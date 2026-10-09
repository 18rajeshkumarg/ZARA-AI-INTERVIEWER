# Human_Detection — YOLOv8 humans-only video analyzer

Offline camera/vision component of the ZARA AI Interview project.
It runs **YOLOv8n** over a video, keeps **humans only** (`classes=[0]`),
draws live bounding boxes with FPS/object counters, and writes the results
to disk.

## Project structure

```
Human_Detection/
├── human_detection.py    # main program
├── requirements.txt      # Python dependencies
├── video/
│   └── humans.mp4        # input video (add your own)
├── yolov8n.pt            # model weights (auto-downloaded by Ultralytics)
├── output.mp4            # generated: annotated video
└── detections.csv        # generated: Frame,Class,Confidence rows
```

## Setup

```bash
pip install -r requirements.txt
```

## Run

```bash
cd Human_Detection
python human_detection.py
```

- A window titled **Human Detection** shows the video with detection boxes,
  the live FPS, and the number of humans in the current frame.
- Press **Q** to stop processing early.
- When it finishes, `output.mp4` and `detections.csv` are written next to the
  script, and a summary is printed to the console.

## Notes

- `yolov8n.pt` is downloaded automatically by Ultralytics on first run —
  there is no need to fetch it manually.
- Detection uses `classes=[0]`, so **only the `person` class (COCO class 0)**
  is counted. Remove that argument from `model.predict()` if you want the
  general COCO detector (cars, phones, bags, …) instead.
- `CONFIDENCE = 0.5` is the minimum score for a detection to be kept.

## Interview session data (recorded by the web app)

During a live interview the web app automatically records the session and
saves the data into this folder (or downloads it if no folder was chosen):

```
human_detection_<round>_<role>_<timestamp>_camera_recording.webm  # camera video + candidate voice
human_detection_<round>_<role>_<timestamp>_candidate_voice.webm   # voice-only track
human_detection_<round>_<role>_<timestamp>_transcript.txt         # timestamped live transcript
human_detection_<round>_<role>_<timestamp>_session.json           # metadata, scores, answers
```

These files can be re-analyzed with the same pipeline, for example:

```bash
# run human detection over a recorded interview video
cd Human_Detection
python human_detection.py video/human_detection_screening_frontend_<stamp>_camera_recording.webm
```

## Relation to the web app

The deployed site can't run Python/OpenCV in the browser, so the **live
interview camera** uses an equivalent in-browser person detector
(TensorFlow.js COCO-SSD, `person` class) to enforce the same rules in real
time: the interview auto-terminates if **0 people** or **2+ people** are
visible. This folder is the offline/analytical version of that pipeline.
