"""
checkpoints_v2_source.py — Step 4 part (a): the data-access + cleaning layer that
turns raw Supabase `checkpoints_v2` rows into records shaped like the ones
`layer3_resolver` already consumes.

WHY THIS EXISTS
    As of 2026-09-07 the ruleset source of truth is the Supabase `checkpoints_v2`
    table (see CLAUDE.md changelog + migration-v22), NOT the per-position JSON. But
    checkpoints_v2 is not a drop-in: its `pose_landmarks` column is comma-shattered
    and note-polluted (QB rows only — OL rows are clean), it has no checkpoint-label
    field, tier columns are gone (derive from `measurable_by_pose`), and pose
    annotation is essentially QB-only. This module isolates all of that so the
    resolver rewire (part b) stays small.

    This is part (a) — the loader + cleaner. It does NOT resolve landmarks to
    MediaPipe indices, order checklists, or gate views/phases; that is the resolver.

SCOPE / GUARANTEES
    * clean_pose_landmarks: recovers real tokens from the shattered/polluted array
      and routes free-text debris to a note. Idempotent no-op on already-clean input.
    * Fails loud (UnknownLandmarkError) on any token outside CONTROLLED_VOCAB AFTER
      cleaning — same discipline as the JSON build's validator.
    * NULL `measurable_by_pose` == not-yet-annotated (distinct from 'No', which is a
      real annotation → skip tier). technique_readiness() gates on NULL only.
"""

from __future__ import annotations

import json
import os
import re
import sys
from typing import Any

_HERE = os.path.dirname(__file__)
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)
import landmark_derivations as ld  # noqa: E402


class UnknownLandmarkError(ValueError):
    pass


# ── pose_landmarks cleaning ───────────────────────────────────────────────────────
# checkpoints_v2.pose_landmarks is the comma-split of the ORIGINAL raw Airtable field,
# which appended a free-text note as "… token. (note)" or a whole-field "(note)". The
# comma-split shattered notes-with-commas across several array elements. We rejoin the
# array with ", " to reconstruct the raw string, then apply the exact note-stripper the
# JSON build used (build_ruleset.split_landmarks), ported here so this module has no
# dependency on the deprecated build script.
_NOTE_RE = re.compile(r"\.\s*\(")


def _split_raw(raw: str | None) -> tuple[list[str], str | None]:
    """(tokens, note). Strip a trailing '. (note)' or whole-field leading '(note)'
    before comma-tokenising. Verbatim port of build_ruleset.split_landmarks."""
    if raw is None:
        return [], None
    s = raw.strip()
    if s.startswith("("):
        return [], s
    m = _NOTE_RE.search(s)
    if m:
        body, note = s[: m.start()].strip(), s[m.end() - 1:].strip()
    else:
        body, note = s, None
    return [t.strip() for t in body.split(",") if t.strip()], note


def clean_pose_landmarks(arr: list[str] | None) -> tuple[list[str], str | None]:
    """Clean checkpoints_v2's shattered/polluted pose_landmarks array.

    Returns (tokens, note). `tokens` are trimmed, in original order, note-free.
    `note` is the recovered free-text (or None). No-op on already-clean input.
    """
    if not arr:
        return [], None
    raw = ", ".join(a for a in arr if a is not None)
    return _split_raw(raw)


# ── tier derivation (the JSON build's judge/proxy_only/skip, from the enum) ────────
def derive_tier(measurable_by_pose: str | None) -> str | None:
    """'judge' | 'proxy_only' | 'skip', or None when unannotated (NULL).

    NULL is NOT 'skip' — it means the row has not been pose-annotated yet. 'No' IS a
    real annotation (a coach-visible, camera-blind checkpoint) → 'skip'.
    """
    mbp = (measurable_by_pose or "").strip()
    if not mbp:
        return None
    if mbp in ("Yes", "Needs Motion"):
        return "judge"
    if mbp == "Partial":
        return "proxy_only"
    if mbp == "No":
        return "skip"
    raise ValueError(f"unexpected measurable_by_pose value: {measurable_by_pose!r}")


# ── checkpoint-label synthesis (no name/final_checkpoint field exists) ─────────────
# Decision (2026-09-07): phase where present; else a short human-readable clause from
# the IES leading text. Row id is an internal identifier, never the display label.
_CLAUSE_SPLIT = re.compile(r"\s*[—–\-:;.]\s+")


def synthesize_label(row: dict[str, Any], max_len: int = 60) -> str:
    phase = (row.get("phase") or "").strip()
    if phase:
        return phase
    ies = (row.get("ideal_execution_standard") or "").strip()
    if ies:
        clause = _CLAUSE_SPLIT.split(ies, maxsplit=1)[0].strip()
        if len(clause) > max_len:
            clause = clause[:max_len].rsplit(" ", 1)[0] + "…"
        if clause:
            return clause
    # last-resort internal identifier — should be unreachable for annotated rows
    return f"{row.get('technique') or '?'} #{row.get('id')}"


