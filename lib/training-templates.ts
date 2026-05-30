import type { Exercise, ExperienceLevel } from '@/types'
import { findRBDrillsForPainPoint, rbDrillToExercise } from './position-drills/rb'
import { findWRDrillsForPainPoint, wrDrillToExercise } from './position-drills/wr'
import { findQBDrillsForPainPoint, qbDrillToExercise } from './position-drills/qb'
import { findOLDrillsForPainPoint, olDrillToExercise } from './position-drills/ol'
import { findTEDrillsForPainPoint, teDrillToExercise } from './position-drills/te'
import { findDLDrillsForPainPoint, dlDrillToExercise } from './position-drills/dl'
import { findLBDrillsForPainPoint, lbDrillToExercise } from './position-drills/lb'
import { findDBDrillsForPainPoint, dbDrillToExercise } from './position-drills/db'
import { findOLBDrillsForPainPoint, olbDrillToExercise } from './position-drills/olb'
import { findSTDrillsForPainPoint, stDrillToExercise } from './position-drills/specialist'

// ─── Exercise Library ─────────────────────────────────────────────────────────
// Curated by pain-point keywords. Used as fallback when OpenAI is unavailable.

type ExerciseTemplate = Omit<Exercise, 'why'> & { tags: string[]; why: string }

