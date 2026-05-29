'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { formatDate } from '@/lib/utils'
import type { ProgressMetric } from '@/types'

interface PerformanceChartProps {
  metrics: ProgressMetric[]
  metricName: string
  unit?: string
  lowerIsBetter?: boolean
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-field-card border border-field-border rounded-lg px-3 py-2 text-sm">
      <p className="text-gray-400">{label}</p>
      <p className="text-white font-semibold">{payload[0].value}</p>
    </div>
  )
}

export default function PerformanceChart({
  metrics,
  metricName,
  unit = '',
  lowerIsBetter = false,
}: PerformanceChartProps) {
  if (metrics.length < 2) {
    return (
      <div className="flex items-center justify-center h-32 bg-field-card border border-field-border rounded-xl text-sm text-gray-500">
        Need at least 2 data points to show a trend.
      </div>
    )
  }

  const data = metrics.map(m => ({
    date: formatDate(m.measured_at),
    value: m.value,
  }))

  const values = metrics.map(m => m.value)
  const baseline = values[0]
  const latest = values[values.length - 1]
  const delta = latest - baseline
  const improved = lowerIsBetter ? delta < 0 : delta > 0

  return (
    <div className="bg-field-card border border-field-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-white">{metricName}</p>
        <div className={`flex items-center gap-1.5 text-xs font-semibold ${improved ? 'text-brand-400' : 'text-red-400'}`}>
          <span>{improved ? '↑' : '↓'}</span>
          <span>
            {Math.abs(delta).toFixed(2)}{unit} {improved ? 'improvement' : 'regression'}
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2d4a31" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#6b7280', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fill: '#6b7280', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={baseline} stroke="#374151" strokeDasharray="4 4" />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#22c55e"
            strokeWidth={2}
            dot={{ fill: '#22c55e', r: 4, strokeWidth: 0 }}
            activeDot={{ r: 6, fill: '#86efac' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
