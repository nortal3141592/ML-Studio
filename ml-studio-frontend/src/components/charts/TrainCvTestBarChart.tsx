import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface Props {
  title: string
  train: number
  cv: number
  test: number
  higherIsBetter: boolean

  labels?: readonly [string, string, string]
}

export function TrainCvTestBarChart({ title, train, cv, test, higherIsBetter, labels = ["Train", 'CV', "Test"] }: Props) {
  const data = [
    { split: labels[0], value: train },
    { split: labels[1], value: cv },
    { split: labels[2], value: test },
  ]
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium capitalize text-text">{title}</p>
        <p className="text-xs text-text-muted">{higherIsBetter ? 'Higher is better' : 'Lower is better'}</p>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data}>
          <CartesianGrid stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="split" stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} width={40} />
          <Tooltip
            contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: 'var(--color-text)' }}
            formatter={(value: any) => (value == null ? '' : Number(value).toFixed(4))}
          />
          <Bar dataKey="value" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}