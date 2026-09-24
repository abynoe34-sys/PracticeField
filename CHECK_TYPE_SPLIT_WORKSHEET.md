# check_type Split Worksheet — FINAL (coach-test framing)

> Status: **FINAL PROPOSAL FOR REVIEW — nothing written to `checkpoints_v2`.** All 263
> signal-bearing judge-tier rows read individually. Supersedes the earlier quantity-count draft of
> this file (the "4 facets per glide parent / ~400 rows" reading was wrong — see §2). Branch
> `fault-tiering-two-dimensional`. Last updated 2026-09-24.

## 0. The two-part rule this encodes

**(a) Ready vs. blocked, per facet** (owner ruling): under Layer 4's *one verdict per row, forever*
architecture, "pick the dominant facet" **discards** the others permanently — worse than a
row-count bump for a facet calculable today. So a facet is either **ready** (real landmarks, no
missing infra → gets a row + `check_type` now) or **blocked** (missing infra → genuinely held, like
the 14 OL content-gap rows and S2; not folded, not noted-in-signal).

**(b) The coach test decides granularity, NOT a quantity-count** (owner ruling): for each candidate,
ask *would a coach watching film treat this as one thing to check, or genuinely several independent
things?* — never "how many calculable quantities are in the sentence." The gap between those two is
exactly where over-splitting lives (§2, §3). Two structural facts make the coach-test answer
"one dominant facet" for almost every multi-quantity row:

1. **check_type inherits fault-tiering's bundling.** A fault-split child is already one fault / one
   landmark set → one `check_type`, never re-split. A row fault-tiering deliberately left bundled is
   one coaching thing → one dominant `check_type`.
2. **the QB Drop-Back matrix already carries dedicated sibling rows per cell** (Base, Shoulders,
   Hips, Stride, Tempo, First-step, Plant, Finish, Glide, Step-sequence all exist per formation×step
   — verified e.g. 3-Step gun: `239` Base, `243` Shoulders, `249` Hips, `245` Tempo beside `237`
   Finish, `247` Step-seq). A row that re-lists hips/shoulders/base is **not** new measurement —
   those are their own rows. Folding them in would duplicate.

**Genuine split only where the coach test = quantity-count AND no sibling row / fault-child already
covers the facet.** In practice that is the OL Blocking rows (sparse table, no siblings) and nothing
else.

## 1. The three prerequisites that gate every "blocked" facet

