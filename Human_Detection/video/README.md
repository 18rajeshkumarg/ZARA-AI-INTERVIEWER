# Input videos

Place your source video here as:

```
video/humans.mp4
```

The detection script reads this path (see `VIDEO_PATH` in
`../human_detection.py`), or accepts any video as an argument:

```bash
python human_detection.py video/humans.mp4
```

## Recorded interview clips (automatic)

The ZARA web app saves the **camera recording of every interview round here
automatically** when you choose the `Human_Detection` folder at the start of
the interview:

```
video/human_detection_<round>_<role>_<timestamp>_camera_recording.webm
```

Each clip can be re-analyzed directly:

```bash
python human_detection.py video/human_detection_screening_frontend_<stamp>_camera_recording.webm
```

Large video files (`.mp4`, `.webm`) are intentionally not committed to the
repository — the `.gitignore` excludes them.
