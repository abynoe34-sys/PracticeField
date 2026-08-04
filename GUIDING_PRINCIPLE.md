# Practice Field — Guiding Principle (the North Star)

This sits ABOVE every spec, feature, and technical decision. When in doubt about what to
build or how, judge it against this. Everything else in the project — the pipeline, the pose
estimation, the specs, the catalogue — exists to serve what's written here. If a decision
doesn't serve this, it's noise.

## The North Star

**Replicate the coach standing next to the player.**

The entire goal of Practice Field is captured in one question:

> "If I'm a coach standing next to my player during drills — what am I watching, what mistake
> am I seeing, and how do I correct it?"

That is the product. Three beats, in order:

1. **What am I watching for** — the specific things that matter for THIS position and technique.
2. **What mistake am I seeing** — recognising the known fault pattern.
3. **How do I correct it** — a cue the player can act on right now, and a drill that fixes it.

The app is not a measuring tape that reports numbers. It is an attempt to replicate the coach's
**EYE** (what to look for, what's wrong) and the coach's **MOUTH** (how to say the fix so it lands).

## Decision tests that fall out of this

1. **The "would a coach actually say this?" razor.** Every piece of feedback must pass it.
   - ❌ "Your hip-shoulder slope is -70.49°." (a sensor reporting)
   - ✅ "Get your hips up — you're going to lunge off the ball." (a coach coaching)

   Apply this to the ruleset content AND to how the app phrases everything.

2. **The catalogue is the coaching; the pipeline is just delivery.** The rulesets
   (position → what to watch → the mistake → the correction) ARE the product's intelligence. The
   pose estimation, measurement, confidence handling, and capture machinery are impressive — but
   they are only the DELIVERY MECHANISM for the coaching. Never mistake the plumbing for the point.

3. **Honesty about the camera's limits is part of the goal, not a betrayal.** A real coach's eye
   sees things a camera cannot: the player's eyes, their pre-snap read, the play context, movement
   over ground. Knowing WHERE pose analysis can replicate the coach and where it CANNOT (yet) is
   being true to the goal — it maps what's buildable now vs. what needs more. Don't fake the parts
   the camera can't see; be clear about them.

4. **This is the moat.** Generic competitors (CheckMotion, etc.) report measurements across 30+
   sports. A generalist structurally CANNOT have a coach's eye for 30 sports. Practice Field can
   have it for football. "Narrow and deep" really means: we are trying to BE the coach, not the
   measuring tape. That depth is the defensible edge.

## What this implies for how work is prioritised

- The **ruleset catalogue** (the coach's knowledge, per position/technique) is the heart of the
  product and can only come from real coaching expertise. It is the highest-value work, even
  though it's slower because it needs a human coach's brain.
- **Feedback quality is measured by the razor above**, not by how many metrics are computed.
- **New features earn their place by serving the watch → mistake → correct loop.** A feature that
  adds measurement but not coaching is suspect.
- Where the camera can't yet see what a coach sees (dynamic movement, reads, context), that's a
  known frontier — capture the coaching detail, but be honest that automating it needs capability
  that doesn't exist yet.

---

*The condensed version of this principle also sits at the top of `CLAUDE.md` (loaded into context
each session). This file is the canonical, full statement. Everything else serves it.*
