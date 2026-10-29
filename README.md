# ZARA AI Interviewer

Role-specific application pages hosted as a static React/Vite site.

## Sign-in and applications

The current GitHub Pages preview does not call a live API. **Create account** stores a salted PBKDF2 password hash in browser storage, then switches to **Sign in**. Successful sign-in opens the selected role application page. On first application submission, the browser asks the candidate to select the local `ZARA AI Interview` project folder; it then writes a numbered text file under `Candidate Applications/Candidates/` and the photo under `Candidate Applications/Uploads/`.

Accounts remain in the browser where they were created and do not sync to other devices. Candidate files are written only to the folder selected by the person using the browser. They are not sent to a shared server or to the hiring team. Do not use this mode for confidential candidate records or as production authentication.

The unused `server/` folder contains an optional Express/PostgreSQL API prototype. It is not called by the current static-site sign-in or application flow.

## Run locally

Requirements: Node.js 20+ and npm.

```sh
npm ci
npm run dev
```

Run `npm run lint` and `npm run build` to check the frontend.

## Publish

GitHub Actions builds and deploys the frontend to GitHub Pages when changes are pushed to `main`.
