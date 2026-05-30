/**
 * Wide Receiver Position-Specific Drill Library
 * Source: "WR Book — Basics and Advanced Concepts" coaching guide (translated from Hungarian)
 *         + curated YouTube drill reference library
 * Used by: training plan generator, video analysis AI, drill reference UI
 *
 * Teaching philosophy (from source material):
 *  1. Athletics / conditioning is the non-negotiable foundation
 *  2. Ball feel and cutting are daily habits, not session activities
 *  3. Concentration under contact separates good WRs from great ones
 *  4. Know the playbook AND the opponent — pre-snap wins happen in the film room
 *  5. Choose a role model with a similar body type and master their movements first
 */

import type { Exercise } from '@/types'

// ─── Reference Video Type ─────────────────────────────────────────────────────

export interface DrillVideoWR {
  title: string
  url: string
  duration: string
  notes?: string
}

// ─── Technique Areas ──────────────────────────────────────────────────────────

export type WRTechniqueArea =
  | 'athletics'
  | 'releases'
  | 'route_running'
  | 'catching'
  | 'blocking'
  | 'footwork'
  | 'film_study'

export type WRDrillCategory = Exercise['category']

// ─── Drill Entry ──────────────────────────────────────────────────────────────

export interface WRDrillEntry {
  name: string
  category: WRDrillCategory
  technique_area: WRTechniqueArea
  sets: number | null
  reps: number | null
  duration: string | null
  why: string
  coaching_cue: string
  common_mistake: string
  fixes: string[]           // pain-point keywords this drill addresses
  progressions: string[]    // beginner → advanced
  videos: DrillVideoWR[]
}

// ─── Full WR Drill Library ────────────────────────────────────────────────────

