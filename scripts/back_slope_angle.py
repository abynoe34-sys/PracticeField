"""
Back-slope angle extractor (MediaPipe Tasks API, 0.10.x)
Landmarks used:
  11 = left shoulder   12 = right shoulder
  23 = left hip        24 = right hip

Signed back-slope angle convention
-----------------------------------
  angle = atan2(sy - hy, |hx - sx|)

  where sy/hy are image-y coordinates (y increases downward).
  Because image-y is flipped, (sy - hy) is positive when hips are
  anatomically HIGHER than shoulders.

   0°  = back perfectly flat / horizontal
  +ve  = hips higher than shoulders  (loading forward, weight on hand)
  -ve  = shoulders higher than hips  (sitting back on heels)

  The abs() on dx means the sign is the same regardless of which way
  the player faces in the frame.

Outputs:
  - CSV    : scripts/back_slope_angles.csv  (columns: frame, time_s, person, angle_deg, note)
  - STDOUT : frame-by-frame table

Privacy enforcement
-------------------
  SOURCE_VIDEO is deleted automatically after a successful run.
  assert_clean_columns() fails the run — before any deletion — if the
  output CSV contains any source-identifying column name.
  On any failure the source video is NOT deleted.

  To use for a new batch: update SOURCE_VIDEO at the top of this file.
"""

import sys
import os
import csv
import math
import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks.python        import BaseOptions
from mediapipe.tasks.python.vision import PoseLandmarker, PoseLandmarkerOptions, RunningMode

# ── Config — update SOURCE_VIDEO for each new batch ──────────────────────────
SOURCE_VIDEO = r"C:\Users\abyno\AppData\Local\CapCut\Videos\0606 (3)(3)\0606 (3)(3)-1.mp4"
MODEL_PATH   = r"C:\Users\abyno\PracticeField\scripts\pose_landmarker_heavy.task"
OUTPUT_CSV   = r"C:\Users\abyno\PracticeField\scripts\back_slope_angles.csv"

# Landmark indices
L_SHOULDER, R_SHOULDER = 11, 12
L_HIP,      R_HIP      = 23, 24
MIN_VIS = 0.25

# ── Privacy guard ─────────────────────────────────────────────────────────────
_FORBIDDEN_EXACT = frozenset({
    'file', 'filename', 'filepath', 'path', 'source', 'src',
    'video', 'clip', 'image', 'img', 'url', 'uri',
})
_FORBIDDEN_SUFFIXES = ('_at', '_timestamp', '_path', '_file', '_url', '_src', '_source')
_FORBIDDEN_PREFIXES = ('date_', 'created_', 'updated_', 'ts_')


def assert_clean_columns(csv_path: str) -> None:
    """
    Raise AssertionError if the CSV header contains any column that could
    trace a measurement back to source footage or a real-world identity.
    Called after writing the CSV, before source footage is deleted.
    """
    with open(csv_path, newline='', encoding='utf-8') as f:
        cols = next(csv.reader(f))
    bad = []
    for col in cols:
        lo = col.lower()
        if lo in _FORBIDDEN_EXACT:
            bad.append(col)
        elif any(lo.endswith(s) for s in _FORBIDDEN_SUFFIXES):
            bad.append(col)
        elif any(lo.startswith(s) for s in _FORBIDDEN_PREFIXES):
            bad.append(col)
    if bad:
        raise AssertionError(
            f"\n[PRIVACY GUARD] {csv_path!r} contains forbidden column(s): {bad}\n"
            "These columns can link a measurement back to source footage or an identity.\n"
            "Remove them and re-run. Source footage has NOT been deleted."
        )
    print(f"  [OK] Column check passed — {cols}")


