"""
build_ruleset.py — regenerate the canonical position ruleset JSONs from raw Airtable pulls.

Position-agnostic successor to build_qb_ruleset.py: one builder, one config per position
table, so QB, WR, and the future position tables (DB/OL/…) all generate the same way and
the pipeline reads them the same way.

Source of truth: Airtable base appziCSbI55tKhf4W (per-position tables). Raw pulls are
committed alongside (`<pos>_ruleset.raw.json`, verbatim {records, metadata}); this script
transforms them into `<pos>_ruleset.json`. Deterministic given the raw files — do NOT
hand-edit the JSON; edit in Airtable and re-run.

What it does per row:
  - Airtable field IDs → human keys (per-position FIELDS map below).
  - single-selects flattened to their string name; numbers passed through.
  - Pose Landmarks: strips the trailing/leading free-text note ("… . (note)" / "(note)")
    BEFORE tokenising (the note carries its own commas/semicolons), preserving it in
    `pose_landmarks_note`.
  - derives judge / proxy_only / skip from `Measurable by Pose?`.
  - carries `thresholds_status` from Airtable (never hardcoded).
  - carries `phase` / `phase_order` where the table has them (WR): the phase a measurement
    belongs to and its position in the required sequence — the ORDER IS ITSELF COACHED.

Validator — FAILS LOUDLY (no silent defaults) on: record count != the pull's own
metadata.totalRecordCount, null `Measurable by Pose?`, null `Thresholds Status`, an unknown
landmark token, or empty `Pose Landmarks` on a non-skip row (a skip/`No` row may carry zero
— its checkpoint genuinely isn't pose-visible; the reason lives in `pose_landmarks_note`).

Adds no thresholds and no verdicts: every number in Measurable Signal is a recommendation
until a row's thresholds_status is 'Calibrated'.
"""

from __future__ import annotations
import json, os, re, sys
from collections import Counter

from landmark_derivations import CONTROLLED_VOCAB

HERE = os.path.dirname(os.path.abspath(__file__))
_NOTE_RE = re.compile(r"\.\s*\(")

# ── per-position configuration ────────────────────────────────────────────────
# fields: Airtable field id -> output key. `pose_landmarks_raw` is split into
# pose_landmarks + pose_landmarks_note. Only keys a table actually has are listed.
POSITIONS = {
    "QB": {
        "table": "tblnbu1fm6YoQ56SG", "raw": "qb_ruleset.raw.json", "out": "qb_ruleset.json",
        "fields": {
            "fldmpC81yNIlArGwR": "name", "fld8ZcrcnDDzhA0HL": "position",
            "fldSeEyQnehOmYQPY": "position_group", "fld4H2kZQvuPI9Oky": "position_unit",
            "fldw5dI2RKG9xPOz7": "variation", "fldJj8kWviJAfhJf9": "technique",
            "fldViUEWDAUduA2ye": "ideal_execution_standard", "fldbjosotdFNwKpfO": "fault_trigger",
            "fldNHsrtCsDzFSzoc": "measurable_signal", "fldR0h8mGmXCaAVYp": "measurable_by_pose",
            "fldzQHo5ntjkzWMLA": "thresholds_status", "fldaZ0lYWnukDhiSj": "static_or_dynamic",
            "fldenwfxKhb65ZyfM": "camera_angle", "fldRlp3O1tunXze3P": "pose_landmarks_raw",
            "fldkTRsCmXyhnbRH7": "coaching_cue", "fldkC7ShypizZ1Tse": "correction_strategy",
            "fldPwndtfcoJ72ml8": "status",
        },
    },
    "WR": {
        "table": "tblUjygfinPpQbtXL", "raw": "wr_ruleset.raw.json", "out": "wr_ruleset.json",
        "fields": {
            "fldCHVDdJCO7Jl2Td": "name", "fldRtfAvAnzders7Q": "position",
            "fldC7IZwklzjyfvys": "variation", "fldYZ7F96YI8CV30T": "technique",
            "fldz07Q1ktIOzmpqY": "phase", "fldvAE9ZTJLXU7DpY": "phase_order",
            "fldP92I0CdHLKpj7d": "ideal_execution_standard", "fldbS3BRiNwYEP3pG": "fault_trigger",
            "fld9xx1Oppv32GP5d": "measurable_signal", "fldvVkMtHQf2QfHYs": "measurable_by_pose",
            "fld05lZfIzIJSCsCw": "thresholds_status", "fldKhcwpYopXn4L2S": "static_or_dynamic",
            "fldFG3gyvz2YWve5Q": "camera_angle", "fldW2zGQGNOjFxg4l": "pose_landmarks_raw",
            "fldMVEbUCKt7CF8LT": "coaching_cue", "fldHhUmLBJwflxWvY": "correction_strategy",
            "fldPbYWafBVOQWy8t": "status",
        },
    },
}


