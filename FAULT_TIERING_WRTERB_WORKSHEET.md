# WR / TE / RB `Also:` Fault-Tiering Worksheet (combined)

> Status: **EXECUTED 2026-09-16 — 40 `Also:` rows → 51 on live `checkpoints_v2`.** 11 clean-IES split
> children landed (ids 1820–1830); 29 tag-only UPDATEs (26 row-tags + the 3 S2 rows tagged as single
> units). **S2 knee-flexion facet HELD unsplit per owner directive** (WR 723 / TE 1075 / RB 1101 — no
> genuine parent IES sentence; awaiting authored correct-landing standard from owner/SME). Verified live
> (not circularly), snapshot regenerated, resolver 228/228 + cleaning 28/28. Original proposal preserved
> below. Produced 2026-09-15. Each
> position checked independently (DB's independence result and QB's facets result were both treated as
> non-transferable). Combined into one doc because the findings rhyme, but the split/tag call was made
> per row against live content. All `player_tier`/`fault_severity` are first-pass strawman. Same
> two-step discipline: worksheet → review → separate go-ahead for execution.

## Fresh re-derivation — NO drift this time

Unlike QB (whose plan list had drifted 14/42 and missed 28), the explicit-`Also:` inventory is **exact**:
the plan's 40 IDs (WR 17 / TE 17 / RB 6) match the live `Also:` set precisely — **0 drifted, 0 missed**.
The `Also:` keyword rows are stable; only QB's *sentence-enumeration* set had drifted. All 40 are
**2-fault** (a single `Also:` each) — no 3-fault rows like DB's 1725.

## Verified finding: TE is a 1:1 verbatim copy of WR (so WR's disposition transfers — checked, not assumed)

You flagged this specifically. I compared each TE `Also:` row to its WR counterpart on **landmarks + camera
+ measurable_by_pose** (the fields that drive the split decision), not just prose:

| WR | TE | annotation identical? | IES |
|---|---|---|---|
| 709/720/723/729 (Catching) | 1061/1072/1075/1081 | **yes** (landmarks, cam, mbp all match) | identical |
| 777/825/830/838/845/858/864 (Release) | 1283/1331/1336/1344/1351/1364/1370 | **yes** | only `receiver`→`tight end` reword |
| 875/931/945/961/967/973 (Routes) | 1381/1437/1451/1467/1473/1479 | **yes** | identical / minor reword |

The copy carried WR's annotation verbatim (the same thing the earlier TE join-copy test asserted), so
**WR's split/tag disposition transfers to TE row-for-row** — but this is *verified by comparing the live
annotation per pair*, not assumed from shared lineage. The IES reword (`receiver`→`tight end`) doesn't
touch the landmark partition or the split decision.

RB shares 3 Catching rows verbatim with WR (1087=709, 1098=720, 1101=723, 1107=729) plus 2 RB-original
rows (FB Blocking, Wheel) analysed on their own content.

## Disposition summary — between DB and QB

**40 rows → 54 (net +14).** 14 split, 26 row-tag. This sits between DB (all 11 split) and QB (only 3 of 8
archetypes). The `Also:` rows here are a **mix**: some secondaries are a genuinely different measurement
(different body region / missing landmark / different measurability → DB-like, split), others are another
way to fail the same measurement on the same landmarks (QB-like, row-tag).

