/**
 * Linebacker (LB) Drill Library
 *
 * Sources:
 *  - LB Drills PPTX (Romison Saint-Louis): Fit Position, Sled Work, Hoop Drills, Pass Drops
 *  - LB Drills DOCX (Jeff Lutt, Great Bend HS KS): Back Hip Pursuit, Block Escape,
 *    Zone/Man Coverage, Blitz Technique, Tackling, Peter Buck LB Drills
 *  - 2023 Comets Inside Linebackers Fundamentals & Drills PDF
 *  - Video reference: Ohio State Linebacker Drills, South Alabama LBs, Miami LBs
 *  - Hawk Tackling progression
 *  - Alabama Defensive Drills: DB Shuffle-Butt-Cut (applicable to LB coverage)
 */

export type LBTechniqueArea =
  | 'stance_fit'
  | 'block_defeat'
  | 'run_reads'
  | 'pass_drops'
  | 'man_coverage'
  | 'blitz_technique'
  | 'tackling'

export interface LBDrillEntry {
  name: string
  technique_area: LBTechniqueArea
  coaching_cue: string
  why: string
  common_mistake: string
  fixes: string[]
  sets?: string
  reps?: string
  duration?: string
  progressions: string[]
  videos: { title: string; url: string; duration: string }[]
}

export interface LBTeachingStep {
  order: number
  topic: string
  technique_area: LBTechniqueArea
  keyPoints: string[]
  techniques?: { name: string; bestFor: string; cues: string[] }[]
}

// ─── Area Labels ──────────────────────────────────────────────────────────────

export const LB_AREA_LABELS: Record<LBTechniqueArea, string> = {
  stance_fit:     'Stance & Fit Position',
  block_defeat:   'Block Defeat',
  run_reads:      'Run Reads & Fits',
  pass_drops:     'Pass Drops & Zone',
  man_coverage:   'Man Coverage',
  blitz_technique:'Blitz Technique',
  tackling:       'Tackling',
}

// ─── Drill Library ─────────────────────────────────────────────────────────────

