/**
 * Specialist Position Drill Library — K (Kicker), P (Punter), LS (Long Snapper)
 * Covers kicking mechanics, punting technique, snap accuracy, and the
 * shared athletic foundation all specialists need.
 */

import type { Exercise } from '@/types'

// ─── Reference Video Type ─────────────────────────────────────────────────────

export interface DrillVideoST {
  title: string
  url: string
  duration: string
  notes?: string
}

// ─── Technique Areas ──────────────────────────────────────────────────────────

export type STTechniqueArea =
  | 'approach_mechanics'   // K — plant, steps, approach angle
  | 'kicking_mechanics'    // K — hip rotation, contact point, follow-through
  | 'kickoff'              // K — power, hang time, directional kickoffs
  | 'punt_mechanics'       // P — drop, contact, spiral, follow-through
  | 'directional_punting'  // P — coffin corner, pooch, directional control
  | 'snap_mechanics'       // LS — speed, spiral, accuracy
  | 'snap_and_block'       // LS — immediate post-snap protection
  | 'conditioning'         // All — leg strength, hip flexibility, core power
  | 'mental'               // All — routine, pressure, visualization

export type STDrillCategory = Exercise['category']

// ─── Drill Entry ──────────────────────────────────────────────────────────────

export interface STDrillEntry {
  name: string
  category: STDrillCategory
  technique_area: STTechniqueArea
  specialist_type: 'K' | 'P' | 'LS' | 'ALL'  // who this drill is for
  sets: number | null
  reps: number | null
  duration: string | null
  why: string
  coaching_cue: string
  common_mistake: string
  fixes: string[]
  progressions: string[]
  videos: DrillVideoST[]
}

// ─── Full Specialist Drill Library ───────────────────────────────────────────

