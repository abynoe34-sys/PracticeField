/**
 * Defensive Back (CB / S / DB) Position-Specific Drill Library
 *
 * Primary sources:
 *  • McLeod DB Drill Manual (complete drill library — footwork, coverage, tackling, ball drills)
 *  • Free Safety / Rover Fundamentals & Coverage Techniques (1/4s, 1/2 field, Press Man, Off Man)
 *  • Bump and Run Inside Man Technique (press coverage)
 *  • 12 clinic coaches: Adam Harvey (Hutto TX), Allen Brown (Eastern Washington),
 *    Bryant Foster (Coastal Carolina), Cherokee Valeria (Sacramento State),
 *    Chris Campolieta (Richmond County NC), Diamond Weaver (Stony Brook),
 *    Eric Crocker (film review), Gary McGraw (Sam Houston State),
 *    Jay Wilson (Marshall TX), Leon Wright (ODU), Mike McElroy (Bethel College),
 *    Patrick Toney (Louisiana)
 *
 * Core DB philosophy (from sources):
 *  1. Believe in your backpedal — butt leads you back, string leads you forward
 *  2. Cushion is an asset; never give it up cheaply
 *  3. In phase = hip to hip, look for ball. Out of phase = play the receiver's head and hands
 *  4. Every break must be sharp — never run the hump
 *  5. Be a ballhawk: intercept at the highest point, never wait for it to come to you
 */

import type { Exercise } from '@/types'

// ─── Technique Areas ──────────────────────────────────────────────────────────

export type DBTechniqueArea =
  | 'stance_backpedal'    // base stance, low pedal, tempo control
  | 'change_of_direction' // plant step, W drill, hip turns, angle breaks
  | 'man_coverage'        // cushion, press, trail, phase (in/out), bump and run
  | 'zone_coverage'       // Cover 2 funnel, Cover 3 drop, bail, Quarters read
  | 'ball_skills'         // intercepts, tip drills, tracking ball, strip technique
  | 'block_defeat'        // stalk, crack recognition, cut block defeat, edge setting
  | 'tackling'            // open field, angle tackle, leverage tackle, same-foot-same-shoulder

export const DB_AREA_LABELS: Record<DBTechniqueArea, string> = {
  stance_backpedal:    'Stance & Backpedal',
  change_of_direction: 'Change of Direction',
  man_coverage:        'Man Coverage',
  zone_coverage:       'Zone Coverage',
  ball_skills:         'Ball Skills & Turnovers',
  block_defeat:        'Block Defeat',
  tackling:            'Tackling',
}

// ─── Drill Entry Type ─────────────────────────────────────────────────────────

export interface DBDrillEntry {
  name: string
  technique_area: DBTechniqueArea
  category: Exercise['category']
  sets: number | null
  reps: number | null
  duration?: string
  why: string
  coaching_cue: string
  common_mistake: string
  fixes: string[]
  progressions: string[]
  videos: { title: string; url: string; duration: string }[]
}

// ─── Teaching Step Type ───────────────────────────────────────────────────────

export interface DBTeachingStep {
  order: number
  topic: string
  technique_area: DBTechniqueArea
  keyPoints: string[]
  techniques?: { name: string; bestFor: string; cues: string[] }[]
}

// ─── Drill Library ────────────────────────────────────────────────────────────

