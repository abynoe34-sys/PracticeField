/**
 * Free Safety (FS) Position Drill Library
 *
 * The Free Safety operates as the "center fielder" of the defense — the last
 * line of protection against big plays.
 *
 * Primary Role: Reading the quarterback's eyes, providing over-the-top help
 *   to cornerbacks, and covering the deep middle in zone coverage.
 * Key Skills:  Superior field vision, elite top-end speed, high football IQ.
 *
 * Drill emphasis: QB read and deep zone first, pursuit angle second,
 * ball skills (high-point catch) third.
 */

import type { Exercise } from '@/types'

export interface DrillVideoFS {
  title: string
  url: string
  duration: string
  notes?: string
}

export type FSTechniqueArea =
  | 'qb_read'         // reading QB eyes, drop, intent; break timing
  | 'deep_zone'       // center field, deep half, deep third; cushion
  | 'over_top_help'   // rotating to help CB over the top of vertical routes
  | 'pursuit'         // angle pursuit, cross-field range, run support from deep
  | 'ball_skills'     // tracking, high-point catch, over-the-shoulder catch
  | 'play_action'     // discipline against run fakes that attack deep middle
  | 'conditioning'    // speed and range foundation

export type FSDrillCategory = Exercise['category']

export interface FSDrillEntry {
  name: string
  category: FSDrillCategory
  technique_area: FSTechniqueArea
  sets: number | null
  reps: number | null
  duration: string | null
  why: string
  coaching_cue: string
  common_mistake: string
  fixes: string[]
  progressions: string[]
  videos: DrillVideoFS[]
}

