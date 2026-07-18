import { getAdminClient } from '@/lib/supabase'

export type ResolvedRole =
  | { role: 'coach'; coachId: string }
  | { role: 'player'; playerAccountId: string }
  | null

// Role is derived, not stored — a user is a coach if a coaches row has their
// auth_user_id, a player if a player_accounts row does. No separate `role`
// column: a mutually-exclusive-FK pattern, consistent with how ownership is
// modeled everywhere else in this schema (see chk_sv_has_owner). Used by
// GET /api/whoami and by requireCoachSession() (API route ownership checks).
export async function resolveRole(authUserId: string): Promise<ResolvedRole> {
  const db = getAdminClient()

  const { data: coach } = await db
    .from('coaches')
    .select('coach_id')
    .eq('auth_user_id', authUserId)
    .single()
  if (coach) return { role: 'coach', coachId: coach.coach_id }

  const { data: playerAccount } = await db
    .from('player_accounts')
    .select('id')
    .eq('auth_user_id', authUserId)
    .single()
  if (playerAccount) return { role: 'player', playerAccountId: playerAccount.id }

  return null
}
