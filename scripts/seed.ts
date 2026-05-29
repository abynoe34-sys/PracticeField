/**
 * Seed script — populates the database with realistic sample data for testing.
 * Run: npm run seed
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Load .env.local manually (tsx doesn't auto-load it)
function loadEnv() {
  try {
    const content = readFileSync('.env.local', 'utf-8')
    for (const line of content.split('\n')) {
      const match = line.match(/^([^=]+)=(.*)$/)
      if (match) {
        const [, key, val] = match
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = val.trim()
        }
      }
    }
  } catch {
    console.warn('No .env.local found, using existing process.env')
  }
}

loadEnv()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const COACH_ID = 'DEMO123XY'

const PLAYERS = [
  { name: 'Marcus Johnson',  position: 'WR',  experience_level: 'intermediate' },
  { name: 'Darius Williams', position: 'QB',  experience_level: 'intermediate' },
  { name: 'T.J. Okafor',    position: 'RB',  experience_level: 'beginner'     },
  { name: 'Elijah Carter',  position: 'CB',  experience_level: 'elite'        },
]

const today = new Date()
function daysAgo(n: number): string {
  const d = new Date(today)
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

async function seed() {
  console.log('🌱 Seeding Practice Field database…\n')

  // ── Coach ──────────────────────────────────────────────────────────────────
  const { data: existingCoach } = await supabase
    .from('coaches')
    .select('coach_id')
    .eq('coach_id', COACH_ID)
    .single()

  if (!existingCoach) {
    const { error } = await supabase.from('coaches').insert({
      coach_id: COACH_ID,
      name: 'Coach Demo',
      email: 'demo@practicefield.app',
      sport: 'american_football',
    })
    if (error) { console.error('Coach insert failed:', error.message); process.exit(1) }
    console.log(`✓ Coach created: ${COACH_ID}`)
  } else {
    console.log(`  Coach already exists: ${COACH_ID}`)
  }

  // ── Players ────────────────────────────────────────────────────────────────
  const playerIds: Record<string, string> = {}

  for (const p of PLAYERS) {
    const { data: existing } = await supabase
      .from('players')
      .select('id')
      .eq('coach_id', COACH_ID)
      .eq('name', p.name)
      .single()

    if (existing) {
      playerIds[p.name] = existing.id
      console.log(`  Player already exists: ${p.name}`)
      continue
    }

    const { data, error } = await supabase
      .from('players')
      .insert({ ...p, coach_id: COACH_ID })
      .select()
      .single()

    if (error || !data) { console.error(`Player ${p.name} failed:`, error?.message); continue }
    playerIds[p.name] = data.id
    console.log(`✓ Player: ${p.name} (${p.position})`)
  }

  // ── Sessions ───────────────────────────────────────────────────────────────
  const sessions = [
    // Marcus Johnson — WR, 3 sessions showing progression
    {
      player: 'Marcus Johnson',
      session_date: daysAgo(21),
      strengths: ['Run blocking IQ', 'Hand strength on contested catches'],
      improvements: ['Slow off the line vs press', 'Route precision on crossers', 'Weak hand drops'],
      root_causes: {
        'Slow off the line vs press': 'No release technique practiced, doesn\'t vary release point',
        'Route precision on crossers': 'Rounds off break, no defined stem',
        'Weak hand drops': 'Doesn\'t extend fully through catch point',
      },
      notes: 'First session back from summer. Baseline established.',
    },
    {
      player: 'Marcus Johnson',
      session_date: daysAgo(14),
      strengths: ['Run blocking IQ', 'Hand strength on contested catches', 'Release vs press (improved)'],
      improvements: ['Route precision on crossers', 'Weak hand drops'],
      root_causes: {
        'Route precision on crossers': 'Better stem but still rounds off at 7 yards',
        'Weak hand drops': 'Better on high balls, still struggles away from body',
      },
      notes: 'Significant improvement on press release after bag work.',
    },
    {
      player: 'Marcus Johnson',
      session_date: daysAgo(7),
      strengths: ['Run blocking IQ', 'Hand strength', 'Press release', 'Crosser route precision'],
      improvements: ['Weak hand drops'],
      root_causes: { 'Weak hand drops': 'Catches with fingertips instead of soft hands' },
      notes: 'Ready to move to 1v1 rep work. One lingering issue.',
    },

    // Darius Williams — QB
    {
      player: 'Darius Williams',
      session_date: daysAgo(18),
      strengths: ['Arm strength', 'Pocket presence'],
      improvements: ['3-step drop footwork', 'Pre-snap read progression', 'Ball placement vs Cover 2'],
      root_causes: {
        '3-step drop footwork': 'Hitches on third step, doesn\'t set feet before throwing',
        'Pre-snap read progression': 'Locks onto primary too early, doesn\'t scan defense',
        'Ball placement vs Cover 2': 'Throws to body instead of back shoulder / back of end zone',
      },
      notes: '',
    },
    {
      player: 'Darius Williams',
      session_date: daysAgo(4),
      strengths: ['Arm strength', 'Pocket presence', '3-step drop footwork'],
      improvements: ['Pre-snap read progression', 'Ball placement vs Cover 2'],
      root_causes: {
        'Pre-snap read progression': 'Getting better but still doesn\'t check to third read',
        'Ball placement vs Cover 2': 'Inconsistent — good in 1v1, struggles in 7v7',
      },
      notes: 'Film session helped with Cover 2 recognition.',
    },

    // T.J. Okafor — RB (beginner, no improvement)
    {
      player: 'T.J. Okafor',
      session_date: daysAgo(25),
      strengths: ['Vision', 'Contact balance'],
      improvements: ['Ball security', 'Pass protection', 'Route running out of backfield'],
      root_causes: {
        'Ball security': 'Carries with one arm, doesn\'t cover ball with elbow',
        'Pass protection': 'Doesn\'t understand blitz pickup assignments',
        'Route running out of backfield': 'Runs flat routes, no depth on outs',
      },
      notes: '',
    },
    {
      player: 'T.J. Okafor',
      session_date: daysAgo(11),
      strengths: ['Vision', 'Contact balance'],
      improvements: ['Ball security', 'Pass protection', 'Route running out of backfield'],
      root_causes: {
        'Ball security': 'Still reverts to one-arm carry under pressure',
        'Pass protection': 'Improved awareness but misses stunts',
        'Route running out of backfield': 'Depth improved, footwork still sloppy',
      },
      notes: '',
    },

    // Elijah Carter — CB (elite)
    {
      player: 'Elijah Carter',
      session_date: daysAgo(10),
      strengths: ['Zone coverage IQ', 'Ball skills', 'Tackling technique'],
      improvements: ['Backpedal to break transition', 'Press vs stack WRs'],
      root_causes: {
        'Backpedal to break transition': 'Loses center of gravity on hip flip, too upright',
        'Press vs stack WRs': 'Doesn\'t jam and redirect, lets WR determine release side',
      },
      notes: 'Elite tools. These are the 1% details at this level.',
    },
  ]

  for (const s of sessions) {
    const pid = playerIds[s.player]
    if (!pid) continue

    const { data: existing } = await supabase
      .from('sessions')
      .select('id')
      .eq('player_id', pid)
      .eq('session_date', s.session_date)
      .single()

    if (existing) {
      console.log(`  Session already exists: ${s.player} on ${s.session_date}`)
      continue
    }

    const { error } = await supabase.from('sessions').insert({
      player_id: pid,
      coach_id: COACH_ID,
      session_date: s.session_date,
      strengths: s.strengths,
      improvements: s.improvements,
      root_causes: s.root_causes,
      notes: s.notes || null,
    })

    if (error) { console.error(`Session failed (${s.player}):`, error.message); continue }
    console.log(`✓ Session: ${s.player} — ${s.session_date}`)
  }

  // ── Progress Metrics ───────────────────────────────────────────────────────
  const metrics = [
    { player: 'Marcus Johnson', metric_name: '40-Yard Dash (sec)', entries: [
      { date: daysAgo(28), value: 4.61 },
      { date: daysAgo(21), value: 4.58 },
      { date: daysAgo(14), value: 4.55 },
      { date: daysAgo(7),  value: 4.52 },
    ]},
    { player: 'Marcus Johnson', metric_name: 'Vertical Jump (in)', entries: [
      { date: daysAgo(28), value: 34 },
      { date: daysAgo(14), value: 35 },
      { date: daysAgo(7),  value: 36.5 },
    ]},
    { player: 'Darius Williams', metric_name: '3-Cone Drill (sec)', entries: [
      { date: daysAgo(18), value: 7.1 },
      { date: daysAgo(4),  value: 6.95 },
    ]},
    { player: 'Elijah Carter', metric_name: '40-Yard Dash (sec)', entries: [
      { date: daysAgo(30), value: 4.45 },
      { date: daysAgo(10), value: 4.43 },
    ]},
  ]

  for (const m of metrics) {
    const pid = playerIds[m.player]
    if (!pid) continue

    for (const entry of m.entries) {
      const { error } = await supabase.from('progress_metrics').insert({
        player_id: pid,
        coach_id: COACH_ID,
        metric_name: m.metric_name,
        value: entry.value,
        measured_at: entry.date,
      }).select()

      if (error && error.code !== '23505') {
        console.error(`Metric failed (${m.player} / ${m.metric_name}):`, error.message)
      }
    }
    console.log(`✓ Metrics: ${m.player} — ${m.metric_name}`)
  }

  // ── Training Plan ──────────────────────────────────────────────────────────
  const pid = playerIds['Marcus Johnson']
  if (pid) {
    const { data: existingPlan } = await supabase
      .from('training_plans')
      .select('id')
      .eq('player_id', pid)
      .limit(1)
      .single()

    if (!existingPlan) {
      const expires = new Date(today)
      expires.setDate(expires.getDate() + 42)

      const { error } = await supabase.from('training_plans').insert({
        player_id: pid,
        coach_id: COACH_ID,
        pain_points: ['Weak hand drops', 'Route precision on crossers'],
        experience_level: 'intermediate',
        commitment_weeks: 6,
        generated_by: 'coach',
        expires_at: expires.toISOString(),
        exercises: [
          { name: 'Dynamic Hip Flexor Stretch', sets: 2, reps: 10, duration: null, why: 'Opens the hip flexors before explosive movements.', category: 'warmup' },
          { name: 'Leg Swings', sets: 2, reps: 15, duration: null, why: 'Activates the hip joint through its full range.', category: 'warmup' },
          { name: 'Ladder Drills (high-knees, lateral)', sets: 3, reps: null, duration: '3 minutes', why: 'Builds foot coordination and ground contact time.', category: 'agility' },
          { name: 'Cone Route Tree (1-7 routes)', sets: 3, reps: null, duration: '10 minutes', why: 'Drills muscle memory for precise break points.', category: 'footwork' },
          { name: 'Catch Point Drill (high/low/away/in)', sets: 3, reps: 10, duration: null, why: 'Trains hands to lead and secure the ball away from the body — directly targets weak-hand drops.', category: 'technique' },
          { name: 'Release vs. Press Coverage (bag)', sets: 3, reps: null, duration: '10 minutes', why: 'Builds confidence winning off the line vs press corners.', category: 'technique' },
          { name: 'Romanian Deadlift (RDL)', sets: 3, reps: 10, duration: null, why: 'Develops posterior chain for top-end sprint speed.', category: 'strength' },
          { name: '10-Yard Burst Starts', sets: 6, reps: 1, duration: null, why: 'Trains explosive first-step acceleration.', category: 'speed' },
          { name: 'Static Quad & Hip Flexor Stretch', sets: 1, reps: null, duration: '60 seconds each side', why: 'Reduces post-workout tightness.', category: 'cooldown' },
          { name: 'Foam Roll', sets: 1, reps: null, duration: '5 minutes', why: 'Speeds recovery between sessions.', category: 'cooldown' },
        ],
      })

      if (error) console.error('Training plan failed:', error.message)
      else console.log('✓ Training plan: Marcus Johnson')
    } else {
      console.log('  Training plan already exists for Marcus Johnson')
    }
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Seed complete!

Demo Coach ID: ${COACH_ID}
Visit: http://localhost:3000/${COACH_ID}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`)
}

seed().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})