const EXERCISE_LIBRARY: ExerciseTemplate[] = [
  // WARMUP
  {
    name: 'Dynamic Hip Flexor Stretch',
    sets: 2, reps: 10, duration: null,
    category: 'warmup',
    tags: ['hip', 'mobility', 'flexibility', 'stiffness'],
    why: 'Opens the hip flexors before explosive movements, reducing injury risk and improving stride length.',
    coaching_cue: 'Drive the back knee to the ground — feel the stretch at the top of each lunge',
    demo_url: 'https://www.youtube.com/results?search_query=dynamic+hip+flexor+stretch+football+warmup',
  },
  {
    name: 'Leg Swings (front-to-back & lateral)',
    sets: 2, reps: 15, duration: null,
    category: 'warmup',
    tags: ['hip', 'mobility', 'warmup', 'flexibility'],
    why: 'Dynamically activates the hip joint through its full range of motion before running drills.',
    coaching_cue: 'Keep the planted leg straight — let the swing leg move freely and naturally',
    demo_url: 'https://www.youtube.com/results?search_query=leg+swings+dynamic+warmup+football',
  },
  {
    name: 'High Knees (in place)',
    sets: 3, reps: null, duration: '30 seconds',
    category: 'warmup',
    tags: ['warmup', 'speed', 'knee drive', 'cardio'],
    why: 'Elevates heart rate and reinforces proper knee drive mechanics critical for speed.',
    coaching_cue: 'Pump the arms hard — your arms drive your knees',
    demo_url: 'https://www.youtube.com/results?search_query=high+knees+drill+football+warmup',
  },

  // SPEED
  {
    name: '10-Yard Burst Starts',
    sets: 6, reps: 1, duration: null,
    category: 'speed',
    tags: ['speed', 'acceleration', 'first step', 'burst', 'slow'],
    why: 'Trains explosive first-step acceleration—the most critical phase of any route or pursuit angle.',
    coaching_cue: 'Stay low through 5 yards — you should feel like you\'re falling forward',
    demo_url: 'https://www.youtube.com/results?search_query=10+yard+burst+start+acceleration+football+drill',
  },
  {
    name: '40-Yard Interval Sprints',
    sets: 5, reps: 1, duration: null,
    category: 'speed',
    tags: ['speed', '40', 'top-end', 'slow', 'cardio'],
    why: 'Builds top-end speed and conditions the phosphocreatine energy system used in football plays.',
    coaching_cue: 'Drive phase through 20 yards, then relax your face and let the speed come',
    demo_url: 'https://www.youtube.com/results?search_query=40+yard+dash+training+football+speed',
  },
  {
    name: 'Resisted Band Sprints (15 yards)',
    sets: 4, reps: 2, duration: null,
    category: 'speed',
    tags: ['speed', 'power', 'acceleration', 'strength', 'burst'],
    why: 'Resistance bands force greater hip extension and glute activation, translating directly to faster acceleration.',
    coaching_cue: 'Push through the band with your whole foot — don\'t let it pull you upright',
    demo_url: 'https://www.youtube.com/results?search_query=resisted+band+sprint+football+acceleration+drill',
  },
  {
    name: 'A-Skip Drill',
    sets: 3, reps: null, duration: '20 yards',
    category: 'speed',
    tags: ['speed', 'knee drive', 'mechanics', 'form'],
    why: 'Reinforces proper sprint mechanics: vertical shin angle, dorsiflexion, and high knee drive.',
    coaching_cue: 'Pull the foot up sharply — toes to shin — before the knee comes down',
    demo_url: 'https://www.youtube.com/results?search_query=A+skip+sprint+mechanics+football',
  },

  // AGILITY
  {
    name: '5-10-5 Pro Agility Shuttle',
    sets: 4, reps: 1, duration: null,
    category: 'agility',
    tags: ['agility', 'change of direction', 'lateral', 'slow', 'cuts'],
    why: 'The gold-standard change-of-direction test and drill—trains the plant-and-drive mechanics used on every cut.',
    coaching_cue: 'Plant the outside foot, drop your hips, and explode out — don\'t round the cones',
    demo_url: 'https://www.youtube.com/watch?v=jCGWkKSAJiE',
  },
  {
    name: 'L-Drill (3-Cone)',
    sets: 4, reps: 1, duration: null,
    category: 'agility',
    tags: ['agility', 'change of direction', 'cuts', 'lateral', 'corner'],
    why: 'Develops the ability to redirect momentum while maintaining body control and pad level.',
    coaching_cue: 'Dip your shoulder into each turn — your pads lead, your feet follow',
    demo_url: 'https://www.youtube.com/results?search_query=L+drill+3+cone+football+agility',
  },
  {
    name: 'Ladder Drills (high-knees, lateral, ickey shuffle)',
    sets: 3, reps: null, duration: '3 minutes total',
    category: 'agility',
    tags: ['agility', 'footwork', 'foot speed', 'coordination', 'lateral'],
    why: 'Improves foot coordination and ground contact time—key for quick, precise movements on the field.',
    coaching_cue: 'Quick touches — stay on your toes and never let your heels hit',
    demo_url: 'https://www.youtube.com/results?search_query=agility+ladder+drills+football',
  },
  {
    name: 'Box Jumps',
    sets: 4, reps: 6, duration: null,
    category: 'agility',
    tags: ['power', 'agility', 'explosion', 'vertical', 'jumping'],
    why: 'Trains triple extension (ankle, knee, hip) which powers every explosive athletic movement in football.',
    coaching_cue: 'Swing arms, dip hips, explode — land soft with bent knees',
    demo_url: 'https://www.youtube.com/results?search_query=box+jumps+football+explosiveness',
  },

  // FOOTWORK
  {
    name: 'Cone Route Tree (1-7 routes)',
    sets: 3, reps: null, duration: '10 minutes',
    category: 'footwork',
    tags: ['footwork', 'routes', 'wr', 'te', 'rb', 'cuts', 'separation'],
    why: 'Drilling the full route tree with cones builds muscle memory for precise break points and clean releases.',
    coaching_cue: 'Attack the top of every route — sell the go ball before you break',
    demo_url: 'https://www.youtube.com/results?search_query=route+tree+cone+drill+football+WR',
  },
  {
    name: 'QB Drop-Back Footwork (3/5/7 step)',
    sets: 5, reps: 5, duration: null,
    category: 'footwork',
    tags: ['footwork', 'qb', 'pocket', 'drop', 'mechanics'],
    why: 'Consistent drop-back footwork ensures the QB reaches the proper depth and weight transfer position for every throw.',
    coaching_cue: 'Hitch-hitch-throw rhythm — your last step sets your base and triggers the throw',
    demo_url: 'https://www.youtube.com/results?search_query=QB+drop+back+footwork+3+5+7+step+drill',
  },
  {
    name: 'Mirror Drill (Partner)',
    sets: 4, reps: null, duration: '30 seconds each',
    category: 'footwork',
    tags: ['footwork', 'coverage', 'db', 'cb', 'lateral', 'change of direction'],
    why: 'Simulates game-speed mirroring of a receiver/ball carrier, building reactive lateral agility for defenders.',
    coaching_cue: 'Read the hips, not the feet — stay patient and react, don\'t guess',
    demo_url: 'https://www.youtube.com/results?search_query=mirror+drill+football+defensive+back+coverage',
  },
  {
    name: 'Backpedal to Break Drill',
    sets: 4, reps: 6, duration: null,
    category: 'footwork',
    tags: ['footwork', 'db', 'cb', 'backpedal', 'coverage', 'mechanics'],
    why: 'Trains the backpedal and hip-flip transition that cornerbacks and safeties use on every passing down.',
    coaching_cue: 'Chin over toes in the pedal — when you flip, low elbow leads the turn',
    demo_url: 'https://www.youtube.com/results?search_query=backpedal+break+drill+football+cornerback',
  },

  // STRENGTH
  {
    name: 'Goblet Squat',
    sets: 3, reps: 12, duration: null,
    category: 'strength',
    tags: ['strength', 'legs', 'lower body', 'squat', 'beginner'],
    why: 'Builds quad and glute strength with a front-loaded position that reinforces upright torso and depth.',
    coaching_cue: 'Elbows inside your knees at the bottom — chest tall the whole way up',
    demo_url: 'https://www.youtube.com/results?search_query=goblet+squat+football+strength',
  },
  {
    name: 'Romanian Deadlift (RDL)',
    sets: 3, reps: 10, duration: null,
    category: 'strength',
    tags: ['strength', 'hamstring', 'posterior chain', 'speed', 'hinge'],
    why: 'Develops the hamstrings and posterior chain—the primary muscles responsible for top-end sprint speed.',
    coaching_cue: 'Push your hips back to the wall behind you — feel the hamstrings load before the bar moves',
    demo_url: 'https://www.youtube.com/results?search_query=romanian+deadlift+RDL+football+hamstring',
  },
  {
    name: 'Split Squat (Bulgarian)',
    sets: 3, reps: 8, duration: null,
    category: 'strength',
    tags: ['strength', 'legs', 'single leg', 'balance', 'stability'],
    why: 'Single-leg loading identifies and corrects strength imbalances that cause technique breakdown under fatigue.',
    coaching_cue: 'Vertical shin on the front leg — knee tracks over the second toe',
    demo_url: 'https://www.youtube.com/results?search_query=bulgarian+split+squat+football+single+leg+strength',
  },
  {
    name: 'Single-Leg Bounding',
    sets: 3, reps: null, duration: '20 yards',
    category: 'strength',
    tags: ['strength', 'power', 'speed', 'single leg', 'explosion'],
    why: 'Develops explosive single-leg power and hip drive, directly transferring to faster acceleration and cutting.',
    coaching_cue: 'Drive the opposite knee up hard on each bound — distance comes from hip drive, not lean',
    demo_url: 'https://www.youtube.com/results?search_query=single+leg+bounding+football+power',
  },
  {
    name: 'Sled Push (moderate load)',
    sets: 4, reps: null, duration: '20 yards each',
    category: 'strength',
    tags: ['strength', 'power', 'acceleration', 'burst', 'push', 'ol', 'dl'],
    why: 'Builds functional pushing strength in the exact body position used when accelerating out of a stance.',
    coaching_cue: 'Stay low — if you can see the sled clearly, your hips are too high',
    demo_url: 'https://www.youtube.com/results?search_query=sled+push+football+acceleration+lineman',
  },

  // TECHNIQUE
  {
    name: 'Release vs. Press Coverage (bag/partner)',
    sets: 3, reps: null, duration: '10 minutes',
    category: 'technique',
    tags: ['technique', 'wr', 'te', 'release', 'separation', 'press', 'stack'],
    why: 'Practicing release technique against resistance builds the confidence and skill to win off the line vs. press corners.',
    coaching_cue: 'Threaten inside first — make the corner shift weight, then rip outside',
    demo_url: 'https://www.youtube.com/results?search_query=WR+press+release+drill+football',
  },
  {
    name: 'Catch Point Drill (high/low/away/in)',
    sets: 3, reps: 10, duration: null,
    category: 'technique',
    tags: ['technique', 'wr', 'te', 'hands', 'catching', 'drops'],
    why: 'Reps across all catch-point windows train the hands to lead and secure the ball away from the body.',
    coaching_cue: 'Eyes on the tip of the ball — catch it, THEN look for yards',
    demo_url: 'https://www.youtube.com/results?search_query=catch+point+drill+wide+receiver+hands+football',
  },
  {
    name: 'Pocket Presence Simulation',
    sets: 3, reps: null, duration: '10 minutes',
    category: 'technique',
    tags: ['technique', 'qb', 'pocket', 'pressure', 'footwork', 'mechanics'],
    why: 'Moving through a simulated collapsing pocket while scanning downfield builds the mechanical habits that hold up under live pressure.',
    coaching_cue: 'Slide away from pressure first, THEN reset your feet before the throw',
    demo_url: 'https://www.youtube.com/results?search_query=quarterback+pocket+presence+drill+football',
  },
  {
    name: 'Ball Security Gauntlet (RB)',
    sets: 3, reps: null, duration: '5 minutes',
    category: 'technique',
    tags: ['technique', 'rb', 'ball security', 'fumble', 'carry'],
    why: 'High-volume contact on the ball trains the secure four-point carry position into automatic muscle memory.',
    coaching_cue: 'Four points of pressure: fingertips over the tip, forearm under the ball, bicep squeeze, tuck to the chest',
    demo_url: 'https://www.youtube.com/results?search_query=ball+security+gauntlet+running+back+drill',
  },
  {
    name: 'Block Sustain & Finish Drill',
    sets: 4, reps: 6, duration: null,
    category: 'technique',
    tags: ['technique', 'ol', 'blocking', 'finish', 'sustain', 'push', 'punch'],
    why: 'Repetitions of punch-and-sustain develop hand placement and hip drive needed to move defenders at the point of attack.',
    coaching_cue: 'Punch inside the frame — thumbs up, elbows in, then drive your feet',
    demo_url: 'https://www.youtube.com/results?search_query=offensive+lineman+punch+sustain+block+drill',
  },

  // COOLDOWN
  {
    name: 'Static Quad & Hip Flexor Stretch',
    sets: 1, reps: null, duration: '60 seconds each side',
    category: 'cooldown',
    tags: ['cooldown', 'flexibility', 'hip', 'recovery'],
    why: 'Reduces post-workout tightness in the hip flexors and quads that can limit stride length over time.',
    coaching_cue: 'Tuck your tailbone under — you should feel it deep in the front of the hip, not the knee',
    demo_url: 'https://www.youtube.com/results?search_query=quad+hip+flexor+stretch+football+cooldown',
  },
  {
    name: 'Seated Hamstring Stretch',
    sets: 1, reps: null, duration: '60 seconds each side',
    category: 'cooldown',
    tags: ['cooldown', 'flexibility', 'hamstring', 'recovery', 'speed'],
    why: 'Lengthens the hamstrings after sprint work, maintaining the range of motion needed for full posterior chain power.',
    coaching_cue: 'Hinge from the hip, not the back — reach forward with a flat spine',
    demo_url: 'https://www.youtube.com/results?search_query=seated+hamstring+stretch+football+recovery',
  },
  {
    name: 'Foam Roll (quads, IT band, calves)',
    sets: 1, reps: null, duration: '5 minutes',
    category: 'cooldown',
    tags: ['cooldown', 'recovery', 'soreness', 'stiffness'],
    why: 'Self-myofascial release reduces muscle stiffness and soreness, speeding recovery between sessions.',
    coaching_cue: 'Roll slowly — pause on the tender spots for 10-15 seconds before moving on',
    demo_url: 'https://www.youtube.com/results?search_query=foam+rolling+football+recovery+routine',
  },
]