export const DB_DRILLS: DBDrillEntry[] = [

  // ── STANCE & BACKPEDAL ──────────────────────────────────────────────────────

  {
    name: 'DB Stance & Low Pedal',
    technique_area: 'stance_backpedal',
    category: 'technique',
    sets: 3,
    reps: null,
    duration: '15 yards across and back',
    why: 'The backpedal is the foundation of all DB play. Chin over toes, stomach grazing the thigh — this creates an explosive base for any cut or turn. A high-stepping DB telegraphs his reactions and loses leverage.',
    coaching_cue: 'Cut the grass — feet stay low, elbows parallel to back, butt leads you back.',
    common_mistake: 'Rising out of the pedal and leaning back, which kills the ability to drive on the ball.',
    fixes: [
      'poor backpedal', 'upright posture', 'high-stepping', 'slow backpedal',
      'balance issues', 'stance issues', 'pad level',
    ],
    progressions: [
      'Walking low pedal on yard line',
      'Half-speed with coaching stops for posture check',
      'Full-speed backpedal sideline to hash',
      'Fast/Slow variation: coach signals speed changes with ball extension and retraction',
    ],
    videos: [],
  },

  {
    name: 'Fast / Slow Backpedal (Tempo Control)',
    technique_area: 'stance_backpedal',
    category: 'technique',
    sets: 3,
    reps: null,
    duration: '15-20 yards',
    why: 'DBs rarely backpedal at constant speed. Route runners use stem moves and speed changes to steal cushion. This drill trains the ability to gear up and gear down without losing pad level or base.',
    coaching_cue: 'Ball out = accelerate; ball to chest = decelerate — never lose your base during the gear change.',
    common_mistake: 'Straightening up when slowing down, which kills hip-sink and the ability to break on the ball.',
    fixes: [
      'cushion management', 'losing leverage', 'slow reaction to route breaks',
      'poor backpedal tempo', 'getting beat over the top', 'cushion',
    ],
    progressions: [
      '3 speed changes, coach-controlled',
      'Add directional weave at each speed change',
      'Live receiver applying stem moves',
    ],
    videos: [],
  },

  {
    name: 'Karoke Hip Warm-Up',
    technique_area: 'stance_backpedal',
    category: 'agility',
    sets: 2,
    reps: null,
    duration: '15 yards each direction',
    why: 'Hip flexibility is the physical prerequisite for everything a DB does — turns, breaks, man turns, bail technique. Daily karoke primes the hip rotators and reinforces quick-feet habits.',
    coaching_cue: 'Watch for quick feet and active hips; use your arms as if sprinting.',
    common_mistake: 'Lazy hip rotation — going through the motions rather than driving the hips through each crossover.',
    fixes: [
      'hip stiffness', 'slow hip turn', 'stiff transitions', 'man turn too slow', 'hip flexibility',
    ],
    progressions: [
      'Standard karoke facing coach',
      'Add ball catch while karoking for coordination',
      'Both directions, increase speed each rep',
    ],
    videos: [],
  },

  // ── CHANGE OF DIRECTION ──────────────────────────────────────────────────────

  {
    name: 'W Drill (DB — Backpedal & Plant)',
    technique_area: 'change_of_direction',
    category: 'agility',
    sets: 3,
    reps: null,
    duration: '4-cone run, both directions',
    why: 'The W Drill trains the core skill: pedal to a point, plant hard on the back foot, and drive at a sharp angle — all while maintaining cushion. It is the footwork pattern used on every route break in a game.',
    coaching_cue: 'Butt to the cone — explode off the plant foot with string going straight to the aiming cone.',
    common_mistake: 'Rounding the breaks instead of planting and driving at a sharp angle.',
    fixes: [
      'slow breaks', 'rounded cuts', 'poor plant step', 'losing leverage on routes',
      'change of direction', 'w drill', 'break angle',
    ],
    progressions: [
      'Short W: cones 2 yards apart — emphasize foot fire',
      'Long W: cones 5 yards apart — full backpedal between',
      'Add ball on final break for catch and run',
    ],
    videos: [],
  },

  {
    name: 'Hip Turns — 3-Part Progression',
    technique_area: 'change_of_direction',
    category: 'technique',
    sets: 3,
    reps: 3,
    why: 'DBs must know when to break from an open-hip position versus when to execute a baseball (speed) turn. Getting this wrong means running the hump and giving up separation. This 3-part drill builds the instinct.',
    coaching_cue: 'Hips open and facing the middle? Break back. Hips closed toward the goal line? Baseball turn.',
    common_mistake: 'Always choosing the same technique regardless of hip position — leaving receivers open on crossers or posts.',
    fixes: [
      'hip turn', 'slow to transition', 'getting beat on posts', 'getting beat on crosses',
      'baseball turn', 'backpedal to break transition', 'lost receiver',
    ],
    progressions: [
      'Part 1: Pedal, open hips, break back / in / out (3 choices)',
      'Part 2: Pedal, hip turn, baseball turn, accelerate back to coach',
      'Part 3: Pedal, open, baseball turn to drive an out or in route',
    ],
    videos: [],
  },

  {
    name: 'Pedal and Turn (Man Turn)',
    technique_area: 'change_of_direction',
    category: 'technique',
    sets: 4,
    reps: null,
    duration: '8-10 yard backpedal + sprint through hash',
    why: 'When a receiver speed threatens the cushion, the DB must open hips, rip the arm and shoulder through on a low plane, and explode into a sprint — without false steps. A poor turn gives receivers a free step.',
    coaching_cue: 'Lead with elbow on a low plane (90 degrees or less); lead toe points 180 degrees down the center of your body.',
    common_mistake: 'High elbow on the turn — raising the arm opens the hips slowly and kills acceleration.',
    fixes: [
      'slow turn', 'high elbow turn', 'man turn technique', 'getting beat deep',
      'receiver running past', 'cushion stolen', 'man turn',
    ],
    progressions: [
      'Solo: pedal to hash, turn right/left on coach signal',
      'With partner: receiver threatens cushion at 3/4 speed',
      'Full speed live receiver — react to break',
    ],
    videos: [],
  },

  // ── MAN COVERAGE ─────────────────────────────────────────────────────────────

  {
    name: 'Cushion / Cushion and Turn Drill',
    technique_area: 'man_coverage',
    category: 'technique',
    sets: 4,
    reps: null,
    duration: 'Sideline to hash, both directions',
    why: 'Cushion management separates good corners from great ones. Too much cushion gives quick game. Too little gets beaten deep. The drill forces the DB to stay in a pedal while a receiver runs at full speed, until the hip-to-hip threshold forces the turn.',
    coaching_cue: 'Stay in your pedal as long as you have cushion — never open up too soon, or too late.',
    common_mistake: 'Opening the hips before the receiver forces it, which telegraphs the turn and allows easy double moves.',
    fixes: [
      'cushion too deep', 'opening hips early', 'getting beat on double move',
      'man coverage', 'lost receiver on vertical', 'cushion management',
    ],
    progressions: [
      'Receiver at half speed — 5-7 yard cushion, work turn transition',
      'Receiver at 3/4 speed — tighten cushion for teaching',
      'Full speed receiver — react naturally to when turn is forced',
    ],
    videos: [],
  },

  {
    name: 'Phase Drill — In Phase & Out of Phase',
    technique_area: 'man_coverage',
    category: 'technique',
    sets: 3,
    reps: 4,
    why: 'When hip to hip (in phase), the DB looks for the ball. When trailing (out of phase), he plays the receiver head and hands. Mixing up the technique is the most common DB error on deep balls.',
    coaching_cue: 'In phase: press the hip with inside hand, look for the ball when you have control. Out of phase: smack the far wrist to break stride, never contact the body early.',
    common_mistake: 'Looking for the ball when out of phase — drawing a flag while still behind the receiver.',
    fixes: [
      'pass interference', 'reaching', 'looking for ball too early', 'in phase',
      'out of phase', 'deep ball coverage', 'man coverage breakdown', 'phase',
    ],
    progressions: [
      'Walk-through with two staggered DBs — one leads, one trails',
      'Half-speed with coach calling in-phase / out-of-phase',
      'Live receiver at 3/4 speed with ball thrown on signal',
    ],
    videos: [],
  },

  {
    name: 'Bump & Run Mirror / Snake Drill',
    technique_area: 'man_coverage',
    category: 'technique',
    sets: 4,
    reps: null,
    duration: '10-15 yards',
    why: 'Press coverage demands lateral shuffle balance, active hands, and hip flexibility — not physical strength alone. The Snake Drill replicates a receiver working a DB in and out after initial contact, forcing hand alternation and footwork adaptation.',
    coaching_cue: 'Thumb up and elbow locked on the jam — punch the breastplate, not the arms. Shuffle until you lose position, then execute the man turn.',
    common_mistake: 'Reaching with one hand only and allowing the receiver to escape inside — the DB must alternate hands as the receiver moves.',
    fixes: [
      'press coverage', 'bump and run', 'jam technique', 'receiver releasing',
      'hand fighting', 'inside release beaten', 'press man',
    ],
    progressions: [
      'Mirror only (no contact) — emphasize lateral shuffle and shade',
      'Mirror Jam: funnel receiver inside on coach second whistle',
      'Snake: receiver works in/out 10-15 yards, DB alternates hands',
    ],
    videos: [],
  },

  {
    name: 'Trail Technique (Man Underneath)',
    technique_area: 'man_coverage',
    category: 'technique',
    sets: 3,
    reps: null,
    duration: 'Route length (15-20 yards)',
    why: 'When a receiver wins the release and a DB must trail, the goal is not to catch up by speed — it is to cut the angle and get between the receiver and the ball. Trailing in the hip pocket is a recipe for a completion.',
    coaching_cue: 'Trail 1 yard behind with inside leverage. Key the hip, then the eyes and hands — never commit to the body fakes.',
    common_mistake: 'Trailing directly behind the receiver (in his hip pocket) rather than maintaining inside leverage between receiver and ball.',
    fixes: [
      'trail coverage', 'can\'t catch receiver', 'beaten on out breaking routes',
      'no inside leverage', 'man coverage', 'recovery technique', 'trail',
    ],
    progressions: [
      'Start from funnel position — already trailing after funneling',
      'Start from press — DB loses the release, transitions to trail',
      'Live routes: slant, out, curl, dig',
    ],
    videos: [],
  },

  // ── ZONE COVERAGE ─────────────────────────────────────────────────────────────

  {
    name: 'Shuffle Jam / Funnel Drill (Cover 2)',
    technique_area: 'zone_coverage',
    category: 'technique',
    sets: 3,
    reps: null,
    duration: '12 yards',
    why: 'In Cover 2, the corner must re-route receivers inside to the safety and flatten routes. The funnel drill trains the jab-style punch with the palm — shoulders still parallel to LOS — that forces receivers off their release angle.',
    coaching_cue: 'Blow the jam like a boxer jab — palm contact, one side favored. After funneling, drop to your landmark and find the ball.',
    common_mistake: 'Reaching out with full arm extension, which kills lateral mobility and lets athletic receivers run around the jam.',
    fixes: [
      'cover 2 technique', 'receiver running free', 'outside release vs corner',
      'funnel technique', 'zone coverage', 'flat coverage beaten', 'cover 2',
    ],
    progressions: [
      'Against air: shuffle and punch at fixed landmark',
      'Against receiver running inside/outside routes',
      'Add QB drop — break on ball after funneling',
    ],
    videos: [],
  },

  {
    name: 'Bail Technique Drill',
    technique_area: 'zone_coverage',
    category: 'technique',
    sets: 3,
    reps: null,
    duration: '15-20 yards',
    why: 'Bail is the technique of turning and running outside-leverage while tracking through the receiver to the QB. Done right, it protects the fade while leaving the underneath throw for help. Done wrong, the DB runs blindly and gets beaten on the skinny post.',
    coaching_cue: 'Bail 1 yard outside the receiver — never straight back. Key through the receiver to the QB eyes for the first 5 yards.',
    common_mistake: 'Bailing straight back instead of outside, surrendering the fade and failing to get into a pass-break position.',
    fixes: [
      'bail coverage', 'fade route beaten', 'skinny post coverage',
      'deep ball', 'zone coverage', 'corner route', 'bail',
    ],
    progressions: [
      'Against air: align 1 yard from cone, bail to dot and break on signal',
      'Receiver shows movement (no route): DB bails and locates QB',
      'Live route: receiver runs fade, skinny post, or 3-step',
    ],
    videos: [],
  },

  {
    name: 'Drop and Read — Full Secondary Drill',
    technique_area: 'zone_coverage',
    category: 'technique',
    sets: 3,
    reps: null,
    duration: 'Full pass play',
    why: 'Zone is a team technique — everyone must read run/pass simultaneously, drop to their zone landmark, and break as a unit on the throw. Individual zone skill means nothing if the secondary freelances.',
    coaching_cue: 'Run: sprint through the LOS immediately. Pass: continue drop and find the QB — when he throws, everyone breaks to the ball.',
    common_mistake: 'Peeking at the ball before reaching your zone landmark, which opens underneath windows for crossing routes.',
    fixes: [
      'zone discipline', 'run/pass read', 'slow to ball', 'crossing routes open',
      'cover 3', 'zone coverage', 'secondary rotation', 'drop and read',
    ],
    progressions: [
      'Against air with numbered cards for run/pass patterns',
      'QB plus routes, no live ball',
      'Full secondary with tip drill on interception to practice pursuit',
    ],
    videos: [],
  },

  // ── BALL SKILLS & TURNOVERS ───────────────────────────────────────────────────

  {
    name: 'Tip Drill & Interception at Highest Point',
    technique_area: 'ball_skills',
    category: 'technique',
    sets: 3,
    reps: 6,
    why: 'Tipped balls are gifts — but only if DBs are trained to react and locate the ball above the catch point. The drill also conditions DBs to always go get the ball at its highest point rather than waiting for it.',
    coaching_cue: 'First DB tips the ball upward — trailing DB sprints and catches at the highest point, never below the chin.',
    common_mistake: 'Letting the ball come down to chest level before securing — an alert receiver can steal it back.',
    fixes: [
      'dropped interception', 'ball tracking', 'tipped ball recovery',
      'interception technique', 'ball skills', 'alertness', 'tip drill',
    ],
    progressions: [
      'Stationary tip from close range',
      'Both DBs moving — first tips at full extension, second tracks',
      'Add pursuit angle — second DB starts 5 yards back',
    ],
    videos: [],
  },

  {
    name: 'Rake & Punch — Ball Strip Progression',
    technique_area: 'ball_skills',
    category: 'technique',
    sets: 3,
    reps: 4,
    why: 'Turnovers change games. The Rake rips down on the ball before the receiver can tuck it — the Punch drives up through the hands after possession. Both must be executed before initiating a tackle, or the receiver squeezes and holds.',
    coaching_cue: 'Strip the ball FIRST — then tackle. A receiver who feels a hit will death-grip the ball; catch him before the squeeze.',
    common_mistake: 'Initiating the tackle before the strip attempt, which causes the receiver to squeeze the ball tighter.',
    fixes: [
      'strip technique', 'forced fumble', 'turnover', 'punch out',
      'rake technique', 'ball security opponent', 'interception missed',
    ],
    progressions: [
      'Rake: receiver holds ball in outside arm, DB closes and strips from hands',
      'Punch: receiver tucks ball, DB punches upward through hands',
      'Fumble Recovery: coach rolls ball — DB scoops (clear) or smothers (crowd)',
    ],
    videos: [],
  },

  {
    name: 'Backpedal Break & Catch',
    technique_area: 'ball_skills',
    category: 'technique',
    sets: 4,
    reps: null,
    duration: 'Full route length',
    why: 'DBs must be able to pedal, react to the ball in the air, break at a sharp angle, and catch — all in one fluid motion. Training breaks and catches separately leaves a gap that shows up on film.',
    coaching_cue: 'Sharp break at the exact moment you see the QB elbow come forward. Catch at the highest point with hands only — no body catches.',
    common_mistake: 'Rounding the break angle (running the hump) rather than planting and driving at a sharp 45.',
    fixes: [
      'interception', 'ball skills', 'break on ball', 'late break', 'dropped ball',
      'route jump', 'pass defense', 'break and catch',
    ],
    progressions: [
      'Angle Cut: coach throws in front of DB who must extend arms at full speed',
      'Backpedal 45: open to right or left at 45 on coach signal, catch',
      'Route Progression: slant, out, dig, post, post-corner — break on each',
    ],
    videos: [],
  },

  // ── BLOCK DEFEAT ──────────────────────────────────────────────────────────────

  {
    name: 'Stalk Block Defeat — 3-Step Progression',
    technique_area: 'block_defeat',
    category: 'technique',
    sets: 3,
    reps: 4,
    why: 'Every run to the boundary requires a corner to defeat a WR stalk block. A DB who gets walled by a stalk block removes himself from the play. The 3-step sequence (Fit, Lockout, Shed) builds the muscle memory to win this block every time.',
    coaching_cue: 'Read the QB first for run/pass, then snap eyes to WR. Attack with outside arm free — hairline under chin, hands fit on outer chest.',
    common_mistake: 'Attacking the block before confirming run — a pass fake after engagement puts the DB completely out of position.',
    fixes: [
      'stalk block', 'walled off on run', 'edge contain', 'cornerback run support',
      'block defeat', 'run support', 'WR blocking', 'stalk',
    ],
    progressions: [
      'Step 1 — Fit: static drill, hands on chest, bend knees and hips',
      'Step 2 — Lockout: explode ankles/knees/hips, lock arms, hands at eye level',
      'Step 3 — Shed: violently throw WR to side, step and replace, make tackle',
    ],
    videos: [],
  },

  {
    name: 'Crack Block Recognition Drill',
    technique_area: 'block_defeat',
    category: 'technique',
    sets: 3,
    reps: null,
    duration: 'Full play',
    why: 'Crack blocks blindside DBs who are focused on the run. The crack call system and switching assignments is the solution. This drill makes the communication instinctive.',
    coaching_cue: 'Corner calls CRACK — Safety attacks underneath the blocker and becomes force. Corner squeezes, stops, and fills over the top for contain.',
    common_mistake: 'Safety running blindly to the ball while ignoring the crack block, getting walled out of the play.',
    fixes: [
      'crack block', 'crack and go', 'run force', 'secondary run support',
      'blown run assignment', 'communication', 'safety run support', 'crack',
    ],
    progressions: [
      'Walk-through with WR showing crack block route only',
      'Full speed crack with QB run action',
      'Crack and Go: WR fakes crack, releases deep to prevent playing the drill',
    ],
    videos: [],
  },

  // ── TACKLING ─────────────────────────────────────────────────────────────────

  {
    name: 'Tackling Progression — 3-Step (DB Version)',
    technique_area: 'tackling',
    category: 'technique',
    sets: 3,
    reps: null,
    why: 'DBs tackle in space at high speed after a redirect — their technique must be instinctive. The 3-step progression (Fit, Step and Fit, Step Fit and Drive) locks in same-foot/same-shoulder mechanics before adding speed and movement.',
    coaching_cue: 'Eyes up, good bend, strike with same foot same shoulder — upper cut arms, square the back, drive until the whistle.',
    common_mistake: 'Leading with the head-down collision instead of the shoulder-first approach — leads to missed tackles and injury risk.',
    fixes: [
      'missed tackle', 'tackling technique', 'arm tackle', 'going low',
      'same foot same shoulder', 'tackling in space', 'tackle form',
    ],
    progressions: [
      'Fit Position: static, DB fits on partner from football position',
      'Step and Fit: one approach step, then fit',
      'Step, Fit and Drive: full step, contact, drive through until whistle',
    ],
    videos: [],
  },

  {
    name: 'Open Field Tackle — Angle & Head Up',
    technique_area: 'tackling',
    category: 'technique',
    sets: 4,
    reps: null,
    why: 'The open field tackle is the hardest tackle in football — a DB must redirect at speed, control his approach, and flatten a ball carrier move. One missed tackle in open space costs a touchdown. This drill replicates the exact scenario.',
    coaching_cue: 'Shorten your stride and sink your hips as you close — stay inside. When the carrier commits, press to the inside hip to flatten the move, then execute.',
    common_mistake: 'Overrunning the ball carrier cut, which takes the DB completely out of position and opens the alley.',
    fixes: [
      'open field tackle', 'missed tackle', 'broken tackle', 'angle tackle',
      'leverage tackle', 'sideline tackle', 'run support', 'open field',
    ],
    progressions: [
      'Angle Tackle (45 degrees): DB and carrier 5 yards apart, attack at angle',
      'Sideline Tackle: use sideline as extra defender, constrict lane',
      'Head Up (A): DB and RB sprint 5 yards — DB wins position and breaks down',
      'Head Up (B): DB sprints to breakdown 5 yards out, RB declares direction',
    ],
    videos: [],
  },

]

