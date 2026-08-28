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
    # NOTE: Left/Right Thumb and Left/Right Index Finger were REPOINTED to the Hand
    # landmarker (2026-08-28, owner decision 1) — they are no longer resolved from the
    # low-fidelity pose thumb/index points (pose idx 19–22). They now live in HANDS_INDEX
    # below and a checkpoint using them REQUIRES Hands to have run. See REPOINTED_FROM_POSE.
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

# ══════════════════════════════════════════════════════════════════════════════
# HAND LANDMARKER vocabulary (2026-08-28) — a SECOND detector (service/dynamic/
# hands_spine.py), 21 landmarks per hand. Added after verifying the geometry below
# against real Hands output on the two hand-shape clips (clip 1: catch shapes;
# clip 2: palm orientations). A checkpoint that uses any of these tokens REQUIRES
# Hands to have run — Layer 3 emits that requirement and marks the checkpoint
# not-assessable when Hands is skipped or fails.
# ══════════════════════════════════════════════════════════════════════════════

# MediaPipe Hands 21-landmark indices (per hand)
HAND_WRIST = 0
HAND_TIP = {"Thumb": 4, "Index Finger": 8, "Middle Finger": 12, "Ring Finger": 16, "Pinky": 20}
HAND_MCP = {"Index Finger": 5, "Middle Finger": 9, "Ring Finger": 13, "Pinky": 17}

# Sided fingertip tokens → (anatomical side, Hands landmark index). Thumb/Index are the
# two REPOINTED tokens (were pose idx 19–22); Pinky/Middle/Ring are new (owner decision 2).
HANDS_INDEX = {
    f"{side} {name}": (side.lower(), idx)
    for side in ("Left", "Right")
    for name, idx in HAND_TIP.items()
}

# Tokens that were resolved from pose before 2026-08-28 and are now Hands-sourced.
REPOINTED_FROM_POSE = frozenset({
    "Left Thumb", "Right Thumb", "Left Index Finger", "Right Index Finger",
})

# Hands-derived geometric tokens (owner decision 2). Palm = centroid of the four finger
# MCP joints; Palm Normal = the vector the palm faces (chirality-consistent — see
# palm_normal() below). Both need Hands.
HANDS_DERIVED = {
    f"{side} Palm": {
        "kind": "hands_geometric",
        "from": [f"{side} Index Finger MCP", f"{side} Middle Finger MCP",
                 f"{side} Ring Finger MCP", f"{side} Pinky MCP"],
        "rule": "centroid of the index/middle/ring/pinky MCP joints (Hands idx 5,9,13,17) "
                "of the {s} hand — the palm centre.".format(s=side.lower()),
    } for side in ("Left", "Right")
}
HANDS_DERIVED.update({
    f"{side} Palm Normal": {
        "kind": "hands_geometric",
        "from": [f"{side} Palm", f"{side} Wrist (hand)"],
        "rule": "unit vector the {s} palm faces: cross((index_MCP - wrist),(pinky_MCP - "
                "wrist)) computed on WORLD landmarks, sign-flipped for the left hand so both "
                "hands' normals point OUT of the palm (chirality-consistent — verified L/R "
                "agree on clip 2's palm-up/forward/out holds).".format(s=side.lower()),
    } for side in ("Left", "Right")
})

# The complete Hands vocabulary that may appear in the catalogue.
HANDS_VOCAB = frozenset(set(HANDS_INDEX) | set(HANDS_DERIVED))

# ── The complete controlled vocabulary ────────────────────────────────────────
# Every landmark token that may appear in the catalogue. The ingestion validator
# fails loudly on anything outside this set. Real pose landmarks + pose-derived
# tokens + Hands landmarks + Hands-derived tokens.
CONTROLLED_VOCAB = frozenset(set(MEDIAPIPE_INDEX) | set(DERIVATIONS) | HANDS_VOCAB)


def is_derived(token: str) -> bool:
    """True if the token is not a raw MediaPipe pose landmark (needs resolution)."""
    return token in DERIVATIONS or token in HANDS_DERIVED


def requires_hands(token: str) -> bool:
    """True if resolving this token needs the Hand landmarker to have run."""
    return token in HANDS_INDEX or token in HANDS_DERIVED


def classify(token: str) -> str:
    """Return 'mediapipe' | 'hands' | 'hands_geometric' | pose-derivation-kind | 'unknown'."""
    if token in HANDS_INDEX:
        return "hands"
    if token in HANDS_DERIVED:
        return "hands_geometric"
    if token in DERIVATIONS:
        return DERIVATIONS[token]["kind"]
    if token in MEDIAPIPE_INDEX:
        return "mediapipe"
    return "unknown"


