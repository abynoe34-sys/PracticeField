"""
M1 back-slope measurement on static PNG stills.
MediaPipe Pose Landmarker — IMAGE running mode (no timestamp needed).

Back-slope angle convention (signed):
  Vector: shoulder_midpoint -> hip_midpoint  (lm 11+12 -> lm 23+24)
  Angle : measured from horizontal in ANATOMICAL space (y-up, i.e. image-y flipped)
  +90°  = perfectly upright   (hips directly below shoulders)
    0°  = torso horizontal    (shoulders and hips at same height, leaning forward)
  -90°  = inverted            (shoulders below hips — e.g. diving)

  For a 3-point stance we expect a moderately positive angle that is
  significantly less than 90 (forward-leaning torso).

Output: scripts/m1_results_good.csv
  columns: person, slope_deg, lean_from_vertical, higher, note, drill, quality, view
  (source filenames are never written)

Usage:
    py scripts/m1_measure_stills.py --drill ol_stance_3point --quality good --view side

Privacy enforcement
-------------------
  All source PNG stills are deleted automatically after a successful run.
  assert_clean_columns() fails the run — before any deletion — if the
  output CSV contains any source-identifying column name.
  On any failure the source stills are NOT deleted.

  To use for a new batch: update STILLS at the top of this file.
"""

import sys
import os
import csv
import math
import argparse
import cv2
import mediapipe as mp
from mediapipe.tasks.python        import BaseOptions
from mediapipe.tasks.python.vision import PoseLandmarker, PoseLandmarkerOptions, RunningMode

MODEL_PATH = r"C:\Users\abyno\PracticeField\scripts\pose_landmarker_heavy.task"
OUTPUT_CSV = r"C:\Users\abyno\PracticeField\scripts\m1_results_good.csv"
SCRIPTS    = r"C:\Users\abyno\PracticeField\scripts"

# Update STILLS for each new batch.
# Filenames are used only for loading — they are never written to the output CSV.
STILLS = [
    "Bad stance 3.jpg",
    "Bad stance 4.jpg",
]

L_SHOULDER, R_SHOULDER = 11, 12
L_HIP,      R_HIP      = 23, 24
NOSE = 0
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
    Called after writing the CSV, before source stills are deleted.
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
            "Remove them and re-run. Source stills have NOT been deleted."
        )
    print(f"  [OK] Column check passed — {cols}")


# ── Measurement ───────────────────────────────────────────────────────────────
def slope(lms):
    """
    Returns (slope_deg, lean_from_vertical, higher) or (None, None, None).

    slope_deg         : signed angle of shoulder->hip vector from horizontal,
                        anatomical y-up. Sign depends on facing direction.
    lean_from_vertical: facing-direction-independent magnitude of torso lean.
                        0° = perfectly upright, 90° = torso fully horizontal.
                        Positive = forward lean.
    higher            : which landmark group is higher in the frame.
    """
    vis = [(lms[i].visibility or 0.0) for i in (L_SHOULDER, R_SHOULDER, L_HIP, R_HIP)]
    if any(v < MIN_VIS for v in vis):
        return None, None, None

    sx = (lms[L_SHOULDER].x + lms[R_SHOULDER].x) / 2
    sy = (lms[L_SHOULDER].y + lms[R_SHOULDER].y) / 2
    hx = (lms[L_HIP].x     + lms[R_HIP].x)      / 2
    hy = (lms[L_HIP].y     + lms[R_HIP].y)       / 2

    dx =  hx - sx
    dy = -(hy - sy)
    raw_angle = math.degrees(math.atan2(dy, dx))

    torso_len = math.sqrt(dx**2 + (hy - sy)**2)
    if torso_len < 1e-6:
        return round(raw_angle, 2), None, None

    nose_x       = lms[NOSE].x
    facing_right = nose_x > hx
    horiz_disp   = (sx - hx) if facing_right else (hx - sx)
    vert_disp    = hy - sy
    lean_from_vertical = math.degrees(math.atan2(horiz_disp, vert_disp))

    higher = "shoulders" if sy < hy else "hips"
    return round(raw_angle, 2), round(lean_from_vertical, 2), higher


