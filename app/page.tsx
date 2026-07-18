import Link from 'next/link'

// Unified accounts (2026-07-18): replaced the old "Start Coaching" anonymous
// flow (POST /api/coach — created a coach with no email/password at all,
// "your Coach ID is your password") and the "resume session by typing a
// coach ID" input. Both signup and login now go through /signup and /login
// for both roles.
export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-field-dark">
      {/* Hero */}
      <div className="text-center mb-12 max-w-xl">
        <div className="text-6xl mb-4">🏟️</div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-3 leading-tight">
          Practice Field
        </h1>
        <p className="text-lg text-gray-400">
          Track performance. Get virtual training coaching. Build better players.
        </p>
        <p className="text-sm text-gray-600 mt-2">
          Built for American football coaches & players.
        </p>
      </div>

      {/* Actions */}
      <div className="w-full max-w-sm space-y-3">
        <Link
          href="/signup"
          className="block w-full text-center bg-brand-600 hover:bg-brand-500 text-white font-bold py-4 px-6 rounded-xl text-lg transition-colors"
        >
          ⚡ Sign Up
        </Link>
        <Link
          href="/login"
          className="block w-full text-center bg-field-card border border-field-border hover:border-brand-600 text-white font-semibold py-4 px-6 rounded-xl text-lg transition-colors"
        >
          Log In
        </Link>
        <p className="text-center text-xs text-gray-600 pt-1">
          For coaches and players — pick your role when you sign up.
        </p>
      </div>

      {/* Feature List */}
      <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full">
        {[
          { icon: '📋', title: 'Session Reviews', desc: 'Log strengths, weaknesses, and root causes after every practice.' },
          { icon: '🤖', title: 'Virtual Training Coach', desc: 'Get expert exercise recommendations with sets, reps, and WHY it helps.' },
          { icon: '📈', title: 'Progress Tracking', desc: 'Visual charts show trends, plateau detection, and when to pivot.' },
        ].map(f => (
          <div key={f.title} className="bg-field-card border border-field-border rounded-xl p-4">
            <div className="text-2xl mb-2">{f.icon}</div>
            <h3 className="font-semibold text-white text-sm mb-1">{f.title}</h3>
            <p className="text-xs text-gray-500">{f.desc}</p>
          </div>
        ))}
      </div>
    </main>
  )
}