export const WR_DRILLS: WRDrillEntry[] = [

  // ── ATHLETICS & CONDITIONING ──────────────────────────────────────────────

  {
    name: 'Sprint Mechanics & Acceleration (WR)',
    category: 'speed',
    technique_area: 'athletics',
    sets: 6, reps: 1, duration: '10 yards each',
    why: 'Every route starts with your first 5 yards off the line. Poor sprint mechanics — upright posture, passive arm drive, heel strike — waste the acceleration phase and let corners close before you reach your stem.',
    coaching_cue: 'Drive phase through 10 yards: lean forward, knees up, violent arm drive. Stand tall only after the break.',
    common_mistake: 'Standing upright too soon after the snap — kills acceleration before the stem even begins',
    fixes: ['slow', 'speed', 'acceleration', 'first step', 'explosion', 'slow off the line', 'slow stem'],
    progressions: ['A-skip form drill', '10-yard burst from stance', 'Full-speed route with emphasis on first 5 yards'],
    videos: [
      { title: 'Top WR Footwork Drills & Route Running Secrets', url: 'https://www.youtube.com/watch?v=-Lcr8_E1-Ag', duration: '~10 min' },
      { title: '8 Best WR Drills — includes acceleration work', url: 'https://www.youtube.com/watch?v=eTDcc2zozDg', duration: '~12 min' },
    ],
  },
  {
    name: 'WR Conditioning Circuit',
    category: 'speed',
    technique_area: 'athletics',
    sets: 5, reps: null, duration: '6 minutes total',
    why: 'The coaching guide emphasizes: "Be able to run at the end of the game the same as at the beginning and you\'ll guarantee a TD." WRs who gas out run lazy routes and lose separation late in games.',
    coaching_cue: 'Every rep at game speed — conditioning at half-speed builds a half-speed player',
    common_mistake: 'Treating conditioning as a separate activity from technique — run routes at game speed during conditioning, not jog-throughs',
    fixes: ['conditioning', 'endurance', 'tired', 'fourth quarter', 'fatigue', 'slow late game'],
    progressions: ['Moderate-intensity route tree', 'Full-speed route tree', 'Game-speed route tree with contested catches'],
    videos: [
      { title: 'WR Speed & Agility Training', url: 'https://www.youtube.com/watch?v=c33Cpy8MSjY', duration: '~8 min' },
      { title: '5 WR Speed and Agility Drills', url: 'https://www.youtube.com/watch?v=yZMG5kIVU1Q', duration: '~6 min' },
    ],
  },

  // ── RELEASES ──────────────────────────────────────────────────────────────

  {
    name: 'Swim Release (vs. Press)',
    category: 'technique',
    technique_area: 'releases',
    sets: 4, reps: 8, duration: null,
    why: 'A corner playing press at the line will jam you the moment you release. The swim is the primary release against inside-aligned press — slap the jam arm down and swim through before the CB can reset.',
    coaching_cue: 'Slap the arm down hard, swim through FAST — do not pause between the slap and the swim or the corner resets',
    common_mistake: 'Swimming too slow after the slap — gives the corner time to recover and re-engage',
    fixes: ['press', 'release', 'jam', 'bump and run', 'off the line', 'press coverage', 'getting jammed'],
    progressions: ['Solo shadow reps (no partner)', 'Bag as press defender', 'Partner press with live hands', 'vs. full press coverage'],
    videos: [
      { title: '5 WR Press Release Drills & Tips', url: 'https://www.youtube.com/watch?v=Jp2p1qF9Ycc', duration: '~7 min' },
      { title: '4 WR Press Release Techniques with Drills', url: 'https://www.youtube.com/watch?v=JiIiSlJ7NUw', duration: '~6 min' },
      { title: 'Wide Receiver Press Release Drills', url: 'https://www.youtube.com/watch?v=bjos7cxAV9c', duration: '~5 min' },
    ],
  },
  {
    name: 'Rip Release (vs. Press)',
    category: 'technique',
    technique_area: 'releases',
    sets: 4, reps: 8, duration: null,
    why: 'When the CB is aligned outside or shade-outside, the rip inside is your release. Dip the inside shoulder, rip through the armpit, and accelerate into the stem immediately — do not pause after the rip.',
    coaching_cue: 'Dip the shoulder FIRST, then rip through the armpit — the shoulder dip is what makes the rip work',
    common_mistake: 'Ripping without dropping the shoulder — the rip fails to clear the arm and the CB maintains contact',
    fixes: ['press', 'release', 'jam', 'off the line', 'inside release', 'bump and run', 'press coverage'],
    progressions: ['Shadow reps', 'Bag work', 'Partner live hands', 'Full-speed vs. CB in press'],
    videos: [
      { title: '5 WR Press Release Drills & Tips', url: 'https://www.youtube.com/watch?v=Jp2p1qF9Ycc', duration: '~7 min' },
      { title: 'Wide Receiver Press Release Drills 2011 (RIP, footwork, chop)', url: 'https://www.youtube.com/watch?v=b3P-9T4a8GE', duration: '~8 min' },
      { title: '4 WR Press Release Techniques with Drills', url: 'https://www.youtube.com/watch?v=JiIiSlJ7NUw', duration: '~6 min' },
    ],
  },
  {
    name: 'Push-Pull (Chop) Release (vs. Press)',
    category: 'technique',
    technique_area: 'releases',
    sets: 4, reps: 6, duration: null,
    why: 'When a CB has seen your swim and rip, the push-pull freezes them. Two hands on the chest, push (their weight shifts back), pull (off-balance), then release into the route. It works because it exploits the CB\'s own force against them.',
    coaching_cue: 'Push-pull is a rhythm: PUSH (weight forward) → PULL (off-balance) → GO. Each beat is one count.',
    common_mistake: 'Pushing without pulling — you only move the CB back, you don\'t off-balance them. Both hands stay engaged through the pull.',
    fixes: ['press', 'release', 'jam', 'off the line', 'press coverage', 'technique', 'getting held'],
    progressions: ['Shadow slow-motion', 'Bag work', 'Live partner press', 'Full route + release vs. CB'],
    videos: [
      { title: '4 WR Press Release Techniques with Drills', url: 'https://www.youtube.com/watch?v=JiIiSlJ7NUw', duration: '~6 min' },
      { title: '5 WR Press Release Drills & Tips', url: 'https://www.youtube.com/watch?v=Jp2p1qF9Ycc', duration: '~7 min' },
    ],
  },

  // ── ROUTE RUNNING ─────────────────────────────────────────────────────────

  {
    name: 'Stem Work & Leverage Attacks',
    category: 'footwork',
    technique_area: 'route_running',
    sets: 4, reps: 8, duration: null,
    why: 'The stem is how you set up the break. A flat stem running directly at the break point is the easiest route to defend. By attacking the CB\'s leverage — inside shade, outside shade — you force a commitment before your cut.',
    coaching_cue: 'Attack the CB\'s leverage on your approach — make them move their feet before you break. Separation is created at the stem, not the break.',
    common_mistake: 'Running in a straight line to the break point — the CB never has to commit and stays in phase',
    fixes: ['route running', 'stem', 'separation', 'leverage', 'approach', 'getting covered', 'CB in phase'],
    progressions: ['Cone stem walk-through', 'Half-speed stem + break', 'Full-speed stem vs. bag', 'vs. live CB'],
    videos: [
      { title: 'Cooper Kupp — Route Running, Release & Separation', url: 'https://www.youtube.com/watch?v=b8Y-BrxoGQc', duration: '~15 min' },
      { title: 'WR Route Running Drills', url: 'https://www.youtube.com/watch?v=O0RJ05mswfY', duration: '~8 min' },
      { title: 'Teaching and Coaching WRs — Routes & Catching', url: 'https://www.youtube.com/watch?v=fY2VxBnRXcw', duration: '~20 min' },
    ],
  },
  {
    name: 'Out / Comeback Break Drill',
    category: 'technique',
    technique_area: 'route_running',
    sets: 4, reps: 8, duration: null,
    why: 'Out and comeback routes are timing routes — the ball is in the air before the cut is finished. A rounded break lets the corner undercut; a sharp cut creates the 2-yard window the QB needs.',
    coaching_cue: 'Plant hard on the OUTSIDE foot, snap the hips toward the sideline — not the shoulders. Hips first, then shoulders, then eyes to the QB.',
    common_mistake: 'Leading the cut with the shoulders — telegraphs the route to the CB and produces a rounded, slow break',
    fixes: ['route running', 'out route', 'comeback', 'cut', 'separation', 'break', 'outside routes', 'rounded routes'],
    progressions: ['Walk-through break', 'Half-speed break vs. cone', 'Full-speed with QB throw on the break', 'vs. live CB'],
    videos: [
      { title: '8 Best WR Drills — break drills included', url: 'https://www.youtube.com/watch?v=eTDcc2zozDg', duration: '~12 min' },
      { title: 'Best Solo WR Drills', url: 'https://www.youtube.com/watch?v=T7Z2jq0KR5E', duration: '~10 min' },
      { title: '3-Step Jab — footwork into the break', url: 'https://www.youtube.com/watch?v=pZWZSoFOgjc', duration: '~5 min' },
    ],
  },
  {
    name: 'Slant & Quick Game Timing Drill',
    category: 'technique',
    technique_area: 'route_running',
    sets: 4, reps: 8, duration: null,
    why: 'Slant routes are rhythm routes — the QB is throwing off a 1- or 3-step drop. One step after the release, cut inside at 45 degrees. Run it too deep and you miss the throwing window entirely.',
    coaching_cue: 'Quick release, two steps, hard 45-degree cut inside — the ball is already coming. Get your eyes to the QB immediately after the cut.',
    common_mistake: 'Running the slant too deep before cutting — turns it into a crossing route and the window closes',
    fixes: ['route running', 'slant', 'quick game', 'timing', 'inside routes', 'drops', 'separation'],
    progressions: ['Walk-through with cone at cut', 'Half-speed with QB', 'Full-speed with live timing', 'vs. zone with read'],
    videos: [
      { title: 'WR Drills — Routes and Agility', url: 'https://www.youtube.com/watch?v=IQ2F7op_g0g', duration: '~8 min' },
      { title: 'Teaching and Coaching WRs — Routes', url: 'https://www.youtube.com/watch?v=fY2VxBnRXcw', duration: '~20 min' },
    ],
  },
  {
    name: 'Post / Corner Double-Move Drill',
    category: 'technique',
    technique_area: 'route_running',
    sets: 3, reps: 6, duration: null,
    why: 'Double-move routes (post-corner, corner-post, stop-and-go) only work if the first move is convincingly sold. If the CB doesn\'t bite, the second move has no value. This drill trains the sell — eyes, hips, and feet must all commit to the fake.',
    coaching_cue: 'Sell the FIRST move with your eyes AND your hips — not just your feet. The CB reads eyes. Look them off.',
    common_mistake: 'First move too hesitant or too short — the CB doesn\'t commit, stays in phase, and the second move has no space',
    fixes: ['route running', 'post', 'corner', 'double move', 'deep routes', 'separation', 'big plays', 'selling routes'],
    progressions: ['Shadow both moves slow-motion', 'Half-speed vs. cone target', 'Full-speed vs. bag as CB', 'vs. live safety read'],
    videos: [
      { title: 'Cooper Kupp — Route Running & Separation', url: 'https://www.youtube.com/watch?v=b8Y-BrxoGQc', duration: '~15 min' },
      { title: 'Best Solo WR Drills', url: 'https://www.youtube.com/watch?v=T7Z2jq0KR5E', duration: '~10 min' },
    ],
  },

  // ── CATCHING ─────────────────────────────────────────────────────────────

  {
    name: 'Hand Placement & Soft Hands Drill',
    category: 'technique',
    technique_area: 'catching',
    sets: 3, reps: 20, duration: null,
    why: 'The coaching guide states: "The key is control." Thumbs-in for balls at or above the waist; pinkies-together for balls below. Wrong hand placement is the #1 cause of drops — the ball hits the palm instead of the fingers.',
    coaching_cue: 'Catch with your FINGERS — not your palms, not your body. Soft hands (fingers absorb the ball), then squeeze. Eyes on the tip of the ball.',
    common_mistake: 'Body catching (trapping the ball against the chest) or reaching out with stiff hands — both produce inconsistent catches',
    fixes: ['catching', 'drops', 'hand placement', 'soft hands', 'concentration', 'fingers', 'hands'],
    progressions: ['Wall ball (solo hand placement)', 'Partner toss close range', 'Full route + catch', 'Catch + immediate tuck and run'],
    videos: [
      { title: 'Teaching and Coaching WRs — Catching Technique', url: 'https://www.youtube.com/watch?v=fY2VxBnRXcw', duration: '~20 min' },
      { title: '8 Best WR Drills', url: 'https://www.youtube.com/watch?v=eTDcc2zozDg', duration: '~12 min' },
    ],
  },
  {
    name: 'Contested Catch / High-Point Drill',
    category: 'technique',
    technique_area: 'catching',
    sets: 4, reps: 8, duration: null,
    why: '50/50 balls are wins if you attack the football before the DB can adjust. High-pointing — jumping to meet the ball at its peak with both hands fully extended — takes it away from the defender. Waiting for the ball to come down gives the DB a second read.',
    coaching_cue: 'Attack the ball at its HIGHEST point — go GET it. Use your body to box out the defender before the jump.',
    common_mistake: 'Waiting for the ball to come to you — gives the DB time to adjust and creates unnecessary contact during the catch',
    fixes: ['contested catch', 'high point', 'jump ball', 'red zone', '50-50', 'jump catches', 'tall catches', 'body positioning'],
    progressions: ['Solo jump-and-reach reps', 'Partner high-point toss', 'Full route + contested catch', 'vs. live DB with contact'],
    videos: [
      { title: 'Pittsburgh WRs — High Point & Contested Catch Drill', url: 'https://www.youtube.com/shorts/sBPuX42eR9Q', duration: 'Short' },
      { title: 'Teaching and Coaching WRs — Catching', url: 'https://www.youtube.com/watch?v=fY2VxBnRXcw', duration: '~20 min' },
    ],
  },
  {
    name: 'Concentration Catch with Distraction',
    category: 'technique',
    technique_area: 'catching',
    sets: 4, reps: 10, duration: null,
    why: 'The coaching guide: "Practice a lot with verbal and light physical disturbance. Accept that you will get hit — then you won\'t be afraid and you\'ll focus on the ball. If there\'s no hit, there\'s a TD." Concentration is a trained skill, not a personality trait.',
    coaching_cue: 'Eyes on the ball all the way INTO the hands — accept the contact, secure the ball FIRST, then look for yards',
    common_mistake: 'Anticipating the hit before securing the ball — causes early eye removal from the ball and drops on contact',
    fixes: ['catching', 'drops', 'concentration', 'contact catch', 'YAC', 'drops on contact', 'looking away', 'distraction'],
    progressions: ['Catch with verbal distraction', 'Catch with partner light touch', 'Catch through contact (pad/bag)', 'Full game-speed contested catch'],
    videos: [
      { title: 'Best Solo WR Drills', url: 'https://www.youtube.com/watch?v=T7Z2jq0KR5E', duration: '~10 min' },
      { title: '8 Best WR Drills', url: 'https://www.youtube.com/watch?v=eTDcc2zozDg', duration: '~12 min' },
    ],
  },
  {
    name: 'Over-the-Shoulder / Deep Ball Catch',
    category: 'technique',
    technique_area: 'catching',
    sets: 4, reps: 6, duration: null,
    why: 'Go routes and deep posts require catching over the shoulder at full speed without breaking stride. Slowing to look kills separation and signals the safety. Track the ball early; let it come to extended hands.',
    coaching_cue: 'Find the ball early with your eyes, track it the whole way down — do not slow down. Let the ball come to your EXTENDED hands.',
    common_mistake: 'Turning head and slowing down to look — alerts the safety, kills the separation lead, and makes the catch harder',
    fixes: ['catching', 'deep ball', 'go route', 'streak', 'over the shoulder', 'vertical route', 'tracking'],
    progressions: ['Partner toss over shoulder (walking)', 'Half-speed run with over-shoulder catch', 'Full-speed go route with QB', 'vs. safety help over top'],
    videos: [
      { title: 'Cooper Kupp — Route Running & Separation (includes deep routes)', url: 'https://www.youtube.com/watch?v=b8Y-BrxoGQc', duration: '~15 min' },
      { title: 'WR Drills compilation', url: 'https://www.youtube.com/watch?v=IQ2F7op_g0g', duration: '~8 min' },
    ],
  },

  // ── BLOCKING ─────────────────────────────────────────────────────────────

  {
    name: 'Stalk Block (WR vs. DB)',
    category: 'technique',
    technique_area: 'blocking',
    sets: 4, reps: 8, duration: null,
    why: 'WR stalk blocking is the difference between a 6-yard run and a 20-yard run. It\'s a skill most WRs neglect. The stalk block mirrors the defender — staying in front, chopping feet, not lunging — until the ball carrier commits to a direction.',
    coaching_cue: 'Feet chopping, stay in FRONT of the defender — mirror and sustain. Do not lunge or reach. Block until the whistle.',
    common_mistake: 'Reaching or lunging at the defender — the DB sidesteps and runs to the ball carrier. Stay patient and mirroring.',
    fixes: ['blocking', 'stalk block', 'run support', 'team play', 'missed blocks', 'perimeter blocking'],
    progressions: ['Mirror drill only (no contact)', 'Mirror + engage on signal', 'Full stalk block vs. DB partner', 'In team run period'],
    videos: [
      { title: 'WR Blocking Drill — Stalk Block Progression', url: 'https://www.youtube.com/watch?v=SyHVMuM86zs', duration: '~8 min' },
      { title: 'Temple University — WR Stalk Blocking Drills', url: 'https://www.youtube.com/watch?v=1aFafKiU9jo', duration: '~10 min' },
      { title: 'Youth Football — WR Stalk Blocking', url: 'https://www.youtube.com/watch?v=RtsMRy-4mcM', duration: '~5 min' },
      { title: 'Build Better Blocking WRs (Coaching Guide)', url: 'https://www.youtube.com/watch?v=f0D8eni2vo8', duration: '~12 min' },
      { title: 'Stalk Blocking Drill Guide for Coaches', url: 'https://www.youtube.com/watch?v=_6OWe6zNnJw', duration: '~8 min' },
    ],
  },
  {
    name: 'Crack Block (WR vs. LB / Safety)',
    category: 'technique',
    technique_area: 'blocking',
    sets: 3, reps: 6, duration: null,
    why: 'The crack block seals inside defenders on outside runs. Executed correctly, it creates a running lane on the perimeter. Executed incorrectly (too high, wrong angle), it leads to a missed block or a penalty.',
    coaching_cue: 'Attack the inside number of the defender, stay LOW — drive through with your shoulder, not your head',
    common_mistake: 'Going too high — leads to a facemask or missed block. Aim for the inside shoulder, not the helmet.',
    fixes: ['blocking', 'crack block', 'outside run', 'run support', 'perimeter blocking'],
    progressions: ['Walk-through angle to target', 'Half-speed vs. stationary target', 'Full-speed vs. moving defender', 'In team run period'],
    videos: [
      { title: 'Build Better Blocking WRs (Coaching Guide)', url: 'https://www.youtube.com/watch?v=f0D8eni2vo8', duration: '~12 min' },
    ],
  },

  // ── FOOTWORK & COORDINATION ───────────────────────────────────────────────

  {
    name: 'Barefoot Footwork & Direction Change',
    category: 'agility',
    technique_area: 'footwork',
    sets: 3, reps: null, duration: '10 minutes',
    why: 'The coaching guide: "Practice barefoot a lot — you learn to change direction on your toes, which your knees will thank for years." Barefoot training forces correct toe-based cutting mechanics. With cleats this becomes automatic. Without cleats you learn to lower your center of gravity to change direction safely.',
    coaching_cue: 'Change direction on your TOES — not your heels. Lower the center of gravity into every cut. Your knees will thank you.',
    common_mistake: 'Heel striking on cuts — this is slow and puts enormous stress on the knee joint over time',
    fixes: ['footwork', 'cutting', 'direction change', 'agility', 'injury prevention', 'knee', 'cuts', 'slow cuts'],
    progressions: ['Barefoot lateral shuffles', 'Barefoot 45-degree cuts', 'Barefoot route-tree walk-through', 'Add cleats and replicate the mechanics'],
    videos: [
      { title: '5 Wide Receiver Footwork and Agility Drills', url: 'https://www.youtube.com/watch?v=sfAiizYaa5g', duration: '~6 min' },
      { title: 'Top 5 Agility Drills All WRs Should Be Doing', url: 'https://www.youtube.com/watch?v=pUBx1CRQmFw', duration: '~8 min' },
    ],
  },
  {
    name: 'Agility Ladder — WR Route Footwork Patterns',
    category: 'agility',
    technique_area: 'footwork',
    sets: 4, reps: null, duration: '8 minutes',
    why: 'The agility ladder trains the foot speed and coordination needed for route stems, stutters, and change of direction. In the slot especially, quick direction change is life — being agile beats being fast in tight space.',
    coaching_cue: 'Eyes UP — not on the ladder. Train the feet to move automatically so your eyes can stay on coverage.',
    common_mistake: 'Looking down at feet during ladder drills — breaks awareness and posture, which is the opposite of game conditions',
    fixes: ['footwork', 'agility', 'foot speed', 'coordination', 'quickness', 'slot', 'quick game', 'direction change'],
    progressions: ['Single-foot in each box', 'Two-feet lateral', 'In-out crossover', 'Full-speed WR-specific patterns'],
    videos: [
      { title: 'Speed and Agility Wide Receiver Drills', url: 'https://www.youtube.com/watch?v=YeP5s2foftk', duration: '~8 min' },
      { title: '5 Wide Receiver Footwork and Agility Drills', url: 'https://www.youtube.com/watch?v=sfAiizYaa5g', duration: '~6 min' },
      { title: 'Receiver Drill — Agility & Footwork', url: 'https://www.youtube.com/watch?v=1EmLI19hG_U', duration: '~5 min' },
    ],
  },
  {
    name: 'Basketball Dribbling (Ball Coordination & Touch)',
    category: 'technique',
    technique_area: 'footwork',
    sets: 1, reps: null, duration: '10 minutes daily',
    why: 'The coaching guide: "Every basketball genius is great at catching the ball. Get a ball and dribble every day. 10 minutes of daily practice gives about a month\'s worth of ball touches. YouTube is your friend." Daily dribbling builds hand-eye coordination and ball control directly transferable to catching in traffic.',
    coaching_cue: 'Control is the key, not speed. 10 minutes every day — consistency over intensity. The days you least want to do it are the most important.',
    common_mistake: 'Skipping on rest days or after practice — this is a daily habit, not a session drill. Short and consistent beats long and sporadic.',
    fixes: ['ball feel', 'hand-eye coordination', 'catching', 'touch', 'concentration', 'drops', 'hands', 'coordination'],
    progressions: ['Two-handed stationary dribble', 'Alternating hands stationary', 'Walking while dribbling', 'Dribbling while doing footwork patterns'],
    videos: [],
  },

  // ── FILM STUDY ────────────────────────────────────────────────────────────

  {
    name: 'Opponent Film Study Protocol',
    category: 'technique',
    technique_area: 'film_study',
    sets: null, reps: null, duration: '30–60 min per opponent',
    why: 'The coaching guide: "Pros study every opponent — they know their weaknesses and attack them. The more you can say about a defender, the more certain you are to win more often." Pre-snap information about a CB\'s tendencies, preferred leverage, and reactions to certain routes is a cheat code.',
    coaching_cue: 'Ask these questions about every defender you face: Which direction do they NOT like to turn? What routes don\'t work against them? How do they tackle? What makes them nervous?',
    common_mistake: 'Watching film casually without asking specific questions — highlights entertain but don\'t prepare. Ask questions and take notes.',
    fixes: ['film study', 'opponent', 'preparation', 'scouting', 'pre-snap', 'coverage reads'],
    progressions: ['Watch and take notes on the 8 key questions', 'Test your reads in practice vs. scout team', 'Pre-snap application in game situations'],
    videos: [
      { title: 'How to Study Film as a WR (opponent read — starts at 32:20)', url: 'https://www.youtube.com/watch?v=o5fdhfVrg1I', duration: '~45 min', notes: 'Key content at 32:20 mark' },
    ],
  },
  {
    name: 'Self Film Study Protocol',
    category: 'technique',
    technique_area: 'film_study',
    sets: null, reps: null, duration: '20–30 min per game',
    why: 'The coaching guide: "Be honest — don\'t look at the highlights, look for mistakes." Honest self-evaluation identifies repeating errors in stance, release, stems, and route consistency that coaches and opponents will absolutely exploit.',
    coaching_cue: 'Ask: Is my stance always the same? Is my release always the same? Do I sell every play or telegraph when I\'m the target?',
    common_mistake: 'Only watching your good plays — this feels good but teaches nothing. The mistakes are where the growth is.',
    fixes: ['film study', 'self study', 'improvement', 'consistency', 'fundamentals', 'habits', 'telegraphing'],
    progressions: ['Watch game film and list every mistake', 'Compare to prior game — are the same mistakes repeating?', 'Bring a specific correction to the next practice'],
    videos: [],
  },
]

