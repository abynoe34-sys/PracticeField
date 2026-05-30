/**
 * Quarterback Position-Specific Drill Library
 * Primary source: "QB Drill Tape — Tom Brady" (https://www.youtube.com/watch?v=1UJHfHe6iow)
 * Additional sources: coach-validated QB technique resources
 * Used by: training plan generator, video analysis AI, drill reference UI
 *
 * Core QB philosophy (Brady approach):
 *  1. Footwork is the foundation of every throw — dot drills every morning
 *  2. The drop is not moving backward; it is setting a platform to throw forward
 *  3. Pocket presence is built on a simple rule: always have a base to throw from
 *  4. Every throw is to a spot on the field — not to a receiver; the receiver runs to the spot
 *  5. Pre-snap wins games; post-snap confirms them
 */

import type { Exercise } from '@/types'

// ─── Reference Video Type ─────────────────────────────────────────────────────

export interface DrillVideoQB {
  title: string
  url: string
  duration: string
  notes?: string
}

// ─── Technique Areas ──────────────────────────────────────────────────────────

export type QBTechniqueArea =
  | 'stance_cadence'
  | 'drop_backs'
  | 'pocket_presence'
  | 'throwing_mechanics'
  | 'pre_snap_reads'
  | 'progressions'
  | 'footwork_agility'

export type QBDrillCategory = Exercise['category']

// ─── Drill Entry ──────────────────────────────────────────────────────────────

export interface QBDrillEntry {
  name: string
  category: QBDrillCategory
  technique_area: QBTechniqueArea
  sets: number | null
  reps: number | null
  duration: string | null
  why: string
  coaching_cue: string
  common_mistake: string
  fixes: string[]
  progressions: string[]
  videos: DrillVideoQB[]
}

// ─── Full QB Drill Library ────────────────────────────────────────────────────

