/**
 * Outside Linebacker (OLB / Sam / Will / Jack / Edge) Position-Specific Drill Library
 *
 * Sources:
 *  • Aaron Curry (Seattle Seahawks) — OLB Fundamentals (pro-level)
 *  • Chidera Diribe (Kansas University) — OLB fundamentals in a 3-4 defense (2021)
 *  • Bryan Till (Richmond Senior HS) — OLB play in a 3-4
 *  • Bryan Nardo (Youngstown State) — LB play, skills & drills
 *  • Will Windham (Kent State) — ILB/OLB play, taking indy to the game
 *  • Michael Patterson (Brophy Prep AZ) — LB play in the 3-3 stack
 *  • Lynn Nutt (Dordt University) — LB drills, skills, and game application
 *
 * Core OLB philosophy (compiled from sources):
 *  1. You are the edge — your job is to make everything spill inside to your teammates
 *  2. Pass rush is a chess match: set up your counter before you run your first move
 *  3. In the 3-4, you are the defensive line — get off on the ball, not on the snap count
 *  4. Flat coverage is your zone; own it — don't chase the seam and give up the flat
 *  5. Set the edge on run; rush the passer; cover the flat — master all three or the offense exploits whichever you don't
 *
 * Position note:
 *  OLB covers Sam (strongside, typically over TE), Will (weakside, athletic pass rusher),
 *  and Jack (stand-up edge rusher in 3-4/odd fronts). Distinct from ILB/MLB in the
 *  existing LB library — OLB is primarily an edge-setter and pass rusher first.
 */

import type { Exercise } from '@/types'

// ─── Technique Areas ──────────────────────────────────────────────────────────

export type OLBTechniqueArea =
  | 'stance_alignment'  // 2-pt OLB stance, width/depth, shade vs TE, pre-snap keys
  | 'edge_setting'      // force and contain, spill technique, wrong-arm, run-force fits
  | 'pass_rush'         // get-off, speed rush, bend around corner, counter moves, swim/rip
  | 'block_defeat'      // defeating TE reach, FB lead, combo blocks, stab and shed
  | 'pass_coverage'     // flat zone, hook-curl, curl-to-flat, man on TE/RB
  | 'blitz_technique'   // edge blitz, inside blitz, stunt/twist with DL, get-skinny
  | 'pursuit'           // cutback lane, run-to pursuit, run-away counterpoint

export const OLB_AREA_LABELS: Record<OLBTechniqueArea, string> = {
  stance_alignment: 'Stance & Alignment',
  edge_setting:     'Edge Setting & Force',
  pass_rush:        'Pass Rush',
  block_defeat:     'Block Defeat',
  pass_coverage:    'Pass Coverage',
  blitz_technique:  'Blitz Technique',
  pursuit:          'Pursuit & Cutback',
}

// ─── Drill Entry Type ─────────────────────────────────────────────────────────

