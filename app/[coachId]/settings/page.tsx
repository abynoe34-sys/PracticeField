'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'

export default function SettingsPage() {
  const { coachId } = useParams<{ coachId: string }>()
  const [copied, setCopied] = useState(false)

  const coachUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/${coachId}`
    : `https://your-app.com/${coachId}`

  const copyUrl = async () => {
    await navigator.clipboard.writeText(coachUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage your coach workspace</p>
      </div>

      {/* Coach ID */}
      <section className="bg-field-card border border-field-border rounded-xl p-5 space-y-4">
        <h2 className="text-base font-semibold text-white">Your Coach ID</h2>
        <p className="text-xs text-gray-500">
          This is your unique workspace. Bookmark it — it&apos;s the only way to access your data.
          Share it with players so they can view their own sessions and plans.
        </p>

        <div className="bg-field-dark border border-field-border rounded-lg px-4 py-3 font-mono text-lg text-brand-400 tracking-widest text-center">
          {coachId}
        </div>

        <div className="flex gap-2">
          <input
            readOnly
            value={coachUrl}
            className="flex-1 bg-field-dark border border-field-border rounded-lg px-3 py-2 text-xs text-gray-400 truncate"
          />
          <button
            onClick={copyUrl}
            className="bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy URL'}
          </button>
        </div>
      </section>

      {/* About */}
      <section className="bg-field-card border border-field-border rounded-xl p-5 space-y-3">
        <h2 className="text-base font-semibold text-white">About Practice Field v1</h2>
        <ul className="space-y-1.5 text-xs text-gray-500">
          <li>• No account required — your Coach ID is your identity</li>
          <li>• Data is stored in Supabase (PostgreSQL)</li>
          <li>• Training plans use GPT-4o mini (falls back to expert templates offline)</li>
          <li>• Progress charts require 2+ data points per metric</li>
          <li>• Plateau detection triggers after 3 sessions with identical improvement areas</li>
        </ul>
      </section>

      {/* Danger Zone */}
      <section className="bg-red-950 border border-red-900 rounded-xl p-5 space-y-3">
        <h2 className="text-base font-semibold text-red-400">Data & Privacy</h2>
        <p className="text-xs text-red-500">
          All data is tied to your Coach ID. Do not share your Coach ID with anyone you don&apos;t trust with full access to your coaching data.
          There is no account recovery in v1 — if you lose your Coach ID, your data cannot be retrieved without direct database access.
        </p>
      </section>
    </div>
  )
}
