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
5. The candidate screen shows a Zoom button for each round.
6. Before a Zoom button opens, the **YOLO face verification** modal checks that exactly one candidate is visible. When it passes, the candidate is redirected to the Zoom round.
7. Round 2 unlocks only after Round 1 is marked completed.
8. The **Boss Round** card is hidden until both virtual rounds are completed. It is an in-person round at the Boss location. A WhatsApp button opens a pre-written message to **+91 7975044149** stating that the candidate is selected for the 3rd Interview.
9. The **HIRED EMPLOYEE** button appears only after the Boss approves the candidate. It links to <https://roles-backend.onrender.com>.

The 11 hiring roles live in [`shared/roles.js`](shared/roles.js) and are shared by the frontend and the optional server prototype.

## Authentication (no external API)

The GitHub Pages build intentionally has **no authentication API** and never calls Render. Create Account and Sign In run entirely in the browser:

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

Each candidate text file contains the candidate details, both interview times, both Zoom links, round status, Boss Round status and the activity trail.

The folder is selected **once** with the File System Access API and the directory handle is persisted in IndexedDB. Later submissions reuse it silently — there is no folder picker and no `showDirectoryPicker` abort error for the candidate. If the folder is not available (new device, revoked permission or unsupported browser), the application still saves in the browser and the candidate sees no error.

To connect or reconnect the folder on the review machine, open `#/admin`, enter the Boss passcode and use **Connect folder**.

Records written by older builds (details only, no schedule) can be completed in place with `npm run repair:candidates -- --write`. See [`Candidate Applications/README.md`](Candidate Applications/README.md).

> Candidate files are intentionally git-ignored (`Candidate Applications/Candidates/*` and `Uploads/*`) so personal data is not published to the public GitHub repository. They remain in the local project folder for the hiring team.

## Hiring review (`#/admin`)

The review page is local and does not call an API. It reads applications from this browser and lets the Boss:

- mark Round 1 and Round 2 complete
- record the Boss Round request / completion
- approve a candidate (only after both virtual rounds and the Boss Round)
- reject a candidate

Default passcode: **`ZARA-BOSS-2026`**. Set `VITE_ADMIN_CODE` in `.env` before building to change it.

Approval unlocks the **HIRED EMPLOYEE** button on the candidate screen in that browser. Cross-device review requires the optional server prototype, which the live static site does not use.

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

## Optional server prototype

`server/index.js` remains as an optional Express/PostgreSQL API prototype (auth, uploads, admin review). The deployed GitHub Pages site does **not** call it and does not require it. See `.env.example` for its settings.

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
| `src/components/FaceVerification.tsx` | YOLO/COCO-SSD camera verification modal |
| `src/components/AdminDashboard.tsx` | Local Boss review and folder connection |
| `src/components/Shell.tsx` | Header, logo link and footer |
| `src/lib/auth.ts` | Browser-local PBKDF2 account authentication |
| `src/lib/applications.ts` | Applications, schedules, Zoom links and status transitions |
| `src/lib/candidateStorage.ts` | Project-folder writes and local photo storage |
| `scripts/repair-candidates.mjs` | Upgrades older candidate `.txt` records to the current format |
| `src/lib/faceVerification.ts` | TensorFlow.js COCO-SSD person detector |
| `shared/roles.js` | Single source of truth for the 11 roles |
| `Human_Detection/` | Offline YOLOv8 person-detection analyzer |
| `server/` | Optional Express/PostgreSQL API prototype (not used by the live site) |
