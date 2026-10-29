# ZARA AI Interviewer

Role-specific application pages hosted as a static React/Vite site.

## Sign-in and applications

The current GitHub Pages preview does not call a live API. **Create account** stores a salted PBKDF2 password hash in browser storage, then switches to **Sign in**. Successful sign-in opens the selected role application page. Application details are kept in that browser's local storage, and the uploaded photo is kept in IndexedDB on that device.

This is a browser-only preview: accounts and applications do not sync to other devices or reach the hiring team. Clearing browser site data removes them. Do not use this mode for confidential candidate records or as production authentication.

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