export const LB_DRILLS: LBDrillEntry[] = [
  // ── Stance & Fit Position ──────────────────────────────────────────────────
  {
    name: 'Fit Position Drill',
    technique_area: 'stance_fit',
    coaching_cue: 'Attack and get into fit — not react and then fit',
    why: 'The fit position (hands on blocker\'s breastplate, wide base, hips down) is the foundation of every block defeat and tackle. This drill builds the muscle memory of immediately reaching fit on contact rather than waiting.',
    common_mistake: 'Feet going stagnant when engaging the blocker — LB must keep feet "hot" throughout the fit.',
    fixes: ['stance', 'fit', 'block defeat', 'pad level', 'footwork'],
    sets: '3',
    reps: '8',
    progressions: [
      'Static fit: LB already in fit position, violently extend arms on command and hold',
      'Attack to fit: LB in stance, 1st whistle → attack to fit; 2nd whistle → violently extend; 3rd whistle → violently disengage',
      'Bag behind foot: place bag behind back foot to prevent false step — LB must step forward',
      'Live partner: partner steps toward LB, LB shoots hands to fit, falls back and repeats',
    ],
    videos: [],
  },
  {
    name: 'Warmup Combo Movements (Shuffle / Drop / Attack)',
    technique_area: 'stance_fit',
    coaching_cue: 'Stay square as long as possible — open hips late, not early',
    why: 'The LB warmup combo (shuffle → drop → attack) trains the three core movement patterns of linebacker play in one continuous sequence. Builds the habit of staying square until forced to open hips.',
    common_mistake: 'Opening hips too early on the shuffle or drop — telegraph coverage and slow reaction to the ball.',
    fixes: ['stance', 'footwork', 'lateral', 'drops', 'pursuit'],
    duration: '8 min',
    progressions: [
      'Shuffle only: lateral shuffle for 3-4 steps staying square',
      'Shuffle + drop: shuffle, then open hips into a backpedal drop',
      'Full combo: shuffle → drop → attack on coach signal',
    ],
    videos: [],
  },

  // ── Block Defeat ───────────────────────────────────────────────────────────
  {
    name: 'Sled Work "Hands" — LB Version',
    technique_area: 'block_defeat',
    coaching_cue: 'Shoot hands inside — create separation before you shed',
    why: 'LBs must be able to defeat blocks from OL, TE, and FB. The sled progression builds the punch, extension, and hip drive needed to create enough separation to shed and pursue the ball carrier.',
    common_mistake: 'Grabbing or wrapping the blocker instead of punching inside the frame — creates false-start reads and penalties.',
    fixes: ['block defeat', 'punch', 'hand fighting', 'leverage', 'shed'],
    sets: '4',
    reps: '10',
    progressions: [
      'On knee: inside hand punches (alternate)',
      'On knee: both hands simultaneously — explosion reps',
      'On knee: shoot hands, extend, bring hips through',
      '2-point stance: punch → explode → shoot hips → drive → disengage and finish (scoop and score, INT, or tackle)',
    ],
    videos: [],
  },
  {
    name: 'Club & Rip Block Escape',
    technique_area: 'block_defeat',
    coaching_cue: 'Shock with the hands first, then rip — not rip before you shock',
    why: 'The club-and-rip is the LB\'s primary block escape move. The shock (inside punch) disrupts the blocker\'s balance; the rip (elbow to hip) creates separation. Done in sequence they are nearly unstoppable.',
    common_mistake: 'Trying to rip through without the initial shock — the blocker absorbs the rip and maintains grip.',
    fixes: ['block defeat', 'club', 'rip', 'escape', 'shed', 'separation'],
    sets: '3',
    reps: '8',
    progressions: [
      'Club only: hammer-fist the blocker\'s arm down, resetting after each rep',
      'Rip only: dip shoulder and drive elbow to hip through the blocker',
      'Club → rip in sequence: club the arm down, immediately rip through',
      'Triangle drill: 2 blockers vs 1 LB — go on OL movement, use club-rip on both',
    ],
    videos: [
      { title: 'Peter Buck LB Drills', url: 'https://www.youtube.com/watch?v=ObvYU3Pv31s', duration: 'Full' },
    ],
  },
  {
    name: 'Single Block & Tackle (OL + RB)',
    technique_area: 'block_defeat',
    coaching_cue: 'Clear the hip before you go for the tackle',
    why: 'The single-block-and-tackle drill (1 OL, 1 RB) trains the LB to defeat a block and then immediately transition to a tackle — without over-pursuing past the blocker or losing the ball carrier.',
    common_mistake: 'Fighting through the blocker without clearing the hip, resulting in the LB pursuing from a bad angle.',
    fixes: ['block defeat', 'tackle', 'hip clear', 'shed', 'run defense'],
    sets: '3',
    reps: '5',
    progressions: [
      'Hip clear vs bag: practice clearing the hip on the edge of a stationary bag',
      'OL only: 1-on-1 block defeat without the RB',
      'Full rep: 1 OL + 1 RB at full speed',
    ],
    videos: [],
  },

  // ── Run Reads & Fits ───────────────────────────────────────────────────────
  {
    name: 'Back Hip Pursuit Drill',
    technique_area: 'run_reads',
    coaching_cue: 'Stay on the back hip of the RB — you\'re always behind him until you\'re not',
    why: 'Jeff Lutt\'s (Great Bend HS) Back Hip Pursuit drill trains the LB to maintain inside leverage on the ball carrier. The LB stays on the RB\'s back hip until the RB commits — then triggers on the correct angle.',
    common_mistake: 'Flowing too fast and over-running the cutback — the LB should stay controlled on the back hip until the ball declares.',
    fixes: ['pursuit', 'run reads', 'cutback', 'flow', 'inside leverage'],
    sets: '3',
    reps: '5',
    progressions: [
      'Flow only: LB tracks RB laterally staying on back hip — no contact',
      'Flow + cutback: RB executes a cutback from behind the middle bag, LB reacts',
      'Full rep: block escape → back hip pursuit → tackle on the RB',
    ],
    videos: [],
  },
  {
    name: 'LB Read Steps vs RB Directional Flow',
    technique_area: 'run_reads',
    coaching_cue: 'Read the front hip of the blocker — that\'s where the run is going',
    why: 'The read-step drill teaches the LB to take controlled, two-step reads before committing to a run fill. Reading blocker hips rather than the ball or the backfield prevents guess-plays and over-pursuit.',
    common_mistake: 'Taking a hard run step before reading — LB commits to the wrong gap on misdirection and play-action.',
    fixes: ['run reads', 'reads', 'react', 'gap', 'play action'],
    sets: '4',
    reps: '6',
    progressions: [
      '3 LB flow to RB: practice front hip, back hip, and cutback reads with 3 LBs simultaneously',
      'Read step vs double move: RB jabs one way, cuts back — LB must hold read step',
      'Live: OL pulls or releases, LB reads hip color and fills correct gap',
    ],
    videos: [],
  },
  {
    name: 'Hoop Drill — LB Blitz Angle',
    technique_area: 'run_reads',
    coaching_cue: 'Sprint around the hoop — simulate a tight run-through',
    why: 'The hoop drill trains the LB to maintain pad level and change direction around a tight obstacle — replicating the body control needed when shooting a gap on a blitz or a run fill at the line of scrimmage.',
    common_mistake: 'Standing up around the hoop instead of dipping the shoulder and maintaining pad level.',
    fixes: ['run reads', 'blitz', 'gap', 'pad level', 'bend'],
    sets: '3',
    reps: '6',
    progressions: [
      'Bend around hoop and pick up towel',
      'Bend around hoop halfway and redirect: stop midway, redirect the other direction',
      'Hoop under chute: enforce low pad level throughout the hoop bend',
      'Hoop with block: coach inside the hoop engages LB with pad — LB must clear',
    ],
    videos: [],
  },

  // ── Pass Drops & Zone ──────────────────────────────────────────────────────
  {
    name: 'Angle Drop / Zone Drop Drill',
    technique_area: 'pass_drops',
    coaching_cue: 'Open at 45 degrees — not straight back, not sideways',
    why: 'Zone drops must be angled to cover the assigned window. Dropping straight back leaves the underneath seam open; dropping sideways leaves the hook-curl open. A 45-degree angle drop covers both.',
    common_mistake: 'Dropping straight back and giving up the seam route or shallow crossing route underneath.',
    fixes: ['pass drops', 'zone', 'angle drop', 'coverage', 'reads'],
    sets: '4',
    reps: '6',
    progressions: [
      'Angle drop only: 45-degree drop to landmark without the ball',
      'Drop and locate: drop to landmark, locate QB, work to thrown ball',
      'Distraction drop: LB wraps around standing dummy and catches thrown ball (distraction drill)',
    ],
    videos: [],
  },
  {
    name: 'W Drill — Agility and Zone Footwork',
    technique_area: 'pass_drops',
    coaching_cue: 'Feet hot at every turn — no flat-footed hesitation',
    why: 'The W Drill builds the lateral footwork needed for zone drops, reroutes, and pass rush angles. Combines the shuffle, sprint, and backpedal movements that LBs use on every pass down.',
    common_mistake: 'Planting flat-footed at the corners of the W instead of staying light and pivoting quickly.',
    fixes: ['pass drops', 'footwork', 'lateral', 'agility', 'zone'],
    duration: '10 min',
    progressions: [
      'Shuffle-Sprint-Shuffle: lateral shuffle → sprint → shuffle the other way',
      'Sprint-Shuffle-Sprint: sprint forward → lateral shuffle → sprint again',
      'W Drill: weave forward through cones, weave backward through same cones',
      'Agile bags: 1-foot, 2-foot, lateral step, in/out shuffle, forward/backpedal — finish with tackle or catch',
    ],
    videos: [],
  },
  {
    name: 'Re-Route Drill (Zone Disruption)',
    technique_area: 'pass_drops',
    coaching_cue: 'Jam the receiver\'s shoulder — don\'t grab, don\'t hold',
    why: 'LBs in zone coverage are allowed to jam receivers crossing through their zone. The re-route drill teaches the LB to disrupt the receiver\'s path with a legal shoulder-jam while maintaining their drop assignment.',
    common_mistake: 'Grabbing or holding the receiver — illegal contact. The jam must be with the hands to the shoulder or chest, before the receiver clears 5 yards.',
    fixes: ['pass drops', 'zone', 'reroute', 'jam', 'coverage'],
    sets: '3',
    reps: '6',
    progressions: [
      'Footwork-only drop: drop to zone, locate receiver crossing through',
      'Jam-and-drop: disrupt receiver with shoulder jam, resume drop assignment',
      'Play-action: LB reads run, identifies play-action, recovers to zone drop',
    ],
    videos: [],
  },

  // ── Man Coverage ───────────────────────────────────────────────────────────
  {
    name: 'Man Coverage (White) — Cover RB from Backfield',
    technique_area: 'man_coverage',
    coaching_cue: 'Hip-to-hip with the RB — everywhere he goes, you go',
    why: 'LBs in man coverage on running backs must key the RB\'s release direction while maintaining alignment inside the RB\'s route. The "White" coverage drill (Jeff Lutt) trains the LB to match the RB immediately.',
    common_mistake: 'Losing the RB on a wheel route or check-down — LB must maintain inside leverage on every release.',
    fixes: ['man coverage', 'coverage', 'rb', 'releases', 'wheel'],
    sets: '3',
    reps: '6',
    progressions: [
      'Walk-through: RB runs flat, angle, and wheel routes at half-speed',
      'Mirror: LB mirrors RB\'s first 3 steps before route declares',
      'Live: RB at full speed with QB — LB man coverage, no bracket help',
    ],
    videos: [],
  },
  {
    name: 'Buddy Outs — LB in Man vs TE / Slot',
    technique_area: 'man_coverage',
    coaching_cue: 'Open to your man\'s outside shoulder — don\'t let him cut behind you',
    why: 'Buddy Outs (Jeff Lutt) trains LBs to execute man coverage on out-breaking routes from TEs or slot receivers — the most common mismatches at linebacker. The LB must stay on the inside hip through the route stem.',
    common_mistake: 'Turning shoulders too early and allowing the receiver to cut behind the LB on an in-breaking route.',
    fixes: ['man coverage', 'coverage', 'out routes', 'te coverage', 'separation'],
    sets: '3',
    reps: '6',
    progressions: [
      'Footwork-only: LB mirrors receiver stem and break without ball',
      'Trail technique: stay on inside hip through the stem, drive on the break',
      'Full rep with ball: QB throws, LB contests the catch or intercepts',
    ],
    videos: [],
  },

  // ── Blitz Technique ────────────────────────────────────────────────────────
  {
    name: 'Blitz Get-Skinny Drill',
    technique_area: 'blitz_technique',
    coaching_cue: 'Snap hips open and get skinny — no hands at first',
    why: 'The blitz requires the LB to get through a narrow gap without using hands on blockers in the gap. The "get-skinny" technique (snap hips to turn sideways) maximizes the gap the LB can fit through.',
    common_mistake: 'Trying to bull through the gap instead of getting skinny — stacks bodies in the gap and kills the blitz.',
    fixes: ['blitz', 'blitz technique', 'gap', 'pass rush', 'footwork'],
    sets: '3',
    reps: '6',
    progressions: [
      'Hip snap only: practice opening hips and getting skinny without moving forward',
      'Blitz gap with open gap: blitz path with gap left open — focus on correct footwork',
      'Blitz gap with closing gap: gap moves, LB must redirect',
      'Add hands: once hip-snap is automatic, add hands to redirect blockers',
    ],
    videos: [],
  },
  {
    name: 'Play-Action Blitz Counter',
    technique_area: 'blitz_technique',
    coaching_cue: 'Step up, then sprint to your drop — don\'t freeze on play-action',
    why: 'Play-action is the most effective weapon against a blitzing LB. This drill trains the LB to take one aggressive step toward the run fake, then immediately recognize and recover to the pass drop assignment.',
    common_mistake: 'Freezing for too long on the play-action fake — the LB arrives at the drop too late to be effective.',
    fixes: ['blitz', 'play action', 'pass drops', 'reads', 'react'],
    sets: '3',
    reps: '5',
    progressions: [
      'Run read only: LB takes one step toward run, coach signals "pass" — LB recovers',
      'Full play-action: QB and RB run full play-action, LB must ID and recover',
      'Live blitz vs play-action: offense runs play-action against the blitz',
    ],
    videos: [],
  },

  // ── Tackling ──────────────────────────────────────────────────────────────
  {
    name: 'Hawk Tackling Progression',
    technique_area: 'tackling',
    coaching_cue: 'Buzz → hit position → roll hips → wrap and drive',
    why: 'The Hawk tackling progression (used widely at the college and NFL level) is a safe, effective tackling method: the LB buzzes his feet to decelerate, gets to hit position (bent knees, eyes on ball), rolls hips through contact, and wraps and drives.',
    common_mistake: 'Leading with the head or not buzzing feet before contact — results in missed tackles and potential injury.',
    fixes: ['tackling', 'form tackle', 'wrap', 'open field', 'missed tackle'],
    sets: '3',
    reps: '6',
    progressions: [
      'Stance and hit position: hold hit position for 3 seconds — knees bent, back flat',
      'Buzz and freeze: run at a partner, buzz feet to decelerate, freeze in hit position',
      'Full hawk tackle: buzz → hit position → roll hips → wrap and drive',
      'Open-field tackle (sideline): angle tackle cutting off the sideline',
    ],
    videos: [
      { title: 'Ohio State Linebacker Drills', url: 'https://www.youtube.com/watch?v=placeholder_ohio_lb', duration: 'Film' },
      { title: 'Ultimate Football University South Alabama LBs', url: 'https://www.youtube.com/watch?v=placeholder_sou_ala_lb', duration: 'Clinic' },
    ],
  },
  {
    name: 'Cutback Tackle / One-Man Sled Wrap & Drive',
    technique_area: 'tackling',
    coaching_cue: 'Wrap and drive — never arm-tackle from behind',
    why: 'The cutback tackle drill focuses on making a tackle from pursuit angle — coming from behind and to the side. The one-man sled wrap reinforces the wrap-and-drive habit even when the LB is slightly out of position.',
    common_mistake: 'Arm-tackling from pursuit angle — the RB can break an arm tackle easily; the full wrap is required.',
    fixes: ['tackling', 'wrap', 'cutback', 'pursuit', 'arm tackle'],
    sets: '3',
    reps: '6',
    progressions: [
      'Sled wrap and drive: approach sled from a pursuit angle, wrap and drive 3 yards',
      'Cone cutback: RB cuts back around a cone, LB wraps from a pursuit angle',
      'Live cutback: RB at full speed with a cutback cue, LB must wrap and drive',
    ],
    videos: [],
  },
  {
    name: 'Vice Drill (Ball Strip on Sled / Scoop & Score)',
    technique_area: 'tackling',
    coaching_cue: 'Tackle and strip simultaneously — tomahawk off the edge',
    why: 'Ball disruption drills build the habit of always trying to strip the ball on every tackle — converting potential stops into turnovers. Includes tomahawk from the edge (EMOL strip) and vice technique from in front.',
    common_mistake: 'Stopping at the tackle without attempting to strip — misses the turnover opportunity.',
    fixes: ['tackling', 'takeaway', 'strip', 'fumble', 'turnover'],
    sets: '3',
    reps: '6',
    progressions: [
      'Tomahawk off edge: approach from outside, tomahawk the ball from behind',
      'Vice grip in front: two-arm tackle and squeeze the ball simultaneously',
      'Scoop and score: pick up the loose ball and score at full speed',
      'Hand/eye tennis ball: catch tennis ball thrown at unpredictable angles — builds hand-eye for strip',
    ],
    videos: [
      { title: 'Ball Disruptions in Football — CoachAd', url: 'https://coachad.com/articles/ball-disruptions-in-football-winning-with-defense/', duration: 'Article' },
    ],
  },
]

