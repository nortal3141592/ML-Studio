import { useRef, useState, type ChangeEvent } from 'react'
import { clsx } from 'clsx'

interface FileInputProps {
  label?: string
  accept?: string
  error?: string
  onFileSelect: (file: File | null) => void
}

export function FileInput({ label, accept, error, onFileSelect }: FileInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  function handleFile(file: File | null) {
    setFileName(file?.name ?? null)
    onFileSelect(file)
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    handleFile(e.target.files?.[0] ?? null)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    handleFile(e.dataTransfer.files?.[0] ?? null)
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm text-text-muted">{label}</label>}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={clsx(
          'flex flex-col items-center justify-center gap-1 rounded-md border border-dashed px-4 py-8 text-center cursor-pointer transition-colors',
          isDragging ? 'border-accent bg-accent-muted' : 'border-border hover:border-border-strong',
          error && 'border-error'
        )}
      >
        <span className="text-sm text-text">
          {fileName ?? 'Drop a CSV here, or click to browse'}
        </span>
        {fileName && (
          <span className="text-xs text-text-muted font-mono">{fileName}</span>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  )
}