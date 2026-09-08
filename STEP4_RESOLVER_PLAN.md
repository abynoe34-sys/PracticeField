# Step 4 — `layer3_resolver` → `checkpoints_v2` rewire: implementation plan

> Status: **parts (a)+(b)+(c) DONE & verified 2026-09-07; (d) out of scope as planned.** QB resolves
> from checkpoints_v2; the 22 migrated cues verified resolving on their correct checkpoints (24/24 +
> 28/28 tests). Ready for the single end-of-flow review/merge decision. Step 6 still HELD.
>
> **UPDATE 2026-09-08 — WR wired to checkpoints_v2.** WR became fully annotated (291/291, 0 NULL
> measurable_by_pose, 0 pollution) and was wired in by adding `"WR"` to `V2_POSITIONS` (reusing the
> QB source layer, no duplication). WR resolves 291 rows (181 judge / 110 proxy / 0 skip), all
> techniques ready, phased techniques ordered by phase_order and unphased (First Step / First 5 Yards
> / Stance) by row_id. Resolver suite now 40/40; cleaning suite 28/28; QB unchanged. Must-land
> spot-check: Split Release (24 rows, 4 phases in order, anchor row 865) + the 8 CLAUDE.md-"Part C"
> retiered Catching rows asserted at their ACTUAL tier (proxy_only, NOT judge) and hands-free — a
> tripwire against a silent flip toward the stale aspiration. **Separate, still-open follow-up (NOT
> decided here):** whether those 8 rows should get the hand-token treatment CLAUDE.md's Part C
> describes, or the pose-only Partial annotation stands as the real answer. Step 6 still HELD (the
> JSON files remain in place, just no longer read by the resolver).
>
> **UPDATE 2026-09-08 — TE wired to checkpoints_v2.** TE became fully annotated (308/308, 0 NULL
> measurable_by_pose, 0 pollution) and was wired by adding `"TE"` to `V2_POSITIONS` (reusing the
> QB/WR source layer). TE resolves 308 rows (197 judge / 111 proxy / 0 skip), all techniques ready.
> Wrinkle handled: First Step + Stance are partially phased *at the technique level* but all-or-nothing
> *per variation* (WR-copied variations unphased→row_id; TE-original 2-Point/3-Point phased→phase_order),
> so ordering stays clean — covered by a test. ~85% of TE (263/308) is WR-copied ANNOTATION (positional
> within group; IES reworded receiver→tight end). Must-land spot-check: (1) join-copy fidelity —
> Catching 21/21 + Split Release 24/24 resolve with landmarks+tier IDENTICAL to WR (no resolver-visible
> drift); (2) anchor row 1371 (TE's copy of WR's verified 865) resolves at Vertical Escape / po4 /
> proxy_only, landmarks identical to WR 865, content intact AND correctly TE-worded ('tight end', not
> 'receiver'); (3) a TE-ORIGINAL technique (First Step / Start - 2 Point, phases 1-5) resolves in order.
> Resolver suite now 65/65; cleaning suite 28/28; QB + WR unchanged. Step 6 still HELD (DB/RB/OL still
> read the JSON). CLAUDE.md changelog updated to QB+WR+TE.
> Prereq context: the 2026-09-07 source-of-truth migration (see CLAUDE.md changelog + `migration-v22`).
> Scope guard: Step 6 (retire JSON) stays HELD until (a)+(b) land and are verified.

## Why this is a rewrite, not a data-source swap

`checkpoints_v2` (1,638 rows, rebuilt taxonomy) differs from the legacy per-position JSON in
ways that touch the resolver's core, established by direct live query:

- **Pose annotation is essentially QB-only.** QB 327/342 annotated; **WR 0/291**; TE/DB/RB 0/609;
  OL 59/396. "Content exists" (all positions) and "content is CV-usable" (QB only) are two
  different completion bars — only QB has cleared the second. This is the biggest structural fact.
- **`pose_landmarks` is comma-shattered + note-polluted — QB only.** 69 QB rows (78 elements)
  carry free-text note fragments as bogus array elements (e.g. `"Neck. (Head orientation
  measurable; gaze deferred.)"`, `"and accuracy need ball tracking...)"`). OL's 59 rows are
  clean (0 polluted). So the pollution is specific to QB's ingestion, not systemic — the cleaner
  must fix QB **and** be a no-op on clean OL input.
- **No checkpoint-label field.** `final_checkpoint` is NULL on all 1,638 rows; there is no
  composite `name`. The resolver's `measurement = name.split(" - ")[-1]` key is gone.
- **Tier columns gone.** `judge`/`proxy_only`/`skip` don't exist; derive from `measurable_by_pose`.
- **`formation` is a new populated dimension** (`All formations` + Gun/Pistol/UC). The old JSON
  folded formation into `variation`; the resolver never consulted it.
- **Phase structure is per-technique, not per-position.** Fully phased: QB Ball Carry, WR
  Routes/Release/Catching/Blocking/Ball Carry. Partial: QB Exchange (10/46), Pocket Movement
  (30/83). **No phase at all: QB Drop-Back, Stance, Throwing; WR Stance/First Step/First 5 Yards.**