// ─── Template Selection Logic ─────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const toExercise = ({ tags: _tags, ...e }: ExerciseTemplate): Exercise => e

function scoreExercise(exercise: ExerciseTemplate, painPoints: string[]): number {
  const painText = painPoints.join(' ').toLowerCase()
  let score = 0
  for (const tag of exercise.tags) {
    if (painText.includes(tag)) score += 2
  }
  return score
}

function pickByCategory(
  exercises: ExerciseTemplate[],
  category: Exercise['category'],
  count: number,
  painPoints: string[]
): ExerciseTemplate[] {
  const pool = exercises.filter(e => e.category === category)
  const scored = pool
    .map(e => ({ e, score: scoreExercise(e, painPoints) }))
    .sort((a, b) => b.score - a.score)
  return scored.slice(0, count).map(x => x.e)
}

/** Generic main exercises from the shared library */
function getGenericMainExercises(level: ExperienceLevel, painPoints: string[]): Exercise[] {
  const mainCategories: Exercise['category'][] =
    level === 'beginner'
      ? ['footwork', 'agility', 'technique', 'strength']
      : ['speed', 'agility', 'strength', 'technique', 'footwork']

  const mainExercises: ExerciseTemplate[] = []
  for (const cat of mainCategories) {
    const picked = pickByCategory(EXERCISE_LIBRARY, cat, 2, painPoints)
    for (const p of picked) {
      if (!mainExercises.find(e => e.name === p.name)) mainExercises.push(p)
    }
    if (mainExercises.length >= 8) break
  }
  return mainExercises.map(toExercise)
}

