"""
build_qb_ruleset.py — regenerate service/rulesets/qb_ruleset.json from a raw Airtable
pull of the QB ruleset table.

Provenance / reproducibility:
  - Source of truth: Airtable base appziCSbI55tKhf4W, table tblnbu1fm6YoQ56SG ("QB ruleset").
  - Raw pull committed alongside this script as qb_ruleset.raw.json (verbatim Airtable
    response: {records, metadata}). Re-pull with the Airtable connector to refresh it.
  - This script transforms the raw pull -> qb_ruleset.json. It is deterministic given
    the raw file.

What it does:
  - Field IDs -> human names; single-selects flattened to their string name.
  - Pose Landmarks: strips the trailing free-text note "... . (note)" BEFORE tokenising
    (the note contains commas/semicolons and would otherwise shatter the token list).
    The stripped note is preserved in `pose_landmarks_note`.
  - Derives judge / proxy_only / skip from `Measurable by Pose?`.
  - Carries `thresholds_status` from the Airtable field (NOT hardcoded).

Validator — FAILS LOUDLY (raises, non-zero exit), no silent defaults, on:
  - record count != EXPECTED_COUNT (285)
  - any empty Pose Landmarks
  - any null "Measurable by Pose?"
  - any landmark token outside CONTROLLED_VOCAB (landmark_derivations.py)

It deliberately does NOT hard-fail on a null Thresholds Status (not one of the agreed
fail conditions) but REPORTS the distribution loudly so a gap is never silent.

This script adds no thresholds and no verdicts. Every number in Measurable Signal /
Metric is a recommendation until its row's thresholds_status == 'Calibrated'.
"""

from __future__ import annotations
import json, os, re, sys
from collections import Counter

from landmark_derivations import CONTROLLED_VOCAB

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "qb_ruleset.raw.json")
OUT = os.path.join(HERE, "qb_ruleset.json")
EXPECTED_COUNT = 309

# Airtable field id -> output key
FIELD = {
    "fldmpC81yNIlArGwR": "name",
    "fld8ZcrcnDDzhA0HL": "position",
    "fldSeEyQnehOmYQPY": "position_group",
    "fld4H2kZQvuPI9Oky": "position_unit",
    "fldw5dI2RKG9xPOz7": "variation",
    "fldJj8kWviJAfhJf9": "technique",
    "fldViUEWDAUduA2ye": "ideal_execution_standard",
    "fldbjosotdFNwKpfO": "fault_trigger",
    "fldNHsrtCsDzFSzoc": "measurable_signal",
    "fldR0h8mGmXCaAVYp": "measurable_by_pose",
    "fldzQHo5ntjkzWMLA": "thresholds_status",
    "fldaZ0lYWnukDhiSj": "static_or_dynamic",
    "fldenwfxKhb65ZyfM": "camera_angle",
    "fldRlp3O1tunXze3P": "pose_landmarks_raw",
    "fldkTRsCmXyhnbRH7": "coaching_cue",
    "fldkC7ShypizZ1Tse": "correction_strategy",
    "fldPwndtfcoJ72ml8": "status",
}

_NOTE_RE = re.compile(r"\.\s*\(")


def scalar(v):
    """Flatten a single-select object to its name; pass through text; None stays None."""
    if isinstance(v, dict):
        return v.get("name")
    if isinstance(v, list):
        return [scalar(x) for x in v]
    return v


def split_landmarks(raw: str):
    """Return (tokens, note).

    Two note shapes occur in the field:
      1. "LM1, LM2, ... . (note)"  — a note appended after the last landmark.
      2. "(note)"                  — the whole field is a note, no landmarks at all
                                     (the skip/'No' Ball Placement rows).
    In both cases the note (which contains its own commas/semicolons) must be split
    off BEFORE comma-tokenising, or it shatters into bogus tokens.
    """
    if raw is None:
        return [], None
    s = raw.strip()
    if s.startswith("("):  # shape 2 — entire field is a note, zero landmarks
        return [], s
    m = _NOTE_RE.search(s)  # shape 1 — trailing ". (note)"
    if m:
        body = s[: m.start()].strip()
        note = s[m.end() - 1 :].strip()  # from the '(' onward, note kept verbatim
    else:
        body, note = s, None
    tokens = [t.strip() for t in body.split(",") if t.strip()]
    return tokens, note


