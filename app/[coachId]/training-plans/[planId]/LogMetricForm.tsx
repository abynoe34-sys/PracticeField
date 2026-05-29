'use client'

import { useState } from 'react'
import { todayISO } from '@/lib/utils'

const COMMON_METRICS = [
  '40-Yard Dash (sec)',
  'Vertical Jump (in)',
  '3-Cone Drill (sec)',
  'Broad Jump (in)',
  'Route Precision Score (1-10)',
  'Bench Press (reps)',
]

interface LogMetricFormProps {
  playerId: string
  coachId: string
}

export default function LogMetricForm({ playerId, coachId }: LogMetricFormProps) {
  const [metric, setMetric] = useState('')
  const [customMetric, setCustomMetric] = useState('')
  const [value, setValue] = useState('')
  const [date, setDate] = useState(todayISO())
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const metricName = metric === '__custom__' ? customMetric.trim() : metric

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!metricName || !value) return
    setSaving(true)
    setError(null)
    setSuccess(false)

    const res = await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player_id: playerId,
        coach_id: coachId,
        metric_name: metricName,
        value: parseFloat(value),
        measured_at: date,
      }),
    })

    if (res.ok) {
      setSuccess(true)
      setValue('')
      setTimeout(() => setSuccess(false), 3000)
    } else {
      const j = await res.json()
      setError(j.error ?? 'Failed to save')
    }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSave} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Metric</label>
          <select
            value={metric}
            onChange={e => setMetric(e.target.value)}
            required
            className="w-full bg-field-dark border border-field-border rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-brand-600"
          >
            <option value="">Select…</option>
            {COMMON_METRICS.map(m => <option key={m} value={m}>{m}</option>)}
            <option value="__custom__">Custom…</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Value</label>
          <input
            type="number"
            step="0.01"
            value={value}
            onChange={e => setValue(e.target.value)}
            required
            placeholder="4.52"
            className="w-full bg-field-dark border border-field-border rounded-lg px-2.5 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-600"
          />
        </div>
      </div>

      {metric === '__custom__' && (
        <input
          type="text"
          value={customMetric}
          onChange={e => setCustomMetric(e.target.value)}
          placeholder="Custom metric name"
          required
          className="w-full bg-field-dark border border-field-border rounded-lg px-2.5 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-600"
        />
      )}

      <div>
        <label className="block text-xs text-gray-500 mb-1">Date</label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          required
          className="bg-field-dark border border-field-border rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-brand-600"
        />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
      {success && <p className="text-xs text-brand-400">✓ Metric saved!</p>}

      <button
        type="submit"
        disabled={saving || !metricName || !value}
        className="w-full bg-field-dark border border-field-border hover:border-brand-600 disabled:opacity-40 text-white text-xs font-medium py-2.5 rounded-lg transition-colors"
      >
        {saving ? 'Saving…' : 'Log Metric'}
      </button>
    </form>
  )
}
