# check_type Assignment — FINAL for review (pre-write)

> **PROPOSAL FOR FINAL REVIEW — nothing written to `checkpoints_v2` yet.** The complete
> `id → check_type` assignment for all 263 signal-bearing judge-tier rows, plus the +5 new split-child
> rows. Generated from a fresh live pull (2026-09-25), classification reproducible in SQL, with three
> per-row corrections applied by hand (§4). Follows `CHECK_TYPE_SPLIT_WORKSHEET.md`. Branch
> `fault-tiering-two-dimensional`.

## 0. Owner rulings encoded here
- **Finish vs. Base: separate.** Base = static foot-width (`range`). Finish's justifying clause —
  *"weight transfers off the back foot into the throw, generating ground force"* — measures energy
  transfer over time, not a position → **`cross_phase`** (weight distribution back-foot→front across
  load→release; `trend` is the equivalent if measured as a single forward-COM series — reviewer's
  pick, defaulted to `cross_phase`). Not `range` — that mislabel was corrected.
- **OL churn id 10: split into two.** Its churn facet is explicitly authored as *"reuses the churn
  signal from Blocking-Pass Center's Finish phase"* (id 5) → churn is a settled, reused check
  recurring at a different phase; forward-drive is genuinely distinct. → +1 (total new = **+5**).

## 1. Final counts (263 existing rows → one check_type each; +5 new)

| check_type | n | notes |
|---|---|---|
| `range` | 206 | dominant — angles, widths, distances, positions, held-through-phase angles, loaded-base gestalts, snap→throw duration (225,300) |
| `trend` | 21 | glide-core oscillation (7), inter-step tempo (4), sprint (3), lateral-displacement/economy (2), snap-tempo (5, P1) |
| `cross_phase` | 10 | Finish — weight transfer back→front (9 Drop-Back + 383 PA) |
| `strict_ordering` | 8 | throwing kinetic sequence (hip-before-shoulder etc.) + release-vs-apex |
| `ordering_window` | 7 | step-sequence step/crossover pattern |
| `convergence` | 7 | plant foot-vs-body heading (6) + head/shoulder/hip/feet stacking (411) |
| **SPLIT** | 4 rows | OL Blocking 2/5/7/10 → **+5 new rows** (§3) |
| **total** | **263** | +5 new = **268 rows** post-write |

Dispositions within the above: **calibration-blocked** — 10 (P1 snap-frame): rotation@snap 5
`271,340,345,520,525`; snap→throw duration `range` 2 `225,300`; snap-tempo `trend` 5
`236,301,314,479,500` — each gets a check_type but can't calibrate until **P1**
(snap-frame reference). **held facet** — 7 rows keep a ready check but hold a **P2** (ball-tracking)
facet: `445,449,451,466,472,394,399`. **P3 report-only** — Exchange track `278,354,529` (open-angle
`range` is judged; the track is reported, verdict deferred on run concept).

## 2. Full id → check_type map (every row; grouped, verified live)

### OL_Center Stance — `range` (21) — foot stagger, position-specific bounds (§4 of split worksheet)
`12,19,60,76,82,123,148,154,160,167,208,213,562,568,608,635,640,646,652,694,700`

### QB Stance — `range` (18) — pad level / base / hips / knee / shoulder / stagger
`287,291,292,293,294,295,365,366,367,368,369,370,541,542,543,546,547,549`

### QB Drop-Back
- `range` **ready (81)**: `223,224,227,230,231,232,234,238,239,242,243,244,249,251,252,256,258,261,263,264,297,298,302,304,305,306,308,309,312,313,316,319,320,321,324,325,327,328,329,333,335,337,371,376,378,379,483,484,485,486,487,488,490,492,496,498,499,501,503,504,507,509,512,513,515,517,518,1806,1807,1808,1809,1810,1811,1812,1813,1814,1815,1816,1817,1818,1819`
  (incl. FG-knees `1806–1812` = knee separation; FG-weight `1813–1819` = weight centered; `379` = static reset posture — corrected out of Finish, see §4)
