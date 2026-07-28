import { type InputHTMLAttributes, forwardRef, useId } from 'react'
import { cn } from '../../lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, id, ...props }, ref) => {
    const generatedId = useId()
    const inputId = id ?? generatedId

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm text-text-muted">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'h-9 rounded-md border bg-surface px-3 text-sm text-text',
            'placeholder:text-text-muted',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            error ? 'border-error' : 'border-border',
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error || helperText ? `${inputId}-desc` : undefined}
          {...props}
        />
        {(error || helperText) && (
          <p
            id={`${inputId}-desc`}
            className={cn('text-xs', error ? 'text-error' : 'text-text-muted')}
          >
            {error ?? helperText}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'