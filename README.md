# ZARA AI Interviewer

Role-specific application and interview site for **Indica Software**, hosted as a static React/Vite site on GitHub Pages.

Live site: <https://18rajeshkumarg.github.io/ZARA-AI-INTERVIEWER/>

## Candidate flow

1. **Apply For Job** scrolls to **Pick a Role**.
2. Every role card has its own **INTERVIEW →** page (`#/apply/<role-slug>`).
3. The candidate creates an account or signs in, then submits:
   - full name
   - email address (the account email)
   - phone number
   - work experience
   - location
   - a short description about themselves
   - a face photo (JPEG, PNG or WebP, up to 5 MB)
4. On submit, the next day is reserved automatically:
   - **Virtual Round 1:** 11:30 AM–11:55 AM IST
   - **Virtual Round 2:** 12:40 PM–1:10 PM IST
5. The candidate screen shows a **Verify face & join Round** button for each round.
6. Before a Zoom button opens, the camera check uses TensorFlow.js COCO-SSD person detection and a rough face-area heuristic to check that exactly one person is visible. This is not facial identity verification. When the check passes, the real Zoom link opens in a new tab. Nothing (and specifically never `about:blank`) opens before the check passes. If the browser blocks the popup, an **Open … on Zoom** button appears inside the modal.
7. **Passing Round 1 unlocks Round 2 automatically.** The hiring team marks Round 1 completed in the review portal, and the candidate's Round 2 Zoom access is granted immediately — there is no separate selection step.
8. **The hiring team owns completion.** Only the review portal can mark a round completed or not completed; candidates cannot advance themselves. Every confirmed change refreshes the candidate screen automatically.
9. The **Boss Round** card is hidden until the hiring team confirms both virtual rounds as completed. It is an in-person round at the Boss location. A WhatsApp button opens a pre-written message to **+91 7975044149** stating that the candidate is selected for the 3rd Interview.
10. The hiring team confirms the final outcome with **Selected** or **Rejected**. **HIRED EMPLOYEE** appears only after the Boss approves (Selected after the Boss Round).
11. A **rejected** candidate can reattend the same interview after a **2-month** waiting period, which is meant for upskilling. Their dashboard shows the exact reapply date and unlocks a **Reapply for this role** button when the date arrives.

Candidates cannot submit or move forward with missing details: name, email, phone, experience, location, about, and a face photo are all required, and the form is validated before an application is created.

The 11 hiring roles live in [`shared/roles.js`](shared/roles.js).

## Authentication (no external API)

The GitHub Pages build intentionally has **no authentication API**. Create Account and Sign In run entirely in the browser:

- passwords are stored as salted **PBKDF2-SHA-256** hashes (210,000 iterations)
- **Create account** creates the account and switches straight to **Sign in**
- an existing email switches to **Sign in** with a clear message
- no `fetch` call is made, so there is no “Failed to fetch” / “Request could not be completed” path

Accounts and sessions are stored in `localStorage` for this origin. They do not sync across devices. This is the requested normal, static sign-in flow.

## Candidate files and project folder

Applications are saved in the browser (including the face photo in IndexedDB). When the project folder is connected, the site also writes:

```
Candidate Applications/
├── Candidates/
│   ├── candidate-000001.txt
│   └── candidate-000002.txt
├── Uploads/
│   ├── candidate-000001.jpg
│   └── candidate-000002.jpg
└── activity.txt
```

Each candidate text file contains the candidate details, both interview times, both Zoom links, round status, Round 2 selection, the reapply date (when rejected), process updates and the candidate's tracked activity. `activity.txt` keeps one line per save so the hiring team has a chronological log.

The folder is selected **once** with the File System Access API and the directory handle is persisted in IndexedDB. Later submissions reuse it silently — there is no folder picker and no `showDirectoryPicker` abort error for the candidate. If the folder is not available (new device, revoked permission or unsupported browser), the application still saves in the browser and the candidate sees no error.

To connect or reconnect the folder on the review machine, open `#/admin`, enter the Boss passcode and use **Connect folder**.

Records written by older builds (details only, no schedule) can be completed in place with `npm run repair:candidates -- --write`. See [`Candidate Applications/README.md`](Candidate Applications/README.md).

> Candidate files are intentionally git-ignored (`Candidate Applications/Candidates/*` and `Uploads/*`) so personal data is not published to the public GitHub repository. They remain in the local project folder for the hiring team.

## Hiring review (`#/admin`)

The review page is local and does not call an API. It is **not linked anywhere on the candidate site** — the only way in is the direct URL <https://18rajeshkumarg.github.io/ZARA-AI-INTERVIEWER/#/admin>. It reads the applications saved in this browser and lets the Boss:

- edit the **Round 1** and **Round 2 Zoom links** (the candidate screen picks them up after the next confirmed change)
- mark **Round 1 completed / not completed** — completing Round 1 is the pass decision and grants Round 2 access automatically
- mark **Round 2 completed / not completed**
- record the **Boss Round** request and completion
- confirm the outcome with a single **Selected / Rejected** pair:
  - **Selected** is recorded immediately and shows **Selected** in the decision panel, the process tracker and the candidate screen — it is never a silent click
  - **Selected** before Round 2 grants Round 2 access
  - **Selected** after the Boss Round approves the candidate and unlocks **HIRED EMPLOYEE**
  - **Undo selection** reverses a selection made before the Boss Round
  - **Rejected** closes the application and starts the candidate's **2-month** upskilling/reapply period
