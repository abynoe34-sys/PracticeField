"""
test_checkpoints_v2_source.py — tests for the Step-4 part (a) cleaning layer.

Runnable without a test framework (none is installed in this project):
    <venv>/python -m service.rulesets.test_checkpoints_v2_source
or from service/rulesets/:  python test_checkpoints_v2_source.py
Exits nonzero on any failure; prints a per-check summary.

Fixtures are REAL rows pulled from checkpoints_v2 (2026-09-07):
    testdata/checkpoints_v2_landmark_fixtures.json
QB rows exercise the note-pollution cleaner; OL rows are clean (cleaner must no-op).
"""

from __future__ import annotations

import json
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)

import landmark_derivations as ld
import checkpoints_v2_source as src

FIXTURES = os.path.join(_HERE, "testdata", "checkpoints_v2_landmark_fixtures.json")

_checks = []


def check(name, cond, detail=""):
    _checks.append((name, bool(cond), detail))


def _load_fixture():
    data = json.load(open(FIXTURES, encoding="utf-8"))
    rows = data["rows"]
    return [r for r in rows if r["position"] == "QB"], [r for r in rows if r["position"].startswith("OL_")]


def test_cleaner_recovers_all_qb_tokens(qb):
    """Every token surviving the cleaner on real QB rows is in the controlled vocab —
    i.e. no note debris leaks through as a bogus token, and no real token is dropped."""
    leaked = []
    for r in qb:
        tokens, _ = src.clean_pose_landmarks(r["pose_landmarks"])
        for t in tokens:
            if t not in ld.CONTROLLED_VOCAB:
                leaked.append((r["id"], t))
    check("QB: no unknown token survives cleaning", not leaked,
          f"{len(leaked)} leaked, e.g. {leaked[:3]}")


def test_polluted_rows_yield_notes(qb):
    """The 69 known-polluted QB rows (those with a '(' , ')' , '.' or lowercase-leading
    element in the raw array) must produce a captured note, not silently drop text."""
    import re
    def polluted(arr): return any(re.search(r'[().]', t) or re.match(r'^[a-z]', t) for t in (arr or []))
    polluted_rows = [r for r in qb if polluted(r["pose_landmarks"])]
    with_note = [r for r in polluted_rows if src.clean_pose_landmarks(r["pose_landmarks"])[1]]
    check("QB: polluted rows are the expected count (69)", len(polluted_rows) == 69,
          f"found {len(polluted_rows)}")
    check("QB: every polluted row yields a note", len(with_note) == len(polluted_rows),
          f"{len(with_note)}/{len(polluted_rows)} produced a note")


def test_ol_cleaner_is_noop(ol):
    """OL rows are already clean — the cleaner must return the same tokens (order-preserving),
    no note, and drop nothing. Guards against a QB-shaped cleaner corrupting good data."""
    changed, out_of_vocab = [], []
    for r in ol:
        original = [t.strip() for t in (r["pose_landmarks"] or []) if t.strip()]
        tokens, note = src.clean_pose_landmarks(r["pose_landmarks"])
        if tokens != original or note is not None:
            changed.append((r["id"], original, tokens, note))
        out_of_vocab += [t for t in tokens if t not in ld.CONTROLLED_VOCAB]
    check("OL: cleaner is a no-op on clean rows", not changed,
          f"{len(changed)} changed, e.g. {changed[:2]}")
    check("OL: all clean tokens are in vocab", not out_of_vocab,
          f"out-of-vocab: {sorted(set(out_of_vocab))[:5]}")