# ── Angle helper ──────────────────────────────────────────────────────────────
def back_slope_deg(lms):
    pts = [lms[i] for i in (L_SHOULDER, R_SHOULDER, L_HIP, R_HIP)]
    vis = [lm.visibility if lm.visibility is not None else 0.0 for lm in pts]
    if any(v < MIN_VIS for v in vis):
        return None

    sx = (lms[L_SHOULDER].x + lms[R_SHOULDER].x) / 2
    sy = (lms[L_SHOULDER].y + lms[R_SHOULDER].y) / 2
    hx = (lms[L_HIP].x     + lms[R_HIP].x)      / 2
    hy = (lms[L_HIP].y     + lms[R_HIP].y)       / 2

    signed = math.degrees(math.atan2(sy - hy, abs(hx - sx)))
    return round(signed, 2)


def main():
    success = False
    try:
        cap = cv2.VideoCapture(SOURCE_VIDEO)
        if not cap.isOpened():
            raise RuntimeError(f"Cannot open source video: {SOURCE_VIDEO}")

        fps   = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        print(f"Video: {total} frames @ {fps:.1f} fps")
        print(f"Model: {MODEL_PATH}")
        print()

        options = PoseLandmarkerOptions(
            base_options        = BaseOptions(model_asset_path=MODEL_PATH),
            running_mode        = RunningMode.VIDEO,
            num_poses           = 2,
            min_pose_detection_confidence = 0.5,
            min_pose_presence_confidence  = 0.5,
            min_tracking_confidence       = 0.5,
            output_segmentation_masks     = False,
        )

        rows = []
        ms_per_frame = 1000.0 / fps

        print(f"{'Frame':>6}  {'Time(s)':>7}  {'Person':>6}  {'Angle(deg)':>10}  {'Note'}")
        print("-" * 52)

        with PoseLandmarker.create_from_options(options) as detector:
            frame_n = 0
            while True:
                ok, frame = cap.read()
                if not ok:
                    break
                frame_n += 1

                rgb    = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
                ts_ms  = int(frame_n * ms_per_frame)
                result = detector.detect_for_video(mp_img, ts_ms)
                time_s = round(frame_n / fps, 3)

                if result.pose_landmarks:
                    for p_idx, lms in enumerate(result.pose_landmarks):
                        angle   = back_slope_deg(lms)
                        note    = "ok" if angle is not None else "low_vis"
                        ang_str = f"{angle:.2f}" if angle is not None else "N/A"
                        print(f"{frame_n:>6}  {time_s:>7.3f}  {p_idx:>6}  {ang_str:>10}  {note}")
                        rows.append({
                            "frame":     frame_n,
                            "time_s":    time_s,
                            "person":    p_idx,
                            "angle_deg": angle if angle is not None else "",
                            "note":      note,
                        })
                else:
                    print(f"{frame_n:>6}  {time_s:>7.3f}  {'--':>6}  {'N/A':>10}  no_detection")
                    rows.append({
                        "frame":     frame_n,
                        "time_s":    time_s,
                        "person":    "",
                        "angle_deg": "",
                        "note":      "no_detection",
                    })

        cap.release()

        with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(
                f, fieldnames=["frame", "time_s", "person", "angle_deg", "note"]
            )
            writer.writeheader()
            writer.writerows(rows)

        print()
        print("--- Done ---")
        print(f"  Rows written : {len(rows)}")
        print(f"  CSV          : {OUTPUT_CSV}")

        angles = [r["angle_deg"] for r in rows if isinstance(r["angle_deg"], float)]
        if angles:
            print(f"  Angle range  : {min(angles):.1f}°  to  {max(angles):.1f}°")
            print(f"  Mean angle   : {sum(angles)/len(angles):.1f}°")

        print()
        assert_clean_columns(OUTPUT_CSV)
        success = True

    finally:
        if success:
            print(f"\nDeleting source video: {SOURCE_VIDEO}")
            try:
                os.unlink(SOURCE_VIDEO)
                print("  Deleted.")
            except FileNotFoundError:
                print("  Warning: source not found — already deleted?")
        else:
            print(f"\n[!] Source video NOT deleted — fix the error above first.")
            print(f"    {SOURCE_VIDEO}")


if __name__ == "__main__":
    main()