def main():
    parser = argparse.ArgumentParser(description="M1 back-slope measurement on stills")
    parser.add_argument('--drill',      required=True,
                        help='Drill/position label in snake_case (e.g. ol_stance_3point)')
    parser.add_argument('--quality',    required=True, choices=['good', 'bad'],
                        help='Clip quality: good or bad')
    parser.add_argument('--view',       required=True, choices=['side', 'front'],
                        help='Camera angle: side or front')
    parser.add_argument('--fault-type', required=True,
                        choices=['none', 'narrow_stance', 'stagger',
                                 'head_down', 'forward_lean', 'sitting_back'],
                        help='Primary fault demonstrated (use none for good-quality examples)')
    parser.add_argument('--line-side',  required=True, choices=['left', 'right'],
                        help='Side of the offensive line: left or right')
    parser.add_argument('--position',   required=True, choices=['guard_tackle', 'center'],
                        help='Position group: guard_tackle or center')
    args = parser.parse_args()

    success = False
    source_paths = [f"{SCRIPTS}\\{fname}" for fname in STILLS]

    try:
        options = PoseLandmarkerOptions(
            base_options        = BaseOptions(model_asset_path=MODEL_PATH),
            running_mode        = RunningMode.IMAGE,
            num_poses           = 4,
            min_pose_detection_confidence = 0.4,
            min_pose_presence_confidence  = 0.4,
        )

        rows = []
        print(f"{'Person':>6}  {'Slope':>9}  {'LeanFmVert':>10}  {'Higher':>10}  Note")
        print("-" * 52)

        with PoseLandmarker.create_from_options(options) as det:
            for path in source_paths:
                frame = cv2.imread(path)
                if frame is None:
                    raise RuntimeError(f"Cannot read still: {path}")

                rgb    = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
                result = det.detect(mp_img)

                if not result.pose_landmarks:
                    print(f"  [no detection in {os.path.basename(path)}]")
                    continue

                for p_idx, lms in enumerate(result.pose_landmarks):
                    ang, lean, higher = slope(lms)
                    if ang is None:
                        note = "low_vis"
                        print(f"{p_idx:>6}  {'N/A':>9}  {'N/A':>10}  {'N/A':>10}  {note}")
                    else:
                        note = "ok"
                        print(f"{p_idx:>6}  {ang:>9.2f}  {lean:>10.2f}  {higher:>10}  {note}")
                    rows.append({
                        "person":             p_idx,
                        "slope_deg":          ang  if ang  is not None else "",
                        "lean_from_vertical": lean if lean is not None else "",
                        "higher":             higher if higher else "",
                        "note":               note,
                        "drill":              args.drill,
                        "quality":            args.quality,
                        "view":               args.view,
                        "fault_type":         args.fault_type,
                        "line_side":          args.line_side,
                        "position":           args.position,
                    })

        if not rows:
            raise RuntimeError("No measurements produced — check source stills and model.")

        with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(
                f,
                fieldnames=["person", "slope_deg", "lean_from_vertical", "higher", "note",
                            "drill", "quality", "view", "fault_type", "line_side", "position"]
            )
            writer.writeheader()
            writer.writerows(rows)

        print()
        print("--- Done ---")
        print(f"  Rows written : {len(rows)}")
        print(f"  CSV          : {OUTPUT_CSV}")
        print()
        print("  Next step: copy good rows to *_clean.csv and add position_label column manually.")

        print()
        assert_clean_columns(OUTPUT_CSV)
        success = True

    finally:
        if success:
            print(f"\nDeleting {len(source_paths)} source still(s):")
            for p in source_paths:
                try:
                    os.unlink(p)
                    print(f"  Deleted: {p}")
                except FileNotFoundError:
                    print(f"  Warning: not found (already deleted?): {p}")
        else:
            print(f"\n[!] Source stills NOT deleted — fix the error above first.")
            for p in source_paths:
                print(f"    {p}")


if __name__ == "__main__":
    main()