def test_specific_recovery_cases():
    """Explicit shapes: token+note glued, whole-field debris, multi-element shattered note."""
    t, n = src.clean_pose_landmarks(["Neck. (Head orientation measurable; gaze deferred.)"])
    check("recover 'Neck. (note)' → ['Neck'] + note", t == ["Neck"] and n and n.startswith("("), f"{t!r},{n!r}")

    t, n = src.clean_pose_landmarks(["Left Shoulder", "Neck. (Head orientation measurable; gaze deferred.)"])
    check("recover token,token.(note) → 2 tokens + note", t == ["Left Shoulder", "Neck"] and bool(n), f"{t!r},{n!r}")

    t, n = src.clean_pose_landmarks(["(Not pose-measurable — ball velocity", "and accuracy need ball tracking.)"])
    check("whole-field debris → [] + note", t == [] and bool(n), f"{t!r},{n!r}")

    t, n = src.clean_pose_landmarks(["Left Ankle", "Right Ankle", "Left Heel"])
    check("clean multi-token → unchanged, no note", t == ["Left Ankle", "Right Ankle", "Left Heel"] and n is None, f"{t!r},{n!r}")

    t, n = src.clean_pose_landmarks([])
    check("empty array → [] + None", t == [] and n is None, f"{t!r},{n!r}")


def test_idempotence(qb):
    """Re-cleaning already-cleaned tokens is stable (no progressive corruption)."""
    unstable = []
    for r in qb:
        t1, _ = src.clean_pose_landmarks(r["pose_landmarks"])
        t2, n2 = src.clean_pose_landmarks(t1)
        if t2 != t1 or n2 is not None:
            unstable.append((r["id"], t1, t2, n2))
    check("cleaner is idempotent on its own output", not unstable, f"{len(unstable)} unstable, e.g. {unstable[:2]}")


def test_derive_tier():
    cases = {"Yes": "judge", "Needs Motion": "judge", "Partial": "proxy_only", "No": "skip",
             None: None, "": None, "  ": None}
    bad = {v: src.derive_tier(v) for v, exp in cases.items() if src.derive_tier(v) != exp}
    check("derive_tier maps enum → tier (NULL/'' → None, 'No' → skip)", not bad, f"mismatches: {bad}")
    # NULL must NOT be skip — the load-bearing distinction
    check("derive_tier(None) is None, not 'skip'", src.derive_tier(None) is None)
    check("derive_tier('No') is 'skip'", src.derive_tier("No") == "skip")


def test_normalize_fails_loud_on_unknown():
    bad = {"id": -1, "position": "QB", "technique": "Drop-Back", "measurable_by_pose": "Yes",
           "pose_landmarks": ["Left Shoulder", "Nonexistent Landmark"], "static_dynamic": "Static"}
    try:
        src.normalize_row(bad)
        check("normalize_row raises on unknown token", False, "no exception raised")
    except src.UnknownLandmarkError:
        check("normalize_row raises on unknown token", True)
    # and a good row normalises with expected shape
    # realistic shape: the free-text note is always TRAILING in real Airtable/checkpoints_v2
    # data (verified: no clean vocab token ever follows a note — see test_no_clean_token_dropped)
    good = {"id": 1, "position": "QB", "formation": "Gun", "variation": "5 Step",
            "technique": "Drop-Back", "measurable_by_pose": "Yes", "static_dynamic": "Dynamic",
            "camera_angle": "Side", "thresholds_status": "Draft", "phase": None,
            "ideal_execution_standard": "Feet glide low to the ground — cleats cutting grass.",
            "pose_landmarks": ["Left Ankle", "Right Ankle. (heel vs toe per measurement.)"]}
    n = src.normalize_row(good)
    check("normalize_row: static_dynamic -> static_or_dynamic", n["static_or_dynamic"] == "Dynamic")
    check("normalize_row: tier derived (judge)", n["judge"] and not n["skip"])
    check("normalize_row: landmarks cleaned", n["pose_landmarks"] == ["Left Ankle", "Right Ankle"])
    check("normalize_row: note captured", bool(n["pose_landmarks_note"]))
    check("normalize_row: label from IES when no phase", n["label"].startswith("Feet glide"))