- `range` **ready + held transition-timing facet (9)**: `226,241,253,307,318,334,482,502,510` — each resolves to one balance `range`; the transition-*timing* facet is **P1-held on the 7 snap-anchored** (`226,241,307,318,334,482,502`) and **folded-ready on the 2 movement-anchored** (`253,510`). No new row either way.
- `range` **P1 snap→throw duration (2)**: `225,300` — two-sided duration window (bidirectional fault); needs the snap-frame reference to calibrate.
- `trend` **ready (11)**: FG-core glide `240,259,315,331,477,494,516`; inter-step tempo `245,260,326,511`
- `trend` **P1 snap-tempo (5)**: `236,301,314,479,500`
- `cross_phase` **ready (9)** — Finish, weight transfer: `233,237,255,310,323,336,489,491,514`
- `ordering_window` **ready (7)** — step-sequence: `247,257,322,330,478,493,506`
- **SPLIT**: (none here — OL only)
- Play-Action `383` → `cross_phase` (has weight-transfer clause); `379` → `range` (static reset, no clause) — see §4.

### QB Pocket Movement
- `range` **ready (33)**: `384,385,389,390,391,392,393,395,396,397,401,404,406,407,409,410,413,415,416,417,418,419,423,424,425,426,427,428,429,430,432,434,435`
- `range` **P1 rotation@snap (5)**: `271,340,345,520,525`
- `range` **P2 held ball facet (2)**: `394,399`
- `trend` **ready (5)**: `266` (lateral displacement), `267,341,521` (sprint), `412` (movement economy)
- `convergence` **ready (7)**: `268,273,342,347,522,527` (plant heading) + `411` (stacking)
- `strict_ordering` **ready (1)**: `422` (kinetic chain after reset)

### QB Throwing
- `range` **ready (22)**: `437,438,439,440,441,442,443,446,448,452,454,459,460,461,462,464,467,470,471,473,474,475`
- `range` **P2 held ball facet (4)**: `449,451,466,472`
- `strict_ordering` **ready (6)**: `453,456,457,463,465,469`
- `strict_ordering` **P2 held ball facet (1)**: `445` (release-vs-apex; arm proxy ready, exact ball point held)

### QB Exchange
- `range` **ready (6)**: `281,283,349,360,536,539` (hip/shoulder angle held through exchange)
- `range` **P3 report-only track (3)**: `278,354,529` (open-angle judged; track reported, verdict deferred)

### OL_Center Blocking — **SPLIT (4 rows → +5 new)** — see §3
`2, 5, 7, 10`

## 3. The +5 new split-child rows (definitions — for write)

Split parents keep their id + one facet; children get new ids at write time. Every child inherits the
parent's `player_tier` / `fault_severity` / `is_safety` (a measurement split, not a re-tiering). IES
text is **extracted from the parent**, not invented. No dependency logic folded in (§6 pointer).

**id 2** — Pass_Pro / "Snap & First Step" / Fundamental / sev NULL / fault "Ducking Head on Snap":
| row | facet | check_type | landmarks | extracted standard |
|---|---|---|---|---|
| **2** (keep) | base-width retention | `range` | L/R Ankle | "preserving a shoulder-width base" |
| **NEW-1** | spine/torso flatness | `range` | Sternum, Pelvis Center | "zero drop in height; spine angle not breaking" |
| **NEW-2** | knee flexion | `range` | L/R Knee | knee flexion angle at the snap-step frame |
| held (P1) | first-step latency; height-drop vs pre-snap baseline | — | — | needs snap-frame / pre-snap reference |

**id 7** — Run / "Snap & First Step" / Fundamental / Major / fault "Roll-Snapping":
| row | facet | check_type | landmarks | extracted standard |
|---|---|---|---|---|
| **7** (keep) | direction of travel | `range` (displacement vector) | Pelvis Center | "firing downhill vs. lateral burst" |
| **NEW-3** | torso/spine flatness | `range` | Sternum, Pelvis Center | "flat, driving posture rather than standing tall" |
| held (P1) | first-step onset timing | — | — | needs snap-frame reference |

