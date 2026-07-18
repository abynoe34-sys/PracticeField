import { redirect } from 'next/navigation'

// Superseded by the unified /login entry point (2026-07-18) — kept as a
// redirect so any existing links/bookmarks to this URL still work.
export default function PlayerLoginRedirect() {
  redirect('/login')
}
