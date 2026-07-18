'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { getSupabaseClient } from '@/lib/supabase'

interface NavigationProps {
  coachId: string
}

export default function Navigation({ coachId }: NavigationProps) {
  const pathname = usePathname()
  const router = useRouter()
  const base = `/${coachId}`

  // Added 2026-07-18 (unified accounts) — coaches previously had no sign-out
  // at all, since they had no real session to sign out of. router.refresh()
  // after signOut() (not just push) so the app/[coachId]/layout.tsx server
  // check re-runs against the now-cleared session on next navigation.
  const logout = async () => {
    await getSupabaseClient().auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const links = [
    { href: base,               label: 'Dashboard', icon: '⚡' },
    { href: `${base}/players`,  label: 'Players',   icon: '🏈' },
    { href: `${base}/settings`, label: 'Settings',  icon: '⚙️' },
  ]

  return (
    <nav className="sticky top-0 z-50 bg-field-dark border-b border-field-border">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">

          {/* Brand / Logo — frameless mark (2026-07-18 brand rollout). NOT
              public/logo.png, which has a white rounded card baked into the
              asset — that shouldn't bleed into the dark nav surface. */}
          <Link href={base} className="flex items-center gap-2.5 shrink-0">
            <Image
              src="/practice-field-mark.png"
              alt="Practice Field"
              width={32}
              height={32}
              className="rounded-md object-contain"
              priority
            />
            <span className="hidden sm:inline font-bold text-white text-base tracking-tight">
              Practice Field
            </span>
          </Link>

          {/* Nav links — active state is a thin angled red underline
              (BRAND_SPEC §3's "flag/chevron motif", used sparingly) rather
              than a solid fill, so red stays a single sparing accent. */}
          <div className="flex items-center gap-1">
            {links.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  pathname === link.href
                    ? 'text-white'
                    : 'text-field-muted hover:text-white hover:bg-field-card'
                )}
              >
                <span className="text-base">{link.icon}</span>
                <span className="hidden sm:inline">{link.label}</span>
                {pathname === link.href && (
                  <span className="absolute left-2 right-2 -bottom-0.5 h-0.5 bg-brand-500 -skew-x-12" />
                )}
              </Link>
            ))}
          </div>

          {/* Coach ID chip + sign out */}
          <div className="flex items-center gap-2">
            <span className="hidden md:flex items-center gap-1.5 bg-field-card border border-field-border rounded-md px-2.5 py-1 text-xs text-field-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 inline-block"></span>
              {coachId}
            </span>
            <button
              onClick={logout}
              className="text-xs text-field-muted hover:text-white px-2 py-1.5 rounded-md hover:bg-field-card transition-colors"
            >
              Log out
            </button>
          </div>

        </div>
      </div>
    </nav>
  )
}