/**
 * RB-specific main exercises drawn from the curated position drill library.
 * Scores each drill against the pain points and picks the top matches,
 * falling back to the generic pool if fewer than 4 RB drills are found.
 */
function getRBMainExercises(level: ExperienceLevel, painPoints: string[]): Exercise[] {
  // Score each drill by how many pain points it addresses
  const drillScores = new Map<string, { exercise: Exercise; score: number }>()

  for (const pp of painPoints) {
    for (const drill of findRBDrillsForPainPoint(pp)) {
      const entry = drillScores.get(drill.name)
      if (entry) {
        entry.score += 1
      } else {
        drillScores.set(drill.name, { exercise: rbDrillToExercise(drill), score: 1 })
      }
    }
  }

  const sorted = [...drillScores.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ exercise }) => exercise)

  // Pad with generic exercises if the pain points didn't yield enough RB matches
  if (sorted.length < 4) {
    const existing = new Set(sorted.map(e => e.name))
    const filler = getGenericMainExercises(level, painPoints)
      .filter(e => !existing.has(e.name))
      .slice(0, 6 - sorted.length)
    return [...sorted, ...filler]
  }

  return sorted
}

/**
 * WR-specific main exercises drawn from the curated position drill library.
 */
function getWRMainExercises(level: ExperienceLevel, painPoints: string[]): Exercise[] {
  const drillScores = new Map<string, { exercise: Exercise; score: number }>()

  for (const pp of painPoints) {
    for (const drill of findWRDrillsForPainPoint(pp)) {
      const entry = drillScores.get(drill.name)
      if (entry) {
        entry.score += 1
      } else {
        drillScores.set(drill.name, { exercise: wrDrillToExercise(drill), score: 1 })
      }
    }
  }

  const sorted = [...drillScores.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ exercise }) => exercise)

  if (sorted.length < 4) {
    const existing = new Set(sorted.map(e => e.name))
    const filler = getGenericMainExercises(level, painPoints)
      .filter(e => !existing.has(e.name))
      .slice(0, 6 - sorted.length)
    return [...sorted, ...filler]
  }

  return sorted
}

