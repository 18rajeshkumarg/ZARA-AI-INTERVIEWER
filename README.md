# ZARA AI Interviewer

ZARA AI Interviewer is a polished, client-side interview simulation for hiring teams that need a fast, structured way to evaluate candidates across roles and locations.

The experience takes a candidate from role selection through a **screening round** and a **real interview** — both conducted live by ZARA AI with the camera and microphone on, voice read-out, live transcription and automatic recording — and into a scored, downloadable report. The final round is announced as a **one-on-one, offline** interview with the hiring panel. Everything runs in the browser; no backend is required.

## What It Includes

- Landing page with product overview, workflow explanation, FAQs, and a global candidate ticker.
- Role selection for Senior Frontend Engineer and Senior Product Manager interviews.
- **Screening round → real interview → offline final round** flow, driven by the Interview button.
- **ZARA reads every question and its options aloud** (Web Speech synthesis) after speaking the start-of-interview instructions.
- **Microphone stays on** for the whole interview — real mic levels drive the waveform.
- **Live speech-to-text transcript** of everything the candidate says (Web Speech API).
- **Automatic recording**: camera video (`*_camera_recording.webm`), candidate voice (`*_candidate_voice.webm`), timestamped transcript (`*_transcript.txt`) and session metadata (`*_session.json`).
- Session data is written straight into the **`Human_Detection/` folder** (File System Access API) or auto-downloaded if no folder is chosen.
- Live scoring across structure, technical vocabulary, vocal fluency, and confidence.
- Per-answer AI-style feedback and tracked role keywords.
- Final hiring verdicts: Strong hire, Hire, Lean hire, or No hire.
- Plain-text report export with the role, scores, feedback, and keyword coverage.
- Responsive layout for desktop and mobile screens.

## Product Flow

1. Pick a role on the landing page and press **Interview**.
2. ZARA greets the candidate, reads the instructions aloud, and starts the **screening round** (3 questions).
3. The **real interview** (role-specific questions) follows with the same mechanics — questions and options are spoken, every response is transcribed and recorded.
4. After both online rounds, the app announces that the **final round is conducted one-on-one, offline** with the hiring panel.
5. Review the overall score, dimension breakdown, verdict, and per-answer feedback, then export the report.

## Interview Proctoring

The live interview enforces a proctored session in `src/components/InterviewRoom.tsx`:

- The **camera and microphone must be on** for the whole interview; the session will not start without them.
- The interview **auto-terminates** when the candidate switches tabs/windows, loses focus, captures the screen (PrintScreen / snipping shortcuts), turns the camera or microphone off, or when the **AI vision** scan sees **0 people** (candidate left) or **2+ people** (someone else present) on consecutive scans.
- A violation freezes the session, stops the camera, captures a still frame as evidence, saves the partial recording + transcript, and shows the termination reason.

Person detection runs **100% in the browser** (TensorFlow.js COCO-SSD, `person` class — loaded on demand from CDN), so the static GitHub Pages deployment needs no backend. If the detector cannot load, the interview continues with the remaining proctoring checks.

## Session Data In Human_Detection/

During the interview the browser records the camera feed and the candidate's voice and transcribes the conversation live. When the round ends (or is terminated), these files are saved automatically:

```text
human_detection_<round>_<role>_<timestamp>_camera_recording.webm
human_detection_<round>_<role>_<timestamp>_candidate_voice.webm
human_detection_<round>_<role>_<timestamp>_transcript.txt
human_detection_<round>_<role>_<timestamp>_session.json
```

- Press **Choose Human_Detection folder** at the start of the interview and pick this repository's `Human_Detection/` folder once — every round then saves directly into it (Chrome/Edge, File System Access API).
- If no folder is chosen (or the browser does not support the picker, e.g. Firefox), the four files are downloaded automatically — move them into `Human_Detection/`.
- The transcript and metadata also feed the offline Python tooling in [`Human_Detection/`](Human_Detection/) for further analysis.

## Tech Stack

- React 19
- TypeScript
- Vite 7
- Tailwind CSS 4
- Framer Motion for transitions and animated feedback
- Lucide React for interface icons
- Web APIs: MediaRecorder, Web Speech (recognition + synthesis), File System Access, AudioContext
- TensorFlow.js + COCO-SSD (CDN, runtime) for in-browser person detection

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
├── App.tsx                    # landing → screening → real interview → offline → report
├── index.css                  # Global styles, Tailwind setup, fonts, and effects
├── main.tsx                   # React application entry point
├── components/
│   ├── Landing.tsx             # Product landing page, nav, and role picker
│   ├── InterviewRoom.tsx       # Recorded, proctored interview with voice + transcript
│   ├── FinalRound.tsx          # Offline one-on-one final round announcement
│   └── Report.tsx              # Score summary, feedback, and report export
├── lib/
│   ├── capture.ts              # Camera/voice recording, live transcript, TTS, folder storage
│   └── interview.ts            # Roles, screening + interview questions, answers, scoring data
└── assets/                     # Static application assets
Human_Detection/
├── human_detection.py          # YOLOv8 humans-only video analyzer (Python/OpenCV)
├── requirements.txt            # Python dependencies
└── video/                      # Place input videos here (and interview session data)
```

## Human_Detection (offline Python vision)

[`Human_Detection/`](Human_Detection/) contains the standalone YOLOv8 pipeline for offline video analysis — bounding boxes, live FPS overlay, `output.mp4`, and `detections.csv`. It counts **humans only** via `classes=[0]`. It also receives the recorded interview session data (video, voice, transcript, metadata) saved by the web app. See [Human_Detection/README.md](Human_Detection/README.md) for setup and usage.

## Customising The Demo

Edit `src/lib/interview.ts` to add or change:

- Roles, interview duration labels, and tracked keywords.
- Screening questions (`screeningQuestions`) and role-specific interview questions.
- Answer choices, feedback text, and per-dimension scores.

Each answer can contribute up to 20 points to each scoring dimension. The report normalises the accumulated scores to a 0–100 scale and derives the hiring verdict from the average.

## Deployment

The app is a static Vite frontend and deploys automatically to GitHub Pages via [.github/workflows/deploy.yml](.github/workflows/deploy.yml). Every push to `main` installs the locked dependencies, builds the Vite site, and publishes the generated `dist/` directory.

## Repository

GitHub: [18rajeshkumarg/ZARA-AI-INTERVIEWER](https://github.com/18rajeshkumarg/ZARA-AI-INTERVIEWER)

## Live Preview

The project is live on GitHub Pages at:

[Open the ZARA AI Interviewer demo](https://18rajeshkumarg.github.io/ZARA-AI-INTERVIEWER/)

The deployment is automated by [.github/workflows/deploy.yml](.github/workflows/deploy.yml). Every push to `main` installs the locked dependencies, builds the Vite site, and publishes the generated `dist/` directory to GitHub Pages.

The current deployment has completed successfully, with both the `build` and `deploy` jobs passing.
