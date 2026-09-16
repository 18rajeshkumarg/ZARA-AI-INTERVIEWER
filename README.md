# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    # ZARA AI Interviewer

    ZARA AI Interviewer is a polished, client-side interview simulation for hiring teams that need a fast, structured way to evaluate candidates across roles and locations.

    The experience takes a recruiter from role and candidate selection through a guided interview and into a scored, downloadable report. It is designed as a realistic product demo: the interview flow, scoring rubric, feedback, animations, and report generation all run in the browser.

    ## What It Includes

    - Landing page with product overview, workflow explanation, FAQs, and candidate directory.
    - Role selection for Senior Frontend Engineer and Senior Product Manager interviews.
    - Candidate profiles for six candidates across Lagos, Tokyo, Bengaluru, Buenos Aires, Milan, and Dubai.
    - Guided five-question interview sessions with calibrated answer paths.
    - Live animated waveform, interview phase indicator, transcript, and score dimensions.
    - Scoring across structure, technical vocabulary, vocal fluency, and confidence.
    - Per-answer AI-style feedback and tracked role keywords.
    - Final hiring verdicts: Strong hire, Hire, Lean hire, or No hire.
    - Plain-text report export with the candidate, role, scores, feedback, and keyword coverage.
    - Responsive layout for desktop and mobile screens.

    ## Product Flow

    1. Choose a role and candidate from the landing page.
    2. Review each interview question and select one of the simulated candidate responses.
    3. Inspect live score changes, keyword matches, and the running transcript.
    4. Advance through all five questions.
    5. Review the overall score, dimension breakdown, verdict, and per-answer feedback.
    6. Export the report as a `.txt` file or start a new interview.

    ## Demo Scope

    This repository currently contains a fully interactive frontend demo. The interview responses and scoring data are defined locally in `src/lib/interview.ts`; there is no live AI provider, speech-to-text service, authentication, database, or backend API connected yet.

    The waveform and interview phases are visual simulations. To turn this into a production system, connect the interview room to a backend that handles authentication, candidate data, speech transcription, model evaluation, persistence, and organisation-level data retention controls.

    ## Tech Stack

    - React 19
    - TypeScript
    - Vite 7
    - Tailwind CSS 4
    - Framer Motion for transitions and animated feedback
    - Lucide React for interface icons
    - React Router DOM is available for future route-based expansion

    ## Getting Started

    ### Prerequisites

    - Node.js 18 or newer
    - npm 9 or newer

    ### Install dependencies

    ```bash
    npm install
    ```

    ### Start the development server

    ```bash
    npm run dev
    ```

    Vite will print the local URL, normally `http://localhost:5173`.

    ### Create a production build

    ```bash
    npm run build
    ```

    ### Preview the production build

    ```bash
    npm run preview
    ```

    ### Run lint checks

    ```bash
    npm run lint
    ```

    ### Verify the project

    The project is checked with both commands before changes are published:

    ```bash
    npm run lint
    npm run build
    ```

    The build runs TypeScript project checks and creates the production bundle in `dist/`.

    ## Project Structure

    ```text
    src/
    ├── App.tsx                    # Controls landing, interview, and report stages
    ├── index.css                  # Global styles, Tailwind setup, fonts, and effects
    ├── main.tsx                   # React application entry point
    ├── components/
    │   ├── Landing.tsx             # Product landing page and role/candidate picker
    │   ├── InterviewRoom.tsx       # Guided interview and live scoring experience
    │   └── Report.tsx              # Score summary, feedback, and report export
    ├── lib/
    │   └── interview.ts            # Candidate, role, question, answer, and scoring data
    └── assets/                     # Static application assets
    ```

    ## Customising The Demo

    Edit `src/lib/interview.ts` to add or change:

    - Candidates and their location metadata.
    - Roles, interview duration labels, and tracked keywords.
    - Questions and answer choices.
    - Feedback text and per-dimension scores.

    Each answer can contribute up to 20 points to each scoring dimension. The report normalises the accumulated scores to a 0–100 scale and derives the hiring verdict from the average.

    ## Deployment

    The app is a static Vite frontend and can be deployed to Vercel, Netlify, GitHub Pages, or any static hosting provider.

    ```bash
    npm run build
    ```

    Deploy the generated `dist/` directory. Configure the host to serve `index.html` as the fallback for client-side routes if routes are added later.

    ## Repository

    GitHub: [18rajeshkumarg/ZARA-AI-INTERVIEWER](https://github.com/18rajeshkumarg/ZARA-AI-INTERVIEWER)

    ## Live Preview

    The project is live on GitHub Pages at:

    [Open the ZARA AI Interviewer demo](https://18rajeshkumarg.github.io/ZARA-AI-INTERVIEWER/)

    The deployment is automated by [.github/workflows/deploy.yml](.github/workflows/deploy.yml). Every push to `main` installs the locked dependencies, builds the Vite site, and publishes the generated `dist/` directory to GitHub Pages.

    The current deployment has completed successfully, with both the `build` and `deploy` jobs passing.