/**
 * QB-specific main exercises drawn from the curated position drill library.
 */
function getQBMainExercises(level: ExperienceLevel, painPoints: string[]): Exercise[] {
  const drillScores = new Map<string, { exercise: Exercise; score: number }>()

  for (const pp of painPoints) {
    for (const drill of findQBDrillsForPainPoint(pp)) {
      const entry = drillScores.get(drill.name)
      if (entry) {
        entry.score += 1
      } else {
        drillScores.set(drill.name, { exercise: qbDrillToExercise(drill), score: 1 })
      }
    }
  }

  const sorted = [...drillScores.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ exercise }) => exercise)

  if (sorted.length < 4) {
    const existing = new Set(sorted.map(e => e.name))
    const filler = getGenericMainExercises(level, painPoints)
      .filter(e => !existing.has(e.name))
      .slice(0, 6 - sorted.length)
    return [...sorted, ...filler]
  }

  return sorted
}

/**
 * OL-specific main exercises drawn from the curated position drill library.
 */
function getOLMainExercises(level: ExperienceLevel, painPoints: string[]): Exercise[] {
  const drillScores = new Map<string, { exercise: Exercise; score: number }>()

  for (const pp of painPoints) {
    for (const drill of findOLDrillsForPainPoint(pp)) {
      const entry = drillScores.get(drill.name)
      if (entry) {
        entry.score += 1
      } else {
        drillScores.set(drill.name, { exercise: olDrillToExercise(drill), score: 1 })
      }
    }
  }

  const sorted = [...drillScores.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ exercise }) => exercise)

  if (sorted.length < 4) {
    const existing = new Set(sorted.map(e => e.name))
    const filler = getGenericMainExercises(level, painPoints)
      .filter(e => !existing.has(e.name))
      .slice(0, 6 - sorted.length)
    return [...sorted, ...filler]
  }

  return sorted
}

