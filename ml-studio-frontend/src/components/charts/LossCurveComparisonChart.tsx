import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { RunLossCurve } from '../../lib/api/types/evaluation'

const LINE_COLORS = ['var(--color-accent)', 'var(--color-success)', 'var(--color-warning)', 'var(--color-error)', 'var(--color-text-muted)']

interface Props {
  curves: RunLossCurve[]
}

export function LossCurveComparisonChart({ curves }: Props) {
  const maxLength = Math.max(...curves.map((c) => c.epochs.length))
  const data = Array.from({ length: maxLength }, (_, i) => {
    const point: Record<string, number> = { epoch: curves[0]?.epochs[i] ?? i }
    curves.forEach((c) => {
      point[`run_${c.run_id}`] = c.train_loss[i]
    })
    return point
  })

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid stroke="var(--color-border)" />
        <XAxis dataKey="epoch" stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: 'var(--color-text)' }}
        />
        {curves.map((c, i) => (
          <Line
            key={c.run_id}
            type="monotone"
            dataKey={`run_${c.run_id}`}
            stroke={LINE_COLORS[i % LINE_COLORS.length]}
            strokeWidth={2}
            dot={false}
            name={`Run #${c.run_id}`}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}