export const QB_DRILLS: QBDrillEntry[] = [

  // ── STANCE & CADENCE ─────────────────────────────────────────────────────

  {
    name: 'Under-Center Stance & Snap Exchange',
    category: 'technique',
    technique_area: 'stance_cadence',
    sets: 3, reps: 10, duration: null,
    why: 'A fumbled snap or poor exchange kills drives before they start. The QB\'s hand placement, pressure on the center, and grip consistency at the exchange point must be automatic before any other skill can be built on top of it.',
    coaching_cue: 'Hands firm into the center\'s crotch — top hand pressure UP, bottom hand relaxed to receive. Eyes downfield from the snap.',
    common_mistake: 'Looking down at the snap — the QB\'s eyes must already be pre-snap scanning the defense at the moment of exchange',
    fixes: ['fumble', 'snap exchange', 'center exchange', 'ball handling', 'under center'],
    progressions: ['Static exchange reps with center', 'Exchange + freeze and hold', 'Exchange + immediate 3-step drop', 'Exchange + live snap count with defense'],
    videos: [
      { title: 'QB Drill Tape — Tom Brady', url: 'https://www.youtube.com/watch?v=1UJHfHe6iow', duration: '~15 min', notes: 'Primary source — Brady drill sequence' },
    ],
  },
  {
    name: 'Shotgun Snap & Set Drill',
    category: 'technique',
    technique_area: 'stance_cadence',
    sets: 3, reps: 10, duration: null,
    why: 'In shotgun, the QB must field a long snap cleanly, set their feet immediately, and be ready to throw — all in ~1 second. A bobbled snap or sloppy set destroys the entire timing of the play.',
    coaching_cue: 'Catch the snap with BOTH hands, set your feet to throwing width instantly — you are already reading coverage before the snap arrives',
    common_mistake: 'Waiting to set feet until after catching the snap — costs 0.3–0.5 seconds, which is the difference between a clean pocket and immediate pressure',
    fixes: ['shotgun', 'snap', 'gun exchange', 'footwork', 'timing', 'set feet'],
    progressions: ['Stationary catch + set', 'Catch + immediate read look', 'Full gun 3-step timing route', 'Full-speed vs. live pass rush'],
    videos: [
      { title: 'QB Drill Tape — Tom Brady', url: 'https://www.youtube.com/watch?v=1UJHfHe6iow', duration: '~15 min' },
      { title: 'QB Gun 3-Step No-Hitch Dropback Footwork', url: 'https://www.youtube.com/watch?v=srNXfIDSPF8', duration: '~6 min' },
    ],
  },

  // ── DROP-BACKS ────────────────────────────────────────────────────────────

  {
    name: '3-Step Drop (Quick Game)',
    category: 'footwork',
    technique_area: 'drop_backs',
    sets: 5, reps: 8, duration: null,
    why: 'The 3-step drop is the entire rhythm of quick game — slant, hitch, quick out, bubble. The ball must be out by the third step. Slow drops turn timing routes into sack situations because the window is only open for 1.5–2 seconds.',
    coaching_cue: 'Step 1 crosses behind, Step 2 opens the hips, Step 3 is the throw step — the ball leaves your hand AT step 3, not after.',
    common_mistake: 'Adding a hitch step after the third step on quick routes — this is a timing route; extra steps mean the window has already closed',
    fixes: ['drop back', '3 step', 'quick game', 'timing', 'slow drop', 'slant', 'hitch route', 'footwork'],
    progressions: ['Shadow drop (no ball)', 'Drop + throw to stationary target', 'Drop + throw to moving WR with timing', 'Drop + live pass rush with route'],
    videos: [
      { title: 'QB Drill Tape — Tom Brady', url: 'https://www.youtube.com/watch?v=1UJHfHe6iow', duration: '~15 min' },
      { title: 'Episode 6 QB Tutor: 3, 5 & 7 Drop Step', url: 'https://www.youtube.com/watch?v=Lh-ZjURzVyk', duration: '~12 min' },
      { title: 'The 3 and 5 Step Drop Explained — QB Mechanics', url: 'https://www.youtube.com/watch?v=xdZGuYOgnwQ', duration: '~8 min' },
      { title: 'Chad Pennington — Footwork 3-Step Drop', url: 'https://www.youtube.com/watch?v=0O8TTJWV0tw', duration: '~10 min' },
      { title: 'QB Dropback Footwork — Rhythm, Balance, Posture (Bill Renner)', url: 'https://www.youtube.com/watch?v=L5Ykp_a9Mis', duration: '~15 min' },
    ],
  },
  {
    name: '5-Step Drop (Intermediate Routes)',
    category: 'footwork',
    technique_area: 'drop_backs',
    sets: 5, reps: 8, duration: null,
    why: 'The 5-step drop times the intermediate route tree — dig, curl, crossing route, comeback. The landmark (depth) must be consistent so the QB\'s platform is always in the same place relative to the protection. Drift and inconsistent depth lead to inaccuracy and sacks.',
    coaching_cue: 'Hit your landmark at 5-7 yards — do NOT drift further back. Set, gather, throw. Your depth is your protection\'s depth.',
    common_mistake: 'Drifting past the landmark because of pressure — this pulls the QB out of rhythm and shortens throws. Set at the landmark and move laterally, not backward.',
    fixes: ['drop back', '5 step', 'footwork', 'drift', 'depth', 'platform', 'pocket', 'timing'],
    progressions: ['Shadow 5-step to landmark', 'Drop + hitch + throw', 'Full-speed to WR on timing', 'vs. live pass rush with hot read'],
    videos: [
      { title: 'QB Drill Tape — Tom Brady', url: 'https://www.youtube.com/watch?v=1UJHfHe6iow', duration: '~15 min' },
      { title: 'Episode 6 QB Tutor: 3, 5 & 7 Drop Step', url: 'https://www.youtube.com/watch?v=Lh-ZjURzVyk', duration: '~12 min' },
      { title: 'QB 3-Step and 5-Step Drop Tips', url: 'https://www.youtube.com/watch?v=3eTc7QN1CaU', duration: '~7 min' },
      { title: 'The 3 and 5 Step Drop Explained — QB Mechanics', url: 'https://www.youtube.com/watch?v=xdZGuYOgnwQ', duration: '~8 min' },
    ],
  },
  {
    name: '7-Step Drop (Deep Game & Play-Action)',
    category: 'footwork',
    technique_area: 'drop_backs',
    sets: 4, reps: 6, duration: null,
    why: 'The 7-step drop is for deep routes — corner, post, seam, go — and play-action fakes. It requires a smooth, fast drop to 9–11 yards, a firm set, and a full-field vision scan. QBs who rush the 7-step throw off their back foot or before the receiver breaks.',
    coaching_cue: 'Fast drop, firm set — gather before the throw. The deeper the route, the MORE important the platform, not less.',
    common_mistake: 'Rushing the throw before completing the drop — this is always off the back foot and almost always overthrows the route',
    fixes: ['drop back', '7 step', 'deep ball', 'play action', 'footwork', 'rushing throw', 'off back foot', 'deep routes'],
    progressions: ['7-step shadow to landmark', 'Full drop + play-action fake + throw', 'Full-speed vs. WR on timing', 'vs. live rush with deep route'],
    videos: [
      { title: 'QB Drill Tape — Tom Brady', url: 'https://www.youtube.com/watch?v=1UJHfHe6iow', duration: '~15 min' },
      { title: 'Episode 6 QB Tutor: 3, 5 & 7 Drop Step', url: 'https://www.youtube.com/watch?v=Lh-ZjURzVyk', duration: '~12 min' },
      { title: '8 New QB Footwork Drills', url: 'https://www.youtube.com/watch?v=JLzVt2gR2wQ', duration: '~12 min' },
    ],
  },

  {
    name: 'Hitch Weight-Shift / Deep Ball Momentum Drill',
    category: 'footwork',
    technique_area: 'drop_backs',
    sets: 3, reps: 8, duration: null,
    why: 'Coach Grant Caraway: "Momentum creation from the hitch will help you get more distance on your deep throws." When throwing a deep fade or post off a 3-step + hitch, a QB who lets weight drift forward kills velocity. Rocking weight from front foot to back foot on the hitch creates stored momentum that drives the throw further — the same principle as a pitcher\'s wind-up.',
    coaching_cue: 'Rock front-to-back on the hitch — upper body shifts back, do NOT click your feet together. Stack position when your stride foot lands. Then hips bring the shoulders through on the throw.',
    common_mistake: 'Clicking the feet together at the hitch — this forces a massive forward stride that blows up the stack position and costs 5–10 yards on deep balls',
    fixes: ['deep ball', 'arm strength', 'velocity', 'hitch', 'deep fade', 'deep post', 'drop back', 'momentum', 'weak deep ball', 'distance'],
    progressions: [
      'Part 1: rock front-to-back only (8 reps, no throw)',
      'Part 2: rock front-to-back twice (8 reps, no throw)',
      'Part 3: rock → rock → stride → throw (8 full reps)',
      'Full-speed 3-step + hitch + deep ball to WR',
    ],
    videos: [
      { title: '5 Drills QBs MUST DO This Off Season (2025) — First Down Training', url: 'https://www.youtube.com/watch?v=SZGs225LV1A', duration: '~11 min', notes: 'Drill 5 — hitch weight-shift deep ball' },
    ],
  },

  // ── POCKET PRESENCE ───────────────────────────────────────────────────────

  {
    name: 'The Brady Drill (Drop → Plant → Hitch → Shuffle)',
    category: 'footwork',
    technique_area: 'pocket_presence',
    sets: 4, reps: 8, duration: null,
    why: 'This is Tom Brady\'s signature pocket drill — the foundation of his legendary pocket presence. Drop, plant at the landmark, hitch (small gathering step to reset platform), shuffle laterally to a new window. It trains the QB to NEVER stop scanning and to always maintain a throwing base.',
    coaching_cue: 'Drop → plant → hitch → shuffle → throw. Every hitch is a potential throw. Your eyes never stop working the field — you are always one step from release.',
    common_mistake: 'Turning the shoulders during the shuffle — this takes your eyes off downfield and telegraphs movement to the defense',
    fixes: ['pocket presence', 'pocket movement', 'drift', 'flushing too early', 'escaping too soon', 'platform', 'hitch step', 'shuffle'],
    progressions: ['Walk-through sequence (no ball)', 'With ball vs. stationary bags', 'Bags + throw on hitch or shuffle', 'vs. live pass rush + WR read'],
    videos: [
      { title: 'QB Drill Tape — Tom Brady', url: 'https://www.youtube.com/watch?v=1UJHfHe6iow', duration: '~15 min', notes: 'Primary source — this drill is the centerpiece' },
      { title: 'Russell Wilson — Pocket Presence, Release & Footwork', url: 'https://www.youtube.com/watch?v=thxQUFhwwlo', duration: '~15 min' },
    ],
  },
  {
    name: 'Slide Step (Lateral Pocket Movement)',
    category: 'footwork',
    technique_area: 'pocket_presence',
    sets: 4, reps: 8, duration: null,
    why: 'When a rusher beats the edge, the QB slides laterally — NOT backward — to reset a throwing lane. Sliding keeps the QB in the pocket, on their platform, and on schedule. Drifting backward collapses protection depth and shortens every route.',
    coaching_cue: 'Slide LATERALLY — do not go backward. Stay square, keep your eyes downfield, keep your base. You are moving the pocket, not leaving it.',
    common_mistake: 'Backing up instead of sliding — this compresses the protection and kills the throwing platform',
    fixes: ['pocket presence', 'pocket movement', 'slide', 'lateral movement', 'drift', 'backing up', 'flushing', 'sack'],
    progressions: ['Slide-step drill with cones (no pressure)', 'Slide + throw to one-side WR', 'vs. live one-man rush', 'vs. live two-man rush'],
    videos: [
      { title: 'QB Pocket Movement Drills — Tyler Allen', url: 'https://www.youtube.com/watch?v=NxehPCMiEsg', duration: '~10 min' },
      { title: 'Pocket Presence: Traits, Film & Drills', url: 'https://www.youtube.com/watch?v=NDFla5nMsf8', duration: '~12 min' },
      { title: 'Jeff Steinberg — QB Pocket Movement Drill', url: 'https://www.youtube.com/watch?v=LZrmZBKbXlo', duration: '~8 min' },
    ],
  },
  {
    name: 'Step Up & Reset (vs. Inside Pressure)',
    category: 'footwork',
    technique_area: 'pocket_presence',
    sets: 4, reps: 6, duration: null,
    why: 'Inside pressure (stunts, A-gap blitzes) closes faster than edge rushers. The answer is to step up into the pocket — this avoids the rusher, creates a clean platform, and often opens the middle of the field as linebackers over-pursue.',
    coaching_cue: 'Step UP and THROUGH the pressure — not to the side. Two steps forward, set your feet, throw. Moving forward into pressure is counterintuitive but correct.',
    common_mistake: 'Flushing sideways or backwards from inside pressure — this abandons the protection and almost always results in a scramble or sack with yards behind the line',
    fixes: ['pocket presence', 'inside pressure', 'blitz', 'step up', 'stunt', 'climbing', 'sack', 'pressure'],
    progressions: ['Walk-through step-up vs. stationary rusher', 'Step-up + throw flat route', 'vs. live inside rusher (no contact)', 'Full live pass rush with step-up reads'],
    videos: [
      { title: 'QB Pocket Movement Drills — Tyler Allen', url: 'https://www.youtube.com/watch?v=NxehPCMiEsg', duration: '~10 min' },
      { title: 'QB Quarterback Pocket Presence Drills — Jeff Garcia', url: 'https://www.youtube.com/watch?v=bpA9WHmi0e8', duration: '~10 min' },
    ],
  },
  {
    name: '"Throwing in the Trees" — Pocket Accuracy Under Obstruction',
    category: 'technique',
    technique_area: 'pocket_presence',
    sets: 3, reps: null, duration: '10 minutes',
    why: 'In a real game, the QB throws through a forest of linemen — the release must be high, tight, and on a precise lane. This drill uses pop-up bags around the QB to simulate that environment and train throwing between gaps, not over or around them.',
    coaching_cue: 'Find the lane, keep the elbow up — throw BETWEEN the bags, not over them. This is about release lane discipline, not arm strength.',
    common_mistake: 'Throwing over the obstruction (too high) or going around it (inaccurate angle) — train the release lane through the gap',
    fixes: ['accuracy', 'pocket', 'throwing lane', 'release', 'high release', 'linemen', 'tipped passes'],
    progressions: ['2 bags / wide lanes', '4 bags / tight lanes', 'Moving bags + timing throw', 'Full live pocket simulation'],
    videos: [
      { title: 'Quarterback Drill: Pocket Presence "Throwing in the Trees"', url: 'https://www.youtube.com/watch?v=mLDCQWEFBRQ', duration: '~8 min' },
      { title: 'QB Pocket Presence Drill — MVP Drive', url: 'https://www.youtube.com/watch?v=opO1vRvcFdQ', duration: '~6 min' },
    ],
  },

  {
    name: 'Cone Box Pocket Shuffle (4-Cone Reaction)',
    category: 'footwork',
    technique_area: 'pocket_presence',
    sets: 6, reps: null, duration: '6 sets',
    why: 'Coach Grant Caraway: "Works on staying in a good base while having to move in the pocket." The 4-cone box forces the QB to shuffle in all four directions while maintaining the stacked throwing position — head, knee, foot aligned, light on the front foot. Reactive version (partner calls random cone numbers) makes it game-realistic rather than predictable.',
    coaching_cue: 'Shuffle to each cone but STAY in your base — head, knee, and foot stacked on the throwing side, light on the front foot the whole time. Do not tip or lean out of position as you move. You are ready to throw from any cone.',
    common_mistake: 'Breaking the stacked base when shuffling — leaning toward the cone you\'re moving to instead of moving under control in your throwing-ready position',
    fixes: ['pocket presence', 'pocket movement', 'pocket footwork', 'base', 'footwork', 'staying in base', 'reaction', 'movement'],
    progressions: [
      'Solo: 1 → 2 → 3 → 4 in order, return to center',
      'Solo: random self-called sequence',
      'Partner: random cone calls (game-realistic reaction)',
      'Partner: random calls + throw immediately after each shuffle',
    ],
    videos: [
      { title: '5 Drills QBs MUST DO This Off Season (2025) — First Down Training', url: 'https://www.youtube.com/watch?v=SZGs225LV1A', duration: '~11 min', notes: 'Drill 4 — cone box pocket shuffle' },
    ],
  },

  // ── THROWING MECHANICS ────────────────────────────────────────────────────

  {
    name: 'Towel / Slo-Motion Wall Drill (Arm Path)',
    category: 'technique',
    technique_area: 'throwing_mechanics',
    sets: 3, reps: 15, duration: null,
    why: 'The towel drill (or slo-motion wall drill) isolates the arm path and release point with no ball, no power, no bad habits. Brady used this type of slow deliberate motion work to wire perfect mechanics before adding speed. Slow is smooth, smooth is fast.',
    coaching_cue: 'Lead with the elbow, wrist snaps DOWN and OUT on release. Feel the correct path — slow enough to own every inch of it.',
    common_mistake: 'Rushing through the motion to "feel like throwing" — the value of this drill is in the deliberate, felt rehearsal of the correct path',
    fixes: ['throwing mechanics', 'arm path', 'mechanics', 'side arm', 'drop elbow', 'release', 'accuracy', 'elbow'],
    progressions: ['Towel only (no ball)', 'Wall drill slo-motion with ball', 'Half-speed partner toss 5 yards', 'Full-speed throw with attention to arm path'],
    videos: [
      { title: 'How to Throw a Football — Tom Brady', url: 'https://www.youtube.com/watch?v=lv5p2Xqkxyk', duration: '~5 min', notes: 'Brady on arm path, wrist snap, and follow-through' },
      { title: 'QB Drill Tape — Tom Brady', url: 'https://www.youtube.com/watch?v=1UJHfHe6iow', duration: '~15 min' },
      { title: 'Slo-Motion Wall Drill — Throwing Mechanics (Bill Renner)', url: 'https://www.youtube.com/watch?v=vM2cGZFKMqg', duration: '~10 min' },
      { title: 'QB Throwing Mechanics: The Most Effective Arm Motion', url: 'https://www.youtube.com/watch?v=_9mQpxVVyUQ', duration: '~8 min' },
      { title: 'Fix Side-Arm Throws / Dropping the Elbow', url: 'https://www.youtube.com/watch?v=hiPqrFRmnbI', duration: '~6 min' },
    ],
  },
  {
    name: 'Release Point Drill',
    category: 'technique',
    technique_area: 'throwing_mechanics',
    sets: 3, reps: 15, duration: null,
    why: 'Release point is the single biggest variable in QB accuracy. Too low and you sail the ball; too late and you telegraph. Brady\'s release is consistently at its apex — the moment the arm reaches full extension above the shoulder, the ball is gone. Consistent release = consistent accuracy.',
    coaching_cue: 'Ball leaves at the TOP — not past it, not before it. Elbow up, wrist through, follow the throw all the way to your hip.',
    common_mistake: 'Releasing too late (past the apex) — this causes the ball to tail and pulls throws short-arm or across the body',
    fixes: ['release point', 'accuracy', 'throwing mechanics', 'late release', 'inaccurate', 'mechanics', 'off target'],
    progressions: ['Stationary release drills vs. wall target', 'Short-range partner throws (5 yards)', 'Mid-range throws with attention to release', 'Full-speed game throws monitoring release consistency'],
    videos: [
      { title: 'How to Throw a Football — Tom Brady', url: 'https://www.youtube.com/watch?v=lv5p2Xqkxyk', duration: '~5 min', notes: 'Brady on release point and follow-through as diagnostic' },
      { title: 'QB Drill Tape — Tom Brady', url: 'https://www.youtube.com/watch?v=1UJHfHe6iow', duration: '~15 min' },
      { title: 'Release Point When Throwing a Football', url: 'https://www.youtube.com/watch?v=V2MxtvPeQ_c', duration: '~5 min' },
      { title: 'Release Point to Maximize Throwing Power', url: 'https://www.youtube.com/watch?v=p465DC-Ql-w', duration: '~6 min' },
      { title: 'A Perfect QB Throwing Motion', url: 'https://www.youtube.com/watch?v=zeLwNhu_g44', duration: '~12 min' },
    ],
  },
  {
    name: 'Hip Rotation & Platform Drill',
    category: 'technique',
    technique_area: 'throwing_mechanics',
    sets: 3, reps: 12, duration: null,
    why: 'Every QB throw is powered by the hips, not the arm. The arm delivers the ball; the hips generate the velocity. Brady\'s mechanics are textbook hip-to-shoulder sequential rotation — hips clear first, then shoulders, then arm, then wrist. This sequence is trainable.',
    coaching_cue: 'HIPS first — feel the hips open before your arm starts forward. Arm speed follows hip speed. Weak throws come from the arm; powerful accurate throws come from sequential hip-to-arm rotation.',
    common_mistake: 'Arm-throwing (shoulders and arm moving simultaneously) — this bypasses the hip drive, reduces velocity, and limits accuracy at long range',
    fixes: ['throwing mechanics', 'arm strength', 'velocity', 'weak throw', 'short arm', 'hip rotation', 'mechanics'],
    progressions: ['Hip isolation drill (hold shoulders, rotate hips)', 'Slow throw with emphasis on hip-first sequence', 'Partner throws monitoring hip timing', 'Full-speed throws vs. live route'],
    videos: [
      { title: 'How to Throw a Football — Tom Brady', url: 'https://www.youtube.com/watch?v=lv5p2Xqkxyk', duration: '~5 min', notes: 'Brady on hip firing and the full kinetic chain' },
      { title: 'QB Drill Tape — Tom Brady', url: 'https://www.youtube.com/watch?v=1UJHfHe6iow', duration: '~15 min' },
      { title: 'How to Play QB: Throwing Mechanics Progression', url: 'https://www.youtube.com/watch?v=w6-vH7MD2UM', duration: '~12 min' },
      { title: 'QB Throwing Mechanics: Point Association', url: 'https://www.youtube.com/watch?v=rqCWLHt933I', duration: '~8 min' },
    ],
  },
  {
    name: 'Accuracy Grid Drill (Spot Throwing)',
    category: 'technique',
    technique_area: 'throwing_mechanics',
    sets: 4, reps: 10, duration: null,
    why: 'Brady does not throw to receivers — he throws to spots, and receivers run to those spots. Training to hit specific targets on a grid (high-low, left-right, with and without movement) wires the QB to throw to a window, which is exactly what game conditions require.',
    coaching_cue: 'Pick the spot before the throw — commit to the window, not the body. Throw to the spot you called, not to wherever the WR ended up.',
    common_mistake: 'Tracking the receiver with the eyes and throwing late — a QB who throws to where the receiver IS will always be late; throw to where they WILL be',
    fixes: ['accuracy', 'spot throwing', 'inaccurate', 'off target', 'late throw', 'mechanics', 'footwork'],
    progressions: ['Stationary targets at 5/10/15/20 yards', 'Moving target on route', 'Anticipation throw to projected spot', 'Full-speed route with defender coverage'],
    videos: [
      { title: 'QB Drill Tape — Tom Brady', url: 'https://www.youtube.com/watch?v=1UJHfHe6iow', duration: '~15 min' },
      { title: 'QB Accuracy Drill', url: 'https://www.youtube.com/watch?v=oKEJ16H-Xpk', duration: '~7 min' },
      { title: '5 Best QB Drills (2021)', url: 'https://www.youtube.com/watch?v=i4-_o8PD7U0', duration: '~10 min' },
    ],
  },

  {
    name: 'Grip & Spiral Control Drill',
    category: 'technique',
    technique_area: 'throwing_mechanics',
    sets: 3, reps: 20, duration: null,
    why: 'Brady: "When it comes off that index finger and it\'s fluid, you know it\'s gonna spin and it\'s gonna be a good throw." Grip is the first link in the throwing chain — before footwork, before hip rotation, before anything. Wrong grip produces wobble, early release, or loss of velocity. This drill isolates the hand and wrist in slow motion until the correct grip is automatic.',
    coaching_cue: 'Ring and pinky fingers across the laces. Small air pocket between palm and ball — do NOT press it into your palm. Index finger slightly higher on the seam to guide the spiral. Thumb underneath for support. Relaxed — not a death grip.',
    common_mistake: 'Pressing the ball into the palm ("death grip") — this kills the roll-off the fingers and produces a flat, wobbling spiral. The ball must roll off the fingertips, not push off the palm.',
    fixes: ['grip', 'spiral', 'wobble', 'wobbly throw', 'mechanics', 'throwing mechanics', 'laces', 'spin'],
    progressions: ['Grip check static (just hold, no throw)', 'Short-range stationary spirals (5 yards)', 'Grip check mid-range (15 yards)', 'Full-speed throw with grip awareness'],
    videos: [
      { title: 'How to Throw a Football — Tom Brady', url: 'https://www.youtube.com/watch?v=lv5p2Xqkxyk', duration: '~5 min', notes: 'Brady explains grip, air pocket, and index finger placement in detail' },
      { title: 'Tom Brady Throwing Mechanics — Performance Labs', url: 'https://www.youtube.com/watch?v=0ViWaCVB3ng', duration: '~10 min' },
    ],
  },
  {
    name: 'Kinetic Chain / Ground-Up Throw Drill',
    category: 'technique',
    technique_area: 'throwing_mechanics',
    sets: 3, reps: 12, duration: null,
    why: 'Brady: "Throwing always starts with your legs — getting power from the ground up through your ankles, knees, hips, and shoulders into your arm. Once you get that energy traveling up from the ground, you don\'t want any of it to go anywhere except through the fingertips." A QB who throws with only the arm uses ~30% of their available power. The full kinetic chain is trainable in slow deliberate reps.',
    coaching_cue: 'Feel the sequence: FEET → ankles → knees → hips → shoulders → elbow → wrist → INDEX FINGER. The ball is the last thing to move. Every link must fire in order or the energy leaks.',
    common_mistake: 'Starting the throw from the shoulder or arm — this skips the entire lower-body contribution and produces a weak, arm-only throw with inconsistent trajectory',
    fixes: ['throwing mechanics', 'arm strength', 'velocity', 'weak throw', 'kinetic chain', 'hip rotation', 'power', 'mechanics'],
    progressions: ['Slow-motion isolated segment practice (legs only, then add hips, then add arm)', 'Half-speed full-chain throw to partner at 10 yards', 'Full-speed partner throw with chain awareness', 'Game-speed throw vs. live route'],
    videos: [
      { title: 'How to Throw a Football — Tom Brady', url: 'https://www.youtube.com/watch?v=lv5p2Xqkxyk', duration: '~5 min', notes: 'Brady walks through the full ground-up kinetic chain sequence' },
      { title: 'Tom Brady Throwing Mechanics — Performance Labs', url: 'https://www.youtube.com/watch?v=0ViWaCVB3ng', duration: '~10 min' },
      { title: 'QB Drill Tape — Tom Brady', url: 'https://www.youtube.com/watch?v=1UJHfHe6iow', duration: '~15 min' },
    ],
  },

  {
    name: 'Straight Jacket Drill (Hip-Shoulder Torque)',
    category: 'technique',
    technique_area: 'throwing_mechanics',
    sets: 1, reps: 30, duration: null,
    why: 'Coach Grant Caraway: "Arms crossed on the chest — no mileage on your arm. Great if you\'re on an off day and still want to work on your mechanics." The drill isolates the hip-to-shoulder sequence by removing the arm entirely. If the QB is pushing weight forward, they physically cannot rotate the front shoulder back — the drill gives instant feedback on whether the kinetic chain is correct.',
    coaching_cue: 'Arms crossed on chest. Stride to your target → front shoulder rotates BACK (slight — don\'t overdo it) → hips whip the upper half through. Think baseball swing: your bat doesn\'t start moving when your foot hits — you wait for the hips. Same here.',
    common_mistake: 'Pushing weight forward at the stride — this prevents the front shoulder from rotating back and makes true hip-shoulder dissociation physically impossible. You become an arm thrower.',
    fixes: ['throwing mechanics', 'arm throw', 'torque', 'hip rotation', 'hip shoulder', 'dissociation', 'mechanics', 'velocity', 'weak throw'],
    progressions: [
      'Slow: stride + front shoulder back + hold (feel the position)',
      'Moderate: full sequence with arm feedback (front shoulder → hips through)',
      'Full speed: 25–30 reps continuous',
      'Transfer: replicate same sequence in a full throw',
    ],
    videos: [
      { title: '5 Drills QBs MUST DO This Off Season (2025) — First Down Training', url: 'https://www.youtube.com/watch?v=SZGs225LV1A', duration: '~11 min', notes: 'Drill 1 — straight jacket' },
    ],
  },
  {
    name: 'Towel No-Stride Drill (Extension & Wrist Flick)',
    category: 'technique',
    technique_area: 'throwing_mechanics',
    sets: 1, reps: 25, duration: null,
    why: 'Coach Grant Caraway: "One of the best things you can do to work on your extension point and wrist flick if you don\'t have any receivers." The no-stride setup (front foot already open, shoulders already back) isolates the second half of the throw — weight-back position, hip drive, and wrist release — removing the stride so you can own that position before adding it back.',
    coaching_cue: 'Middle finger over the top of the towel — not a fist grip. Front foot already open, back shin straight in stack position. Shoulders start back, then HIPS bring shoulders through → wrist flick. Thin towel, held in the middle or slightly below.',
    common_mistake: 'Gripping the towel like a fist — changes the wrist mechanics entirely. The grip should mimic how you hold a football: middle finger on top, flick off the fingertip.',
    fixes: ['wrist flick', 'extension point', 'throwing mechanics', 'weight back', 'wrist', 'mechanics', 'release', 'follow through'],
    progressions: [
      'Static position check (no movement — just feel the stance)',
      'Slow flick × 10 reps emphasizing wrist snap',
      'Full-speed 20–25 reps',
      'Replicate same wrist feel immediately into a live throw',
    ],
    videos: [
      { title: '5 Drills QBs MUST DO This Off Season (2025) — First Down Training', url: 'https://www.youtube.com/watch?v=SZGs225LV1A', duration: '~11 min', notes: 'Drill 2 — towel no-stride' },
    ],
  },

  // ── FOOTWORK & AGILITY ────────────────────────────────────────────────────

  {
    name: 'Five-Dot Drill (Brady Footwork Method)',
    category: 'agility',
    technique_area: 'footwork_agility',
    sets: 3, reps: null, duration: '10 minutes daily',
    why: 'Tom Brady famously spray-painted dots on his driveway and practiced this drill every morning at 6am. It enhances foot quickness, coordination, and agility in the pocket — areas where Brady was rated poorly as a prospect but became elite through deliberate daily practice. The drill improves nimbleness, mental timing, and muscle memory.',
    coaching_cue: 'Hit every dot precisely — this is about accuracy of foot placement, not just speed. Fast AND precise. Brady\'s words: "There\'s more than one way to be elusive."',
    common_mistake: 'Going fast but imprecise — slapping feet anywhere "near" the dots builds imprecise footwork habits. Every contact matters.',
    fixes: ['footwork', 'foot speed', 'agility', 'quickness', 'slow feet', 'pocket agility', 'coordination'],
    progressions: ['Slow walk-through all patterns', 'Moderate speed with precision', 'Max speed with precision', 'Brady variations (custom patterns)'],
    videos: [
      { title: 'QB Drill Tape — Tom Brady', url: 'https://www.youtube.com/watch?v=1UJHfHe6iow', duration: '~15 min', notes: 'Brady\'s dot drill method demonstrated' },
      { title: '4 At-Home QB Footwork Drills', url: 'https://www.youtube.com/watch?v=_YPiwiZKNoA', duration: '~8 min' },
      { title: '8 New QB Footwork Drills', url: 'https://www.youtube.com/watch?v=JLzVt2gR2wQ', duration: '~12 min' },
    ],
  },
  {
    name: 'QB Footwork for Pass Game (Roll-Out, Sprint-Out, Bootleg)',
    category: 'footwork',
    technique_area: 'footwork_agility',
    sets: 4, reps: 6, duration: null,
    why: 'Not all passes are thrown from a set pocket. Roll-outs, sprint-outs, and boots require the QB to throw on the run — maintaining hip alignment to the throw target while the body is moving laterally. A QB who can only throw from a static pocket is a predictable QB.',
    coaching_cue: 'Hips always face the target at the moment of release — you can run sideways but you THROW forward. Feet point to the target on release.',
    common_mistake: 'Throwing across the body because hips are still running sideways at release — this causes significant inaccuracy and arm strain',
    fixes: ['footwork', 'scramble', 'roll out', 'sprint out', 'bootleg', 'throwing on the run', 'moving pocket'],
    progressions: ['Walk-through roll-out + hip reset + throw', 'Half-speed roll-out + throw to target', 'Full-speed roll-out vs. WR route', 'Live boot play with defender'],
    videos: [
      { title: 'QB Footwork Drills for Pass Game', url: 'https://www.youtube.com/watch?v=1REO9WnNO3c', duration: '~8 min' },
      { title: '5 Best QB Drills', url: 'https://www.youtube.com/watch?v=A5Z9_ON3GzQ', duration: '~10 min' },
    ],
  },

  {
    name: 'PVC Pipe Over-Step (Pocket Light-Feet Drill)',
    category: 'agility',
    technique_area: 'footwork_agility',
    sets: 6, reps: null, duration: '20 seconds per set',
    why: 'Coach Grant Caraway: "Gets us comfortable moving on the ball of our feet" in the pocket. Stepping over the pipe forces the QB to lift their feet rather than drag-shuffle, building the quick, light footwork that allows rapid pocket adjustments. Eyes staying downfield throughout is the game-realistic demand.',
    coaching_cue: 'Stay on the BALLS of your feet — quick, light steps over the pipe. Left-right-left-right OR right-left-right-left. Eyes UPFIELD — not on the pipe. Progress to eyes-up as soon as the pattern feels automatic.',
    common_mistake: 'Looking down at the pipe or your feet — begin with eyes down if needed (especially younger players), but progress to eyes upfield as quickly as possible',
    fixes: ['footwork', 'pocket', 'light feet', 'foot speed', 'pocket movement', 'agility', 'quickness', 'coordination'],
    progressions: [
      'Eyes down to learn pattern (beginner only)',
      'Eyes up — 3 sets left-right, 3 sets right-left',
      'Increase speed while maintaining eyes upfield',
      'Add a throw signal — coach claps, QB stops and delivers to a spot',
    ],
    videos: [
      { title: '5 Drills QBs MUST DO This Off Season (2025) — First Down Training', url: 'https://www.youtube.com/watch?v=SZGs225LV1A', duration: '~11 min', notes: 'Drill 3 — PVC pipe over-step footwork' },
    ],
  },

  // ── PRE-SNAP READS ────────────────────────────────────────────────────────

  {
    name: 'Coverage Identification Walk-Through',
    category: 'technique',
    technique_area: 'pre_snap_reads',
    sets: 3, reps: null, duration: '15 minutes',
    why: 'Brady identified the defense pre-snap on virtually every throw. Recognizing Cover 2, Cover 3, Cover 4, man-free, and quarters gives the QB the answer before the snap — meaning the post-snap read is a confirmation, not a search. Pre-snap wins are why Brady consistently threw with such speed and decisiveness.',
    coaching_cue: 'Check the safeties FIRST — their depth and alignment tells you everything. One high = Cover 3 or Man-Free. Two high = Cover 2 or Cover 4. Zero high = blitz.',
    common_mistake: 'Reading coverage post-snap from scratch every play — by the time a coverage is recognized post-snap, the protection has broken down and the window has closed',
    fixes: ['pre-snap reads', 'coverage', 'slow reads', 'decision making', 'coverage ID', 'reads', 'quarterback reads'],
    progressions: ['Film room identification only', 'Walk-through recognition at the line', 'Identify → call protection → snap', 'Full-speed game with pre-snap diagnosis'],
    videos: [
      { title: 'QB School: Pre-Snap Reads', url: 'https://www.youtube.com/watch?v=6u_DnibwqdQ', duration: '~15 min' },
      { title: 'QB Pre-Snap Reads', url: 'https://www.youtube.com/watch?v=5Lktne5NdHY', duration: '~10 min' },
      { title: 'Covering Concepts: Pre-Snap Reads (ft. Mitchell Trubisky)', url: 'https://www.youtube.com/watch?v=DLbquNZj5Mc', duration: '~12 min' },
      { title: 'QB Training — Pre & Post Snap Read (Jeff Garcia)', url: 'https://www.youtube.com/watch?v=_oguK2XT3KY', duration: '~12 min' },
      { title: 'QB Drill Tape — Tom Brady', url: 'https://www.youtube.com/watch?v=1UJHfHe6iow', duration: '~15 min' },
    ],
  },
  {
    name: 'Protection Check & Hot Route Identification',
    category: 'technique',
    technique_area: 'pre_snap_reads',
    sets: 3, reps: null, duration: '15 minutes',
    why: 'When the defense shows more rushers than the protection can handle, the QB must check to a hot route — a short, immediate throw designed to beat the blitz. Recognizing the count (rushers vs. blockers) before the snap and knowing which receiver becomes "hot" is a fundamental QB responsibility, not an advanced skill.',
    coaching_cue: 'Count the box: if rushers > blockers + 1, someone is hot. Know who it is before you take the snap. Your first read post-snap is your hot receiver.',
    common_mistake: 'Not recognizing the blitz pre-snap and holding the ball — this results in sacks that are entirely preventable with pre-snap identification',
    fixes: ['pre-snap reads', 'blitz', 'hot route', 'protection', 'sack', 'coverage', 'recognition', 'decision making'],
    progressions: ['Blitz count drill (classroom)', 'Walk-through blitz ID at the line', 'Identify blitz + throw hot in team period', 'Live blitz vs. full defense'],
    videos: [
      { title: 'QB Pre-Snap Reads', url: 'https://www.youtube.com/watch?v=F_yaJ4h9LS0', duration: '~8 min' },
      { title: 'QB School: Pre-Snap Reads', url: 'https://www.youtube.com/watch?v=6u_DnibwqdQ', duration: '~15 min' },
      { title: 'Anatomy of the Game — QB Reads & Progressions', url: 'https://www.youtube.com/watch?v=s2CiiTSkeFs', duration: '~15 min' },
    ],
  },

  // ── POST-SNAP PROGRESSIONS ────────────────────────────────────────────────

  {
    name: '1-2-3 Progression Read Drill',
    category: 'technique',
    technique_area: 'progressions',
    sets: 4, reps: 6, duration: null,
    why: 'Brady\'s decision speed comes from having a predetermined 1-2-3 read sequence that he works through in under 2 seconds. Drilling the progression makes it automatic — the eyes move in the right order without thinking, and the ball goes to the open receiver at the right moment.',
    coaching_cue: 'Eyes move in the sequence — 1 is your pre-snap read, 2 is your first look post-snap, 3 is your checkdown. One, two, three — the ball goes on the READ, not after deliberating.',
    common_mistake: 'Staring at the primary receiver too long waiting for the route to open — the defense diagnoses the stare, the window closes, and you miss the open receiver at 2 or 3',
    fixes: ['progressions', 'reads', 'decision making', 'staring down', 'locking on', 'slow reads', 'late throws'],
    progressions: ['Walk-through progression with stationary receivers', '3 WR drill — coach calls the read number', 'Full-speed progression vs. live coverage', 'Full offense 11v11'],
    videos: [
      { title: 'Simplified Progression Reads for Your QB (UBC OC Taylor Nill)', url: 'https://www.youtube.com/watch?v=z_8PpyCFMXA', duration: '~20 min' },
      { title: 'QB Training: First Step in Teaching Progressions', url: 'https://www.youtube.com/watch?v=Bab_3QZMZSo', duration: '~12 min' },
      { title: 'Anatomy of the Game — QB Reads & Progressions', url: 'https://www.youtube.com/watch?v=s2CiiTSkeFs', duration: '~15 min' },
      { title: 'QB Drill Tape — Tom Brady', url: 'https://www.youtube.com/watch?v=1UJHfHe6iow', duration: '~15 min' },
    ],
  },
  {
    name: 'Checkdown & Dump-Off Drill',
    category: 'technique',
    technique_area: 'progressions',
    sets: 3, reps: 8, duration: null,
    why: 'Brady\'s career YPA is built significantly on elite checkdown efficiency — when the primary and secondary are covered, he dumps off quickly to the RB or flat receiver and the receiver does the work. Many QBs resist the checkdown and take sacks instead. A completed 4-yard checkdown beats a sack every time.',
    coaching_cue: 'If 1 and 2 are covered, the checkdown is open. Throw it FAST and on time — a late checkdown is a tipped ball or a sack. The checkdown is not giving up; it is the play.',
    common_mistake: 'Holding the ball past the third read because no one is "open enough" — this leads to sacks. The third read is the throw; if it is open at all, throw it.',
    fixes: ['progressions', 'checkdown', 'sack', 'holding ball', 'decision making', 'third read', 'dump off'],
    progressions: ['Isolated checkdown timing drill (drop + check 1-2 + dump)', '3-read progression with live WRs', 'Full offense with defined hot + checkdown routes', 'Live period — QB tracked on checkdown usage'],
    videos: [
      { title: 'QB Drill Tape — Tom Brady', url: 'https://www.youtube.com/watch?v=1UJHfHe6iow', duration: '~15 min' },
      { title: 'QB Training: Vision — Pre & Post Snap Read (Jeff Garcia)', url: 'https://www.youtube.com/watch?v=_oguK2XT3KY', duration: '~12 min' },
    ],
  },
]