/**
 * TE-specific main exercises drawn from the curated position drill library.
 */
function getTEMainExercises(level: ExperienceLevel, painPoints: string[]): Exercise[] {
  const drillScores = new Map<string, { exercise: Exercise; score: number }>()

  for (const pp of painPoints) {
    for (const drill of findTEDrillsForPainPoint(pp)) {
      const entry = drillScores.get(drill.name)
      if (entry) {
        entry.score += 1
      } else {
        drillScores.set(drill.name, { exercise: teDrillToExercise(drill), score: 1 })
      }
    }
  }

  const sorted = [...drillScores.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ exercise }) => exercise)

  if (sorted.length < 4) {
    const existing = new Set(sorted.map(e => e.name))
    const filler = getGenericMainExercises(level, painPoints)
      .filter(e => !existing.has(e.name))
      .slice(0, 6 - sorted.length)
    return [...sorted, ...filler]
  }

  return sorted
}

/**
 * DL-specific main exercises drawn from the curated position drill library.
 */
function getDLMainExercises(level: ExperienceLevel, painPoints: string[]): Exercise[] {
  const drillScores = new Map<string, { exercise: Exercise; score: number }>()

  for (const pp of painPoints) {
    for (const drill of findDLDrillsForPainPoint(pp)) {
      const entry = drillScores.get(drill.name)
      if (entry) {
        entry.score += 1
      } else {
        drillScores.set(drill.name, { exercise: dlDrillToExercise(drill), score: 1 })
      }
    }
  }

  const sorted = [...drillScores.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ exercise }) => exercise)

  if (sorted.length < 4) {
    const existing = new Set(sorted.map(e => e.name))
    const filler = getGenericMainExercises(level, painPoints)
      .filter(e => !existing.has(e.name))
      .slice(0, 6 - sorted.length)
    return [...sorted, ...filler]
  }

  return sorted
}

