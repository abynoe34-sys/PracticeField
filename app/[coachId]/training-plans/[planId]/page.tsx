import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAdminClient } from '@/lib/supabase'
import { getImprovementTimeline } from '@/lib/training-templates'
import TrainingPlanCard from '@/components/TrainingPlanCard'
import LogMetricForm from './LogMetricForm'
import type { TrainingPlan, ExperienceLevel } from '@/types'

interface TrainingPlanPageProps {
  params: Promise<{ coachId: string; planId: string }>
}

export default async function TrainingPlanPage({ params }: TrainingPlanPageProps) {
  const { coachId, planId } = await params
  const db = getAdminClient()

  // Scope by coachId (the layout-verified owner) so a coach can't view another
  // coach's training plan by id (IDOR). A non-owned id yields null → notFound().
  const { data: plan } = await db
    .from('training_plans')
    .select('*')
    .eq('id', planId)
    .eq('coach_id', coachId)
    .single()

  if (!plan) notFound()

  const { data: player } = await db
    .from('players')
    .select('name, position')
    .eq('id', plan.player_id)
    .single()

  const timeline = getImprovementTimeline(
    plan.experience_level as ExperienceLevel,
    plan.pain_points
  )

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div>
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <Link href={`/${coachId}/players`} className="hover:text-gray-300">Players</Link>
          <span>›</span>
          <Link href={`/${coachId}/players/${plan.player_id}`} className="hover:text-gray-300">
            {player?.name ?? 'Player'}
          </Link>
          <span>›</span>
          <span className="text-gray-400">Virtual Training Plan</span>
        </div>
        <h1 className="text-2xl font-bold text-white mt-1">Virtual Training Plan</h1>
        {player && (
          <p className="text-gray-500 text-sm">
            {player.name}{player.position ? ` · ${player.position}` : ''}
          </p>
        )}
      </div>

      <div className="bg-field-card border border-field-border rounded-xl p-5">
        <TrainingPlanCard plan={plan as unknown as TrainingPlan} timeline={timeline} />
      </div>

      {/* Log Progress */}
      <div className="bg-field-card border border-field-border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-3">Log a Metric</h2>
        <LogMetricForm playerId={plan.player_id} coachId={coachId} />
      </div>

      <Link
        href={`/${coachId}/players/${plan.player_id}`}
        className="block w-full bg-field-card border border-field-border hover:border-gray-500 text-white font-medium py-3 rounded-xl text-sm text-center transition-colors"
      >
        ← Back to Player
      </Link>
    </div>
  )
}
