import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type BadgeStatus = 'success' | 'warning' | 'error' | 'info' | 'neutral'



interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status?: BadgeStatus
}

const statusStyles: Record<BadgeStatus, string> = {
  success: 'bg-success-bg text-success',
  warning: 'bg-warning-bg text-warning',
  error: 'bg-error-bg text-error',
  info: 'bg-accent-muted text-accent',
  neutral: 'bg-surface-hover text-text-muted',
}

export function Badge({ status = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium',
        statusStyles[status],
        className
      )}
      {...props}
    />
  )
}