// ─── Helper: Get drills by technique area ────────────────────────────────────

export function getWRDrillsByArea(area: WRTechniqueArea): WRDrillEntry[] {
  return WR_DRILLS.filter(d => d.technique_area === area)
}

// ─── Helper: Find relevant drills by pain-point keywords ────────────────────

export function findWRDrillsForPainPoint(painPoint: string): WRDrillEntry[] {
  const lower = painPoint.toLowerCase()
  return WR_DRILLS.filter(d =>
    d.fixes.some(fix => lower.includes(fix) || fix.includes(lower.split(' ')[0]))
  ).slice(0, 4)
}

// ─── Helper: Convert WRDrillEntry to Exercise for training plan ──────────────

export function wrDrillToExercise(drill: WRDrillEntry): import('@/types').Exercise {
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

export const WR_AREA_LABELS: Record<WRTechniqueArea, string> = {
  athletics:    'Athletics & Conditioning',
  releases:     'Press Releases',
  route_running: 'Route Running',
  catching:     'Catching',
  blocking:     'Blocking',
  footwork:     'Footwork & Coordination',
  film_study:   'Film Study',
}

// ─── Teaching Progression ────────────────────────────────────────────────────
// Structured coaching steps from "WR Book — Basics and Advanced Concepts"
// Translated from Hungarian. Follows the book's chapter order.

export interface WRTeachingStep {
  order: number
  topic: string
  technique_area: WRTechniqueArea
  keyPoints: string[]
  /** Named sub-techniques or position-specific notes within the topic */
  techniques?: {
    name: string
    bestFor: string
    cues: string[]
  }[]
}

export const WR_TEACHING_PROGRESSION: WRTeachingStep[] = [
  {
    order: 1,
    topic: 'Athletics & Conditioning',
    technique_area: 'athletics',
    keyPoints: [
      'Running is the foundation of everything — go to a qualified sprint coach in the off-season',
      'Conditioning is the most important physical attribute: be able to run at the end of the game the same as at the beginning',
      'Practice every day and periodically analyze with video',
      'Good conditioning guarantees late-game TDs because fatigued defenders cannot maintain coverage discipline',
      'Treat conditioning as injury prevention, not punishment — a tired player plays hurt',
    ],
  },
  {
    order: 2,
    topic: 'Footwork, Cutting & Ball Feel',
    technique_area: 'footwork',
    keyPoints: [
      'Practice cutting BAREFOOT — you learn to change direction on your toes, which your knees will thank for years',
      'If you have no cleats, lower your center of gravity to cut; with cleats this becomes automatic',
      'Constant foot strengthening — work barefoot during basketball dribbling practice too',
      'Get a ball (basketball) and dribble 10 minutes every day — this directly builds ball feel for catching',
      '10 minutes of daily dribbling ≈ 1 month of ball touches per year — it adds up fast',
      'YouTube is a free coaching resource — find drills and practice them',
    ],
  },
  {
    order: 3,
    topic: 'Concentration & Catching Under Pressure',
    technique_area: 'catching',
    keyPoints: [
      'Always watch the ball all the way into your hands — eyes stay on the tip of the ball until it is secured',
      'Accept that you WILL get hit — once you accept this, fear disappears and you focus on the ball',
      'If there is no hit, there is a TD. Defenders who don\'t hit are playing for the ball — and they won\'t get it.',
      'Practice concentration catches with verbal and light physical disturbance — game conditions must be simulated in practice',
      'Be careful with fingers — playing with a cast dramatically limits effectiveness',
    ],
  },
  {
    order: 4,
    topic: 'Releases & Getting Off the Line',
    technique_area: 'releases',
    keyPoints: [
      'Press coverage requires a specific release technique — you cannot wing it against a physical corner',
      'Know the difference between a CB in press vs. a LB — their leverage and technique require different releases',
      'Swim: for inside press — slap the jam arm down, swim through fast before the CB resets',
      'Rip: for outside press — dip the shoulder first, then rip through the armpit',
      'Push-pull: the counter to swim/rip — two hands on chest, push-pull to off-balance, then release',
    ],
    techniques: [
      {
        name: 'Swim',
        bestFor: 'CB aligned inside (inside shade or head-up press)',
        cues: [
          'Slap the jam arm DOWN hard',
          'Swim through IMMEDIATELY — no pause between slap and swim',
          'Accelerate into your stem the moment you clear the arm',
        ],
      },
      {
        name: 'Rip',
        bestFor: 'CB aligned outside (outside shade or press outside)',
        cues: [
          'Dip the inside shoulder FIRST — this is the key move',
          'Rip through the armpit of the CB\'s jam arm',
          'Stay low and accelerate into the stem immediately',
        ],
      },
      {
        name: 'Push-Pull (Chop)',
        bestFor: 'Counter when CB expects swim or rip',
        cues: [
          'Two hands on CB\'s chest pads',
          'PUSH (weight shifts back) → PULL (off-balance) → GO',
          'Each beat is one count — rhythm is everything',
        ],
      },
    ],
  },
  {
    order: 5,
    topic: 'Route Running',
    technique_area: 'route_running',
    keyPoints: [
      'There are not just 9 routes — your job is to learn all of them',
      'Know the difference between running a route vs. a CB and vs. a LB — who can run with you? Who will try to grab you?',
      'The stem sets up the break — attack the CB\'s leverage on the approach, force them to commit before you cut',
      'Sell every play — run every route the same way whether you are the target or not',
      'In the slot: quick direction change is your life — being agile beats being fast here',
    ],
    techniques: [
      {
        name: 'Split End (Outside WR)',
        bestFor: 'Alignment outside the numbers',
        cues: [
          'Know routes on both sides of the field — don\'t be a one-side WR',
          'Use motion to identify coverage and find open grass before the snap',
          'Near the sideline: use the boundary as a weapon on out and comeback routes',
          'Watch the defense\'s reaction pre-snap — it tells you what they are going to do',
        ],
      },
      {
        name: 'Slot WR',
        bestFor: 'Alignment in the slot (inside of the numbers)',
        cues: [
          'Quick direction change is everything in the slot — agility over raw speed',
          'Know who is near you at all times — LB inside, nickel outside, safety over top',
          'Leverage wins: inside releases against inside shade, outside releases against outside shade',
        ],
      },
      {
        name: 'Tight End (TE)',
        bestFor: 'Inline or flexed TE alignment',
        cues: [
          'Must know all WR routes — the TE is the defense\'s biggest mismatch problem when used correctly',
          'LB is slow, DB is too small — attack the mismatch every time',
          'Be comfortable in the middle of the field — that is where TEs make their money',
          'Red zone: if a DB covers you, throw high; if a LB covers you, run slant or breaking route',
        ],
      },
    ],
  },
  {
    order: 6,
    topic: 'Blocking',
    technique_area: 'blocking',
    keyPoints: [
      'WR blocking is what separates receivers who are tools from receivers who are weapons',
      'Stalk block: feet chopping, stay in front, mirror the defender — do not lunge or reach',
      'A great stalk block turns a 6-yard run into a 20-yard run — take that seriously',
      'Block every play — defenders learn who does not block, and they disrespect it',
      'Crack block: attack the inside number, stay low, drive through with the shoulder',
    ],
  },
  {
    order: 7,
    topic: 'Film Study — Opponent, Self & Role Models',
    technique_area: 'film_study',
    keyPoints: [
      'OPPONENT: Know their favorite coverages, their dangerous players, their tendencies, what beats them consistently',
      'Ask: Which direction does the CB not like to turn? What routes don\'t work against them? What makes them nervous?',
      'SELF: Be honest — do not watch the highlights; look for mistakes. Is your stance always the same? Your release?',
      'Do you telegraph when you are the target? Do you sell every play equally? What mistakes repeated from last game?',
      'ROLE MODEL: Choose a player with a SIMILAR body type to yours — different body types have different talents and tricks',
      'Master that player\'s movements and techniques first, then expand. You progress faster by perfecting what applies to you.',
    ],
  },
]

/**
 * Get the teaching step for a given WR technique area.
 * Useful for surfacing structured coaching notes alongside drill cards.
 */
export function getWRTeachingStep(area: WRTechniqueArea): WRTeachingStep | undefined {
  return WR_TEACHING_PROGRESSION.find(s => s.technique_area === area)
}
