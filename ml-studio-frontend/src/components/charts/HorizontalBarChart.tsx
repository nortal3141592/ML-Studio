import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface Props {
  data: { label: string; value: number }[]
}

export function HorizontalBarChart({ data }: Props) {
  const height = Math.max(160, data.length * 28)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 16 }}>
        <CartesianGrid stroke="var(--color-border)" horizontal={false} />
        <XAxis type="number" stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="label" stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} width={200} />
        <ReferenceLine x={0} stroke="var(--color-border-strong)" />
        <Tooltip
          contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: 'var(--color-text)' }}
          formatter={(value) => typeof value === 'number' ? value.toFixed(4) : value}
        />
        <Bar dataKey="value" fill="var(--color-accent)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}