- **Field renames / missing meta.** `static_dynamic` (was `static_or_dynamic`); no `pose_landmarks_note`
  column (notes are inline in the array); no `meta.record_count` to validate against.
- **`anchor_phase()`/`PHASE_ORDER`/`_conditional_notes()` are 100% old-vocab** and effectively dead.
- **No committed tests exist** for the dynamic pipeline. The "10 spec checks"/"51/51" were ad-hoc.

## Decisions locked in

1. **Partial-annotation guard — per `(position, technique)`, keyed on NULL `measurable_by_pose`.**
   A technique resolves only if ALL its rows are annotated. Otherwise it's reported as an explicit
   **"not yet migrated"** entry — never a silently-thin checklist. NULL = not-yet-annotated (gate it);
   `'No'` = a real annotation (coach-visible, camera-blind → `skip` tier, keep it). The guard keys on
   NULL, never on tier. Result: **QB Drop-Back / Pocket Movement / Throwing / Stance resolve now;
   QB Exchange (36/46) and Ball Carry (0/5) surface as not-migrated; all WR/TE/DB/RB not-migrated.**
2. **Checkpoint-label synthesis:** `phase` where present; where absent, a short label from the IES's
   **leading clause** (human-readable). Row-id is an internal/debug identifier only, never the display label.
3. **No-phase ordering fallback:** order by `id` (insertion order). Plain, stable, honest about being
   arbitrary — no invented heuristic that looks intentional. (Old keyword heuristic is retired.)
4. **Cleaner robustness:** built against QB polluted rows AND validated as a no-op on OL clean rows,
   so it is not a QB-shaped hack that corrupts good annotation when OL is eventually resolved.

## Deliverables

### (a) Data-access + cleaning layer — `service/rulesets/checkpoints_v2_source.py`  *(in progress)*
Returns records in the **same dict shape the resolver already consumes** (minimal core changes).
- **`clean_pose_landmarks(arr) -> (tokens, note)`** — rejoin the shattered array with `", "` and run
  the ported `split_landmarks()` (strip a trailing `". (note)"` / whole-field `"(note)"` before
  comma-tokenising). Recovers `"Neck."→Neck`, `"Ball Position."→Ball Position`; routes pure debris to
  the note; idempotent on clean input.
- **`derive_tier(measurable_by_pose)`** — Yes/Needs Motion→judge, Partial→proxy_only, No→skip.
- **`synthesize_label(row)`** — phase, else IES leading clause (decision 2).
- **`normalize_row(v2_row)`** — column map (`static_dynamic`→`static_or_dynamic`, formation passthrough,
  etc.); fail loud (`UnknownLandmarkError`) on any token outside `CONTROLLED_VOCAB` **after** cleaning.
- **`technique_readiness(rows)`** — the per-(position,technique) guard (decision 1).
- **`load(...)`** — supabase-py read (creds already in the Python service) with a **local-snapshot
  fallback** so offline dev keeps working (mirrors the current JSON-iteration workflow).
- **Tests** (`test_checkpoints_v2_source.py`): cleaner on real QB polluted rows → only in-vocab tokens
  + captured note, no real token dropped; OL clean rows → unchanged (no-op); pure-debris → []+note;
  tier mapping; normalize fail-loud on a synthetic unknown token; guard (NULL gates, `'No'` resolves).
  Real fixtures committed under `service/rulesets/testdata/`.

### (b) QB-first resolver rewire + hard guard
- Add `formation` param (`'All formations'` = wildcard); new-vocab matching (step count in `variation`,
  Gun/Pistol/UC in `formation`).
- Replace dead `anchor_phase()`/`PHASE_ORDER`: order by `phase_order` where present, else by `id`.
- Rewrite `_conditional_notes()` keys to new vocab.
- Guard: any queried `(position,technique)` with ≥1 NULL row → `not_migrated` marker + counts, checkpoints
  omitted (not tierless); position-only queries return ready techniques' checklists PLUS a
  `not_migrated_techniques` list.

### (c) First committed test suite (resolver)
Translate the behavioral guarantees to new-vocab fixtures (no-verdicts, fail-loud, camera-view gating,
handedness precedence, derived-token resolution); `QB/Gun/5 Step` → `QB / Drop-Back / variation=5 Step /
formation=Gun`. New tests: `'All formations'` wildcard, the not-migrated guard, NULL-vs-`'No'`. **Phase-
scoping tests move off Drop-Back** (no phase) onto a phased technique.

### (d) WR/others gated as a DATA prerequisite (not resolver work)
WR's 0/291 annotation is authoring in `checkpoints_v2` (Measurable-by-Pose, Pose Landmarks, Camera Angle,
Static/Dynamic per row) — the resolver cannot synthesize it. Until done, WR stays on JSON or is reported
not-migrated. Out of scope here.

## Sequencing
(a) cleaner+tests → (b) QB-first resolver+guard+tests → **verify the 22 migrated cue rows resolve with
their cues** → only then is Step 6 (retire JSON) back on the table.

## Out of scope (unchanged)
Step 6; authoring WR/TE/DB/RB annotation; new coaching content; Defense/Formation values except where
QB matching needs `formation`.
