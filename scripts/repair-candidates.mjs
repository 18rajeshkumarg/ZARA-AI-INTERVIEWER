// Repairs candidate .txt files written by older builds.
//
// Records created before the current format have no interview date, Zoom links
// or activity trail. This reads each candidate-*.txt in
// "Candidate Applications/Candidates", keeps every detail the candidate
// actually entered, and re-writes the file in the current format using the
// same scheduling and Zoom-link functions the site itself uses.
//
//   node scripts/repair-candidates.mjs           # report only
//   node scripts/repair-candidates.mjs --write   # apply the repair
//
// Existing values (including an interview date that was already recorded) are
// never discarded, and an already-complete record is left untouched.

import { readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidateDir = path.join(root, "Candidate Applications", "Candidates");
const uploadDir = path.join(root, "Candidate Applications", "Uploads");
const write = process.argv.includes("--write");

const REQUIRED = [
  "Candidate ID",
  "Role",
  "Name",
  "Email",
  "Phone",
  "Work experience",
  "Location",
  "About",
  "Submitted",
];
const COMPLETE_MARKERS = [
  "Interview date",
  "Round 1 Zoom",
  "Round 2 Zoom",
  "Activity",
];

function parse(text) {
  const fields = {};
  for (const line of text.split(/\r?\n/)) {
    const match = /^([A-Za-z][A-Za-z0-9 ]*?):\s?(.*)$/.exec(line);
    if (match && !(match[1] in fields))
      fields[match[1].trim()] = match[2].trim();
  }
  return fields;
}

const pad2 = (n) => String(n).padStart(2, "0");

function istParts(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type) => Number(parts.find((p) => p.type === type)?.value || 0);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** Mirrors scheduleNextDay() in src/lib/applications.ts, anchored to the submission date. */
function scheduleFor(submittedAt) {
  const submitted = submittedAt ? new Date(submittedAt) : new Date();
  const valid = !Number.isNaN(submitted.getTime()) ? submitted : new Date();
  const { year, month, day } = istParts(valid);
  const base = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0));
  const y = base.getUTCFullYear();
  const m = base.getUTCMonth() + 1;
  const d = base.getUTCDate();
  return {
    interviewDate: `${y}-${pad2(m)}-${pad2(d)}`,
    round1: new Date(Date.UTC(y, m - 1, d, 6, 0, 0)).toISOString(), // 11:30 IST
    round2: new Date(Date.UTC(y, m - 1, d, 7, 10, 0)).toISOString(), // 12:40 IST
  };
}

/** Mirrors makeZoomLink() in src/lib/applications.ts so repairs match live links. */
function hashDigits(input, length) {
  let state = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    state ^= input.charCodeAt(i);
    state = Math.imul(state, 16777619);
  }
  let out = "";
  let seed = Math.abs(state);
  for (let i = 0; i < length; i += 1) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    out += String(seed % 10);
  }
  return out;
}

function makeZoomLink(id, round) {
  return `https://zoom.us/j/${hashDigits(`${id}-round-${round}-zoom`, 10)}?pwd=${hashDigits(`${id}-round-${round}-pwd`, 8)}`;
}

function record(id, fields, photoName) {
  const schedule = scheduleFor(fields.Submitted);
  const interviewDate = fields["Interview date"] || schedule.interviewDate;
  const events = [
    `[${fields.Submitted || new Date().toISOString()}] Application submitted - Applied for ${fields.Role}.`,
  ];
  if (fields["Interview date"])
    events.push("[repair] Interview date preserved from the original record.");

  return (
    [
      `Candidate ID: ${id}`,
      `Role: ${fields.Role}`,
      `Name: ${fields.Name}`,
      `Email: ${fields.Email}`,
      `Phone: ${fields.Phone}`,
      `Work experience: ${fields["Work experience"]}`,
      `Location: ${fields.Location}`,
      `About: ${fields.About}`,
      `Photo: ../Uploads/${photoName}`,
      `Submitted: ${fields.Submitted}`,
      `Interview date: ${interviewDate}`,
      `Virtual Round 1: 11:30 AM - 11:55 AM IST`,
      `Round 1 Zoom: ${fields["Round 1 Zoom"] || makeZoomLink(id, 1)}`,
      `Round 1 status: ${fields["Round 1 status"] || "scheduled"}`,
      `Virtual Round 2: 12:40 PM - 1:10 PM IST`,
      `Round 2 Zoom: ${fields["Round 2 Zoom"] || makeZoomLink(id, 2)}`,
      `Round 2 status: ${fields["Round 2 status"] || "scheduled"}`,
      `Boss Round requested: ${fields["Boss Round requested"] || "not yet"}`,
      `Boss Round completed: ${fields["Boss Round completed"] || "not yet"}`,
      `Hiring status: ${fields["Hiring status"] || "pending"}`,
      "",
      "Activity:",
      ...events,
    ].join("\n") + "\n"
  );
}

if (!existsSync(candidateDir)) {
  console.log(`No candidate folder at ${candidateDir}`);
  process.exit(0);
}

const files = (await readdir(candidateDir))
  .filter((f) => /^candidate-\d+\.txt$/i.test(f))
  .sort();
let repaired = 0;
let skipped = 0;
let failed = 0;

for (const file of files) {
  const full = path.join(candidateDir, file);
  const text = await readFile(full, "utf8");
  const fields = parse(text);
  const missing = REQUIRED.filter((key) => !fields[key]);

  if (missing.length) {
    console.log(`SKIP ${file} — missing ${missing.join(", ")}; left untouched`);
    failed += 1;
    continue;
  }
  if (
    COMPLETE_MARKERS.every((marker) =>
      Object.keys(fields).some(
        (key) => key.startsWith(marker) || key === marker,
      ),
    ) &&
    /^Activity:/m.test(text)
  ) {
    console.log(`OK   ${file} — already complete`);
    skipped += 1;
    continue;
  }

  const id = fields["Candidate ID"];
  const photoName = (fields.Photo || "").split("/").pop() || `${id}.jpg`;
  const photoExists = existsSync(path.join(uploadDir, photoName));

  if (!write) {
    console.log(
      `WOULD REPAIR ${file} — interview date, both Zoom links and activity trail (photo ${photoExists ? "found" : "MISSING"})`,
    );
    repaired += 1;
    continue;
  }

  await writeFile(full, record(id, fields, photoName), "utf8");
  console.log(
    `REPAIRED ${file} — ${photoExists ? "photo found" : "photo MISSING, file still repaired"}`,
  );
  repaired += 1;
}

console.log(
  `\n${write ? "Repaired" : "To repair"}: ${repaired} · already complete: ${skipped} · skipped (incomplete data): ${failed}`,
);
if (!write && repaired) console.log("Run with --write to apply.");
