# ZARA AI Interviewer

Role-specific candidate applications with an authenticated API and administrator-controlled interview progression. The frontend is a static React/Vite site. Candidate records are written by the API process to its own persistent data directory; a public GitHub Pages browser cannot write into the repository checkout.

## Candidate journey

1. Choose a role from the home page. Each role has its own route, for example `#/apply/ai-developer`.
2. Create an account with email and password, then verify the email with a one-time code.
3. Submit the role application with mandatory name, email, phone, work experience, location, about text, and a face photo.
4. An administrator marks Round 1 and then Round 2 complete. Only after both are complete does the candidate screen show the Boss Round section.
5. An administrator invites the candidate to the Boss Round and marks the candidate approved after the interview. Only approved candidates see the **HIRED EMPLOYEE** link.

The photo is stored as an application attachment; the service does not perform facial recognition or identity matching. Zoom meeting creation is not integrated.

## Backend storage and access

The Express API uses PostgreSQL for candidate accounts, applications, approval states, and activity events. Passwords are bcrypt-hashed. Email verification codes expire after 10 minutes. Application photos are limited to 5 MB and checked for JPEG, PNG, or WebP signatures. Administrator routes require a separate short-lived JWT.

Each application writes files on the **backend host**:

```text
server/data/Candidates/candidate-000001.txt
server/data/Uploads/candidate-000001.jpg
```

The actual data directory is configurable with `DATA_DIR`. It is excluded from Git to keep candidate personal data and photos out of repository commits. On Render, the included Blueprint mounts a persistent disk at that path. This makes files available to the deployed backend; it does not copy candidate files into a developer’s local project folder or GitHub repository.

Activity records include successful account registration, email verification, sign-in, application submission and retrieval, administrator sign-in and review actions, and photo access, along with timestamps and request metadata.

## Local development

Requirements: Node.js 20+, PostgreSQL, and an SMTP account for sending verification codes.

1. Copy `.env.example` to `.env` and configure `DATABASE_URL`, `JWT_SECRET` (32+ random characters), SMTP settings, and administrator credentials.
2. Install packages: `npm ci`.
3. Start the API: `npm run dev:api` (port 8787 by default).
4. In another terminal, start the site: `npm run dev`.

The API creates its tables on startup. Set `DATA_DIR` to a private writable folder with enough space for photos. Never commit `.env` or `server/data/`.

The protected administrator review page is `#/admin`. Use the configured `ADMIN_EMAIL` and `ADMIN_PASSWORD`. Its API can mark the two virtual rounds complete in order, invite to the Boss Round after both rounds, and approve after the Boss Round. Candidate status and the Hired Employees link are driven by those server-side states.

## Deployment

- GitHub Actions deploys the static frontend to GitHub Pages on pushes to `main`.
- `render.yaml` defines a separate Render API service, PostgreSQL database, and persistent disk. Provisioning it creates paid Render resources. During Blueprint setup, supply the SMTP and administrator secrets; do not put them in Git.
- The production frontend defaults to `https://zara-ai-interviewer-api.onrender.com/api`, matching the configured Render service name. Set the `VITE_API_URL` build variable if the API uses a different hostname.
- Connect Render to this GitHub repository and keep auto-deploy enabled. Backend deployment is separate from the GitHub Pages deployment.

Run `npm run build` to validate the frontend production bundle and `node --check server/index.js` to check API syntax.