# ── row normalisation → resolver-shaped record ────────────────────────────────────
def normalize_row(v2: dict[str, Any]) -> dict[str, Any]:
    """Map one raw checkpoints_v2 row to the dict shape layer3_resolver consumes.

    Fails loud on any landmark token outside CONTROLLED_VOCAB after cleaning.
    """
    tokens, note = clean_pose_landmarks(v2.get("pose_landmarks"))
    unknown = [t for t in tokens if t not in ld.CONTROLLED_VOCAB]
    if unknown:
        raise UnknownLandmarkError(
            f"unknown landmark token(s) {unknown} on checkpoints_v2 id={v2.get('id')} "
            f"(after cleaning from {v2.get('pose_landmarks')!r})")
    mbp = v2.get("measurable_by_pose")
    tier = derive_tier(mbp)
    label = synthesize_label(v2)
    formation = v2.get("formation")
    return {
        "id": v2.get("id"),
        "position": v2.get("position"),
        "group_name": v2.get("group_name"),
        "formation": formation,
        "variation": v2.get("variation"),
        "technique": v2.get("technique"),
        "label": label,
        # synthesised composite for display/back-compat; the resolver (part b) should
        # prefer `label`/structured fields over parsing this.
        "name": " - ".join(str(x) for x in
                            [v2.get("position"), formation, v2.get("variation"), label]
                            if x not in (None, "")),
        "phase": (v2.get("phase") or None),
        "phase_order": v2.get("phase_order"),
        "camera_angle": v2.get("camera_angle"),
        "static_or_dynamic": v2.get("static_dynamic"),   # column renamed in v2
        "thresholds_status": v2.get("thresholds_status"),
        "ideal_execution_standard": v2.get("ideal_execution_standard"),
        "fault_trigger": v2.get("fault_trigger"),
        "measurable_signal": v2.get("measurable_signal"),
        "coaching_cue": (v2.get("coaching_cue") or None),
        "correction_strategy": (v2.get("correction_strategy") or None),
        "check_type": (v2.get("check_type") or None),
        "threshold_parameters": (v2.get("threshold_parameters") or None),
        "measurable_by_pose": mbp,
        "pose_landmarks": tokens,
        "pose_landmarks_note": note,
        "judge": tier == "judge",
        "proxy_only": tier == "proxy_only",
        "skip": tier == "skip",
        "annotated": tier is not None,
    }


# ── per-(position, technique) readiness guard ──────────────────────────────────────
def technique_readiness(rows: list[dict[str, Any]]) -> dict[tuple[str, str], dict[str, Any]]:
    """Map (position, technique) → {total, annotated, ready}. `ready` is True only when
    EVERY row of that technique is annotated (non-NULL measurable_by_pose). A technique
    with any NULL row is 'not yet migrated' and must not be resolved into a thin checklist.
    Keyed on NULL, never on tier ('No' rows are annotated and count as ready)."""
    agg: dict[tuple[str, str], dict[str, int]] = {}
    for r in rows:
        key = (r.get("position"), r.get("technique"))
        a = agg.setdefault(key, {"total": 0, "annotated": 0})
        a["total"] += 1
        if (r.get("measurable_by_pose") or "").strip():
            a["annotated"] += 1
    return {k: {"total": v["total"], "annotated": v["annotated"],
                "ready": v["annotated"] == v["total"] and v["total"] > 0}
            for k, v in agg.items()}


# ── loading ────────────────────────────────────────────────────────────────────────
_SNAPSHOT = os.path.join(_HERE, "testdata", "checkpoints_v2_snapshot.json")


def _rows_from_supabase(position: str | None) -> list[dict[str, Any]]:
    """Read raw rows from Supabase. Lazy import so offline dev without supabase-py still
    imports this module (and uses the snapshot fallback)."""
    from supabase import create_client  # type: ignore
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    client = create_client(url, key)
    q = client.table("checkpoints_v2").select("*")
    if position:
        q = q.eq("position", position)
    return q.execute().data or []


def load_raw(position: str | None = None, *, prefer_snapshot: bool = False) -> list[dict[str, Any]]:
    """Raw checkpoints_v2 rows. Tries Supabase; falls back to a local snapshot file when
    the DB/creds/library are unavailable (preserves the offline-iteration workflow)."""
    if not prefer_snapshot:
        try:
            return _rows_from_supabase(position)
        except Exception:
            pass
    if os.path.exists(_SNAPSHOT):
        rows = json.load(open(_SNAPSHOT, encoding="utf-8")).get("rows", [])
        return [r for r in rows if position is None or r.get("position") == position]
    raise RuntimeError("checkpoints_v2 unavailable: no DB connection and no local snapshot")


def load_normalized(position: str | None = None, *, prefer_snapshot: bool = False) -> list[dict[str, Any]]:
    """Normalised, resolver-shaped records. Fails loud on unknown landmark tokens."""
    return [normalize_row(r) for r in load_raw(position, prefer_snapshot=prefer_snapshot)]