# ══════════════════════════════════════════════════════════════════════════════
# Derived-quantity functions (owner decision 2) — VERIFIED against real Hands output
# on the two clips (2026-08-28). WORLD landmarks only for anything angle-sensitive
# (the Layer 2 lesson: image-space is camera-angle dependent; world is metric and
# view-independent). Each hand is a list of 21 {x,y,z} dicts (world_landmarks).
#
# NOTE / OPEN ITEM: the coaching shape NAMES (thumbs-diamond vs pinkies-basket) do not
# yet map cleanly onto the anatomical "together pair" seen in clip 1 — the overhead and
# chest holds read as PINKY-together, the low holds as INDEX-together. So the catalogue
# retiering that assigns these signals to specific rows is HELD pending the owner
# confirming which filmed hold = which named shape. These primitives are correct and
# decision-independent; only the row-to-shape assignment is held.
# ══════════════════════════════════════════════════════════════════════════════
import math as _math


def _v(hand, i):
    p = hand[i]
    return (p["x"], p["y"], p["z"])


def _sub(a, b):
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def _cross(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


def _norm(a):
    m = _math.sqrt(a[0] ** 2 + a[1] ** 2 + a[2] ** 2)
    return (a[0] / m, a[1] / m, a[2] / m) if m > 1e-9 else (0.0, 0.0, 0.0)


def _dist(a, b):
    return _math.sqrt(sum((a[k] - b[k]) ** 2 for k in range(3)))


def hand_scale(hand) -> float:
    """Per-hand size unit: wrist → middle-finger MCP length. Normalises size-independence."""
    return _dist(_v(hand, HAND_WRIST), _v(hand, HAND_MCP["Middle Finger"])) or 1e-6


def palm_centroid(hand) -> tuple:
    pts = [_v(hand, HAND_MCP[f]) for f in ("Index Finger", "Middle Finger", "Ring Finger", "Pinky")]
    return tuple(sum(p[k] for p in pts) / len(pts) for k in range(3))


def palm_normal(hand, side: str) -> tuple:
    """Chirality-consistent unit normal the palm faces. `side` is anatomical 'left'/'right'
    (from hands_spine's pose-proximity assignment). Sign-flipped for the left hand so both
    hands' normals point out of the palm. WORLD landmarks."""
    w = _v(hand, HAND_WRIST)
    n = _cross(_sub(_v(hand, HAND_MCP["Index Finger"]), w),
               _sub(_v(hand, HAND_MCP["Pinky"]), w))
    if side == "left":
        n = (-n[0], -n[1], -n[2])
    return _norm(n)


def palm_orientation(hand, side: str) -> str:
    """'UP' | 'DOWN' | 'FORWARD' | 'BACK' | 'OUT' from the palm normal in the camera-aligned
    world frame (x=right, y=DOWN, z out-of-screen toward camera is negative). Verified on
    clip 2: palms-up→UP, palms-forward→FORWARD, palms-out→OUT, L/R agree."""
    n = palm_normal(hand, side)
    ax, ay, az = abs(n[0]), abs(n[1]), abs(n[2])
    if ay >= ax and ay >= az:
        return "UP" if n[1] < 0 else "DOWN"
    if az >= ax and az >= ay:
        return "FORWARD" if n[2] < 0 else "BACK"
    return "OUT"


def finger_spread(hand) -> float:
    """Mean adjacent fingertip gap (index→middle→ring→pinky) in hand-scale units. Small when
    the fingers are compact/together, large when splayed."""
    tips = [_v(hand, HAND_TIP[f]) for f in ("Index Finger", "Middle Finger", "Ring Finger", "Pinky")]
    gaps = [_dist(tips[i], tips[i + 1]) for i in range(3)]
    return (sum(gaps) / len(gaps)) / hand_scale(hand)


def inter_hand_tip_gaps(left, right) -> dict:
    """For a two-hand shape, the distance between each homologous fingertip pair, in
    (mean) hand-scale units. The 'together pair' (thumbs-together vs pinkies-together) is
    the one with the smallest gap — the verified, orientation-robust discriminator."""
    sc = (hand_scale(left) + hand_scale(right)) / 2
    return {f: _dist(_v(left, HAND_TIP[f]), _v(right, HAND_TIP[f])) / sc for f in HAND_TIP}


def closest_tip_pair(left, right) -> str:
    """Which homologous fingertip pair is closest between the two hands ('Thumb'/'Pinky'/…).
    This is the shape-family discriminator; the coaching name it maps to is owner-confirmed."""
    gaps = inter_hand_tip_gaps(left, right)
    return min(gaps, key=gaps.get)