| # | Missing prerequisite | Blocks | Kind |
|---|---|---|---|
| **P1** | **Snap-frame reference** (pose can't mark the snap; needs ball tracking or a manual snap frame) | first-step latency/onset, transition-timing-from-snap, hip-rotation baselined "at the snap frame", snap-to-throw tempo, "zero drop vs pre-snap" | true hold |
| **P2** | **Ball tracking** | exact ball-release point, ball-security/protection | true hold |
| **P3** | **Run concept / aiming point** (deferred play-call, not infra) | the *verdict* on Exchange track-vs-aiming-point | report-only (measure & report the track; defer the judgment) |

A **held facet** = a facet of a multi row we do *not* create a row for. A **calibration-blocked
row** = an existing single row whose `check_type` is knowable (assign it; Draft → `measured_only`)
but whose thresholds can't be set until P1/P2 lands. Different things.

## 2. Glide — the reconciliation, from the children's actual text

fault-tiering already decomposed glide into three rows per formation×step. Confirmed live:

| piece | ids | landmarks | fault_trigger (verbatim, abridged) | one `check_type` |
|---|---|---|---|---|
| **FG-core** | 240,259,315,331,477,494,516 | `L/R Foot, L/R Heel, L/R Ankle` (no knees/hips) | "Bouncing, high-stepping, or riding up on the toes instead of gliding… heavy heel contact…" | **`trend`** — low, smooth vertical oscillation |
| **FG-knees** | 1806–1812 | `L/R Knee, L/R Foot` | "Knees crossing (karaoke-style) rather than feet gliding past." | **`range`** — knee separation on a linear path |
| **FG-weight** | 1813–1819 | `L/R Hip, L/R Ankle` | "Weight shifting forward onto the front foot…" | **`range`** — hip-over-ankle (centered) |

FG-core's sentence lists ~5 symptoms (bounce, base-narrow, toe-direction, cross-speed, heel) but the
coach test sees **one**: is the foot gliding low and smooth? All symptoms are that one
ankle-oscillation measurement failing. → **glide = 21 rows, one `check_type` each, no further
split.** (The earlier draft's 84 was the quantity-count error.) Note this reproduces fault-tiering's
own judgment — it split out only the genuinely-different-landmark faults (knees, weight) and left the
rest as one glide fault.

## 3. Assignment — every archetype → one dominant `check_type`, 0 new rows (unless flagged)

Each group's members were read individually; deviations named. Coach-test collapse in the "why one".

| archetype | ids | `check_type` | why one (coach test) |
|---|---|---|---|
| FG-core | 240,259,315,331,477,494,516 | `trend` | glide-vs-bounce = one gesture |
| FG-knees | 1806–1812 | `range` | one isolated fault (fault-child) |
| FG-weight | 1813–1819 | `range` | one isolated fault (fault-child) |
| Step-sequence | 247,257,322,330,478,493,506 | `ordering_window` (step/crossover pattern) | rhythm facet = sibling Tempo row |
| Finish/platform | 233,237,255,310,323,336,379,383,489,491,514; Pocket 392,406,413; Throwing 438,448,459,474 | `range` (balance/loaded base) | hips/shoulders/base = sibling rows ⚑ see §5 Finish-vs-Base |
| Shoulder + open-timing | 227,243,324,376,486,496,518; Pocket 410; Throwing 460 | `range` (angle held through phase) | "open early" = same angle failing over time, not separate ordering |
| Transition + balance | 226,241,253,307,318,334,482,502,510 | `range` (balance) | timing facet P1-held per row (see below) |
| Convergence-plant | 268,273,342,347,522,527 | `convergence` | foot-heading vs body-heading = one agreement check |
| Alignment-stacking | 411 | `convergence` | head/shoulders/hips/feet should agree = one |
| Sprint | 267,341,521 | `trend` | one displacement-rate |
| Hip-before-shoulder | 456,457,469,422,453,463,465 | `strict_ordering` | the sequence IS the one thing (magnitude/posture folded) |
| Separation / arm-slot / shoulder angle (clean) | 464,471,475,441,454,460,467,439,451,461,446,470,473,424,404,434,425 | `range` | single angle each |
| Loaded-base / posture / stance gestalt | QB Stance 287–295,365–370,541–549 (18); Pocket 389,390,416,417,418,435,392,406,413,393,423,430,396,428,397,401,407,409,412,419,391,395,385,429; Throwing 438,448,459,474,442,440,452,462,437 | `range` | "athletic ready base/posture" = one gestalt |
| OL Stance stagger | 12,19,60,76,82,123,148,154,160,167,208,213,562,568,608,635,640,646,652,694,700 (21) | `range` | one stagger distance (§4 param-scoping: position-specific bounds) |
| Drop-Back scalar singles (base/stride/hips/first-step/plant/depth) | 223,224,230–234,236,238,239,242,244,245,249,251,252,256,258,261,263,264,297,298,300,302,305,306,308,309,312,313,316,319,320,321,325,327,328,329,333,335,337,378,483–485,487,488,490,492,498,499,501,503,504,507,509,512,513,514,515,517 | `range` (or `trend` for tempo) | each is one scalar-at-frame; tempo-through-steps = `trend` |
| Exchange step + hip + shoulder | 278,354,529 (step, +P3 track); 281,349,536 (hip); 283,360,539 (shoulder) | `range` | "stay square through the exchange" = one; track = P3 report-only |

### Calibration-blocked single rows (assign `check_type`, flag P1 — cannot calibrate yet)
- Rotation-baselined-at-snap: **271, 340, 345, 520, 525** → `range` (rotation magnitude), **P1**.
- Snap-anchored tempo: **236, 301, 314, 479, 500** → `trend`, **P1**. (Inter-step tempo rows —
  245, 260, 326, 511 — are `trend` and ready, *not* blocked; the divergence is per-row, §4.)
- Transition *timing* facet on the snap-anchored transition rows (307,318,334,482,502) → held (P1);
  their balance facet stays the ready `range` row above.
- Release rows: **445, 449, 451, 466, 472** (Throwing) + **394, 399** (Pocket) → arm-geometry /
  body-control `range` is the ready row; exact ball-point / ball-security facet held (**P2**).

## 4. Row-by-row nuance that defeats pattern-matching (worked, verified)
- **266 vs 271** (both Pocket hip-rotation): 266 measures rotation over the *movement window* →
  ready (and its rotation facet is covered by the rotation archetype anyway → 266 = one `trend`,
  lateral displacement); 271 baselines rotation *"at the snap frame"* → P1-blocked. Same body part,
  opposite call.
- **Transition 253 vs 318**: 253 "from shotgun reception… movement connected" (no snap) → timing
  ready; 318 "after **securing the snap**" → timing P1-held.
- **Rhythm**: inter-step "consistent tempo through all steps" → ready `trend`; "tempo **from snap**
  through final step" → P1. Both say "tempo".
- **456 vs 454**: 456 IS the single hip-before-shoulder `strict_ordering`; 454 (shoulders) →
  `range`, its "rotate after hips" folded because 456 owns that sequence.

## 5. Genuine splits + the two borderline flags (unresolved — do NOT default)

**Genuine splits (coach test = quantity, no sibling/child covers — OL Blocking only):**

| row | split into (each its own `range` row) | held (P1) | net new rows |
|---|---|---|---|
| **OL_Center Blocking id 2** (Pass_Pro) | base width · back/spine flatness · knee bend | first-step latency; pre-snap-drop baseline | **+2** |
| **OL_Center Blocking id 7** (Run) | direction of travel · back/spine flatness | first-step onset | **+1** |
| **OL_Center Blocking id 5** (Pass_Pro) | ankle churn (`trend`) · elbow-lock (`range`) | — | **+1** |

Three separate checks each, **no dependency logic folded in** (kept simple, per ruling).

**Borderline — kept explicitly unresolved:**
- **OL churn id 10** (Run): ankle churn + forward drive. A coach may read "drive him back with
  active feet" as *one* thing, or churn and drive as two. **Not defaulted** — needs a call.
- **Finish vs. Base**: the Finish rows collapse to `range` (balance/readiness), but that is
  near-duplicate of each cell's dedicated Base row. Possibly one row, not two. **Not defaulted** —
  needs a call (merge Finish into Base, or keep Finish as a distinct whole-body-readiness check).

## 6. One-line pointer for later (do not act on now)
> **correction_strategy note (OL pass-set):** base-width / hip-depth / knee-bend are mechanically
> coupled — a narrow base often forces a high hip or straight knee, and vice versa. Kept here as
> three independent `check_type` rows (Layer 4 has no dependency logic). Preserve for
> `correction_strategy` authoring: the fix for one may live in another. Not a complication to this
> task — just a pointer so it isn't lost.

## 7. Final counts (for review, before any write)
- **263 existing signal rows → one `check_type` each** (per §3), of which:
  - ~15 are **calibration-blocked** (P1/P2) — get a `check_type`, can't calibrate until the prereq.
  - a handful carry a **held facet** (P1/P2) or **P3 report-only** track — no extra row created.
- **Genuine new rows: +4** (OL Blocking id 2 → +2, id 7 → +1, id 5 → +1).
- **2 borderline** unresolved (OL churn id 10 → possibly +1; Finish-vs-Base → possibly −0/merge).

→ **263 → ~267 rows (+4), possibly ~268 pending the two flags.** The earlier ~8–12 estimate came in
lower once the coach test was applied strictly with sibling/fault-child awareness: the QB matrix
"multi" rows all collapse to one dominant facet, so the only irreducible splits are OL Blocking's.

## 8. What happens on approval
1. Rule on the two §5 borderlines.
2. I generate the literal 263-row `id → check_type` list (a fresh live pull) + the +4 new-row
   definitions, and bring that exact list back for a final look.
3. Only then write to `checkpoints_v2`. Nothing is written before that review.