// ─── Helper: Get drills by technique area ────────────────────────────────────

export function getQBDrillsByArea(area: QBTechniqueArea): QBDrillEntry[] {
  return QB_DRILLS.filter(d => d.technique_area === area)
}

// ─── Helper: Find relevant drills by pain-point keywords ────────────────────

export function findQBDrillsForPainPoint(painPoint: string): QBDrillEntry[] {
  const lower = painPoint.toLowerCase()
  return QB_DRILLS.filter(d =>
    d.fixes.some(fix => lower.includes(fix) || fix.includes(lower.split(' ')[0]))
  ).slice(0, 4)
}

// ─── Helper: Convert QBDrillEntry to Exercise for training plan ──────────────

export function qbDrillToExercise(drill: QBDrillEntry): import('@/types').Exercise {
  return {
    name: drill.name,
    sets: drill.sets,
    reps: drill.reps,
    duration: drill.duration,
    why: drill.why,
    category: drill.category,
    coaching_cue: drill.coaching_cue ?? null,
    demo_url: drill.videos[0]?.url ?? null,
  }
}

// ─── Map of technique areas to readable labels ───────────────────────────────

export const QB_AREA_LABELS: Record<QBTechniqueArea, string> = {
  stance_cadence:    'Stance & Cadence',
  drop_backs:        'Drop-Back Footwork',
  pocket_presence:   'Pocket Presence',
  throwing_mechanics: 'Throwing Mechanics',
  pre_snap_reads:    'Pre-Snap Reads',
  progressions:      'Reads & Progressions',
  footwork_agility:  'Footwork & Agility',
}

