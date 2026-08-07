"""
landmark_derivations.py — the controlled landmark vocabulary for the QB ruleset,
and the token -> derivation-rule mapping for the tokens that are NOT raw MediaPipe
landmarks.

This module is the single source of truth the (future) Layer-3 resolver imports.
It deliberately contains NO thresholds, NO verdicts, and NO resolver logic — only:
  1. CONTROLLED_VOCAB — the exact set of landmark tokens allowed in the catalogue.
     The ingestion validator (build_qb_ruleset.py) fails loudly on any token outside
     this set, so the vocabulary can only change here, on purpose.
  2. DERIVATIONS — for every token that is not a real MediaPipe pose landmark, how it
     is derived from ones that are. A derived token is still valid vocabulary; it just
     can't be read straight off the landmarker.

MediaPipe Pose exposes 33 landmarks. The catalogue uses friendly names; most map 1:1
to a real landmark, but several are (a) geometric constructions, (b) aliases for a
nearby real landmark, or (c) handedness-resolved. Those are enumerated below so the
resolver never has to guess.

Reference — the real MediaPipe Pose landmarks this catalogue draws on (friendly name
-> MediaPipe index):
    Nose(0),
    Left Eye(2), Right Eye(5), Left Ear(7), Right Ear(8),
    Left Shoulder(11), Right Shoulder(12),
    Left Elbow(13), Right Elbow(14), Left Wrist(15), Right Wrist(16),
    Left Thumb(21), Right Thumb(22), Left Index Finger(19), Right Index Finger(20),
    Left Hip(23), Right Hip(24), Left Knee(25), Right Knee(26),
    Left Ankle(27), Right Ankle(28), Left Heel(29), Right Heel(30),
    Left Foot Index(31), Right Foot Index(32)
"""

from __future__ import annotations

# ── Real MediaPipe landmarks the catalogue references, friendly name -> index ──
MEDIAPIPE_INDEX = {
    "Nose": 0,
    "Left Eye": 2, "Right Eye": 5, "Left Ear": 7, "Right Ear": 8,
    "Left Shoulder": 11, "Right Shoulder": 12,
    "Left Elbow": 13, "Right Elbow": 14, "Left Wrist": 15, "Right Wrist": 16,
    "Left Index Finger": 19, "Right Index Finger": 20,
    "Left Thumb": 21, "Right Thumb": 22,
    "Left Hip": 23, "Right Hip": 24, "Left Knee": 25, "Right Knee": 26,
    "Left Ankle": 27, "Right Ankle": 28, "Left Heel": 29, "Right Heel": 30,
    "Left Foot Index": 31, "Right Foot Index": 32,
}

# ── Derived / non-MediaPipe tokens: how each resolves ──────────────────────────
# kind:
#   "geometric"   — computed from real landmarks (midpoint / line).
#   "alias"       — a friendly name for a nearby real landmark (not its own landmark).
#   "handedness"  — resolves to a Left/Right real landmark using the player's throwing
#                   hand, which is supplied to the resolver as an INPUT (captured in the
#                   app), never inferred from the clip.
#   "external"    — not derivable from pose at all (needs a different model / tracker).
DERIVATIONS = {
    # Geometric constructions
    "Sternum": {
        "kind": "geometric",
        "from": ["Left Shoulder", "Right Shoulder"],
        "rule": "midpoint of Left Shoulder and Right Shoulder",
    },
    "Neck": {
        "kind": "geometric",
        "from": ["Left Shoulder", "Right Shoulder"],
        "rule": "midpoint of Left Shoulder and Right Shoulder (same construction as "
                "Sternum; the catalogue uses 'Neck' where the reference point is the "
                "head/neck junction — treat as shoulder-midpoint until a dedicated "
                "cervical estimate exists)",
    },
    "Pelvis Center": {
        "kind": "geometric",
        "from": ["Left Hip", "Right Hip"],
        "rule": "midpoint of Left Hip and Right Hip",
    },
    "Spine": {
        "kind": "geometric",
        "from": ["Left Shoulder", "Right Shoulder", "Left Hip", "Right Hip"],
        "rule": "line/segment from the shoulder-midpoint to the hip-midpoint (used for "
                "torso/spine angle)",
    },

    # Aliases — friendly names for a nearby real landmark
    "Left Hand": {
        "kind": "alias",
        "from": ["Left Wrist"],
        "rule": "maps to Left Wrist (MediaPipe Pose has no 'hand' point; wrist is the "
                "distal arm landmark). Finger-level detail would need the Hand landmarker.",
    },
    "Right Hand": {
        "kind": "alias",
        "from": ["Right Wrist"],
        "rule": "maps to Right Wrist (see Left Hand).",
    },
    "Left Foot": {
        "kind": "alias",
        "from": ["Left Heel", "Left Foot Index"],
        "rule": "NOT a MediaPipe landmark. Resolve per measurement type: use Left Foot "
                "Index for stance width / toe direction / forward reach; use Left Heel "
                "for ground contact / plant / weight-back. AMBIGUOUS by default — the "
                "resolver must pick per measurement, not assume one.",
        "ambiguous": True,
    },
    "Right Foot": {
        "kind": "alias",
        "from": ["Right Heel", "Right Foot Index"],
        "rule": "NOT a MediaPipe landmark. Resolve per measurement type (see Left Foot).",
        "ambiguous": True,
    },

    # Handedness-resolved — throwing arm; handedness is a resolver INPUT
    "Elbow": {
        "kind": "handedness",
        "from": ["Left Elbow", "Right Elbow"],
        "rule": "the THROWING elbow. Resolve to Left Elbow or Right Elbow from the "
                "player's throwing hand (captured in the app; supplied to the resolver, "
                "never guessed from the clip).",
    },
    "Wrist": {
        "kind": "handedness",
        "from": ["Left Wrist", "Right Wrist"],
        "rule": "the THROWING wrist. Resolve via handedness input (see Elbow).",
    },

    # External — not pose-derivable
    "Ball Position": {
        "kind": "external",
        "from": [],
        "rule": "the football. NOT derivable from pose landmarks — needs ball tracking. "
                "Rows relying on it are proxy_only/skip on the honesty gate.",
    },
}

# ── The scale unit for size-independent (front-view) measurements ──────────────
SCALE_UNIT = {
    "name": "shoulder_width",
    "rule": "Euclidean distance between Left Shoulder and Right Shoulder. Used to "
            "normalise size-independent measurements (e.g. base width as a multiple of "
            "shoulder width). FRONT VIEW ONLY — foreshortened and unreliable from the "
            "side.",
}

# ── The complete controlled vocabulary ────────────────────────────────────────
# Every landmark token that may appear in the catalogue. The ingestion validator
# fails loudly on anything outside this set. Real landmarks + every derived token.
CONTROLLED_VOCAB = frozenset(set(MEDIAPIPE_INDEX) | set(DERIVATIONS))


def is_derived(token: str) -> bool:
    """True if the token is not a raw MediaPipe landmark (needs DERIVATIONS to resolve)."""
    return token in DERIVATIONS


def classify(token: str) -> str:
    """Return 'mediapipe' | derivation-kind | 'unknown' for a landmark token."""
    if token in DERIVATIONS:
        return DERIVATIONS[token]["kind"]
    if token in MEDIAPIPE_INDEX:
        return "mediapipe"
    return "unknown"