| Position | rows | → after | split | row-tag |
|---|---|---|---|---|
| WR | 17 | 22 | 5 | 12 |
| TE | 17 | 22 | 5 (WR's, transferred) | 12 |
| RB | 6 | 10 | 4 | 2 |

**Split rows** — the secondary is a different body region / needs a landmark the row lacks / different measurability:
- **WR:** 709, 723, 729, 931, 967 · **TE:** 1061, 1075, 1081, 1437, 1473 · **RB:** 1087, 1101, 1107, 1218
**Row-tag rows** — secondary is another way to fail the same measurement on the same landmarks:
- **WR:** 720, 777, 825, 830, 838, 845, 858, 864, 875, 945, 961, 973 · **TE:** the 12 counterparts · **RB:** 1098, 1165

---

## Split archetypes (children specified once, mapped to their ids)

`mbp` = proposed `measurable_by_pose`. IES source noted per child and **verified against live text** — one
child type has **no genuine parent sentence** and is flagged authored-not-extracted (see S2).

### S1 — Catching: one-hand reach ‖ hips-rotating-with-chest  (WR 709 / TE 1061 / RB 1087)
Parent `[Elbows, Wrists, Hands]` · Front · Partial (hand-diamond shape deferred).
- **Primary (keeps id):** "REACHING WITH ONE HAND — extending only the leading arm, cutting the catching surface in half. (Hand shape needs the Hand landmarker.)" · KEEP landmarks · Front · Partial · **Fundamental / Major**.
- **Child (new):** "The hips rotating with the chest, breaking the running line and costing stride." · **ADD `[Left Hip, Right Hip]`** (+ Sternum ref) · Both · **Yes** (hip rotation is cleanly pose-measurable — a *different measurability* from the deferred hand-diamond) · **Developing / Minor**.
  - IES: extracted-with-connective from the parent's "…without breaking the lower body's running line" + "keeping stride length intact" (both phrases live in the parent IES; assembled into a standalone standard — flagged as light connective, not synthesis).
- *Why split:* different body region (arms vs hips), a landmark the row lacks (hips), AND different measurability (deferred hand-shape vs measurable hip-rotation). Strongest split in the set — DB-1772-like.

### S2 — Catching: head-follow ‖ stiff-legged landing  (WR 723 / TE 1075 / RB 1101)  ⚠️ authored-IES
Parent `[Nose, Sternum, Left Knee, Right Knee]` · Side · Partial.
- **Primary (keeps id):** "Head staying tilted up after the catch rather than following the ball down into the body, so the tuck is never visually confirmed." · `[Nose, Sternum]` · Side · Partial · **Fundamental / Major**.
- **Child (new):** "Landing stiff-legged without knee flexion, costing balance and the ability to run after the catch." · `[Left Knee, Right Knee]` (already in the parent set — no ADD) · Side · **Yes** (knee-flexion measurable) · **Developing / Minor**.
  - **⚠️ IES has NO genuine parent sentence.** The parent IES describes head-snap-down + roll-over-the-ball; "as the feet return to the turf" is the only landing reference and says nothing about *knee bend*. A soft-knee-landing standard for this child would be **authored, not extracted** — exactly the BC-ball situation. **Flag for explicit content sign-off** before writing; do not pass it off as a partition.
- *Why split:* genuinely different measurements (head tracking vs knee-flexion-on-landing), different body regions — DB-like independence, and both landmark subsets already present so the split itself is clean. The *only* snag is the missing IES sentence for the child.

### S3 — Catching: head-secure ‖ breaking-stride-during-tuck  (WR 729 / TE 1081 / RB 1107)
Parent `[Nose, Neck, Elbows, Sternum]` · Both · Partial.
- **Primary (keeps id):** "Snapping the head forward before the ball is secured into the chest pocket, so the catch is completed blind." · `[Nose, Neck]` (+ Sternum ref) · Both · Partial · **Fundamental / Major**.
- **Child (new):** "Breaking stride or stuttering during the tuck, which surrenders the separation the route created." · **ADD `[Left Foot, Right Foot]`** (stride/step cadence) · Both · **Yes** · **Developing / Major**.
  - IES: extracted from the parent's "…all without breaking the vertical sprint into the end zone." (genuine).
- *Why split:* head vs stride — different region, needs feet the row lacks.

### S4 — Routes: stem-path (fade/banana) ‖ chopping-into-the-load  (WR 931/967 · TE 1437/1473)
Parent `[Left Hip, Right Hip, Left Knee, Right Knee, Pelvis Center]` · Both · Yes.
- **Primary (keeps id):** the path fault — 931/1437 "FADING EARLY — drifting outward before the break"; 967/1473 "BANANA STEMMING — curving the path inward". · KEEP landmarks · Both · Yes · **Developing / Major**.
- **Child (new):** "Chopping or stutter-stepping into the load, which turns a speed cut into a visible breakdown." · **ADD `[Left Foot, Right Foot]`** (step cadence at the gather) · Both · **Yes** · **Developing / Minor**.
  - IES: extracted from the parent's "…without chopping or stutter-stepping" (931/1437) / "…without any choppy or gathering steps" (967/1473). Genuine, per-row verified.
- *Why split:* stem-path (hip trajectory) vs gather-step cadence (needs feet the row lacks) — different measurement + missing landmark. (Note the parent's "(Absolute depth needs a scale reference)" caveat stays on the primary — a third, already-deferred aspect, not split out.)

### S5 — RB Routes/Wheel: banana-turn ‖ out-of-bounds  (RB 1218)
Parent `[Left Hip, Right Hip, Pelvis Center]` · Front · Yes.
- **Primary (keeps id):** "Banana Routing — rounding the vertical turn in a wide, looping circle." · KEEP · Front · Yes · **Developing / Major**.
- **Child (new):** "Stepping Out of Bounds — running too close to the sideline on the turn, leaving no room for a clean drop-in pass." · `[Left Hip, Right Hip]` · Front · **No / skip** (needs the **sideline / field boundary** — an external reference not in the pose landmarks, same class as ball-position and defender-position) · **Advanced / Minor**.
  - IES: extracted from the parent's "…aiming exactly 1 yard inside the sideline boundary." (genuine).
- *Why split:* the "banana" turn-shape is pose-measurable (hip trajectory) but "out of bounds" needs a field-boundary reference → **different measurability** — the RB analog of QB Ball-Carriage's ball facet. **Low-value child** (skip until field calibration) but the split keeps the measurable turn-shape honest rather than dragging the whole row down to a hedge.

**Landmark-vocab check:** every token proposed (`Left/Right Hip`, `Left/Right Knee`, `Left/Right Foot`, `Sternum`, `Nose`, `Neck`, `Left/Right Elbow/Wrist/Hand`) is already in `CONTROLLED_VOCAB` and resolves. **No new vocabulary.**

---

## Row-tag dispositions (26 rows — UPDATE-only, `fault_trigger` stays as multi-facet coaching text)

WR and its TE verbatim-twin get the same tags. Applied to `(WR id / TE id)`:

| Archetype (WR/TE ids) | player_tier | severity | note |
|---|---|---|---|
| Catching Center-Chest/Mid — eyes-early ‖ no-chin-drop (720/1072, RB 1098) | Fundamental | **Critical** | both facets = "clean catch becomes a fumble" (head/eye discipline, shared `[Nose,Neck,Sternum]`) |
| Release Diamond — soft-step ‖ lose-ground (777/1283) | Developing | Major | both = first-step launch quality on `[Feet,Ankles]` |
| Release Slide — bunny-hop ‖ feet-crossing (825/1331) | Developing | Major | both = slide-foot mechanics on `[Feet,Ankles]` |
| Release Slide — lean-early ‖ lean-back (830/1336) | Advanced | Major | both = torso lean (deception) on `[Sternum,Spine,Shoulders]` |
| Release Slide — drop-hands ‖ arm-never-clears (838/1344) | Developing | Major | both = arm-fight path on `[Elbows,Wrists,Shoulders]`; hand technique deferred (Partial) applies to both |
| Release Split — over-split ‖ feet-timing/stagger (845/1351) | Developing | Major | both = split-jump landing on `[Feet,Ankles,Hips]` |
| Release Split — click-back ‖ foot-slide (858/1364) | Developing | Major | both = drive-foot contact on `[Feet,Ankles]` |
| Release Split — slam-into-DB ‖ drift-wide (864/1370) | Developing | Major | both = escape-path direction on `[Feet,Ankles]` (defender not in frame → Partial, both) |
| Routes Cuts-Speed — pop-up ‖ over-sink (875/1381) | Developing | Major | both = hip-sink amount on `[Hips,Pelvis]` |
| Routes Dig — overstride ‖ floppy-foot (945/1451) | Developing | Major | both = plant-step mechanics on `[Feet,FootIndex,Ankles]` |
| Routes In — overstride ‖ floppy-foot (961/1467) | Developing | Major | identical to Dig |
| Routes Seam — overstride/floppy ‖ lateral-drift (973/1479) | Developing | Major | both foot-landmark-based (rigidity + lateral path) |

**RB row-tags:**
| Row | player_tier | severity | note |
|---|---|---|---|
| RB 1098 Catching Center-Chest/Mid | Fundamental | Critical | WR-720 twin |
| RB_FB 1165 Blocking Run-3 Point — pop-and-stop ‖ narrow-track | Fundamental | Major | both = drive-feet width/continuation on `[Feet,Knees]` |

---

## Proposed execution order (difficulty ladder — for the eventual go-ahead, not now)

1. **26 row-tags (UPDATE-only, zero new rows)** — WR + TE + RB. Lowest risk; proves the tagging path on these positions.
2. **Clean-IES splits (11 children):** S1 (hip-rotation, 709/1061/1087), S3 (stride, 729/1081/1107), S4 (chop, 931/967/1437/1473), S5 (wheel out-of-bounds, 1218) — all extract a genuine parent IES sentence; S3/S4 add feet, S1 adds hips, S5 child is skip.
3. **S2 LAST — the authored-IES splits (3 children: 723/1075/1101):** knee-flexion landing has **no genuine parent IES sentence**. Needs an explicit authored standard signed off before writing — do not ship it as a partition.

At execution, same anti-circularity as DB/QB: regenerate the snapshot from live, re-verify counts/tiers/content against a fresh live pull (not the snapshot's own assertions), rebuild the affected tests.

## Spot-check anchors (for your review before any go-ahead)
- **S1 / WR 709** (strongest split — hip landmark ADD + measurability divergence) and its TE twin 1061.
- **S2 / WR 723** (the authored-IES flag — the one to scrutinise, BC-ball-style).
- **RB 1218** (the skip-child / field-boundary case).

Nothing written to `checkpoints_v2`.