// ─── Teaching Steps ───────────────────────────────────────────────────────────

export const DB_TEACHING_PROGRESSION: DBTeachingStep[] = [

  {
    order: 1,
    topic: 'Stance & Backpedal — The DB Foundation',
    technique_area: 'stance_backpedal',
    keyPoints: [
      'Set stance: feet no wider than shoulder width, weight on balls of feet, chin over toes',
      'Stagger foot based on technique: inside foot back for off-man, square for press, heel-toe for invert',
      'Begin low pedal — stomach grazes top of thigh, elbows parallel to back',
      'Graze the grass with the balls of the feet — never high-step',
      'Butt leads you back; string leads you forward',
    ],
    techniques: [
      { name: 'Standard Backpedal', bestFor: 'Off-man and zone coverage', cues: ['Cut the grass', 'Chin over toes', 'Feet never high off ground'] },
      { name: 'Fast/Slow Tempo', bestFor: 'Reacting to receiver stem moves', cues: ['Ball out = accelerate', 'Ball in = decelerate', 'Never lose your base'] },
    ],
  },

  {
    order: 2,
    topic: 'Change of Direction — Plant, Drive, and Hip Turn',
    technique_area: 'change_of_direction',
    keyPoints: [
      'Plant Step: weight shifts to the back foot, drive off the front foot through cones',
      'Angle Break: backpedal 5-7 yards, plant back foot, drive at a sharp 45 over the outside of a cone',
      'Hip Turn Rule: hips open (facing middle of field) = break back; hips closed (toward goal line) = baseball turn',
      'W Drill: butt to the cone — drive at a sharp angle to the next aiming point, never round the break',
      'Lead elbow on a low plane (90 degrees or less) on every man turn',
    ],
    techniques: [
      { name: 'Foot Fire Break', bestFor: 'Square or near-square shoulder position', cues: ['Plant foot and step on it', 'String must go to the cut', 'Heavy arm action out of the break'] },
      { name: 'T-Cut (Zone Turn)', bestFor: 'When shoulders are not parallel', cues: ['Step tight on plant foot', 'Roll plant foot over', 'Lead toe at 180 degrees'] },
      { name: 'Baseball Turn (Man Turn)', bestFor: 'When hips are closed and facing the goal line', cues: ['Lead elbow low — 90 degrees or less', 'Open hips, rip arm and shoulder through', 'Explode into a sprint'] },
    ],
  },

  {
    order: 3,
    topic: 'Man Coverage — Cushion, Phase, and Press',
    technique_area: 'man_coverage',
    keyPoints: [
      'Cushion: stay in backpedal as receiver runs full speed — open hips only when cushion is truly broken',
      'In phase (hip to hip): press hip with inside hand, look for the ball when you have control',
      'Out of phase (trailing): play receiver head turn and hand raise — smack the far wrist to break stride',
      'Trail: 1 yard behind with inside leverage, honor inside fakes, be patient on outside fakes, close hard after 12-15 yards',
      'Press/Bump and Run: shuffle square to LOS, punch breastplate with arm of the release side, stay on top',
    ],
    techniques: [
      { name: 'Off-Man Coverage', bestFor: '7 yards off LOS, one yard inside or outside based on split', cues: ['Shuffle reading for three step', 'Backpedal with tempo and weave', 'Man turn once cushion is broken'] },
      { name: 'Press Man', bestFor: 'LOS alignment, narrow base, urgent bend', cues: ['Eyes on receivers back leg (hip of back leg)', 'Lateral shuffle while staying square to LOS as long as possible', 'Punch breastplate — thumb up, elbow locked'] },
      { name: 'Trail Technique', bestFor: 'After receiver wins the release', cues: ['1 yard behind with inside leverage', 'Be between receiver and ball', 'Close hard for streak after 12-15 yards'] },
    ],
  },

  {
    order: 4,
    topic: 'Zone Coverage — Landmark, Funnel, and Bail',
    technique_area: 'zone_coverage',
    keyPoints: [
      'Funnel (Cover 2): jab-style palm punch, favor inside, funnel receiver toward safety zone',
      'After funnel: drop to 12 yards on numbers, eyes to QB, break on first movement of throwing arm',
      'Bail: align inside eye on outside eye of receiver, bail 1 yard outside receiver on snap — never straight back',
      'Key through receiver to QB for first 5 yards of bail, then sprint to cone when route identified',
      'Do not cover grass — find work when threats disappear',
    ],
    techniques: [
      { name: 'Cover 2 Funnel', bestFor: 'Re-routing receivers inside to the safety', cues: ['Jab-style punch — not a full reach', 'Favor one side', 'Drop to landmark after jam'] },
      { name: 'Bail', bestFor: 'Protecting deep fade while playing underneath with help', cues: ['Bail 1 yard outside receiver', 'Key through receiver to QB', 'Bail hard for first 5 yards'] },
      { name: 'Drop and Read (Cover 3)', bestFor: 'Full secondary run/pass discipline', cues: ['Run: sprint through LOS', 'Pass: continue drop, find QB', 'Break as a unit when QB throws'] },
    ],
  },

  {
    order: 5,
    topic: 'Ball Skills — Intercept, Track, and Strip',
    technique_area: 'ball_skills',
    keyPoints: [
      'Always go get the ball at the highest point — sprint to it, never wait for it to come down',
      'Tip Drill: first DB tips the ball upward, trailing DB sprints to catch at the highest point',
      'Rake: approach from behind, rip down on the ball before the receiver tucks — strip BEFORE the tackle',
      'Punch: drive up through the receiver hands — execute before initiating the tackle',
      'Backpedal Break and Catch: sharp break at QB release (elbow forward) — hands only, never body catches',
    ],
  },

  {
    order: 6,
    topic: 'Block Defeat — Stalk and Crack',
    technique_area: 'block_defeat',
    keyPoints: [
      'Stalk Fit: hairline under chin, hands fit on outer chest of WR — do NOT engage before confirming run',
      'Stalk Lockout: explode ankles/knees/hips, lock arms for separation, hands rise to eye level',
      'Stalk Shed: violently throw WR to the side, step and replace, finish with tackle',
      'Crack Recognition: on WR motion toward inside, CORNER calls CRACK — Safety eyes the blocker and attacks underneath',
      'Corner on Crack: squeeze and stop to confirm crack occurred, fill over the top for edge contain',
    ],
    techniques: [
      { name: 'Stalk Block Defeat', bestFor: 'Boundary run support when WR attempts to wall off corner', cues: ['Outside arm always free', 'Attack with shoulders square and inside foot down', 'Fit, Lockout, Shed — in sequence'] },
      { name: 'Crack Block Coverage', bestFor: 'Run action to the boundary when WR cracks inside', cues: ['Corner calls CRACK loudly', 'Safety attacks underneath blocker', 'Corner fills over top for contain'] },
    ],
  },

  {
    order: 7,
    topic: 'Tackling — Open Field Form and Leverage',
    technique_area: 'tackling',
    keyPoints: [
      'Fit Position: eyes up, same foot same shoulder, bend at ankles/knees/hips — static hold to lock in mechanics',
      'Step and Fit: one approach step, then fit — drive until the whistle blows',
      'Angle Tackle: two lines 2 yards apart, ball carrier starts drill, DB attacks at angle with head across',
      'Open Field (Angle): close with inside leverage, shorten stride and sink hips at 5-yard mark, press inside hip to flatten move',
      'Sideline Tackle: constrict the ball carrier lane toward sideline — use the sideline as the 12th defender',
    ],
  },

]

// ─── Lookup Helpers ───────────────────────────────────────────────────────────

/**
 * Find drills that address a given pain point (keyword match on fixes array)
 */
export function findDBDrillsForPainPoint(painPoint: string): DBDrillEntry[] {
  const kw = painPoint.toLowerCase()
  return DB_DRILLS.filter(d =>
    d.fixes.some(f => kw.includes(f) || f.includes(kw)) ||
    d.name.toLowerCase().includes(kw) ||
    d.why.toLowerCase().includes(kw)
  )
}

/**
 * Convert a DBDrillEntry to the Exercise shape used by training plan generator
 */
export function dbDrillToExercise(drill: DBDrillEntry): Exercise {
  return {
    name: drill.name,
    sets: drill.sets ?? 3,
    reps: drill.reps ?? null,
    duration: drill.duration ?? null,
    category: drill.category,
    why: drill.why,
    coaching_cue: drill.coaching_cue ?? null,
    demo_url: drill.videos[0]?.url ?? null,
  }
}

/**
 * Get the teaching step for a given DB technique area
 */
export function getDBTeachingStep(area: DBTechniqueArea): DBTeachingStep | undefined {
  return DB_TEACHING_PROGRESSION.find(s => s.technique_area === area)
}
