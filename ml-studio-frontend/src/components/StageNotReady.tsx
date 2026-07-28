import { Link } from 'react-router-dom'
import { Card } from './ui/Card'
import { Button } from './ui/Button'

interface StageNotReadyProps {
  message: string
  actionLabel: string
  actionTo: string
}

export function StageNotReady({ message, actionLabel, actionTo }: StageNotReadyProps) {
  return (
    <Card className="flex flex-col items-center gap-3 py-12 text-center">
      <p className="text-sm text-text">{message}</p>
      <Link to={actionTo}>
        <Button size="sm">{actionLabel}</Button>
      </Link>
    </Card>
  )
}