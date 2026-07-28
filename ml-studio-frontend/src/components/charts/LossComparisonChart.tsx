import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface Props {
  data: { label: string; train_loss: number; cv_loss: number; test_loss: number }[]
}

export function LossComparisonChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data}>
        <CartesianGrid stroke="var(--color-border)" />
        <XAxis dataKey="label" stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: 'var(--color-text)' }}
          formatter={(value: unknown) => {
            if (typeof value === 'number') {
              return value.toFixed(4)
            }

            if (typeof value === 'string') {
              const numericValue = Number(value)
              return Number.isNaN(numericValue) ? value : numericValue.toFixed(4)
            }

            return ''
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="train_loss" name="Train" stroke="var(--color-accent)" strokeWidth={2} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="cv_loss" name="CV" stroke="var(--color-text-muted)" strokeWidth={2} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="test_loss" name="Test" stroke="var(--color-warning)" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}