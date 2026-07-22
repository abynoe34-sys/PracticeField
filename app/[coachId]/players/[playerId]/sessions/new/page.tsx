import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAdminClient } from '@/lib/supabase'
import SessionReview from '@/components/SessionReview'

interface NewSessionProps {
  params: Promise<{ coachId: string; playerId: string }>
}

export default async function NewSessionPage({ params }: NewSessionProps) {
  const { coachId, playerId } = await params
  const db = getAdminClient()

  // Scope by coachId (the layout-verified owner) so a coach can't open the
  // note-creation form against another coach's player by id (IDOR). A non-owned
  // id yields null → notFound().
  const { data: player } = await db
    .from('players')
    .select('*')
    .eq('id', playerId)
    .eq('coach_id', coachId)
    .single()

  if (!player) notFound()

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <Link
          href={`/${coachId}/players/${playerId}`}
          className="text-gray-500 hover:text-gray-300 text-sm"
        >
          ← {player.name}
        </Link>
        <h1 className="text-2xl font-bold text-white mt-1">Coaches Notes</h1>
        <p className="text-gray-500 text-sm">Log what happened and what needs work.</p>
      </div>

      <div className="bg-field-card border border-field-border rounded-xl p-5">
        <SessionReview player={player} coachId={coachId} />
      </div>
    </div>
  )
}
