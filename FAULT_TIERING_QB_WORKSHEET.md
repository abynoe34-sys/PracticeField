# QB Drop-Back Fault-Tiering Worksheet — Option B (earned splits only)

> Status: **EXECUTED 2026-09-15** on live `checkpoints_v2` (Option B, approved after archetype review
> + a spot-check that corrected BC-ball's IES to a genuine extraction and rolled the two judge-tier
> upgrades back to `Partial`). QB Drop-Back **56 → 84** rows (139 → 167 in-technique; catalogue 1626 →
> 1654). Row-tagged 5 archetypes (35 rows, UPDATE-only); split 3 (Feet Glide ×3, Ball Carriage ×2,
> Head/Vision ×2 → 28 new children, ids 1792–1819). Verified live (not circularly), snapshot
> regenerated, tests updated. resolver **221/221**, cleaning **28/28**. `player_tier`/`fault_severity`
> remain first-pass strawman, SME-confirmable; the judge-tier upgrades on BC-hands/HV-head are
> deliberately DEFERRED to calibration. Proposal detail below is retained as the execution record.

## Scope (re-derived fresh — the plan doc's list was stale AND wrong-technique)

- The plan's "42 QB Drop-Back" IDs were wrong: **14 had drifted** off Drop-Back (219/220 → Ball Carry;
  267/268/271/273/340/342/346/347/520/522/526/527 → Pocket Movement/Bootleg), and the stale list
  **missed 28** real Drop-Back rows.
- Authoritative current set: **56 multi-fault QB Drop-Back rows** (of 139 Drop-Back total), forming a
  clean **8 measurement-archetypes × 7 formation/step combos** matrix (Gun 3/5, Pistol 3/5, UC 3/5/7).
- **Unphased-key finding (verified live, opposite of DB):** all 56 rows have `phase IS NULL`. Postgres
  `NULLS DISTINCT` (confirmed on a throwaway temp table) makes `uniq_checkpoint_v2` **inert** for
  null-phase rows — the split needs no migration-v24-style widening, but QB Drop-Back also has **no
  DB-level duplicate protection**, now or ever. Standing fact for any future QB writes, not just this split.

## The archetype finding (why this is NOT DB's uniform row-per-fault split)

Every QB "multi-fault" row is ONE measurement whose `fault_trigger` lists several **failure symptoms
of that measurement**, sharing one landmark set / camera / tier / IES. id 240's seven "faults" are seven
ways to fail one thing ("feet glide, low wide base") — a coach watches one thing and names several ways
it breaks. Splitting all 56 → ~175 rows would fabricate annotation-clone rows and multiply the checklist
(the exact "manufacture variation" trap, at the archetype level). So Option B splits only where a real
technical fact forces it.

| # | Archetype | Landmarks | Cam | Tier | Symptoms | **Disposition** |
|---|---|---|---|---|---|---|
| 1 | **Step Sequence** | Feet, Knees, Hips | Both | Needs Motion | count / crossover-on-right-step / rhythm | **ROW-TAG** — landmarks adequate; different check-types alone don't earn a split |
| 2 | **Shoulder** | Shoulders, Sternum, Spine | Front | Needs Motion | open-early / open-to-field / collapse-or-over-rotate | **ROW-TAG** — facets of one rotation measure |
| 3 | **Platform** | Feet,Knees,Hips,Shoulders,Elbow,Wrist | Both | Needs Motion | off-balance / weight-stuck-back | **ROW-TAG** — one "balanced finish" |
| 4 | **Stride** | Feet, Ankles, Knees | Side | Needs Motion | inconsistent-depth / too-long-choppy | **ROW-TAG** — one stride-length measure |
| 5 | **Hips** | Hips, Pelvis Center | Front | Needs Motion | misaligned / back-hip-locked | **ROW-TAG** — one hip-position measure |
| 6 | **Feet Glide** | Feet, Heels, Ankles | Both | Needs Motion | bounce / base-narrow / toes-back / cross-speed / heel-strike **+ knees-cross + weight-forward** | **SPLIT ×3** — knees-cross & weight-forward name landmarks the row lacks |
| 7 | **Ball Carriage** | Hands,Wrists,Elbows,Sternum,Ball | Both | Partial | elbows/one-hand/arms-stiff **+ ball-off-chest + ball-drift** | **SPLIT ×2** — 2 facets need ball tracking (not pose-measurable) |
| 8 | **Head/Vision** | Nose,Eyes,Ears,Neck | Side | Partial | head-unstable **+ eyes-drop/gaze** | **SPLIT ×2** — gaze deferred vs head-stability measurable |