// ─── Teaching Progression ────────────────────────────────────────────────────
// Structured coaching steps derived from the "QB Drill Tape — Tom Brady"
// and supporting coach-validated QB technique resources.

export interface QBTeachingStep {
  order: number
  topic: string
  technique_area: QBTechniqueArea
  keyPoints: string[]
  techniques?: {
    name: string
    bestFor: string
    cues: string[]
  }[]
}

export const QB_TEACHING_PROGRESSION: QBTeachingStep[] = [
  {
    order: 1,
    topic: 'Stance & Cadence',
    technique_area: 'stance_cadence',
    keyPoints: [
      'Under center: hands firm into the center, top hand pressure UP, bottom hand relaxed to receive',
      'Eyes must already be pre-snap scanning the defense at the moment of the snap exchange',
      'Shotgun: catch with both hands, set feet immediately to throwing width — you are already in your read before the ball arrives',
      'Cadence is a weapon: vary the snap count, use hard counts to draw offsides, make the defense reveal their coverage',
      'Consistent stance hides your intentions — the same setup on every play, every formation',
    ],
  },
  {
    order: 2,
    topic: 'Drop-Back Footwork',
    technique_area: 'drop_backs',
    keyPoints: [
      'The drop is not moving backward — it is setting a platform to throw forward',
      '3-step: ball is out on step 3. No hitch. The timing route is already timing off your drop.',
      '5-step: hit your landmark (5–7 yards). Do NOT drift past it. Set, gather, throw.',
      '7-step: fast drop to 9–11 yards, firm set, gather before throwing. Never rush the throw before completing the drop.',
      'Shotgun drops are shorter (2–3 steps) because the QB is already at depth from the snap',
    ],
    techniques: [
      {
        name: '3-Step Drop',
        bestFor: 'Quick game — slant, hitch, quick out, bubble screen',
        cues: [
          'Step 1 crosses behind, Step 2 opens hips, Step 3 IS the throw step',
          'Ball leaves on Step 3 — not after. This is a timing route.',
          'Do NOT add a hitch on true quick routes — the window has already closed',
        ],
      },
      {
        name: '5-Step Drop',
        bestFor: 'Intermediate routes — dig, curl, crossing route, comeback',
        cues: [
          'Hit the landmark at 5–7 yards — this is your depth, commit to it',
          'Set → gather → throw. Do not drift backward past the landmark.',
          'One hitch step is OK when the route needs an extra beat; two is a sack',
        ],
      },
      {
        name: '7-Step Drop',
        bestFor: 'Deep routes — corner, post, seam, go ball, play-action',
        cues: [
          'Fast, smooth drop to 9–11 yards — no wasted motion',
          'Firm set at the landmark BEFORE the throw. The deeper the route, the more the platform matters.',
          'Never throw off the back foot on a 7-step — the ball will sail every time',
        ],
      },
    ],
  },
  {
    order: 3,
    topic: 'Pocket Presence',
    technique_area: 'pocket_presence',
    keyPoints: [
      'Brady\'s rule: always have a base to throw from. Every movement in the pocket is to RESET a platform, not to run.',
      'Slide laterally — do not drift backward. Moving backward compresses protection and shortens every route.',
      'Inside pressure answer: step UP into the pocket, not sideways or backward',
      'The hitch step is a reset — a small gathering step that re-establishes the throwing platform before pulling the trigger',
      'Eyes NEVER leave the field during pocket movement. You are moving the pocket, not abandoning it.',
    ],
    techniques: [
      {
        name: 'The Brady Drill',
        bestFor: 'General pocket movement and presence training',
        cues: [
          'Drop → plant at landmark → hitch (gather) → shuffle lateral → throw',
          'Every hitch is a potential throw — stay on the trigger',
          'Shoulders stay square downfield through the entire shuffle sequence',
        ],
      },
      {
        name: 'Slide Step',
        bestFor: 'Edge pressure — rusher beats the outside',
        cues: [
          'Slide LATERALLY — do not go backward',
          'Stay square, keep eyes downfield, maintain the throwing base',
          'You are moving the pocket, not leaving it',
        ],
      },
      {
        name: 'Step Up',
        bestFor: 'Inside pressure — stunts, A-gap blitzes',
        cues: [
          'Step UP and THROUGH the pressure — two steps forward',
          'Set your feet after stepping up and throw from that new platform',
          'Moving forward is counterintuitive but it avoids the rusher and opens the middle',
        ],
      },
    ],
  },
  {
    order: 4,
    topic: 'Throwing Mechanics',
    technique_area: 'throwing_mechanics',
    keyPoints: [
      'GRIP: Ring and pinky fingers across the laces. Small air pocket between palm and ball — never press the ball into the palm. Index finger slightly higher on the seam to guide the spiral. Thumb underneath for support.',
      'Brady: "When it comes off that index finger and it\'s fluid, you know it\'s gonna spin and it\'s gonna be a good throw." The follow-through IS the diagnostic.',
      'KINETIC CHAIN: Brady — "Throwing always starts with your legs — ground up through ankles, knees, hips, shoulders, arm. Don\'t let any of that energy go anywhere except through the fingertips."',
      'Sequence: FEET → ankles → knees → HIPS (fire first) → shoulders → elbow → wrist → INDEX FINGER. Hips lead; arm follows.',
      'Release point: ball leaves at the APEX of the arm path — past the apex produces a tail; before it produces a looping ball',
      'Elbow stays up throughout — a dropped elbow produces side-arm trajectory and turns every throw inaccurate under pressure',
      'Follow-through: wrist snaps DOWN and OUT, thumb of throwing hand points toward the ground at finish',
      'Brady throws to SPOTS — a location on the field — not to receivers. The receiver runs to the spot.',
    ],
  },
  {
    order: 5,
    topic: 'Pre-Snap Reads',
    technique_area: 'pre_snap_reads',
    keyPoints: [
      'Check the safeties FIRST — their depth and alignment is the master key to the coverage',
      'One high safety = Cover 3 or Man-Free. Two high = Cover 2 or Cover 4. Zero high = potential blitz or zero coverage.',
      'Count the box: rushers vs. blockers. If rushers > blockers + 1, identify your hot receiver before the snap.',
      'Pre-snap wins mean post-snap is a confirmation, not a search — decision speed doubles',
      'Use the hard count to make the defense move and reveal their true alignment',
    ],
  },
  {
    order: 6,
    topic: 'Post-Snap Reads & Progressions',
    technique_area: 'progressions',
    keyPoints: [
      'Work the progression in order — 1 is the pre-snap read, 2 is the first post-snap look, 3 is the checkdown',
      'The ball goes on the READ — not after deliberating. If it\'s open, throw it. Time to throw: under 2 seconds.',
      'Staring at the primary too long is the #1 solvable QB mistake — it alerts coverage and closes the window',
      'The checkdown is NOT giving up — it is the designed play. A 4-yard completion beats a sack every time.',
      'Anticipation throws: Brady releases before the receiver breaks because he sees the coverage and trusts the route',
    ],
  },
  {
    order: 7,
    topic: 'Footwork & Agility — The Brady Method',
    technique_area: 'footwork_agility',
    keyPoints: [
      'Brady was rated poorly as an athlete coming out of college — he became elite through deliberate daily footwork practice',
      'The Five-Dot Drill: spray dots on concrete, practice every morning at 6am, 20 minutes of patterns',
      '"There\'s more than one way to be elusive" — nimble footwork in the pocket is more valuable than straight-line speed',
      'Daily short footwork sessions (10–20 min) compound dramatically over time. This is a daily habit, not a session activity.',
      'Precision first, then speed — every dot contact matters. Fast and imprecise builds bad habits.',
    ],
  },
]

/**
 * Get the teaching step for a given QB technique area.
 */
export function getQBTeachingStep(area: QBTechniqueArea): QBTeachingStep | undefined {
  return QB_TEACHING_PROGRESSION.find(s => s.technique_area === area)
}
