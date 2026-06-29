"""
Validate a manually-curated *_clean.csv before it enters the calibration dataset.

Usage:
    py scripts/validate_clean_csv.py scripts/m1_results_good_clean.csv

Fails with a non-zero exit code and a clear error if the file contains any
column name that could trace a measurement back to source footage or a
real-world identity. Pass on a clean file, fail loudly on a dirty one.

Run this immediately after creating or editing any *_clean.csv — it is the
counterpart to the assert_clean_columns check that runs automatically inside
m1_measure_stills.py on the raw output file.
"""

import sys
import csv

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
    print(f"[OK] {csv_path}")
    print(f"     Columns: {cols}")


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
        except AssertionError as e:
            print(e)
            failed = True

    sys.exit(1 if failed else 0)
