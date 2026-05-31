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
  | 'zone_coverage'   // Quarters, halves, Cover 3 drops; break on ball
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

  // ── ZONE COVERAGE & BREAKS ───────────────────────────────────────────────

  {
    name: 'Quarters Technique — Post / Go Read',
    category: 'technique',
    technique_area: 'zone_coverage',
    sets: 3, reps: 8, duration: null,
    why: 'In Cover 4 (Quarters), the FS maintains 1.5-2 yards of inside leverage and stays with the route until it declares as a post or go. Keeping the inside attitude allows the FS to break hard on all other routes — giving up the inside gives up the entire deep middle.',
    coaching_cue: 'Inside attitude on everything — hold leverage until the route declares. Don\'t give the post until you absolutely have to.',
    common_mistake: 'Rotating to the outside on a go stem before the route declares — opens the post route directly behind the FS in the exact zone they\'re responsible for',
    fixes: ['quarters', 'Cover 4', 'inside leverage', 'post', 'go route', 'deep zone', 'coverage', 'rotation', 'declare'],
    progressions: ['Walk-through alignment and leverage check', 'React to post vs go declaration on signal', 'Full-speed vs WR running post/go/dig combinations'],
    videos: [
      { title: 'Quarters Technique Post Go Read Free Safety Football', url: 'https://www.youtube.com/results?search_query=quarters+technique+post+go+read+free+safety+football+Cover+4', duration: '~7 min' },
    ],
  },
  {
    name: 'Quarters Safety Run Support — Front / Backside',
    category: 'technique',
    technique_area: 'zone_coverage',
    sets: 3, reps: 8, duration: null,
    why: 'In Quarters coverage the front safety fills outside (contain) while the backside safety secures the C gap cutback. Without practiced gap assignments, both safeties over-pursue the ball and the cutback goes untouched.',
    coaching_cue: 'Front safety: fill outside the box. Backside safety: C gap cutback — don\'t follow the ball.',
    common_mistake: 'Both safeties over-pursuing the ball to the same side — leaves the backside cutback lane completely open for a big gain',
    fixes: ['quarters', 'run support', 'contain', 'cutback', 'C gap', 'fill', 'assignment', 'run defense', 'backside', 'gap', 'front safety'],
    progressions: ['Walk-through front/backside assignment identification', 'Half-speed run-support fill with one blocker', 'Full-speed Quarters run support vs live backfield'],
    videos: [
      { title: 'Quarters Safety Run Support Front Backside Football', url: 'https://www.youtube.com/results?search_query=quarters+safety+run+support+front+backside+coverage+football', duration: '~7 min' },
    ],
  },
  {
    name: 'Break on Ball — Halves / Thirds',
    category: 'technique',
    technique_area: 'zone_coverage',
    sets: 4, reps: 8, duration: null,
    why: 'The FS reads the QB\'s drop, pedals on the snap, and breaks at the proper angle to intercept at the ball\'s highest point. Breaking flat instead of at a 45-degree angle results in arriving at the ball when it is already past the apex — the WR wins every 50/50 ball.',
    coaching_cue: 'Plant the outside foot when the QB\'s elbow comes forward — break at 45 degrees to the interception point, not toward the receiver',
    common_mistake: 'Breaking flat toward the receiver rather than at 45 degrees to the interception point — arrives after the apex and misses the interception',
    fixes: ['break on ball', 'ball break', 'interception', 'intercept', 'QB read', 'angle', 'highest point', 'coverage', 'plant', 'zone', 'halves'],
    progressions: ['QB read drop + break on coach throw signal', 'Half-speed angled break to cone', 'Full-speed break vs live QB with receiver'],
    videos: [
      { title: 'Break on Ball Halves Thirds Free Safety Zone Coverage', url: 'https://www.youtube.com/results?search_query=break+on+ball+halves+thirds+free+safety+zone+coverage+football', duration: '~7 min' },
    ],
  },
  {
    name: 'Weave Drill — Lateral Leverage Backpedal',
    category: 'footwork',
    technique_area: 'deep_zone',
    sets: 3, reps: null, duration: '20 yards each',
    why: 'The FS backpedals while the coach directs with ball movement right to left. The FS adjusts lateral angle within the backpedal while maintaining leverage — training the continuous footwork adjustments the FS makes while tracking both the QB\'s eyes and the route simultaneously.',
    coaching_cue: 'Head up on the coach\'s ball — your feet adjust automatically. Eyes lead, feet follow. Never cross your feet.',
    common_mistake: 'Crossing the feet to move laterally instead of shuffling within the backpedal — creates a dead step and destroys break timing',
    fixes: ['weave', 'backpedal', 'lateral', 'leverage', 'coverage', 'change direction', 'footwork', 'movement', 'ball tracking', 'zone'],
    progressions: ['Coach ball slow directional cues (lateral weave)', 'Angle weave with faster direction changes', 'Full-speed weave with QB read on the break'],
    videos: [
      { title: 'Weave Drill Lateral Leverage Backpedal Free Safety Football', url: 'https://www.youtube.com/results?search_query=weave+drill+lateral+leverage+backpedal+free+safety+football', duration: '~6 min' },
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