/**
 * LB-specific main exercises drawn from the curated position drill library.
 */
function getLBMainExercises(level: ExperienceLevel, painPoints: string[]): Exercise[] {
  const drillScores = new Map<string, { exercise: Exercise; score: number }>()

  for (const pp of painPoints) {
    for (const drill of findLBDrillsForPainPoint(pp)) {
      const entry = drillScores.get(drill.name)
      if (entry) {
        entry.score += 1
      } else {
        drillScores.set(drill.name, { exercise: lbDrillToExercise(drill), score: 1 })
      }
    }
  }

  const sorted = [...drillScores.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ exercise }) => exercise)

  if (sorted.length < 4) {
    const existing = new Set(sorted.map(e => e.name))
    const filler = getGenericMainExercises(level, painPoints)
      .filter(e => !existing.has(e.name))
      .slice(0, 6 - sorted.length)
    return [...sorted, ...filler]
  }

  return sorted
}

/**
 * OLB-specific main exercises drawn from the curated position drill library.
 */
function getOLBMainExercises(level: ExperienceLevel, painPoints: string[]): Exercise[] {
  const drillScores = new Map<string, { exercise: Exercise; score: number }>()

  for (const pp of painPoints) {
    for (const drill of findOLBDrillsForPainPoint(pp)) {
      const entry = drillScores.get(drill.name)
      if (entry) {
        entry.score += 1
      } else {
        drillScores.set(drill.name, { exercise: olbDrillToExercise(drill), score: 1 })
      }
    }
  }

  const sorted = [...drillScores.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ exercise }) => exercise)

  if (sorted.length < 4) {
    const existing = new Set(sorted.map(e => e.name))
    const filler = getGenericMainExercises(level, painPoints)
      .filter(e => !existing.has(e.name))
      .slice(0, 6 - sorted.length)
    return [...sorted, ...filler]
  }

  return sorted
}

function getDBMainExercises(level: ExperienceLevel, painPoints: string[]): Exercise[] {
  const drillScores = new Map<string, { exercise: Exercise; score: number }>()

  for (const pp of painPoints) {
    for (const drill of findDBDrillsForPainPoint(pp)) {
      const entry = drillScores.get(drill.name)
      if (entry) {
        entry.score += 1
      } else {
        drillScores.set(drill.name, { exercise: dbDrillToExercise(drill), score: 1 })
      }
    }
  }

  const sorted = [...drillScores.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ exercise }) => exercise)

  if (sorted.length < 4) {
    const existing = new Set(sorted.map(e => e.name))
    const filler = getGenericMainExercises(level, painPoints)
      .filter(e => !existing.has(e.name))
      .slice(0, 6 - sorted.length)
    return [...sorted, ...filler]
  }

  return sorted
}

/**
 * Specialist (K/P/LS) main exercises drawn from the curated specialist drill library.
 */
function getSTMainExercises(level: ExperienceLevel, painPoints: string[]): Exercise[] {
  const drillScores = new Map<string, { exercise: Exercise; score: number }>()

  for (const pp of painPoints) {
    for (const drill of findSTDrillsForPainPoint(pp)) {
      const entry = drillScores.get(drill.name)
      if (entry) {
        entry.score += 1
      } else {
        drillScores.set(drill.name, { exercise: stDrillToExercise(drill), score: 1 })
      }
    }
  }

  const sorted = [...drillScores.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ exercise }) => exercise)

  // Pad with strength/conditioning from the specialist library if pain points
  // didn't surface enough drills
  if (sorted.length < 4) {
    const existing = new Set(sorted.map(e => e.name))
    const filler = getGenericMainExercises(level, painPoints)
      .filter(e => !existing.has(e.name))
      .slice(0, 6 - sorted.length)
    return [...sorted, ...filler]
  }

  return sorted
}