export const FS_DRILLS: FSDrillEntry[] = [

  // ── QB READ & ZONE DROPS ──────────────────────────────────────────────────

  {
    name: 'QB Read Drops — Deep Zone',
    category: 'footwork',
    technique_area: 'qb_read',
    sets: 4, reps: 8, duration: null,
    why: 'The FS reads the QB\'s drop and intent to determine which deep zone to protect — rotating to a deep half on a 3-step drop or staying center-field on a long drop. Breaking on QB eyes rather than receiver routes is what separates elite free safeties.',
    coaching_cue: 'Head on a swivel on the drop — the QB\'s eyes and shoulder turn tell you the throw before his arm does',
    common_mistake: 'Keying the first receiver instead of the QB — gets sucked forward on short passes and vacates the deep middle for the post or seam route',
    fixes: ['QB read', 'read', 'zone', 'deep zone', 'deep middle', 'center field', 'coverage', 'rotation', 'post', 'seam', 'eyes'],
    progressions: ['Drop to landmark with no QB (depth focus)', 'Drop + react to coach throw signal', 'Full-speed drop vs live QB with receivers'],
    videos: [
      { title: 'Free Safety QB Read Drop Deep Zone Coverage Football', url: 'https://www.youtube.com/results?search_query=free+safety+QB+read+drop+deep+zone+coverage+football', duration: '~8 min' },
    ],
  },
  {
    name: 'Center Field Zone Drop — Over-the-Top Help',
    category: 'footwork',
    technique_area: 'deep_zone',
    sets: 4, reps: 8, duration: null,
    why: 'The FS must maintain 12-15 yard pre-snap depth and read which CB will need over-the-top help before the ball is snapped. Arriving late over the top means the CB is in man-island against a vertical — a touchdown.',
    coaching_cue: 'Your depth is your power — stay over the top of everything until the ball is in the air, then break',
    common_mistake: 'Creeping forward to support the run before the snap is confirmed — vacates the deep middle on play-action and leaves the CB without safety help',
    fixes: ['depth', 'center field', 'deep zone', 'over the top', 'vertical', 'Cover 2', 'zone', 'cushion', 'safety help', 'deep', 'post'],
    progressions: ['Depth alignment drill with formation identification', 'Drop + rotate over-the-top to wide side', 'Full-speed center-field rotation vs two-receiver side'],
    videos: [
      { title: 'Free Safety Center Field Zone Drop Over Top Help', url: 'https://www.youtube.com/results?search_query=free+safety+center+field+zone+drop+over+top+help+football', duration: '~7 min' },
    ],
  },

  // ── PLAY-ACTION DISCIPLINE ────────────────────────────────────────────────

  {
    name: 'Play-Action Read Discipline Drill',
    category: 'technique',
    technique_area: 'play_action',
    sets: 3, reps: 8, duration: null,
    why: 'The FS is the most dangerous target for play-action because their run keys (RB and OL movement) all signal run. A FS who bites vacates the deep middle — the most punished single mistake in secondary play.',
    coaching_cue: 'Run action = slow your feet, not commit your body. Your hips stay deep until the QB\'s eyes go forward.',
    common_mistake: 'Aggressively stepping toward the run fake before reading the QB\'s drop — opens the post and deep middle on every play-action snap',
    fixes: ['play action', 'play-action', 'fake', 'run fake', 'bite', 'deep middle', 'coverage', 'discipline', 'read', 'post route'],
    progressions: ['Walk-through run key vs PA key recognition', 'Half-speed read with run/PA signal from coach', 'Full-speed play-action vs live QB and receivers'],
    videos: [
      { title: 'Free Safety Play Action Read Discipline Drill Football', url: 'https://www.youtube.com/results?search_query=free+safety+play+action+read+discipline+drill+football', duration: '~7 min' },
    ],
  },

  // ── PURSUIT & RUN SUPPORT ─────────────────────────────────────────────────

  {
    name: 'Angle Pursuit Drill',
    category: 'speed',
    technique_area: 'pursuit',
    sets: 4, reps: 6, duration: null,
    why: 'When a ball carrier breaks into the secondary the FS has the longest pursuit angle on the field. The wrong angle results in a touchdown even if the FS has superior speed — running to the interception point, not toward the ball carrier, is the skill.',
    coaching_cue: 'Attack the inside hip of where the carrier is going, not where they are — run to the interception point',
    common_mistake: 'Pursuing flat (directly toward the ball carrier) instead of the interception point — overpursues and misses the tackle angle on cutbacks',
    fixes: ['pursuit', 'angle', 'pursuit angle', 'ball carrier', 'tackle', 'open field', 'chase', 'speed', 'interception point', 'cutback', 'miss'],
    progressions: ['Cone angle identification drill (pick correct cone)', 'Half-speed angle pursuit vs coach signal', 'Full-speed pursuit vs live ball carrier'],
    videos: [
      { title: 'Free Safety Angle Pursuit Drill Football Tackling', url: 'https://www.youtube.com/results?search_query=free+safety+angle+pursuit+drill+football+tackling', duration: '~7 min' },
    ],
  },
  {
    name: 'Cross-Field Range Drill',
    category: 'speed',
    technique_area: 'pursuit',
    sets: 4, reps: 4, duration: null,
    why: 'The FS must rotate to either corner of the field in under 3 seconds from center field. Cross-field range separates elite free safeties from average ones — arriving a step late on a back-shoulder fade in the corner is the difference between a PBU and a touchdown.',
    coaching_cue: 'Turn the hips to the target first — don\'t side-shuffle. Hips turned = maximum speed.',
    common_mistake: 'Side-shuffling across the field instead of turning the hips fully — loses 30% of top-end speed and arrives a step late',
    fixes: ['range', 'cross field', 'rotation', 'speed', 'coverage', 'corner', 'deep ball', 'help', 'center field', 'rotate'],
    progressions: ['Hip-turn sprint to sideline (no ball)', 'Cross-field rotation on coach signal', 'Full-speed rotation vs live deep route to either corner'],
    videos: [
      { title: 'Free Safety Cross Field Range Rotation Drill Football', url: 'https://www.youtube.com/results?search_query=free+safety+cross+field+range+rotation+drill+football', duration: '~6 min' },
    ],
  },

  // ── BALL SKILLS ───────────────────────────────────────────────────────────

  {
    name: 'Tracking & High-Point Catch Drill',
    category: 'technique',
    technique_area: 'ball_skills',
    sets: 3, reps: 10, duration: null,
    why: 'The FS routinely catches or breaks up balls with their back to the LOS at full sprint. Tracking over the shoulder and timing the leap to the ball\'s highest point is a trainable skill — the FS who catches at the highest point wins every 50/50 ball.',
    coaching_cue: 'Eyes over the inside shoulder, track the ball to the highest point — jump to the ball, not at the receiver',
    common_mistake: 'Looking back too late and having to lunge for the ball at hip height — turns a winnable interception into a contested catch',
    fixes: ['tracking', 'high point', 'ball skills', 'catch', 'interception', 'over the shoulder', 'deep', 'vertical', 'jump ball', 'contested'],
    progressions: ['JUGS machine over-shoulder tracking', 'Coach throw with pursuit angle', 'Full-speed tracking vs live QB and WR'],
    videos: [
      { title: 'Free Safety High Point Catch Tracking Drill Football', url: 'https://www.youtube.com/results?search_query=free+safety+high+point+catch+tracking+drill+football+interception', duration: '~7 min' },
    ],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function findFSDrillsForPainPoint(painPoint: string): FSDrillEntry[] {
  const lower = painPoint.toLowerCase()
  return FS_DRILLS.filter(d =>
    d.fixes.some(fix => lower.includes(fix) || fix.includes(lower.split(' ')[0]))
  ).slice(0, 4)
}

export function fsDrillToExercise(drill: FSDrillEntry): Exercise {
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
