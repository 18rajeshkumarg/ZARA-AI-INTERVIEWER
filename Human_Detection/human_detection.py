from ultralytics import YOLO
import cv2
import time
import os
import sys
import csv
from collections import defaultdict

# File paths and settings
MODEL_PATH = "yolov8n.pt"
# Optional: pass a video path as the first argument, e.g.
#   python human_detection.py video/human_detection_screening_frontend_<stamp>_camera_recording.webm
VIDEO_PATH = sys.argv[1] if len(sys.argv) > 1 else "video/humans.mp4"
OUTPUT_VIDEO = "output.mp4"
CONFIDENCE = 0.5

# Load YOLO model
model = YOLO(MODEL_PATH)

# Initialize counters
total_frames = 0
total_objects = 0
class_counter = defaultdict(int)

# Open input video
cap = cv2.VideoCapture(VIDEO_PATH)

if not cap.isOpened():
    raise FileNotFoundError(
        f"Could not open video file: {VIDEO_PATH}"
    )

# Get video properties
width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
fps = cap.get(cv2.CAP_PROP_FPS)

if fps <= 0:
    fps = 30.0

# Create output video writer
writer = cv2.VideoWriter(
    OUTPUT_VIDEO,
    cv2.VideoWriter_fourcc(*"mp4v"),
    fps,
    (width, height)
)

if not writer.isOpened():
    cap.release()
    raise RuntimeError(
        f"Could not create output video: {OUTPUT_VIDEO}"
    )

# Create CSV file for detections
csv_file = open("detections.csv", "w", newline="")
csv_writer = csv.writer(csv_file)

csv_writer.writerow([
    "Frame",
    "Class",
    "Confidence"
])

# Start timer
start_time = time.time()

try:
    while cap.isOpened():
        success, frame = cap.read()

        if not success:
            break

        total_frames += 1

        # Run YOLO object detection
        # classes=[0] restricts detection to humans only
        # (class 0 = person in the COCO-trained YOLOv8 model)
        results = model.predict(
            frame,
            conf=CONFIDENCE,
            classes=[0],
            verbose=False
        )

        boxes = results[0].boxes

        # Process detected objects
        for box in boxes:
            cls = int(box.cls[0])
            conf = float(box.conf[0])

            class_name = model.names[cls]

            class_counter[class_name] += 1
            total_objects += 1

            # Save detection information to CSV
            csv_writer.writerow([
                total_frames,
                class_name,
                round(conf, 2)
            ])

        # Draw bounding boxes
        annotated = results[0].plot()

        # Calculate live FPS
        current_time = time.time()
        elapsed_time = current_time - start_time

        fps_live = (
            total_frames / elapsed_time
            if elapsed_time > 0
            else 0
        )

        # Display FPS
        cv2.putText(
            annotated,
            f"FPS: {fps_live:.2f}",
            (20, 40),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            (0, 255, 0),
            2
        )

        # Display object count in current frame
        cv2.putText(
            annotated,
            f"Objects: {len(boxes)}",
            (20, 80),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            (255, 0, 0),
            2
        )

        # Save annotated frame to output video
        writer.write(annotated)

        # Display processed video
        cv2.imshow("Human Detection", annotated)

        # Press Q to stop processing
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

finally:
    # Release resources
    cap.release()
    writer.release()
    csv_file.close()
    cv2.destroyAllWindows()

# Display final results
print("\n----- HUMAN DETECTION SUMMARY -----")
print("Total frames processed:", total_frames)
print("Total objects detected:", total_objects)
print("Class counts:", dict(class_counter))
print("Output video saved to:", OUTPUT_VIDEO)
print("Detection data saved to: detections.csv")