def test_readiness_guard():
    rows = [
        {"position": "QB", "technique": "Drop-Back", "measurable_by_pose": "Yes"},
        {"position": "QB", "technique": "Drop-Back", "measurable_by_pose": "No"},   # annotated
        {"position": "QB", "technique": "Ball Carry", "measurable_by_pose": None},  # NULL → gates
        {"position": "QB", "technique": "Ball Carry", "measurable_by_pose": "Yes"},
        {"position": "WR", "technique": "Routes", "measurable_by_pose": None},
    ]
    rd = src.technique_readiness(rows)
    check("Drop-Back ready (all annotated, incl. a 'No')", rd[("QB", "Drop-Back")]["ready"] is True)
    check("Ball Carry NOT ready (has a NULL row)", rd[("QB", "Ball Carry")]["ready"] is False)
    check("WR Routes NOT ready (all NULL)", rd[("WR", "Routes")]["ready"] is False)


def test_no_clean_token_dropped(qb, ol):
    """STRONGER no-drop guarantee on real data: any raw array element that is ITSELF a clean
    vocab token must appear in the cleaner's output. Catches a real token being swallowed into
    a note (the trailing-note assumption failing). Verified NONE on the live fixture."""
    dropped = []
    for r in qb + ol:
        raw = r["pose_landmarks"] or []
        tokens, _ = src.clean_pose_landmarks(raw)
        for el in raw:
            if el.strip() in ld.CONTROLLED_VOCAB and el.strip() not in tokens:
                dropped.append((r["id"], el.strip()))
    check("no clean vocab token is dropped by the cleaner (real data)", not dropped,
          f"{len(dropped)} dropped, e.g. {dropped[:3]}")


def test_readiness_matches_live_fixture(qb, ol):
    """Against the FULL-row fixture (incl. NULL rows), readiness must match the true live shape:
    QB ready = {Drop-Back, Pocket Movement, Stance, Throwing}; Exchange + Ball Carry NOT ready;
    no OL technique ready (all OL Stance/Blocking are partial)."""
    rd = src.technique_readiness(qb + ol)
    qb_ready = {k[1] for k, v in rd.items() if k[0] == "QB" and v["ready"]}
    check("fixture: QB ready set is exactly {Drop-Back, Pocket Movement, Stance, Throwing}",
          qb_ready == {"Drop-Back", "Pocket Movement", "Stance", "Throwing"}, f"got {sorted(qb_ready)}")
    check("fixture: QB Exchange NOT ready (36/46)", rd[("QB", "Exchange")]["ready"] is False,
          f'{rd[("QB", "Exchange")]}')
    check("fixture: QB Ball Carry NOT ready (0/5)", rd[("QB", "Ball Carry")]["ready"] is False)
    ol_ready = [k for k, v in rd.items() if k[0].startswith("OL_") and v["ready"]]
    check("fixture: no OL technique is ready (all partial)", not ol_ready, f"ready OL: {ol_ready}")


def main():
    try:  # Windows consoles default to cp1252; our detail strings use non-ASCII
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    qb, ol = _load_fixture()
    print(f"fixture: QB={len(qb)} rows, OL={len(ol)} rows")
    test_cleaner_recovers_all_qb_tokens(qb)
    test_polluted_rows_yield_notes(qb)
    test_ol_cleaner_is_noop(ol)
    test_specific_recovery_cases()
    test_idempotence(qb)
    test_no_clean_token_dropped(qb, ol)
    test_derive_tier()
    test_normalize_fails_loud_on_unknown()
    test_readiness_guard()
    test_readiness_matches_live_fixture(qb, ol)

    passed = sum(1 for _, ok, _ in _checks if ok)
    print(f"\n{passed}/{len(_checks)} checks passed\n")
    for name, ok, detail in _checks:
        print(f"  [{'PASS' if ok else 'FAIL'}] {name}" + (f"  — {detail}" if not ok and detail else ""))
    if passed != len(_checks):
        sys.exit(1)


if __name__ == "__main__":
    main()