// ─── Teaching Progression ─────────────────────────────────────────────────────

export const LB_TEACHING_PROGRESSION: LBTeachingStep[] = [
  {
    order: 1,
    topic: 'Stance & Fit Position — Foundation of LB Play',
    technique_area: 'stance_fit',
    keyPoints: [
      'Athletic two-point stance: feet shoulder-width, knees bent, eyes up, weight on balls of feet',
      'Fit position: hands on blocker\'s breastplate, wide base, hips below blocker\'s hips',
      'Feet must stay "hot" — constantly moving at a short, quick tempo',
      'Place bag behind back foot to prevent false-stepping backward when engaging',
      'Reach fit on the first step — never take two steps to fit',
    ],
  },
  {
    order: 2,
    topic: 'Block Defeat — Shock, Shed, and Pursue',
    technique_area: 'block_defeat',
    keyPoints: [
      'Shock (inside punch) must come before any shedding move',
      'Club-and-rip: club the arm down, then rip the same side through',
      'Hands inside the blocker\'s frame — thumbs up, strike the breastplate',
      'Clear the hip before chasing the ball carrier — not around the blocker',
      'Lane integrity: stay in your assigned gap while defeating the block',
    ],
  },
  {
    order: 3,
    topic: 'Run Reads & Fits — The Trigger',
    technique_area: 'run_reads',
    keyPoints: [
      'Read blocker hips, not the ball — front hip of the blocker tells you where the run goes',
      'Back hip pursuit: stay on the RB\'s back hip until he commits — don\'t over-run',
      'Read steps: controlled two-step reads before committing to a fill',
      '3 LB flow concept: front hip, back hip, cutback responsibilities',
      'Play-action discipline: take your read step, then reset — never freeze on a pump fake',
    ],
  },
  {
    order: 4,
    topic: 'Pass Drops & Zone — Coverage Windows',
    technique_area: 'pass_drops',
    keyPoints: [
      '45-degree angle drop: opens the zone window while staying athletic for a run trigger',
      'Lane reads: locate receivers entering your zone — mirror their speed without chasing',
      'W-Drill fundamentals: shuffle → sprint → shuffle → backpedal are the four zone movements',
      'Re-route is legal: jam receivers in your zone before they clear 5 yards',
      'Alert for play-action: first step toward run, then reset and get to drop immediately',
    ],
  },
  {
    order: 5,
    topic: 'Man Coverage — Match and Trail',
    technique_area: 'man_coverage',
    keyPoints: [
      'Key the RB\'s first step immediately — don\'t react to the QB\'s eyes',
      'Inside leverage: stay on the inside hip of your assignment — force routes outside',
      'Trail technique on out-breaking routes: stay on the inside hip through the stem',
      'Wheel route: paramount threat — always maintain inside leverage to prevent the wheel from going behind you',
      '"White" coverage: match RB from the backfield — everywhere he goes, you go',
    ],
  },
  {
    order: 6,
    topic: 'Blitz Technique — Gap, Skinny, and Finish',
    technique_area: 'blitz_technique',
    keyPoints: [
      'Get-skinny: snap hips open to turn sideways through the gap — maximize gap space',
      'No hands in the gap: use body and hip angle to slip through, add hands only if stuck',
      'Redirect if gap closes: blocker shuts the gap — redirect to the next gap immediately',
      'Blitz deception: simulate a run fill before revealing the blitz path',
      'Play-action discipline: one step toward the run, then sprint to the blitz lane — don\'t freeze',
    ],
  },
  {
    order: 7,
    topic: 'Tackling — Safe, Sound, and Effective',
    technique_area: 'tackling',
    keyPoints: [
      'Hawk progression: Buzz feet → hit position (knees bent, head up) → roll hips → wrap and drive',
      'Never lead with the head — forehead contacts the ball carrier\'s chest, not the helmet to the chest',
      'Buzz feet before contact: decelerate by chopping steps, not by stopping and waiting',
      'Open-field: cut the ball carrier off at the sideline — never overrun him',
      'Strip mindset: every tackle is a chance for a turnover — tomahawk or vice on every rep',
    ],
  },
]

// ─── Finder & Getter ─────────────────────────────────────────────────────────

export function findLBDrillsForPainPoint(issue: string): LBDrillEntry[] {
  const lower = issue.toLowerCase()
  return LB_DRILLS.filter(d =>
    d.fixes.some(f => lower.includes(f) || f.includes(lower.split(' ')[0]))
  )
}

export function lbDrillToExercise(drill: LBDrillEntry) {
  return {
    name: drill.name,
    sets: drill.sets ? parseInt(drill.sets) : null,
    reps: drill.reps ? parseInt(drill.reps) : null,
    duration: drill.duration ?? null,
    why: drill.why,
    category: 'technique' as const,
    coaching_cue: drill.coaching_cue ?? null,
    demo_url: drill.videos[0]?.url ?? null,
  }
}

export function getLBTeachingStep(area: LBTechniqueArea): LBTeachingStep | undefined {
  return LB_TEACHING_PROGRESSION.find(s => s.technique_area === area)
}