/**
 * Normalise any specific position code to the drill-library group it should
 * use.  Covers every value in the FootballPosition union type.
 *
 * OT / OG / C  → OL   (all offensive-line variants share the OL library)
 * DE / DT / NT  → DL   (all defensive-line variants share the DL library)
 * ILB / OLB    → LB   (all linebacker variants share the LB library)
 * CB / SS / FS → DB   (all defensive-back variants share the DB library)
 * FB           → RB   (fullback uses the RB library)
 * S            → DB   (generic "safety" tag)
 *
 * K / P / LS     → ST  (Specialists share one library)
 * QB and TE each have their own dedicated libraries and are NOT grouped.
 */
export function normalizePosition(position: string | null | undefined): string | null {
  const p = position?.toUpperCase() ?? null
  if (!p) return null

  // Offensive line group
  if (['OT', 'OG', 'C', 'OL'].includes(p)) return 'OL'

  // Defensive line group
  if (['DE', 'DT', 'NT', 'DL'].includes(p)) return 'DL'

  // Linebacker group — ILB and OLB both use the general LB library
  if (['ILB', 'OLB', 'LB'].includes(p)) return 'LB'

  // Defensive back group
  if (['CB', 'SS', 'FS', 'DB', 'S'].includes(p)) return 'DB'

  // Fullback → RB library
  if (p === 'FB') return 'RB'

  // Specialists → ST library
  if (['K', 'P', 'LS'].includes(p)) return 'ST'

  // Individual libraries: QB, RB, WR, TE — returned as-is
  // No library: Athlete — falls to generic
  return p
}

export function getTemplateExercises(
  level: ExperienceLevel,
  painPoints: string[],
  position?: string | null
): Exercise[] {
  // Always bookend with generic warmup / cooldown
  const warmups   = pickByCategory(EXERCISE_LIBRARY, 'warmup',   2, painPoints).map(toExercise)
  const cooldowns = pickByCategory(EXERCISE_LIBRARY, 'cooldown', 2, painPoints).map(toExercise)

  const pos = normalizePosition(position)
  const main = pos === 'RB'
    ? getRBMainExercises(level, painPoints)
    : pos === 'WR'
    ? getWRMainExercises(level, painPoints)
    : pos === 'QB'
    ? getQBMainExercises(level, painPoints)
    : pos === 'OL'
    ? getOLMainExercises(level, painPoints)
    : pos === 'TE'
    ? getTEMainExercises(level, painPoints)
    : pos === 'DL'
    ? getDLMainExercises(level, painPoints)
    : pos === 'LB'
    ? getLBMainExercises(level, painPoints)
    : pos === 'DB'
    ? getDBMainExercises(level, painPoints)
    : pos === 'ST'
    ? getSTMainExercises(level, painPoints)
    : getGenericMainExercises(level, painPoints)

  return [...warmups, ...main.slice(0, 8), ...cooldowns]
}

// ─── Timeline Calculator ──────────────────────────────────────────────────────

export function getImprovementTimeline(level: ExperienceLevel, painPoints: string[]): {
  weeks: string
  reason: string
  pivot_at_weeks: number
} {
  const timelineMap: Record<ExperienceLevel, { weeks: string; pivot_at_weeks: number }> = {
    beginner:     { weeks: '4–6 weeks', pivot_at_weeks: 4 },
    intermediate: { weeks: '6–10 weeks', pivot_at_weeks: 6 },
    elite:        { weeks: '8–14 weeks', pivot_at_weeks: 8 },
  }
  const t = timelineMap[level]

  const isPhysical = painPoints.some(p =>
    /speed|strength|power|burst|explosion/i.test(p)
  )
  const isTechnique = painPoints.some(p =>
    /route|footwork|hand|mechanic|technique/i.test(p)
  )

  const reason =
    isPhysical && isTechnique
      ? 'Combined physical and technique improvements take consistent rep exposure across multiple weeks to wire into muscle memory.'
      : isPhysical
      ? 'Physical attributes like speed and strength require neurological adaptation (2–3 wks) before measurable gains appear.'
      : 'Technique corrections require repetition under progressively harder conditions before they hold under game pressure.'

  return { ...t, reason }
}