export const SPECIALIST_DRILLS: STDrillEntry[] = [

  // ── SHARED CONDITIONING & FOUNDATION ─────────────────────────────────────

  {
    name: 'Hip Flexor & Quad Dynamic Warm-Up',
    category: 'warmup',
    technique_area: 'conditioning',
    specialist_type: 'ALL',
    sets: 2, reps: 12, duration: null,
    why: 'Kicking and punting generate the highest hip-flexor loads in football. Tight hip flexors shorten the swing arc, costing distance and accuracy on every rep.',
    coaching_cue: 'Drive the back knee to the ground and feel the stretch pull — never kick cold',
    common_mistake: 'Rushing through warm-up before hitting full-effort kicks — leads to groin pulls and poor mechanics',
    fixes: ['tight', 'hip', 'flexibility', 'warmup', 'injury', 'distance', 'short kick', 'short punt'],
    progressions: ['Static lunge hold 30s', 'Dynamic walking lunge', 'Hip circles + leg swings'],
    videos: [
      { title: 'Kicker/Punter Hip Flexor Warm-Up Routine', url: 'https://www.youtube.com/results?search_query=kicker+punter+hip+flexor+warmup+football', duration: '~5 min' },
    ],
  },
  {
    name: 'Single-Leg Romanian Deadlift (Stability)',
    category: 'strength',
    technique_area: 'conditioning',
    specialist_type: 'ALL',
    sets: 3, reps: 10, duration: null,
    why: 'Every kick and punt is a single-leg power event. Weak or unstable plant-leg mechanics collapse under fatigue and pressure — this drill builds the posterior chain stability specialists need.',
    coaching_cue: 'Hinge from the hip, not the knee — feel the hamstring load before you lift',
    common_mistake: 'Letting the hip rotate out as the leg lifts — must stay square and stable throughout',
    fixes: ['plant foot', 'plant leg', 'unstable', 'balance', 'wobbly', 'inconsistent', 'shanks', 'hooks'],
    progressions: ['Bodyweight only', 'Light dumbbell', 'Heavy KB with eyes closed'],
    videos: [
      { title: 'Single Leg RDL for Kickers and Punters', url: 'https://www.youtube.com/results?search_query=single+leg+RDL+kicker+punter+stability', duration: '~6 min' },
    ],
  },
  {
    name: 'Core Rotation Power (Med Ball Throws)',
    category: 'strength',
    technique_area: 'conditioning',
    specialist_type: 'ALL',
    sets: 4, reps: 8, duration: null,
    why: 'Distance in kicking and punting comes from rotational core power, not just leg strength. Weak rotation = short kicks regardless of leg speed.',
    coaching_cue: 'Hips rotate first, then shoulders — never arms-only',
    common_mistake: 'Throwing with the arms instead of driving the rotation from the ground up through the hips',
    fixes: ['distance', 'short kick', 'short punt', 'power', 'weak', 'low distance', 'range'],
    progressions: ['Standing rotational throw', 'Step-into rotational throw', 'Full approach rotational throw'],
    videos: [
      { title: 'Rotational Power Med Ball Training for Specialists', url: 'https://www.youtube.com/results?search_query=rotational+power+med+ball+kicker+punter', duration: '~8 min' },
    ],
  },

  // ── KICKER MECHANICS ─────────────────────────────────────────────────────

  {
    name: 'Approach Consistency Drill (K)',
    category: 'footwork',
    technique_area: 'approach_mechanics',
    specialist_type: 'K',
    sets: 5, reps: 10, duration: null,
    why: 'Inconsistent approach steps create different plant positions on every kick, making accuracy impossible to repeat. The approach must be automatic before the ball is even placed.',
    coaching_cue: 'Same first step, same stride length, same angle — every single time',
    common_mistake: 'Varying the number of steps or the angle of approach depending on distance — creates a completely different kick each time',
    fixes: ['inconsistent', 'accuracy', 'miss', 'miss left', 'miss right', 'approach', 'steps', 'angle'],
    progressions: ['Walk-through approach only (no ball)', 'Approach + place foot (no kick)', 'Full approach + kick'],
    videos: [
      { title: 'Kicker Approach Mechanics Drill', url: 'https://www.youtube.com/results?search_query=kicker+approach+mechanics+consistency+drill+football', duration: '~7 min' },
    ],
  },
  {
    name: 'Plant Foot Placement Drill (K)',
    category: 'technique',
    technique_area: 'approach_mechanics',
    specialist_type: 'K',
    sets: 4, reps: 10, duration: null,
    why: 'Plant foot position determines everything: left/right accuracy, distance, and trajectory. A plant foot 2–3 inches off target changes the kick direction by a full yard at 50 yards.',
    coaching_cue: 'Plant foot should point straight at the target, even with or slightly behind the ball',
    common_mistake: 'Planting the foot too far forward or behind the ball — kills leverage and causes pushes or pulls',
    fixes: ['plant foot', 'hooks', 'pushes', 'miss left', 'miss right', 'slice', 'pull', 'accuracy', 'inconsistent'],
    progressions: ['Tape-marker foot placement drill (no kick)', 'Slow-motion kicks to check position', 'Full-speed kicks with video review'],
    videos: [
      { title: 'Kicker Plant Foot Drill', url: 'https://www.youtube.com/results?search_query=kicker+plant+foot+placement+drill', duration: '~6 min' },
    ],
  },
  {
    name: 'Hip Rotation & Follow-Through (K)',
    category: 'technique',
    technique_area: 'kicking_mechanics',
    specialist_type: 'K',
    sets: 4, reps: 10, duration: null,
    why: 'Distance and accuracy both come from a complete hip-rotation sequence that finishes with the kicking hip driving through the ball. Stopping the follow-through short of the target is the #1 distance killer.',
    coaching_cue: 'Kick through the ball, not at it — your hip keeps going until you are balanced on the plant leg',
    common_mistake: 'Stopping the follow-through at the moment of contact — cuts distance by 5–10 yards and creates inconsistent ball flight',
    fixes: ['distance', 'short', 'low trajectory', 'no follow-through', 'weak kick', 'low ball', 'line drive'],
    progressions: ['Slow-motion hip-rotation mirror drill', 'One-step contact drill', 'Full approach with exaggerated follow-through'],
    videos: [
      { title: 'Kicker Hip Rotation Follow-Through Drill', url: 'https://www.youtube.com/results?search_query=kicker+hip+rotation+follow+through+drill+football', duration: '~8 min' },
    ],
  },
  {
    name: 'Field Goal Accuracy Ladder (K)',
    category: 'technique',
    technique_area: 'kicking_mechanics',
    specialist_type: 'K',
    sets: 1, reps: null, duration: '20 kicks total',
    why: 'Building accuracy from short range outward trains the kicker to lock in mechanics before adding distance. Advancing too quickly to long kicks with broken mechanics compounds errors.',
    coaching_cue: 'Start at the PAT (20 yards), move back only when you hit 8 of 10. Never skip distance rungs.',
    common_mistake: 'Always practicing at the same distance — game situations require confidence from every spot on the hash',
    fixes: ['accuracy', 'miss', 'inconsistent', 'long field goals', 'distance', 'confidence', 'pressure kicks'],
    progressions: ['20 yd PAT → 30 → 35 → 40 → 45 → 50+'],
    videos: [
      { title: 'Field Goal Accuracy Training Progression', url: 'https://www.youtube.com/results?search_query=field+goal+kicker+accuracy+progression+drill', duration: '~10 min' },
    ],
  },
  {
    name: 'Kickoff Power & Hang Time Drill (K)',
    category: 'technique',
    technique_area: 'kickoff',
    specialist_type: 'K',
    sets: 3, reps: 8, duration: null,
    why: 'A kickoff that lands at the goal line with 4.5+ seconds of hang time is ideal — it gives the coverage team time to arrive. Pure distance without hang time helps the returner.',
    coaching_cue: 'Strike the lower half of the ball — your toe goes under the equator, not through the middle',
    common_mistake: 'Hitting the middle of the ball trying for distance — creates low hang time even on long kicks',
    fixes: ['kickoff', 'touchback', 'hang time', 'distance', 'short kickoff', 'returned', 'coverage'],
    progressions: ['Tee height adjustment drill', 'Contact point drill at low speed', 'Full-speed kickoff with hang-time timer'],
    videos: [
      { title: 'Kickoff Mechanics Hang Time Drill', url: 'https://www.youtube.com/results?search_query=kickoff+hang+time+mechanics+kicker+drill', duration: '~9 min' },
    ],
  },

  // ── PUNTER MECHANICS ─────────────────────────────────────────────────────

  {
    name: 'Ball Drop Consistency Drill (P)',
    category: 'technique',
    technique_area: 'punt_mechanics',
    specialist_type: 'P',
    sets: 5, reps: 15, duration: null,
    why: 'The drop is the most repeatable and trainable variable in punting. A consistent drop in the same spot every time is the single biggest predictor of punting accuracy and distance.',
    coaching_cue: 'Release the ball — do not throw it down. Your hand opens and the ball falls exactly where your foot will meet it.',
    common_mistake: 'Tossing or guiding the ball instead of releasing it — different drop position on every punt',
    fixes: ['drop', 'bad drop', 'inconsistent', 'shank', 'off the side of the foot', 'miss hit', 'spiral'],
    progressions: ['Drop-only drill (no kick)', 'Drop to contact (slow motion)', 'Full punt with video drop review'],
    videos: [
      { title: 'Punter Ball Drop Consistency Drill', url: 'https://www.youtube.com/results?search_query=punter+ball+drop+consistency+drill+football', duration: '~7 min' },
    ],
  },
  {
    name: 'Contact Point & Spiral Drill (P)',
    category: 'technique',
    technique_area: 'punt_mechanics',
    specialist_type: 'P',
    sets: 4, reps: 10, duration: null,
    why: 'A spiral punt requires the foot to contact the back third of the ball at the laces, with the toe pointed slightly in and down. Hitting the ball too far back or to the side produces tumbling punts.',
    coaching_cue: 'Toe points in toward the midline, contact on the laces — not the side of the shoe',
    common_mistake: 'Contacting the ball too far to the outside of the foot — causes end-over-end tumbling with no hang time',
    fixes: ['spiral', 'no spiral', 'tumbling', 'knuckleball', 'end over end', 'contact', 'shank', 'off the side'],
    progressions: ['Contact point marker drill (slow motion)', 'Half-speed punts focusing on contact', 'Full-speed punts with film review'],
    videos: [
      { title: 'Punting Spiral Technique Contact Point', url: 'https://www.youtube.com/results?search_query=punter+spiral+contact+point+technique+drill', duration: '~8 min' },
    ],
  },
  {
    name: 'Hang Time Training Drill (P)',
    category: 'technique',
    technique_area: 'punt_mechanics',
    specialist_type: 'P',
    sets: 3, reps: 10, duration: null,
    why: 'A punt that travels 45 yards in under 4.2 seconds gives the returner time to advance the ball. Hang time comes from a high contact point and following through upward — not swinging harder.',
    coaching_cue: 'Kick up, not through — your follow-through goes toward the sky, not at the returner',
    common_mistake: 'Swinging harder to get distance instead of focusing on a higher contact point and upward follow-through',
    fixes: ['hang time', 'returner', 'low kick', 'line drive', 'returned', 'low punt', 'punt returned'],
    progressions: ['High-pop short punch drill', 'Height-over-distance 10 punts', 'Full game-speed with stopwatch'],
    videos: [
      { title: 'Punter Hang Time Training Drill', url: 'https://www.youtube.com/results?search_query=punter+hang+time+drill+football', duration: '~7 min' },
    ],
  },
  {
    name: 'Coffin Corner / Directional Punting Drill (P)',
    category: 'technique',
    technique_area: 'directional_punting',
    specialist_type: 'P',
    sets: 3, reps: 10, duration: null,
    why: 'Directional punting pins the opponent inside the 10 without giving up a touchback. It requires deliberate body angle adjustment on the approach — not just aiming at the last second.',
    coaching_cue: 'Align your approach angle toward the sideline — your body angle determines the punt direction, not your last-second lean',
    common_mistake: 'Aiming the foot at the target rather than adjusting the approach angle — produces inconsistent side-spin punts',
    fixes: ['directional', 'coffin corner', 'out of bounds', 'sideline', 'angle', 'touchback', 'coverage', 'field position'],
    progressions: ['Walk-through approach angle adjustment', 'Half-speed directional punts to cones', 'Full-speed with coach tracking OOB landing'],
    videos: [
      { title: 'Directional Punting Coffin Corner Drill', url: 'https://www.youtube.com/results?search_query=directional+punting+coffin+corner+drill+football', duration: '~9 min' },
    ],
  },

  // ── LONG SNAPPER MECHANICS ────────────────────────────────────────────────

  {
    name: 'Snap Speed & Accuracy Drill — Punt (LS)',
    category: 'technique',
    technique_area: 'snap_mechanics',
    specialist_type: 'LS',
    sets: 5, reps: 15, duration: null,
    why: 'A punt snap must reach the punter at chest height in 0.7–0.8 seconds. Anything over 0.85 seconds gives the block team a chance. Snap speed is a trainable, measurable skill.',
    coaching_cue: 'Snap through the target, not to it — the ball should arrive before the punter is ready to catch it',
    common_mistake: 'Decelerating at the snap to prioritize accuracy over speed — a slow accurate snap is still a block risk',
    fixes: ['snap', 'slow snap', 'bad snap', 'high snap', 'low snap', 'off-target', 'blocked', 'punt block'],
    progressions: ['Partner snaps with stopwatch (measure 0.7s target)', 'Snaps with lane alignment check', 'Full-speed game simulation snaps'],
    videos: [
      { title: 'Long Snapper Punt Snap Speed Drill', url: 'https://www.youtube.com/results?search_query=long+snapper+punt+snap+speed+drill+football', duration: '~8 min' },
    ],
  },
  {
    name: 'Field Goal Snap Stance & Accuracy (LS)',
    category: 'technique',
    technique_area: 'snap_mechanics',
    specialist_type: 'LS',
    sets: 4, reps: 15, duration: null,
    why: 'A field goal snap must arrive at the holder\'s hands in 0.55–0.65 seconds in a tight spiral at knee height. The stance is narrower than a punt snap — different mechanics entirely.',
    coaching_cue: 'Narrow stance, spiral arrives knees-to-waist height — the holder should not have to move their hands more than 6 inches',
    common_mistake: 'Using the same stance and trajectory as a punt snap — field goal snaps go slightly lower and faster than punt snaps',
    fixes: ['snap', 'field goal snap', 'high snap', 'wobble', 'bad spiral', 'holder', 'off-target', 'block'],
    progressions: ['Stance walk-through (no ball)', 'Slow snaps focusing on spiral', 'Full-speed timed snaps with holder'],
    videos: [
      { title: 'Long Snapper Field Goal Snap Technique', url: 'https://www.youtube.com/results?search_query=long+snapper+field+goal+snap+technique+drill', duration: '~7 min' },
    ],
  },
  {
    name: 'Snap & Block Reaction Drill (LS)',
    category: 'technique',
    technique_area: 'snap_and_block',
    specialist_type: 'LS',
    sets: 4, reps: 10, duration: null,
    why: 'After the snap the LS must immediately become a blocker. Watching the ball fly to the punter instead of getting into a blocking position is the most common LS mistake at every level.',
    coaching_cue: 'Snap and lift — your head comes up and your hands reset the INSTANT the ball leaves your hands',
    common_mistake: 'Head staying down to watch the snap — the block rushers are already in the gap when the LS finally looks up',
    fixes: ['block', 'blocking', 'post-snap', 'rusher', 'punt block', 'protection', 'slow recovery', 'gap'],
    progressions: ['Snap-and-lift form drill (partner checks head position)', 'Snap-and-punch bag drill', 'Full-speed snap vs pass rusher'],
    videos: [
      { title: 'Long Snapper Block and Recovery Drill', url: 'https://www.youtube.com/results?search_query=long+snapper+block+recovery+drill+protection', duration: '~6 min' },
    ],
  },
  {
    name: 'Spiral & Grip Mechanics (LS)',
    category: 'technique',
    technique_area: 'snap_mechanics',
    specialist_type: 'LS',
    sets: 3, reps: 20, duration: null,
    why: 'A spiral snap is more consistent and easier to catch than a wobbler. Proper grip with the fingers across the laces and a wrist-pronation finish at release produces a tight spiral every time.',
    coaching_cue: 'Fingers across the laces, pronate the wrist through the release — the ball should spiral from the moment it leaves your hand',
    common_mistake: 'Gripping with the palm rather than the fingertips — produces end-over-end tumbling snaps',
    fixes: ['spiral', 'wobble', 'no spiral', 'tumbling snap', 'grip', 'laces', 'bad snap', 'ugly snap'],
    progressions: ['Grip-only drill (toss to wall)', 'Kneeling spiral snaps to partner', 'Full-stance spiral snaps'],
    videos: [
      { title: 'Long Snapper Spiral Grip Technique', url: 'https://www.youtube.com/results?search_query=long+snapper+spiral+grip+technique+snap+mechanics', duration: '~6 min' },
    ],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Find specialist drills that address a given pain point keyword.
 */
export function findSTDrillsForPainPoint(painPoint: string): STDrillEntry[] {
  const lower = painPoint.toLowerCase()
  return SPECIALIST_DRILLS.filter(d =>
    d.fixes.some(fix => lower.includes(fix) || fix.includes(lower.split(' ')[0]))
  ).slice(0, 4)
}

/**
 * Convert an STDrillEntry to the Exercise shape used by training plan generator.
 */
export function stDrillToExercise(drill: STDrillEntry): Exercise {
  return {
    name: drill.name,
    sets: drill.sets,
    reps: drill.reps,
    duration: drill.duration,
    category: drill.category,
    why: drill.why,
    coaching_cue: drill.coaching_cue ?? null,
    demo_url: drill.videos[0]?.url ?? null,
  }
}
