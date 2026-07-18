'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import PlayerSignupForm from '@/components/PlayerSignupForm'
import CoachSignupForm from '@/components/CoachSignupForm'

type Role = 'coach' | 'player' | null

// Unified sign-up entry point (2026-07-18). One page, pick a role, then the
// role-appropriate form renders below — same underlying signup logic as
// before (POST /api/player-accounts, POST /api/coaches/signup), just no
// longer two disconnected pages a new user has to already know to find.
export default function SignupPage() {
  const [role, setRole] = useState<Role>(null)

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-brand-gradient">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Image
            src="/practice-field-mark.png"
            alt="Practice Field"
            width={72}
            height={72}
            className="mx-auto rounded-md"
            priority
          />
          <Link href="/" className="text-sm text-white/70 hover:text-white mt-4 inline-block">
            ← Back to Practice Field
          </Link>
          <h1 className="text-3xl font-bold text-white mt-2">Create your account</h1>
          <p className="text-sm text-white/60 mt-1">
            {role === null && 'Are you signing up as a coach or a player?'}
            {role === 'coach' && 'Coach account — manage your players and their progress.'}
            {role === 'player' && 'Player account — track your own progress and get AI coaching feedback.'}
          </p>
        </div>

        {role === null && (
          <div className="flex gap-3">
            <button
              onClick={() => setRole('coach')}
              className="flex-1 bg-field-card border border-field-border hover:border-brand-600 text-white font-semibold py-6 rounded-md text-center transition-colors"
            >
              <div className="text-3xl mb-2">🏈</div>
              I&apos;m a Coach
            </button>
            <button
              onClick={() => setRole('player')}
              className="flex-1 bg-field-card border border-field-border hover:border-brand-600 text-white font-semibold py-6 rounded-md text-center transition-colors"
            >
              <div className="text-3xl mb-2">🙋</div>
              I&apos;m a Player
            </button>
          </div>
        )}

        {role !== null && (
          <>
            <button
              onClick={() => setRole(null)}
              className="text-xs text-white/60 hover:text-white"
            >
              ← Choose a different role
            </button>
            {role === 'coach' ? <CoachSignupForm /> : <PlayerSignupForm />}
          </>
        )}

        <p className="text-center text-xs text-white/50">
          Already have an account?{' '}
          <Link href="/login" className="text-white hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  )
}
