import { redirect } from 'next/navigation'
import Navigation from '@/components/Navigation'
import { getServerUser } from '@/lib/supabase-server'
import { getAdminClient } from '@/lib/supabase'

// Real auth gate for every coach-workspace page (unified accounts, 2026-07-18).
//
// Runs server-side, before any child page's own data fetch — this is the
// actual security boundary, not a cosmetic one. Previously this route tree
// had NO auth at all: app/[coachId]/page.tsx's getOrCreateCoach() silently
// created a coaches row for any string in the URL (confirmed live: ~30
// garbage rows from bot crawlers hitting /favicon.ico, /contact-us, etc.),
// and every nested page fetched with the admin client using whatever
// coachId was in the URL, no ownership check at all.
//
// Three outcomes:
//   - No session at all                          -> /login
//   - Session belongs to a player, not a coach    -> /player/dashboard
//   - Session belongs to a DIFFERENT coach than
//     the one in this URL                         -> redirect to their own coachId
//   - Session belongs to exactly this coach       -> render normally
//
// That third case is the ownership-strengthening part: a coach cannot even
// reach another coach's pages by editing the URL, regardless of what any
// individual page or API route does — this is enforced once, here, for the
// whole route tree.
export default async function CoachLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ coachId: string }>
}) {
  const { coachId } = await params

  const user = await getServerUser()
  if (!user) redirect('/login')

  const db = getAdminClient()

  const { data: coach } = await db
    .from('coaches')
    .select('coach_id')
    .eq('auth_user_id', user.id)
    .single()

  if (!coach) {
    const { data: playerAccount } = await db
      .from('player_accounts')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()
    redirect(playerAccount ? '/player/dashboard' : '/login')
  }

  if (coach.coach_id !== coachId) {
    redirect(`/${coach.coach_id}`)
  }

  return (
    <div className="min-h-screen bg-field-dark">
      <Navigation coachId={coachId} />
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