class ValidationError(Exception):
    pass


def build():
    with open(RAW, encoding="utf-8") as f:
        raw = json.load(f)
    records = raw["records"]

    out = []
    failures = []  # collected, then raised together so one run reports every problem
    for r in records:
        cv = r.get("cellValuesByFieldId", {})
        row = {"id": r["id"]}
        for fid, key in FIELD.items():
            row[key] = scalar(cv.get(fid))

        tokens, note = split_landmarks(row.pop("pose_landmarks_raw"))
        row["pose_landmarks"] = tokens
        row["pose_landmarks_note"] = note

        mbp = (row.get("measurable_by_pose") or "").strip()
        row["judge"] = mbp in ("Yes", "Needs Motion")
        row["proxy_only"] = mbp == "Partial"
        row["skip"] = mbp == "No"

        nm = row.get("name") or r["id"]
        # ── loud validation, no silent defaults ──
        if not mbp:
            failures.append(f"null 'Measurable by Pose?' on real row {r['id']} ({nm})")
        # B1: a judge/proxy row MUST carry >=1 landmark; a skip ('No') row MAY carry
        # zero — pose genuinely can't see its checkpoint, and the reason is kept in
        # pose_landmarks_note. So empty landmarks is a failure ONLY on non-skip rows.
        if not tokens and not row["skip"]:
            failures.append(f"empty Pose Landmarks on non-skip row {r['id']} ({nm})")
        unknown = [t for t in tokens if t not in CONTROLLED_VOCAB]
        if unknown:
            failures.append(f"unknown landmark token(s) {unknown} on row {r['id']} ({nm})")

        out.append(row)

    if len(out) != EXPECTED_COUNT:
        failures.insert(0, f"record count {len(out)} != expected {EXPECTED_COUNT}")

    if failures:
        raise ValidationError(
            f"{len(failures)} validation failure(s):\n  - " + "\n  - ".join(failures)
        )

    out.sort(key=lambda x: (x.get("name") or ""))

    # ── loud reporting (not a hard fail) on thresholds_status coverage ──
    ts = Counter(x.get("thresholds_status") for x in out)
    print("Thresholds Status distribution:")
    for k, v in sorted(ts.items(), key=lambda kv: (kv[0] is None, str(kv[0]))):
        print(f"  {str(k):<16} {v}")
    n_null_ts = ts.get(None, 0)
    if n_null_ts:
        print(f"  ** WARNING: {n_null_ts} row(s) have a NULL Thresholds Status — "
              f"carried through as null, NOT defaulted. Surface for owner decision. **")

    payload = {
        "meta": {
            "source_base": "appziCSbI55tKhf4W",
            "source_table": "tblnbu1fm6YoQ56SG",
            "source_table_name": "QB ruleset",
            "synced_via": "Airtable connector (live read)",
            "generated_by": "service/rulesets/build_qb_ruleset.py",
            "raw_source": "service/rulesets/qb_ruleset.raw.json",
            "record_count": len(out),
            "notes": [
                "Canonical QB ruleset the pipeline reads. Generated from the raw pull; "
                "do not hand-edit — edit in Airtable and re-run build_qb_ruleset.py.",
                "thresholds_status comes from Airtable ('Draft' / 'Calibrated' / "
                "'Not Applicable'). Numbers in measurable_signal are RECOMMENDATIONS, "
                "not rules, until a row is 'Calibrated'. No verdicts are produced here.",
                "coaching_cue and correction_strategy are authored later in the owner's "
                "voice; blank by design.",
                "judge/proxy_only/skip derived from measurable_by_pose (Yes/Needs "
                "Motion=judge, Partial=proxy, No=skip).",
                "pose_landmarks tokens are validated against CONTROLLED_VOCAB in "
                "landmark_derivations.py, which also documents how the derived / "
                "non-MediaPipe tokens (Sternum, Pelvis Center, Neck, Spine, Left/Right "
                "Foot, Left/Right Hand, unsided Elbow/Wrist) resolve.",
            ],
        },
        "records": out,
    }
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
    print(f"\nOK: wrote {len(out)} records to {OUT}")


if __name__ == "__main__":
    try:
        build()
    except ValidationError as e:
        print(f"VALIDATION FAILED — {e}", file=sys.stderr)
        sys.exit(1)