export interface OLBDrillEntry {
  name: string
  technique_area: OLBTechniqueArea
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

export interface OLBTeachingStep {
  order: number
  topic: string
  technique_area: OLBTechniqueArea
  keyPoints: string[]
  techniques?: { name: string; bestFor: string; cues: string[] }[]
}

// ─── Drill Library ────────────────────────────────────────────────────────────

export const OLB_DRILLS: OLBDrillEntry[] = [

  // ── STANCE & ALIGNMENT ───────────────────────────────────────────────────────

  {
    name: 'OLB 2-Point Stance & Pre-Snap Read',
    technique_area: 'stance_alignment',
    category: 'technique',
    sets: 3,
    reps: null,
    duration: '10 plays',
    why: 'The OLB stance must serve three masters — run force, pass rush, and coverage. A poor stance tips your assignment before the snap. Pre-snap reads (TE alignment, backfield set, formation width) determine your shade, depth, and first-step priority.',
    coaching_cue: 'Inside foot back, weight on the balls of your feet, coiled and ready — never flat-footed. Read the TE hip before the snap.',
    common_mistake: 'Setting the same stance regardless of coverage or run-force assignment — giving the offense a free pre-snap tell.',
    fixes: [
      'stance', 'pre-snap read', 'alignment', 'tipping assignment',
      'flat-footed', 'first step', 'olb stance',
    ],
    progressions: [
      'Solo stance check: set vs TE shade, coach adjusts alignment',
      'Stance vs formation: coach shows different formations, OLB adjusts shade and depth',
      'Live: OLB sets stance and calls formation type before snap',
    ],
    videos: [
      { title: 'Aaron Curry (Seahawks) — OLB Fundamentals', url: '', duration: 'Clinic' },
      { title: 'Chidera Diribe (Kansas) — OLB Fundamentals 3-4', url: '', duration: 'Clinic' },
    ],
  },

  {
    name: 'OLB Alignment vs TE — Shade & Depth Drill',
    technique_area: 'stance_alignment',
    category: 'technique',
    sets: 3,
    reps: 6,
    why: 'The Sam LB alignment vs the TE is the most critical alignment decision on every play. Head-up gives leverage on both inside and outside releases. Outside shade protects the edge on run. Inside shade disrupts the TE route and helps the safety. Getting alignment wrong pre-snap costs assignment leverage before the ball is snapped.',
    coaching_cue: 'Know your shade before the snap: head-up vs run-heavy, outside shade for edge containment, inside shade to disrupt the TE release.',
    common_mistake: 'Lining up the same shade every play — allowing the offense to scheme a specific release that attacks your alignment.',
    fixes: [
      'te alignment', 'outside shade', 'inside shade', 'leverage',
      'sam linebacker', 'alignment', 'te release beaten',
    ],
    progressions: [
      'Coach calls shade (inside/outside/head-up) — OLB aligns and explains coverage fit',
      'TE runs specific release based on shade — OLB reacts',
      'Live: TE and OLB vs run/pass read',
    ],
    videos: [
      { title: 'Chidera Diribe (Kansas) — OLB Fundamentals in a 3-4', url: '', duration: 'Clinic' },
    ],
  },

  // ── EDGE SETTING ─────────────────────────────────────────────────────────────

  {
    name: 'Set the Edge — Force and Contain Drill',
    technique_area: 'edge_setting',
    category: 'technique',
    sets: 4,
    reps: null,
    duration: 'Full play',
    why: 'Setting the edge is the OLB primary run responsibility. If the edge is not set, the ball bounces outside and the offense gains huge yardage. The OLB must wrong-arm or squeeze the blocker to force the ball carrier back inside to waiting defenders — never get reached.',
    coaching_cue: 'Attack the inside number of the blocker — spill everything inside. Your job is not to make the tackle; it is to make the tackle easy for your teammates.',
    common_mistake: 'Trying to make the tackle solo by taking on the blocker square — getting reached and allowing the back to bounce outside for big yardage.',
    fixes: [
      'edge setting', 'force and contain', 'bounced outside', 'reached on run',
      'contain', 'run force', 'spill technique', 'wrong arm',
    ],
    progressions: [
      'Solo: OLB vs stand-up blocker, work spill technique to inside number',
      'With FB: FB lead blocks, OLB sets edge and spills',
      'Live: TE blocks, OLB forces, RB attempts to bounce — pursue to ball',
    ],
    videos: [
      { title: 'Bryan Till (Richmond Senior) — OLB Play in a 3-4', url: '', duration: 'Clinic' },
    ],
  },

  {
    name: 'Wrong-Arm / Spill Technique',
    technique_area: 'edge_setting',
    category: 'technique',
    sets: 3,
    reps: 4,
    why: 'The wrong-arm technique is used when the OLB is down-blocked and a puller is coming. Instead of fighting through the down block, the OLB dips under and wrong-arms — taking on the pull from the inside out and spilling the ball carrier back to teammates. Without it, pulling plays gain massive yardage on the perimeter.',
    coaching_cue: 'Dip under the down block, flatten your pad level, and take on the pull from the inside — wrong arm into the gap, not around it.',
    common_mistake: 'Fighting over the top of the down block — getting walled out and allowing the puller to reach the second level unimpeded.',
    fixes: [
      'wrong arm', 'spill', 'down block', 'pulling guard', 'puller',
      'sweep', 'power play', 'reach block', 'bounced outside',
    ],
    progressions: [
      'Walk-through: OLB identifies down block and executes wrong-arm solo',
      'Half speed: OLB vs down-block, guard pulls — OLB spills',
      'Full speed: live pull scheme, OLB wrong-arms and pursues',
    ],
    videos: [
      { title: 'Bryan Till (Richmond Senior) — OLB Play in a 3-4', url: '', duration: 'Clinic' },
    ],
  },

  // ── PASS RUSH ────────────────────────────────────────────────────────────────

  {
    name: 'Pass Rush Get-Off & First Step Explosion',
    technique_area: 'pass_rush',
    category: 'speed',
    sets: 4,
    reps: null,
    duration: '5 yards',
    why: 'In a 3-4 defense the OLB is the primary pass rusher — equivalent to a 4-3 defensive end. Get-off on the snap count (not the sound of the snap) is the single biggest separator between productive and non-productive pass rushers. One missed assignment timing costs a full step.',
    coaching_cue: 'Key the ball — go on its first movement, not the QB voice. Stay low for the first two steps, then convert to speed.',
    common_mistake: 'Keying the QB cadence or the snap sound — jumping offsides or false-starting while losing the mental rep advantage.',
    fixes: [
      'pass rush get-off', 'slow first step', 'false start', 'jump offsides',
      'snap count', 'first step', 'pass rush', 'edge rush',
    ],
    progressions: [
      'Solo get-off drill: center snaps ball, OLB fires on ball movement — timed',
      'Get-off with directional move: fire, then choose speed or power at 3 yards',
      'Live: OLB vs OT first step — who wins the first two steps?',
    ],
    videos: [
      { title: 'Aaron Curry (Seahawks) — OLB Fundamentals', url: '', duration: 'Clinic' },
      { title: 'Chidera Diribe (Kansas) — OLB Fundamentals 3-4', url: '', duration: 'Clinic' },
    ],
  },

  {
    name: 'Speed Rush & Bend Around the Corner',
    technique_area: 'pass_rush',
    category: 'speed',
    sets: 4,
    reps: null,
    duration: 'Corner to QB',
    why: 'The speed rush with corner bend is the OLB signature move. It forces the OT to kick hard, then the OLB bends the arc, dips the inside shoulder, and converts the speed into a direct line to the QB. Flat arcs get redirected — only a deep arc with a tight bend survives.',
    coaching_cue: 'Attack upfield first to force the OT to kick — then sink your inside shoulder and bend the corner tight. Convert speed to power if the OT catches up.',
    common_mistake: 'Bending the arc too flat and running parallel to the LOS — allowing the OT to redirect and wall off the rushing lane.',
    fixes: [
      'speed rush', 'bend around corner', 'corner bend', 'arc too flat',
      'ot redirect', 'pass rush', 'edge rush', 'speed to power',
    ],
    progressions: [
      'Hoop Drill: OLB must bend through a hoop set 1 yard outside the OT — maintain upfield angle',
      'Partner drill: OLB speed-rushes dummy OT, bends at shoulder pad level, finishes to cone at QB spot',
      'Live vs OT: full speed corner rush',
    ],
    videos: [
      { title: 'Aaron Curry (Seahawks) — OLB Fundamentals', url: '', duration: 'Clinic' },
    ],
  },

  {
    name: 'Swim & Rip Counter Pass Rush Moves',
    technique_area: 'pass_rush',
    category: 'technique',
    sets: 3,
    reps: 6,
    why: 'A one-move pass rusher is a stopped pass rusher. When the OT takes away the speed rush, the OLB must have an immediate counter — swim over the punch or rip under the arms. These counters must be drilled to become instinctive, not thought through.',
    coaching_cue: 'Set the speed rush first — make the OT respect it. Then use the counter on the OT overcommit. Rip low, swim high.',
    common_mistake: 'Going straight to the counter without setting up the initial move — the OT never overcommits so the counter has no space to work.',
    fixes: [
      'pass rush counter', 'swim move', 'rip move', 'blocked pass rush',
      'OT redirect', 'pass rush', 'hand fighting', 'counter move',
    ],
    progressions: [
      'Stationary: OLB practices swim/rip on a standing pad in rapid succession',
      'Bag drill: OLB approaches bag, contact, execute swim or rip, convert to sprint',
      'Live: OLB vs OT — use speed rush first, then counter on OT adjustment',
    ],
    videos: [
      { title: 'Bryan Nardo (Youngstown State) — LB Skills & Drills', url: '', duration: 'Clinic' },
    ],
  },

  {
    name: 'Bull Rush & Power Conversion',
    technique_area: 'pass_rush',
    category: 'strength',
    sets: 3,
    reps: 4,
    why: 'When the OT is an elite athlete who can mirror the speed rush, the OLB must be able to convert to power — engage with inside hands, lock out, and drive the OT into the QB. A pure speed rusher who cannot bull rush is a predictable rusher.',
    coaching_cue: 'Punch inside the OT frame — thumbs up, elbows in. Lock out arms, sink your hips, and drive your feet through contact.',
    common_mistake: 'Punching outside the OT frame (shoulder or bicep area), which gives the OT leverage to redirect and absorb the power rush.',
    fixes: [
      'bull rush', 'power rush', 'absorbed by OT', 'no push', 'pass rush',
      'speed to power', 'hand placement pass rush', 'edge rush',
    ],
    progressions: [
      'Sled work: drive sled with inside hand placement — 5 full drive steps',
      'Partner drill: OLB punches OT chest, drives 3 yards while OT resists',
      'Live: OLB bull rushes OT — finish to QB shadow',
    ],
    videos: [],
  },

  // ── BLOCK DEFEAT ─────────────────────────────────────────────────────────────

  {
    name: 'TE Reach Block Defeat (OLB)',
    technique_area: 'block_defeat',
    category: 'technique',
    sets: 3,
    reps: 4,
    why: 'The Sam LB faces a TE reach block on almost every outside run play. Getting reached means the ball bounces outside for big yardage. The OLB must stay square, attack the inside number of the TE, and shed before the back reaches the edge.',
    coaching_cue: 'Beat the TE to the spot — attack his inside number before he can establish contact. Stay square, rip through, and chase the ball.',
    common_mistake: 'Allowing the TE to gain outside leverage by not attacking the block quickly enough — getting reached and walled out.',
    fixes: [
      'te reach block', 'reached on run', 'edge contain', 'block defeat',
      'sam linebacker', 'run force', 'block shedding',
    ],
    progressions: [
      'Fit and shed: OLB fits on TE chest, explodes to shed — both sides',
      'Half speed: TE initiates reach, OLB attacks inside number and sheds',
      'Live: TE reach with RB following — OLB defeats, pursues',
    ],
    videos: [
      { title: 'Chidera Diribe (Kansas) — OLB Fundamentals 3-4', url: '', duration: 'Clinic' },
    ],
  },

  {
    name: 'FB Lead Block Defeat (OLB)',
    technique_area: 'block_defeat',
    category: 'technique',
    sets: 3,
    reps: 4,
    why: 'The FB lead block is designed to seal the OLB at the point of attack and create an alley for the HB. The OLB must press the line of scrimmage, deliver a blow with inside hands, shed the FB, and make the tackle — all while keeping outside contain.',
    coaching_cue: 'Press the line, punch inside the FB frame, shed to the ball side. Do not let the FB drive you sideways — keep your outside leg free.',
    common_mistake: 'Absorbing the FB block without fighting through — getting driven sideways and losing outside contain while the RB turns the corner.',
    fixes: [
      'fb lead block', 'lead blocker', 'fullback', 'block defeat',
      'outside contain', 'run force', 'edge setting',
    ],
    progressions: [
      'Fit position vs stand-up dummy — shed left and right',
      'Half speed: FB approaches, OLB punches and sheds',
      'Live: FB lead with RB — OLB defeats block and makes tackle',
    ],
    videos: [],
  },

  // ── PASS COVERAGE ─────────────────────────────────────────────────────────────

  {
    name: 'Flat Zone Drop — Curl to Flat',
    technique_area: 'pass_coverage',
    category: 'technique',
    sets: 3,
    reps: null,
    duration: 'Full pass play',
    why: 'In Cover 2 and Cover 3, the OLB owns the flat zone — typically 0-5 yards from LOS to the sideline at his side. The curl-to-flat technique requires the OLB to open to the flat when the WR or TE threatens it, while staying aware of the curl route sitting behind him. Chasing the seam or dropping too deep opens the flat for an easy completion.',
    coaching_cue: 'Open to the flat, peek to the curl. The flat is your primary — do not let the QB throw the easy route to your zone.',
    common_mistake: 'Dropping too deep looking for the crossing route — abandoning the flat and allowing an easy out-route or swing pass underneath.',
    fixes: [
      'flat zone', 'curl to flat', 'flat coverage', 'zone coverage',
      'too deep', 'pass coverage', 'cover 2', 'cover 3', 'flat route',
    ],
    progressions: [
      'Against air: OLB drops to flat landmark on QB movement',
      'QB throws: flat, out, swing pass — OLB reacts',
      'Route combination: WR runs curl, TE runs flat — OLB plays both',
    ],
    videos: [
      { title: 'Lynn Nutt (Dordt University) — LB Drills & Game Application', url: '', duration: 'Clinic' },
    ],
  },

  {
    name: 'Man Coverage on TE — OLB Version',
    technique_area: 'pass_coverage',
    category: 'technique',
    sets: 3,
    reps: null,
    duration: 'Route length',
    why: 'In man coverage, the Sam LB is frequently matched on the TE — a larger, physical mismatch target that offenses target specifically. The OLB must press the TE release, funnel to the inside, and maintain coverage while dealing with the physical disparity.',
    coaching_cue: 'Jam the TE release with outside hand, funnel him inside. Stay on the TE hip — do not let him release clean on a vertical.',
    common_mistake: 'Giving the TE a free release by bailing too early — allowing him to run the seam route with no disruption.',
    fixes: [
      'te coverage', 'man coverage', 'te release', 'seam route',
      'sam man coverage', 'pass coverage', 'tight end coverage',
    ],
    progressions: [
      'TE releases at half speed — OLB jams and funnels',
      'TE runs dig, seam, corner — OLB covers',
      'Live: QB reads TE — OLB in man coverage',
    ],
    videos: [
      { title: 'Will Windham (Kent State) — ILB/OLB Play', url: '', duration: 'Clinic' },
    ],
  },

  {
    name: 'Hook-Curl Zone Drop (3-3 Stack / Odd Front)',
    technique_area: 'pass_coverage',
    category: 'technique',
    sets: 3,
    reps: null,
    duration: 'Full pass play',
    why: 'In the 3-3 stack and odd-front defenses, the OLB often drops into the hook-curl window (10-15 yards) rather than the flat. This requires a different footwork — open hips at 45 degrees and sink to depth while staying in front of intermediate crossing routes.',
    coaching_cue: 'Open at 45 degrees, sink to 12 yards, eyes on the QB — mirror receivers entering your window. Do not chase routes through your zone.',
    common_mistake: 'Chasing the first receiver who enters the zone — vacating the window and allowing a second receiver to sit in the open space.',
    fixes: [
      'hook curl', 'zone drop', 'pass coverage', '3-3 stack',
      'odd front coverage', 'intermediate coverage', 'chasing routes',
    ],
    progressions: [
      'Against air: drop to hook-curl landmark on QB move',
      'Two receivers: one runs curl, one crosses — OLB stays home and mirrors',
      'Live QB: reads hook-curl window, OLB reacts',
    ],
    videos: [
      { title: 'Michael Patterson (Brophy Prep AZ) — LB Play in 3-3 Stack', url: '', duration: 'Clinic' },
    ],
  },

  // ── BLITZ TECHNIQUE ──────────────────────────────────────────────────────────

  {
    name: 'Edge Blitz — OLB Pressure Package',
    technique_area: 'blitz_technique',
    category: 'speed',
    sets: 4,
    reps: null,
    duration: 'Full rush to QB',
    why: 'The OLB edge blitz is the most effective single-player pressure because it attacks the natural kickslide direction of the OT from the widest point. The OLB must fire immediately on the snap, stay low, and convert to a power move if the OT sets quickly.',
    coaching_cue: 'Win the edge — get your outside foot past the OT outside foot before he can set. Stay low, convert to power if he catches up.',
    common_mistake: 'Tipping the blitz pre-snap by leaning forward or changing stance — allowing the OT to widen protection and give the QB a hot route.',
    fixes: [
      'edge blitz', 'ot too wide', 'blitz tipped', 'pass rush',
      'blitz technique', 'outside pressure', 'edge pressure',
    ],
    progressions: [
      'Solo fire-out: OLB fires from stance to QB shadow on snap',
      'Vs OT: edge blitz at 3/4 speed, convert to move on OT reaction',
      'Live: full edge blitz with OT and QB drop',
    ],
    videos: [
      { title: 'Aaron Curry (Seahawks) — OLB Fundamentals', url: '', duration: 'Clinic' },
    ],
  },

  {
    name: 'Get-Skinny & Inside Gap Blitz',
    technique_area: 'blitz_technique',
    category: 'technique',
    sets: 3,
    reps: 4,
    why: 'When the OLB blitzes an interior gap (A, B, or C gap) rather than the edge, he must get-skinny to slip through a narrow window before blockers can close. This is the same technique used by ILBs but from a wider pre-snap alignment — the disguise element is what makes it dangerous.',
    coaching_cue: 'Snap your hips open sideways to turn your body 90 degrees — become as narrow as possible through the gap. No hands in the gap unless stuck.',
    common_mistake: 'Running into the gap square-shouldered and absorbing the OL block — getting congested at the LOS instead of penetrating.',
    fixes: [
      'get skinny', 'inside blitz', 'gap blitz', 'blitz technique',
      'congested at line', 'inside pressure', 'blitz penetration',
    ],
    progressions: [
      'Solo: OLB snaps hips and slips through two stand-up dummies 2 feet apart',
      'With blockers: OLB fires inside, snaps hips through gap',
      'Live: disguised blitz — OLB walks to edge, fires inside on snap',
    ],
    videos: [
      { title: 'Bryan Nardo (Youngstown State) — LB Skills & Drills', url: '', duration: 'Clinic' },
    ],
  },

  {
    name: 'Stunt / Twist with DL (Loop & Contain)',
    technique_area: 'blitz_technique',
    category: 'technique',
    sets: 3,
    reps: null,
    duration: 'Full play',
    why: 'The OLB stunt with a DL creates a free rusher by crossing paths at the snap. The DE crashes inside, the OLB loops outside into the lane the DE vacated — or vice versa. Timing is everything: the DL must engage the OL before the OLB loops, or both rushers get picked up.',
    coaching_cue: 'Wait for the DE to engage — then loop hard upfield through his lane. Do not loop early or the OT sees both of you.',
    common_mistake: 'Looping too early before the DE engages — the OT can simply redirect to the OLB without losing ground.',
    fixes: [
      'stunt', 'twist', 'loop', 'contain', 'pass rush',
      'de olb stunt', 'blitz timing', 'free rusher',
    ],
    progressions: [
      'Walk-through: DE and OLB execute stunt timing without blockers',
      'Half speed vs OT and OG — DE crashes, OLB loops',
      'Live full speed: full stunt vs OL protection',
    ],
    videos: [],
  },

  // ── PURSUIT ──────────────────────────────────────────────────────────────────

  {
    name: 'OLB Cutback Lane & Run-Away Counterpoint',
    technique_area: 'pursuit',
    category: 'footwork',
    sets: 3,
    reps: null,
    duration: 'Full play',
    why: 'On runs away from the OLB, he must secure the cutback lane — not over-pursue downhill and open an alley behind him. The counterpoint angle is a controlled pursuit that keeps the OLB between the RB and the goal line, eliminating cutback cuts.',
    coaching_cue: 'Run away from you — square shuffle, maintain your gap. Do not overpursue and give up the cutback. Arrive at the correct angle to cut off the ball.',
    common_mistake: 'Over-pursuing the ball and running past the cutback lane — the RB cuts back against the grain for a big gain.',
    fixes: [
      'cutback', 'run away pursuit', 'over pursue', 'counterpoint',
      'pursuit angle', 'run away', 'cutback lane',
    ],
    progressions: [
      'Coach points direction: OLB takes correct pursuit or counterpoint angle',
      'RB runs sweep away: OLB takes counterpoint, RB cuts back — OLB in position',
      'Live: OLB pursues run-to and run-away on consecutive plays',
    ],
    videos: [
      { title: 'Bryan Till (Richmond Senior) — OLB Play in 3-4', url: '', duration: 'Clinic' },
      { title: 'Lynn Nutt (Dordt University) — LB Drills & Game Application', url: '', duration: 'Clinic' },
    ],
  },

  {
    name: 'OLB Pursuit Drill — Run-To Force and Finish',
    technique_area: 'pursuit',
    category: 'speed',
    sets: 3,
    reps: null,
    duration: 'Full pursuit angle',
    why: 'When the run comes to the OLB side, he must set the edge AND get off the block to make or assist the tackle. Good edge setting without a finish tackle is not enough — the OLB must release from the block and get to the ball carrier in the alley.',
    coaching_cue: 'Set the edge — spill inside — release off the block and get your body to the ball. Pursue with urgency, not desperation.',
    common_mistake: 'Getting so focused on the block defeat that the OLB loses his pursuit angle and arrives late to the tackle.',
    fixes: [
      'pursuit angle', 'run force', 'edge setting', 'pursuit',
      'late to tackle', 'tackle in alley', 'run support',
    ],
    progressions: [
      'Blocker only: OLB defeats block and pursues to cone at RB location',
      'With RB at half speed: OLB sets edge, sheds, makes tackle',
      'Live full speed: complete run-force assignment with tackle',
    ],
    videos: [],
  },

]

// ─── Teaching Steps ───────────────────────────────────────────────────────────

export const OLB_TEACHING_PROGRESSION: OLBTeachingStep[] = [

  {
    order: 1,
    topic: 'Stance, Alignment & Pre-Snap Keys',
    technique_area: 'stance_alignment',
    keyPoints: [
      'Inside foot back, weight on balls of feet — coiled to fire in any direction',
      'Read the TE alignment: on the ball vs off the ball, tight vs split, in-line vs H-back',
      'Shade based on assignment: head-up for run/pass balance, outside for edge contain, inside to disrupt TE release',
      'Never set the same shade every play — disguise your assignment as long as possible',
      'Key the ball, not the QB voice — go on first movement of the football',
    ],
    techniques: [
      { name: '2-Point Stance (Base)', bestFor: 'Standard OLB alignment in even or odd front', cues: ['Inside foot back', 'Weight on balls of feet', 'Hands ready, coiled'] },
      { name: '3-Point Stance (3-4 Edge)', bestFor: 'OLB as primary pass rusher in 3-4', cues: ['Hand down on ball side', 'Weight forward', 'Go on ball movement'] },
    ],
  },

  {
    order: 2,
    topic: 'Edge Setting — Force, Spill, and Contain',
    technique_area: 'edge_setting',
    keyPoints: [
      'The OLB is the edge — his job is to make the RB cut inside to his teammates, not to make the solo tackle',
      'Attack the inside number of any blocker — spill everything inside',
      'Wrong-arm: when down-blocked, dip under and take the pull from inside-out',
      'Keep the outside leg free at all times — never get reached',
      'Press the LOS on run flow to you — meet the blocker in the gap, not at your heels',
    ],
    techniques: [
      { name: 'Spill Technique', bestFor: 'Primary run-force responsibility — send ball carrier inside', cues: ['Attack inside number', 'Keep outside leg free', 'Spill everything inside'] },
      { name: 'Wrong-Arm', bestFor: 'When down-blocked by TE with a pulling lineman', cues: ['Dip under the down block', 'Flatten pad level', 'Take pull from inside-out'] },
    ],
  },

  {
    order: 3,
    topic: 'Pass Rush — Get-Off, Speed, and Counter',
    technique_area: 'pass_rush',
    keyPoints: [
      'Key the ball — fire on first movement, not the snap count or QB voice',
      'Attack upfield first on speed rush — force OT to kick wide before bending the arc',
      'Bend the arc tight: dip inside shoulder, keep pad level low through the corner',
      'Set up your counter on the first rep — if the OT takes away the speed, have a counter ready',
      'Swim over the OT punch or rip under the arms — always have two moves per rush',
    ],
    techniques: [
      { name: 'Speed Rush with Corner Bend', bestFor: 'Athletic OLB vs kick-sliding OT', cues: ['Attack upfield first', 'Sink inside shoulder at corner', 'Arc deep before bending back'] },
      { name: 'Bull Rush / Power Conversion', bestFor: 'When OT mirrors speed rush', cues: ['Punch inside OT frame — thumbs up', 'Elbows in, hips sink', 'Drive feet through contact'] },
      { name: 'Swim / Rip Counter', bestFor: 'When OT overcommits to speed rush', cues: ['Rip low — swim high', 'Set the move first, then counter', 'Convert immediately to sprint to QB'] },
    ],
  },

  {
    order: 4,
    topic: 'Block Defeat — TE, FB, and Combo',
    technique_area: 'block_defeat',
    keyPoints: [
      'TE Reach: attack the inside number before the TE can establish leverage — stay square, rip through',
      'FB Lead: press the LOS, punch inside the FB frame, keep outside leg free, shed to the ball side',
      'Down block + pull: recognize the down block by TE — execute wrong-arm on the pulling lineman',
      'Combo block (TE + OT): split the double team by striking the inside gap between both blockers',
      'Never get walled — any block that seals you inside is a loss for the defense',
    ],
  },

  {
    order: 5,
    topic: 'Pass Coverage — Flat, Hook-Curl, and Man on TE',
    technique_area: 'pass_coverage',
    keyPoints: [
      'Flat zone (Cover 2): open to flat immediately, peek to curl — flat is your primary',
      'Hook-curl (Cover 3 / 3-3 Stack): drop at 45 degrees to 12-yard depth, mirror receivers in window',
      'Curl-to-flat technique: take the curl first if no threat to flat, then release to flat on the throw',
      'Man on TE: jam the release with outside hand, funnel inside, stay on the TE hip on vertical routes',
      'Never chase routes through your zone — hold your window and let routes come to you',
    ],
    techniques: [
      { name: 'Flat Zone', bestFor: 'Cover 2 — first flat threat, swing pass, out route', cues: ['Open flat immediately', 'Peek to curl', 'Do not drop past 5 yards on flat assignment'] },
      { name: 'Hook-Curl Drop', bestFor: 'Cover 3 / 3-3 stack — intermediate window ownership', cues: ['45-degree drop at 12 yards', 'Eyes on QB', 'Mirror receivers, do not chase'] },
      { name: 'Man on TE', bestFor: 'Man coverage — Sam LB matched on in-line or H-back TE', cues: ['Jam with outside hand', 'Funnel inside', 'Stay on the hip — no free vertical release'] },
    ],
  },

  {
    order: 6,
    topic: 'Blitz Technique — Edge, Inside, and Stunts',
    technique_area: 'blitz_technique',
    keyPoints: [
      'Edge blitz: win the outside foot — get your outside foot past the OT outside foot before he can set',
      'Get-skinny for inside gap blitz: snap hips sideways — turn your body 90 degrees through the gap',
      'Stunt timing: wait for the DE to engage the OL before looping — do not tip the stunt by looping early',
      'Stay low through the gap: a high rusher gets absorbed; a low rusher creates push',
      'Never tip the blitz pre-snap — disguise your stance and alignment until the snap',
    ],
  },

  {
    order: 7,
    topic: 'Pursuit — Cutback Lane and Run-Away Angles',
    technique_area: 'pursuit',
    keyPoints: [
      'Run to your side: set the edge, spill inside, release off the block, pursue to the ball in the alley',
      'Run away: square shuffle — maintain the cutback lane. Do not over-pursue and vacate your gap',
      'Counterpoint angle: stay between the RB and the goal line as the run develops away',
      'Never over-pursue — the cutback is always available if the pursuit angle is lost',
      'Arrive with urgency and control — a sprinting OLB who overruns the tackle is as bad as a late arrival',
    ],
  },

]

// ─── Lookup Helpers ───────────────────────────────────────────────────────────

/**
 * Find drills that address a given pain point (keyword match on fixes array)
 */
export function findOLBDrillsForPainPoint(painPoint: string): OLBDrillEntry[] {
  const kw = painPoint.toLowerCase()
  return OLB_DRILLS.filter(d =>
    d.fixes.some(f => kw.includes(f) || f.includes(kw)) ||
    d.name.toLowerCase().includes(kw) ||
    d.why.toLowerCase().includes(kw)
  )
}

/**
 * Convert an OLBDrillEntry to the Exercise shape used by training plan generator
 */
export function olbDrillToExercise(drill: OLBDrillEntry): Exercise {
  return {
    name: drill.name,
    sets: drill.sets ?? 3,
    reps: drill.reps ?? null,
    duration: drill.duration ?? null,
    category: drill.category,
    why: drill.why,
  }
}

/**
 * Get the teaching step for a given OLB technique area
 */
export function getOLBTeachingStep(area: OLBTechniqueArea): OLBTeachingStep | undefined {
  return OLB_TEACHING_PROGRESSION.find(s => s.technique_area === area)
}
