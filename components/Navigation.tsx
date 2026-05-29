'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface NavigationProps {
  coachId: string
}

export default function Navigation({ coachId }: NavigationProps) {
  const pathname = usePathname()
  const base = `/${coachId}`

  const links = [
    { href: base, label: 'Dashboard', icon: '⚡' },
    { href: `${base}/players`, label: 'Players', icon: '🏈' },
    { href: `${base}/settings`, label: 'Settings', icon: '⚙️' },
  ]

  return (
    <nav className="sticky top-0 z-50 bg-field-dark border-b border-field-border">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Brand */}
          <Link href={base} className="flex items-center gap-2 font-bold text-brand-400 text-lg tracking-tight">
            <span className="text-2xl">🏟️</span>
            <span className="hidden sm:inline">Practice Field</span>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            {links.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  pathname === link.href
                    ? 'bg-brand-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-field-card'
                )}
              >
                <span className="text-base">{link.icon}</span>
                <span className="hidden sm:inline">{link.label}</span>
              </Link>
            ))}
          </div>

          {/* Coach ID chip */}
          <div className="flex items-center gap-2">
            <span className="hidden md:flex items-center gap-1.5 bg-field-card border border-field-border rounded-lg px-2.5 py-1 text-xs text-gray-400">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 inline-block"></span>
              {coachId}
            </span>
          </div>
        </div>
      </div>
    </nav>
  )
}
