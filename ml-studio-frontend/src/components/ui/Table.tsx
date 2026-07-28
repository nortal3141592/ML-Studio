// src/components/ui/Table.tsx
import { useState } from 'react'
import { clsx } from 'clsx'
import { cn } from '../../lib/utils'


export interface Column<T> {
  key: string
  label: string
  render: (row: T) => React.ReactNode
  sortValue?: (row: T) => string | number // omit to make column unsortable
  className?: string
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  rowKey: (row: T) => string
  emptyMessage?: string
  onRowClick?: (row: T) => void
}

type SortState = { key: string; direction: 'asc' | 'desc' } | null

export function Table<T>({ columns, data, rowKey, emptyMessage = 'No data yet', onRowClick }: TableProps<T>) {
  const [sort, setSort] = useState<SortState>(null)

  function handleSort(col: Column<T>) {
    if (!col.sortValue) return
    setSort((prev) => {
      if (prev?.key !== col.key) return { key: col.key, direction: 'asc' }
      return { key: col.key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
    })
  }

  const sortedData = (() => {
    if (!sort) return data
    const col = columns.find((c) => c.key === sort.key)
    if (!col?.sortValue) return data
    const copy = [...data]
    copy.sort((a, b) => {
      const av = col.sortValue!(a)
      const bv = col.sortValue!(b)
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sort.direction === 'asc' ? cmp : -cmp
    })
    return copy
  })()

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-text-muted">
        {emptyMessage}
      </div>
    )
  }

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-border">
          {columns.map((col) => (
            <th
              key={col.key}
              onClick={() => handleSort(col)}
              className={clsx(
                'px-3 py-2 text-left font-medium text-text-muted',
                col.sortValue && 'cursor-pointer select-none hover:text-text',
                col.className
              )}
            >
              {col.label}
              {sort?.key === col.key && (sort.direction === 'asc' ? ' ↑' : ' ↓')}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sortedData.map((row) => (
          <tr
  key={rowKey(row)}
  onClick={() => onRowClick?.(row)}
  className={cn(
    'border-b border-border last:border-0 hover:bg-surface-hover',
    onRowClick && 'cursor-pointer'
  )}
>
            {columns.map((col) => (
              <td key={col.key} className={clsx('px-3 py-2 text-text', col.className)}>
                {col.render(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}