**Reconciliation of your "five No cases":** on inspection **Step Sequence's** landmarks `[Feet,Knees,Hips]`
*are* adequate for its symptoms (count/crossover/rhythm all resolve), so it is NOT under-annotated and
joins the row-tag set — giving exactly **five** row-tag archetypes (Step Sequence, Shoulder, Platform,
Stride, Hips) and **three** split archetypes (Feet Glide, Ball Carriage, Head/Vision). Your count was right;
this refines the instruction's "Feet Glide/Step Sequence" to "Feet Glide only" on the verified fact.

## Footprint — dramatically smaller than the plan's estimate

| Archetype | Rows | → after | net |
|---|---|---|---|
| 5 row-tag archetypes | 35 | 35 | **+0** (UPDATE-only: add 2 tag columns) |
| Feet Glide (×3) | 7 | 21 | +14 |
| Ball Carriage (×2) | 7 | 14 | +7 |
| Head/Vision (×2) | 7 | 14 | +7 |
| **Total** | **56** | **84** | **+28** |

**56 → 84 (net +28), not the plan's ~+119.** Option B collapses most of the estimate because 5 of 8
archetypes create zero new rows. Post-split QB Drop-Back: 139 → 167 rows.

---

## Row-tag archetypes (5) — UPDATE only, one tag pair per row, no split, no landmark/camera/tier change