class ValidationError(Exception):
    pass


def scalar(v):
    if isinstance(v, dict):
        return v.get("name")          # single select
    if isinstance(v, list):
        return [scalar(x) for x in v]
    return v                           # text / number / None


def split_landmarks(raw):
    """(tokens, note). Strip a trailing '. (note)' or a whole-field leading '(note)'
    before comma-tokenising — the note carries its own commas/semicolons."""
    if raw is None:
        return [], None
    s = raw.strip()
    if s.startswith("("):
        return [], s
    m = _NOTE_RE.search(s)
    if m:
        body, note = s[: m.start()].strip(), s[m.end() - 1 :].strip()
    else:
        body, note = s, None
    return [t.strip() for t in body.split(",") if t.strip()], note


def build(position: str) -> dict:
    cfg = POSITIONS[position]
    with open(os.path.join(HERE, cfg["raw"]), encoding="utf-8") as f:
        raw = json.load(f)
    records = raw["records"]
    expected = raw.get("metadata", {}).get("totalRecordCount", len(records))

    out, failures = [], []
    for r in records:
        cv = r.get("cellValuesByFieldId", {})
        row = {"id": r["id"]}
        for fid, key in cfg["fields"].items():
            row[key] = scalar(cv.get(fid))

        tokens, note = split_landmarks(row.pop("pose_landmarks_raw", None))
        row["pose_landmarks"], row["pose_landmarks_note"] = tokens, note

        mbp = (row.get("measurable_by_pose") or "").strip()
        row["judge"] = mbp in ("Yes", "Needs Motion")
        row["proxy_only"] = mbp == "Partial"
        row["skip"] = mbp == "No"

        nm = row.get("name") or r["id"]
        if not mbp:
            failures.append(f"null 'Measurable by Pose?' on {r['id']} ({nm})")
        if not (row.get("thresholds_status") or "").strip():
            failures.append(f"null 'Thresholds Status' on {r['id']} ({nm})")
        if not tokens and not row["skip"]:
            failures.append(f"empty Pose Landmarks on non-skip row {r['id']} ({nm})")
        unknown = [t for t in tokens if t not in CONTROLLED_VOCAB]
        if unknown:
            failures.append(f"unknown landmark token(s) {unknown} on {r['id']} ({nm})")
        out.append(row)

    if len(out) != expected:
        failures.insert(0, f"record count {len(out)} != pull metadata {expected}")
    if failures:
        raise ValidationError(f"{position}: {len(failures)} failure(s):\n  - " + "\n  - ".join(failures))

    out.sort(key=lambda x: (x.get("name") or ""))
    _report(position, out)

    payload = {
        "meta": {
            "position": position, "source_base": "appziCSbI55tKhf4W", "source_table": cfg["table"],
            "generated_by": "service/rulesets/build_ruleset.py", "raw_source": cfg["raw"],
            "record_count": len(out),
            "notes": [
                "Canonical ruleset the pipeline reads. Generated from the raw pull; do not "
                "hand-edit — edit in Airtable and re-run build_ruleset.py.",
                "thresholds_status from Airtable (Draft/Calibrated/Not Applicable). Numbers in "
                "measurable_signal are RECOMMENDATIONS, not rules, until a row is Calibrated. "
                "No verdicts are produced here.",
                "judge/proxy_only/skip derived from measurable_by_pose. pose_landmarks tokens "
                "validated against CONTROLLED_VOCAB (landmark_derivations.py).",
                "phase / phase_order (where present) name the phase a measurement belongs to and "
                "its position in the required sequence — the order is itself coached.",
            ],
        },
        "records": out,
    }
    with open(os.path.join(HERE, cfg["out"]), "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
    print(f"OK: wrote {len(out)} records to {cfg['out']}\n")
    return payload


def _report(position, out):
    ts = Counter(x.get("thresholds_status") for x in out)
    tiers = Counter("judge" if x["judge"] else "proxy_only" if x["proxy_only"] else "skip" for x in out)
    phased = sum(1 for x in out if x.get("phase"))
    print(f"[{position}] {len(out)} rows | tiers {dict(tiers)} | thresholds {dict(ts)}"
          + (f" | phase-structured {phased}" if any('phase' in x for x in out) else ""))


if __name__ == "__main__":
    try:
        targets = sys.argv[1:] or list(POSITIONS)
        for pos in targets:
            build(pos)
    except ValidationError as e:
        print(f"VALIDATION FAILED — {e}", file=sys.stderr)
        sys.exit(1)
