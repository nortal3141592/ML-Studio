import type { FieldConfig } from '../../lib/hyperparameterFields'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'

interface Props {
  field: FieldConfig
  value: unknown
  onChange: (value: unknown) => void
}

export function HyperparameterField({ field, value, onChange }: Props) {
  if (field.type === 'boolean') {
    return (
      <label className="flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="accent-accent"
        />
        {field.label}
      </label>
    )
  }

  if (field.type === 'select') {
    return (
      <Select
        label={field.label}
        value={value === null ? '' : String(value)}
        onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
        options={field.options ?? []}
      />
    )
  }

  if (field.type === 'nullable_number') {
    return (
      <Input
        label={field.label}
        type="number"
        value={value === null || value === undefined ? '' : Number(value)}
        placeholder="None"
        step={field.step}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      />
    )
  }

  return (
    <Input
      label={field.label}
      type="number"
      value={Number(value)}
      step={field.step}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  )
}