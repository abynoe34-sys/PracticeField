"""
foot_width_preview.py

PURPOSE
-------
One-off PREVIEW script — not part of the validated calibration pipeline.
Shows what a front-view foot-width-vs-hip-width measurement would look like,
using the real pose_landmarker_heavy model already in this project, on a
single still image.

This does NOT write to any calibration CSV, does NOT delete the source
image, and is NOT wired into back_slope_angle.py / m1_measure_stills.py.
It's a standalone visual check — use it to decide whether a given still is
even worth treating as front-view calibration material before it enters
the real pipeline.

WHY HIPS, NOT SHOULDERS (per OL Stance Recipe v2 / Section 4):
Shoulder pads distort the apparent shoulder keypoint position. For any
front-view width ratio, hips are the correct measuring stick instead of
shoulders, since pads don't affect hip width. This script follows that
rule even though the current bad-stance batch is unpadded, so it stays
correct once padded footage re-enters the dataset.

USAGE
-----
    py scripts/foot_width_preview.py path/to/still.png \
        --drill ol_stance_3point --quality bad --view front

Requires the same MediaPipe Tasks setup (pose_landmarker_heavy.task) already
present in this project. Does not require VIDEO mode — this is IMAGE mode,
consistent with the project's existing rule that single stills are
appropriate for static stance measurement (Section 3).
"""

import sys
import os
import argparse
import cv2
import mediapipe as mp
from mediapipe.tasks.python        import BaseOptions
from mediapipe.tasks.python.vision import PoseLandmarker, PoseLandmarkerOptions, RunningMode

# Paths resolve relative to this script file — works regardless of CWD.
_DIR       = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(_DIR, "pose_landmarker_heavy.task")
OUT_PATH   = os.path.join(_DIR, "foot_width_preview_overlay.jpg")  # gitignored via scripts/*.jpg

# Landmark indices (MediaPipe BlazePose 33-point)
L_HIP, R_HIP         = 23, 24
L_ANKLE, R_ANKLE     = 27, 28
L_SHOULDER, R_SHOULDER = 11, 12


def main():
    parser = argparse.ArgumentParser(description="Front-view foot-width preview")
    parser.add_argument('image_path', help='Path to still image')
    parser.add_argument('--drill',   required=True,
                        help='Drill/position label in snake_case (e.g. ol_stance_3point)')
    parser.add_argument('--quality', required=True, choices=['good', 'bad'],
                        help='Clip quality: good or bad')
    parser.add_argument('--view',    required=True, choices=['side', 'front'],
                        help='Camera angle: side or front')
    args = parser.parse_args()

    image_path = args.image_path
    image = cv2.imread(image_path)
    if image is None:
        print(f"[ERROR] Could not read image: {image_path}")
        sys.exit(1)

    h, w = image.shape[:2]

    options = PoseLandmarkerOptions(
        base_options = BaseOptions(model_asset_path=MODEL_PATH),
        running_mode = RunningMode.IMAGE,
        num_poses    = 1,
    )

    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB,
                        data=cv2.cvtColor(image, cv2.COLOR_BGR2RGB))

    with PoseLandmarker.create_from_options(options) as landmarker:
        result = landmarker.detect(mp_image)

    if not result.pose_landmarks:
        print("[ERROR] No pose detected in this image. "
              "Check that the full body is visible and try a clearer still.")
        sys.exit(1)

    lm = result.pose_landmarks[0]

    def px(idx):
        return (int(lm[idx].x * w), int(lm[idx].y * h))

    l_hip, r_hip         = px(L_HIP),    px(R_HIP)
    l_ankle, r_ankle     = px(L_ANKLE),  px(R_ANKLE)
    l_shoulder, r_shoulder = px(L_SHOULDER), px(R_SHOULDER)

    hip_width      = abs(l_hip[0]     - r_hip[0])
    ankle_width    = abs(l_ankle[0]   - r_ankle[0])
    shoulder_width = abs(l_shoulder[0] - r_shoulder[0])

    ratio_to_hip      = ankle_width / hip_width      if hip_width      else float("nan")
    ratio_to_shoulder = ankle_width / shoulder_width if shoulder_width else float("nan")

    print("--- Foot Width Preview ---")
    print(f"  drill={args.drill}  quality={args.quality}  view={args.view}")
    print(f"  Hip width (px)       : {hip_width}")
    print(f"  Shoulder width (px)  : {shoulder_width}  (reference only — not used for ratio, see note below)")
    print(f"  Ankle/foot width (px): {ankle_width}")
    print(f"  Foot-width / Hip-width ratio     : {ratio_to_hip:.2f}")
    print(f"  Foot-width / Shoulder-width ratio: {ratio_to_shoulder:.2f}  (reference only)")
    print()
    print("  NOTE: per the project's recipe, the hip-width ratio is the one that")
    print("  should be trusted for calibration — shoulder width is shown only for")
    print("  comparison and is NOT pad-safe.")
    print()
    print("  No numeric 'good' range has been calibrated yet for this ratio.")
    print("  This script reports the measured ratio only — it does not judge")
    print("  whether it is too narrow, too wide, or fine. That judgment requires")
    print("  comparing against a real calibrated range from good vs bad examples,")
    print("  which does not exist yet for this measurement.")

    # Draw overlay for visual sanity-check
    overlay = image.copy()
    cv2.line(overlay, l_hip,    r_hip,    (255, 180, 80),  4)   # hip line   — amber
    cv2.line(overlay, l_ankle,  r_ankle,  (0,   215, 255), 4)   # ankle line — yellow
    for pt in [l_hip, r_hip, l_ankle, r_ankle]:
        cv2.circle(overlay, pt, 10, (0, 255, 120), -1)
        cv2.circle(overlay, pt, 11, (0, 0,   0),    2)

    cv2.imwrite(OUT_PATH, overlay)
    print(f"\n  Overlay saved to: {OUT_PATH}")
    print("  (This overlay contains footage — review it, then delete it manually.")
    print("   This preview script does not auto-delete anything, since it is not")
    print("   part of the validated calibration pipeline.)")


if __name__ == "__main__":
    main()
