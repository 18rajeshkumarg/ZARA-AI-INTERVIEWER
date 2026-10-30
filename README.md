# ZARA AI Interviewer

Role-specific application pages hosted as a static React/Vite site.

## Sign-in and applications

The current GitHub Pages preview does not call a live API. **Create account** stores a salted PBKDF2 password hash in browser storage, then switches to **Sign in**. Successful sign-in opens the selected role application page. On first application submission, the browser asks the candidate to select the local `ZARA AI Interview` project folder; it then writes a numbered text file under `Candidate Applications/Candidates/` and the photo under `Candidate Applications/Uploads/`.

Accounts remain in the browser where they were created and do not sync to other devices. Candidate files are written only to the folder selected by the person using the browser. They are not sent to a shared server or to the hiring team. Do not use this mode for confidential candidate records or as production authentication.

The role list lives in [`shared/roles.js`](shared/roles.js) and is imported by both the frontend and the optional API prototype, so the two cannot drift apart.

## Repository layout

| Path | Contents |
| --- | --- |
| `src/components/Landing.tsx` | Home page, role list and the browser-local application form |
| `src/components/AdminDashboard.tsx` | Hiring review page (`#/admin`) for the optional API prototype |
| `src/lib/candidateStorage.ts` | File System Access writes and folder-handle persistence |
| `src/components/InterviewRoom.tsx`, `FinalRound.tsx`, `Report.tsx` | Full AI interview room, final-round screen and score report — **retained but not currently routed** |
| `src/lib/interview.ts`, `src/lib/capture.ts` | Question bank, scoring model, TTS/transcription and recording helpers for the interview room |
| `server/` | Optional Express/PostgreSQL API prototype (not deployed, not called by the static site) |
| `shared/roles.js` | Single source of truth for the open roles |
| `Human_Detection/` | Offline YOLOv8 person-detection analyzer for recorded session videos |

The `#/admin` page expects the optional API to be running; it cannot sign in against GitHub Pages alone. The interview room, final-round screen and report are likewise not reachable from the current application-only routes.

## Run locally

Requirements: Node.js 20+ and npm.

```sh
npm ci
npm run dev
```

Run `npm run lint` and `npm run build` to check the frontend.

## Publish

GitHub Actions builds and deploys the frontend to GitHub Pages when changes are pushed to `main`.