- review the **process updates** and the automatically tracked **candidate activity** (every click, page view and verification) per candidate, plus the site-wide activity log
- **Connect folder** so records are mirrored into `Candidate Applications/`

Candidates never see these controls and cannot mark a round complete themselves.

### Boss passcode

- Default passcode: **`ZARA-BOSS-2026`**
- Set `VITE_ADMIN_CODE` in `.env` (or the Pages build environment) before building to change it. The value is compiled into the bundle, so treat it as a client-side gate, not a server secret.
- A correct passcode stores `zara_admin_unlocked` in `sessionStorage`, so the tab stays unlocked until it is closed. **Sign out** clears it immediately.
- Opening `#/admin` without the passcode shows only the passcode form; no candidate data is rendered.
- Because everything is browser-local, the review page can only see applications saved in the same browser/device.

Approval unlocks the **HIRED EMPLOYEE** button on the candidate screen in that browser. Clicking the button shows the local hiring confirmation; nothing is sent to an external service.

### Hired employee onboarding (browser-local)

After hiring, the candidate can select **Send EMPLOYEE Details**. The admin review on the **same browser and device** then exposes two generated, branded sample-reference PDFs: an employee ID-card design and an office log-in / log-out card design. Both pages are exactly **85.6 × 54 mm (CR80)** and include a QR containing only a sample reference code. The cards are prominently marked **SAMPLE ONLY — NOT VALID FOR IDENTIFICATION OR ACCESS**; the QR does not validate identity or employment. Print at **100% / Actual size**, with fit-to-page/A4 scaling disabled.

The admin reviews the PDFs, confirms review, and can publish a WhatsApp number. The employee can share the sample PDFs using the device share sheet or open a prefilled WhatsApp request. The share sheet does not restrict its recipient, so the employee must verify the admin-published contact and confirm the send. Nothing is sent automatically. After the admin records physical card receipt, the candidate sees a link to `https://roles-backend.onrender.com`.

After Boss Round completion and hiring approval, both the employee and admin portal show a branded onboarding notice scheduled for the next day, 10:30 AM–1:00 PM IST. It includes the supplied checklist: educational certificates (10th, 10+2, graduation, post-graduation and applicable course certifications); previous-employer pay slips for the last three months; service and relieving letters from all previous employers; three copies each of PAN and Aadhaar (Aadhaar required for credential creation), plus passport for international employees; six white-background passport photographs; cancelled cheque or bank passbook copy (not required for a new bank account); and the signed Indica Software offer letter. The notice warns that candidates with incomplete documents would not be onboarded.

After the Boss Round is completed and the candidate is hired, the admin can prepare an original Indica-branded offer letter with the candidate's role and contact details, enter the employer-approved compensation and employment terms, upload an authentic authorized signatory signature, and explicitly issue it. The PDF then appears in the hired candidate's portal. Download requires a camera check with the COCO-SSD person detector; if the model cannot load, the download remains locked. This is only a one-person presence check, not identity authentication, and is bypassable in a client-only static app. The PDF is not emailed or synchronized across devices. The generated letter uses an original layout rather than reproducing the supplied third-party offer-letter design.

This is a local workflow, not a cross-device employee portal: candidate submissions, the admin passcode gate, review state, offer terms, and employee onboarding status are stored in the browser and are not protected or synchronized by a server. Do not use this static-site flow for confidential employee records or treat generated sample ID/log PDFs as company-issued credentials. Authentic employee ID verification, a QR verification endpoint, cross-device delivery, and enforceable admin-only access require a working authenticated backend.

## Run locally

Requirements: Node.js 20+ and npm.

```sh
npm ci
npm run dev
```

Useful checks:

```sh
npm run lint
npm run build
```

## Publish

GitHub Actions builds the frontend and deploys `dist` to GitHub Pages whenever `main` is pushed:

```sh
git push origin main
```

The workflow is in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

## Repository layout

| Path | Contents |
| --- | --- |
| `src/components/Home.tsx` | Home page, role cards, schedule and FAQs |
| `src/components/RoleApplication.tsx` | Per-role sign-in, application form and submission |
| `src/components/CandidateDashboard.tsx` | Candidate schedule, Zoom rounds, Boss Round and HIRED EMPLOYEE |
| `src/components/FaceVerification.tsx` | COCO-SSD person-detection camera check for interview links and offer-letter downloads |
| `src/components/AdminDashboard.tsx` | Local Boss review and folder connection |
| `src/components/Shell.tsx` | Header, logo link and footer |
| `src/lib/auth.ts` | Browser-local PBKDF2 account authentication |
| `src/lib/applications.ts` | Applications, schedules, Zoom links and status transitions |
| `src/lib/candidateStorage.ts` | Project-folder writes and local photo storage |
| `scripts/repair-candidates.mjs` | Upgrades older candidate `.txt` records to the current format |
| `src/lib/faceVerification.ts` | TensorFlow.js COCO-SSD person detector |
| `shared/roles.js` | Single source of truth for the 11 roles |
| `Human_Detection/` | Offline YOLOv8 person-detection analyzer |
