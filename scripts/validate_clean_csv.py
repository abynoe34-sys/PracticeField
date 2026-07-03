"""
Validate a manually-curated *_clean.csv before it enters the calibration dataset.

Usage:
    py scripts/validate_clean_csv.py scripts/m1_results_good_clean.csv [...]

Runs two independent checks against each file:

  1. Identity-leak guard (assert_clean_columns): fails if any column name
     could trace a measurement back to source footage or a real-world identity.

  2. Structure guard (assert_required_structure): fails if the required metadata
     columns (drill, quality, view) are missing or contain invalid values.

Fails with exit code 1 and a clear error if either check fails on any file.
Pass on a clean file, fail loudly on a dirty one.

Run this immediately after creating or editing any *_clean.csv.
"""

import sys
import csv

# ── Identity-leak guard ───────────────────────────────────────────────────────

_FORBIDDEN_EXACT = frozenset({
    'file', 'filename', 'filepath', 'path', 'source', 'src',
    'video', 'clip', 'image', 'img', 'url', 'uri',
})
_FORBIDDEN_SUFFIXES = ('_at', '_timestamp', '_path', '_file', '_url', '_src', '_source')
_FORBIDDEN_PREFIXES = ('date_', 'created_', 'updated_', 'ts_')


def assert_clean_columns(csv_path: str) -> None:
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
            "Remove them before this file is used as training data."
        )
    print(f"[OK privacy]    {csv_path}")
    print(f"     Columns: {cols}")


# ── Structure guard ───────────────────────────────────────────────────────────

REQUIRED_COLUMNS  = frozenset({'drill', 'quality', 'view', 'fault_type', 'line_side', 'position'})
QUALITY_VALUES    = frozenset({'good', 'bad'})
VIEW_VALUES       = frozenset({'side', 'front'})
FAULT_TYPE_VALUES = frozenset({'none', 'narrow_stance', 'stagger', 'head_down', 'forward_lean', 'sitting_back'})
LINE_SIDE_VALUES  = frozenset({'left', 'right'})
POSITION_VALUES   = frozenset({'guard_tackle', 'center'})


def assert_required_structure(csv_path: str) -> None:
    with open(csv_path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        col_set = frozenset(c.lower() for c in (reader.fieldnames or []))

        missing = sorted(REQUIRED_COLUMNS - col_set)
        if missing:
            raise AssertionError(
                f"\n[STRUCTURE] {csv_path!r} is missing required column(s): {missing}\n"
                "Every calibration CSV must have: drill, quality, view, fault_type, line_side, position."
            )

        bad_quality    = set()
        bad_view       = set()
        bad_fault_type = set()
        bad_line_side  = set()
        bad_position   = set()
        for row in reader:
            q  = (row.get('quality')    or '').strip()
            v  = (row.get('view')       or '').strip()
            ft = (row.get('fault_type') or '').strip()
            ls = (row.get('line_side')  or '').strip()
            po = (row.get('position')   or '').strip()
            if q  not in QUALITY_VALUES:
                bad_quality.add(repr(q))
            if v  not in VIEW_VALUES:
                bad_view.add(repr(v))
            if ft not in FAULT_TYPE_VALUES:
                bad_fault_type.add(repr(ft))
            if ls not in LINE_SIDE_VALUES:
                bad_line_side.add(repr(ls))
            if po not in POSITION_VALUES:
                bad_position.add(repr(po))

    errors = []
    if bad_quality:
        errors.append(
            f"  quality: invalid value(s) {sorted(bad_quality)}"
            f" — allowed: {sorted(QUALITY_VALUES)}"
        )
    if bad_view:
        errors.append(
            f"  view: invalid value(s) {sorted(bad_view)}"
            f" — allowed: {sorted(VIEW_VALUES)}"
        )
    if bad_fault_type:
        errors.append(
            f"  fault_type: invalid value(s) {sorted(bad_fault_type)}"
            f" — allowed: {sorted(FAULT_TYPE_VALUES)}"
        )
    if bad_line_side:
        errors.append(
            f"  line_side: invalid value(s) {sorted(bad_line_side)}"
            f" — allowed: {sorted(LINE_SIDE_VALUES)}"
        )
    if bad_position:
        errors.append(
            f"  position: invalid value(s) {sorted(bad_position)}"
            f" — allowed: {sorted(POSITION_VALUES)}"
        )
    if errors:
        raise AssertionError(
            f"\n[STRUCTURE] {csv_path!r} contains invalid column values:\n"
            + "\n".join(errors)
        )
    print(f"[OK structure]  {csv_path}")
    print(f"     drill / quality / view / fault_type / line_side / position present and valid")


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: py scripts/validate_clean_csv.py <path-to-clean-csv> [...]")
        sys.exit(1)

    failed = False
    for path in sys.argv[1:]:
        try:
            assert_clean_columns(path)
        except FileNotFoundError:
            print(f"[ERROR] File not found: {path}")
            failed = True
            continue
        except AssertionError as e:
            print(e)
            failed = True

        try:
            assert_required_structure(path)
        except AssertionError as e:
            print(e)
            failed = True

        print()

    sys.exit(1 if failed else 0)