`fault_trigger` stays as the multi-symptom coaching text (it's the "several ways it goes wrong" a coach says).

| Archetype (all 7 instances) | `player_tier` | `fault_severity` | rationale |
|---|---|---|---|
| **Step Sequence** (247,257,322,330,478,493,506) | Fundamental | Major | learn the drop's steps first; wrong depth breaks route timing |
| **Shoulder** (243,258,324,335,486,496,518) | Developing | Major | tips the throw early / cuts vision to one side |
| **Platform** (237,255,323,336,489,491,514) | Developing | Major | no ground force → weak/errant throw |
| **Stride** (238,261,313,328,485,498,509) | Developing | Minor | depth/timing; rarely catastrophic on its own |
| **Hips** (249,263,319,337,487,504,513) | Advanced | Major | rotational power-transfer nuance |

---

## Split archetypes (3) — child specs (defined once per archetype, applied to all 7 instances)

**KEEP** = parent's landmarks cover it; **ADD** = new token(s) the parent row lacks. `mbp` = proposed
`measurable_by_pose`. IES per child is **partitioned from the parent's existing multi-sentence IES** where
the parent genuinely has a sentence for that facet (same discipline as the fault-text split). **One
exception, flagged honestly:** id 248's IES never describes ball position independently of hand mechanics,
so BC-ball takes the parent's verbatim ball-security sentence ("Football remains secure from snap
reception through the drop — two-hand control…") rather than an authored "stays on the chest" phrase.
At execution, any child whose parent lacks a genuine sentence for its facet must be flagged
authored-not-extracted, never passed off as a pure partition.

### 6. Feet Glide → 3 children (ids 240, 259, 315, 331, 477, 494, 516)
| child | symptoms | landmarks | cam | mbp | tier | sev |
|---|---|---|---|---|---|---|
| **FG-core** (keeps parent id) | bounce/high-step, base-narrow, toes-back, cross-speed, heel-strike | KEEP `[L/R Foot, L/R Heel, L/R Ankle]` | Both | Needs Motion | Fundamental | Major |
| **FG-knees** (new) | knees crossing (karaoke), knees swinging wide off line | **ADD `[L/R Knee]`** + `L/R Foot` | Both | Needs Motion | Fundamental | Major |
| **FG-weight** (new) | weight shifting forward onto the front foot | **ADD `[L/R Hip]`** + `L/R Ankle` | Side | Needs Motion | Developing | Major |

*The whole reason this archetype splits: the current row names "knees" and "weight forward" but carries
only feet/heels/ankles — it literally cannot measure two of its own symptoms today. Splitting adds the
knee and hip tokens where they belong.*

### 7. Ball Carriage → 2 children (ids 248, 254, 317, 332, 480, 495, 508)
| child | symptoms | landmarks | cam | mbp | tier | sev |
|---|---|---|---|---|---|---|
| **BC-hands** (keeps parent id) | elbows flare, dropping to one hand, arms stiff/flail/cross-midline | `[L/R Hand, L/R Wrist, L/R Elbow, Sternum]` (drop Ball Position) | Both | **Partial** (unchanged — judge-tier upgrade DEFERRED to calibration) | Fundamental | Critical |
| **BC-ball** (new) | ball off chest, ball drifting off carriage | `[Ball Position, Sternum]` | Both | **No** (skip — needs ball tracking) | Fundamental | Critical |

*Splitting separates the pose-measurable hand carriage from the un-trackable ball: BC-ball is honestly
`skip` (deferred to ball tracking) — a hard fact, not a tier choice. BC-hands **stays `Partial`** — whether
hand/elbow carriage earns judge-tier is left to calibration evidence, not asserted now (arm tracking through
a fast drop — occlusion / motion blur / hands crossing the body — is exactly where real pose estimation may
be messier than the architecture suggests). The **separation** is the earned change; the tier upgrade is not.*

### 8. Head/Vision → 2 children (ids 250, 262, 311, 338, 481, 497, 505)
| child | symptoms | landmarks | cam | mbp | tier | sev |
|---|---|---|---|---|---|---|
| **HV-head** (keeps parent id) | head bouncing/dipping/rocking; upper body unstable | `[Nose, L/R Ear, Neck]` | Side | **Partial** (unchanged — judge-tier upgrade DEFERRED to calibration) | Fundamental | Minor |
| **HV-gaze** (new) | eyes drop / not progressing downfield | `[Nose, L/R Eye]` (orientation proxy) | Side | **Partial** (gaze/reads deferred) | Advanced | Major |

*Same shape as Ball Carriage: measurable head-stability separated from the deferred gaze facet. Both stay
`Partial` — HV-gaze because gaze is genuinely deferred, HV-head because its judge-tier upgrade is left to
calibration, not asserted now. The separation is the earned change.*

**Landmark-vocab check:** every token used above — `Left/Right Knee`, `Left/Right Hip`, `Sternum`,
`Nose`, `Left/Right Eye`, `Left/Right Ear`, `Neck`, `Ball Position` — is already in `CONTROLLED_VOCAB`
and resolved by existing QB rows. **No new vocabulary needed.** (`Ball Position` resolves as external /
needs-ball-tracking; `Sternum`/`Neck` are derived; the rest are MediaPipe.)

---

## Spot-check rows (fully expanded, for your review before approving)

> ⚠️ **QB execution wrinkle (found during spot-check):** unlike DB's clean `Also:`-delimited faults
> (mechanically splittable by `split_part`), several QB fault sentences **straddle two body parts**, so
> the split is per-*clause*, hand-partitioned — no delimiter to mechanize, and each straddling clause is a
> judgment call. Both spot-check rows contain one (marked ⚠️). QB execution is more hand-authored than DB's,
> and read-back-verify-each-child matters even more.

### id 240 — Feet Glide, 3 Step, Gun (the densest case: 7 symptoms → 3 children)
Current: `[L/R Foot, L/R Heel, L/R Ankle]` · Both · Needs Motion · cue "Cut grass with your cleats — feet glide, knees don't cross."
Live fault (7 clauses, one straddles): "Bouncing, high-stepping, or riding up on the toes instead of gliding. Knees crossing (karaoke-style) rather than the feet gliding past. Base narrowing so the body leans and loses balance. Weight shifting forward onto the front foot, preventing a clean load. **⚠️ Toes pointing backward or knees swinging wide off the linear path.** Crossing at a speed that costs control. Heavy heel contact or wasted movement."
- **FG-core (id 240 retained):** fault = "Bouncing, high-stepping, or riding up on the toes instead of gliding. Base narrowing so the body leans and loses balance. **Toes pointing backward.** Crossing at a speed that costs control. Heavy heel contact or wasted movement." · KEEP `[L/R Foot, L/R Heel, L/R Ankle]` · Both · Needs Motion · **Fundamental / Major** · IES (verbatim) = "Feet glide low to the ground throughout the drop — cleats cutting grass, staying in contact so a balanced throwing base is available immediately. Base stays wide enough to hold balance."
- **FG-knees (new):** fault = "Knees crossing (karaoke-style) rather than the feet gliding past. **Knees swinging wide off the linear path.**" · **ADD `[L/R Knee]`** + `L/R Foot` · Both · Needs Motion · **Fundamental / Major** · IES (verbatim) = "The designed crossover step is a FOOT crossing past foot while the knees stay on a linear path; the knees do not cross over one another as in a karaoke drill." · keeps the "knees don't cross" cue.
- **FG-weight (new):** fault = "Weight shifting forward onto the front foot, preventing a clean load." · **ADD `[L/R Hip]`** + `L/R Ankle` · Side · Needs Motion · **Developing / Major** · IES (verbatim) = "Weight stays centred, not forward on the front foot."

⚠️ Straddle resolved: "Toes pointing backward" → FG-core (foot orientation); "knees swinging wide" → FG-knees (knee path).

### id 248 — Ball Carriage, 3 Step, Gun (the mixed-measurability case: 4 clauses → 2 children)
Current: `[L/R Hand, L/R Wrist, L/R Elbow, Sternum, Ball Position]` · Both · Partial · cue "Two hands on it — relaxed, not loose."
Live fault (one straddles): "**⚠️ Ball drops off the chest or elbows flare during the drop.** (Ball Position needs ball tracking.) Dropping to one hand on the ball. Arms stiff, or flailing/crossing the body's midline, forcing the torso to overwork and sapping rotational energy. Ball drifting off a consistent carriage position."
- **BC-hands (id 248 retained):** fault = "**Elbows flare during the drop.** Dropping to one hand on the ball. Arms stiff, or flailing/crossing the body's midline, forcing the torso to overwork and sapping rotational energy." · `[L/R Hand, L/R Wrist, L/R Elbow, Sternum]` (Ball Position dropped) · Both · **Partial** (unchanged — upgrade deferred to calibration) · **Fundamental / Critical** · IES (verbatim sentences 2–4) = "Both hands stay securely on the ball throughout the drop. Arms and hands stay relaxed but controlled — not stiff, not so loose that the ball drifts and body position goes with it. Hands do not cross the body's midline." · keeps the two-hands cue.
- **BC-ball (new):** fault = "**Ball drops off the chest during the drop.** Ball drifting off a consistent carriage position. (Ball Position needs ball tracking.)" · `[Ball Position, Sternum]` · Both · **No** (skip — needs ball tracking) · **Fundamental / Critical** · IES = **verbatim sentence 1** "Football remains secure from snap reception through the drop — two-hand control until entering the throwing sequence." *(Genuine extraction. An earlier draft synthesized a "stays on the chest at a consistent carriage position" phrase from the fault_trigger — corrected here; the parent IES has no independent ball-position sentence, so this verbatim ball-security sentence is used instead.)*

⚠️ Straddle resolved: "elbows flare" → BC-hands (arm mechanics); "ball drops off the chest" → BC-ball (tracking-dependent).

---

## Proposed execution order (difficulty ladder — for the eventual go-ahead, not now)

1. **5 row-tag archetypes (35 rows, UPDATE-only, zero new rows, zero annotation change)** — pure `player_tier`+`fault_severity` writes. Lowest risk; proves the tagging path on QB before any split.
2. **Head/Vision split (7→14)** then **Ball Carriage split (7→14)** — the 2-way measurability splits (mirror DB-1772: peel off the deferred facet, upgrade the measurable remainder Partial→judge / →skip). No landmark *adds*, just re-partition + tier correction.
3. **Feet Glide split (7→21) LAST** — the only archetype needing new landmark tokens (knees, hips), most like DB's hard rows. Prove the ladder on everything else first.

At execution, same anti-circularity as DB: QB's snapshot + committed tests will need regeneration from
live and a fresh-live re-verify (QB row count + IDs change), **not** the regenerated snapshot's own
assertions circularly.

---

## Forward note (flagged, NOT part of this worksheet): the 51 remaining `Also:` rows

The WR (17) / TE (17) / RB (6) + DB-were-11 `Also:` rows still pending split deserve the **same archetype
check QB just got** before assuming DB's row-per-fault result generalizes. DB's 1772/1783-1784 proved
genuine independence *for DB*; QB proved the opposite is common. Each cluster should be asked "several
things, or one thing described several ways?" — not split by sentence-counting. A per-position
pre-worksheet pass, same as this one.