**id 5** — Pass_Pro / "The Finish" / Developing / Major / fault "Pop and Stop":
| row | facet | check_type | landmarks | extracted standard |
|---|---|---|---|---|
| **5** (keep) | ankle churn | `trend` | L/R Ankle | "continuous 6-inch choppy steps; feet never stop" |
| **NEW-4** | elbow-lock stability | `range` | L/R Elbow | "locked arms; elbow angle within a narrow range" |

**id 10** — Run / "The Drive" / Fundamental / sev NULL / no fault:
| row | facet | check_type | landmarks | extracted standard |
|---|---|---|---|---|
| **10** (keep) | ankle churn | `trend` **(reuses id 5's churn definition)** | L/R Ankle | "rapid 6-inch chat steps; feet never stop" |
| **NEW-5** | forward drive | `trend` | Pelvis Center | "sustained forward Pelvis displacement; drive the defender vertically" |

## 4. Per-row corrections applied by hand (beyond the archetype pass — flagged for review)
1. **`225`, `300`** (1-Step "proper timing **from snap to throw** ~0.3–0.4s"; fault "out of sync"):
   **`range`** on the derived snap→throw duration (a two-sided window), **P1**-blocked. NOT
   `strict_ordering`/`synchronisation` — the fault is bidirectional (too fast *and* too slow), which
   only a two-sided band catches; the event order is trivial. The five tempo siblings
   (`236,301,314,479,500`) stay `trend` — they measure motion *smoothness* ("no hitch/pause/gather"),
   a property independent of duration, and none states a target time.
2. **`379`** (Play-Action "Regain a balanced throwing **posture**…"): kept `range`, **not** Finish/
   `cross_phase` — its IES has **no** weight-transfer/ground-force clause; it is a static reset end-state.
3. **`383`** (Play-Action "balanced base… **weight transfer**… before release"): → `cross_phase` with
   the Finish family — it **does** carry the weight-transfer clause.

## 5. Not calibrating anything
Every row is `Draft` → Layer 4 computes and reports the value (`measured_only`), never pass/fail, until
a row is `Calibrated` with real `threshold_parameters` (footage-gated, separate work). Assigning
`check_type` only fixes *which of the 9 measurement patterns* applies + the extractor's input contract.

## 6. On approval
Write to `checkpoints_v2`: set `check_type` on the 263 existing rows per §2; insert NEW-1..NEW-5 with
extracted IES/landmarks and inherited tiers per §3; leave `threshold_parameters` empty (Draft). Then
regenerate the snapshot and run the resolver suite. **Nothing is written before this review is approved.**

## 7. OPEN before write — fault/severity/is_safety routing on the OL Blocking splits
Write-prep surfaced that each split parent (2/5/7) carries ONE fault mapping to only a SUBSET of its
measurement facets, so "children inherit the parent's flags" (§3) is ambiguous and, taken literally,
would contradict the ratified §5c safety criterion (it would mark base-width/knee children `is_safety`
with no injury text). **Recommended (Option R): route fault_trigger / fault_severity / is_safety to the
child facet that actually describes the fault; the other facets become no-fault performance rows.**
Consequential flips this entails, flagged: **id 2** (kept, base-width) `is_safety` true→false — the
head-drop safety fault moves to NEW-1 (spine); **id 7** (kept, direction) severity Major→NULL — the
"Roll-Snapping" fault moves to NEW-3 (spine). id 5's "Pop and Stop" stays on the churn facet (kept);
elbow-lock child → NULL. id 10 has no fault (both children clean). `player_tier` inherits unchanged;
every `check_type` is exactly as in §2/§3. **Awaiting owner ruling: (R) route, or (I) literal
inheritance. No write until ruled.**
