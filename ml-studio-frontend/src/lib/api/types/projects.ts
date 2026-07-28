export type DatasetStage = 'raw' | 'cleaned' | 'engineered'
export type DatasetSplit = 'train' | 'cv' | 'test'
export type ProjectStatus = 'uploaded' | 'cleaning' | 'ready' | 'training' | 'completed' | 'failed'
export type TaskType = 'regression' | 'binary_classification' | 'multiclass_classification'

export interface ProjectPublic {
  id: number
  project_name: string
  status: ProjectStatus
  task_type: TaskType | null
  raw_dataset_path: string
  created_at: string
  updated_at: string
}
// export interface MetadataResponse {
//   rows: number
//   columns: number
//   column_names: string[]
//   dtypes: Record<string, string>
//   missing_values: Record<string, number>
//   memory_bytes: number
//   cleaning_summary: Record<string, unknown> | null
// }

// Row values are heterogeneous by nature (a CSV column can hold numbers, strings, nulls) —
// `unknown` forces every consumer to check/cast before use rather than assuming a shape.
export interface PreviewRowsResponse {
  x_rows: Record<string, unknown>[] | null
  y_rows: Record<string, unknown>[] | null
  rows: Record<string, unknown>[] | null
}

export interface CleaningRequest {
  droppable_columns: string[]
}

export interface CleaningSummary {
  rows_before: number
  rows_after: number
  columns_before: number
  columns_after: number
  duplicate_rows_removed: number
  removed_constant_columns: string[]
  removed_sparse_columns: string[]
  filled_numeric: Record<string, unknown>
  filled_categorical: Record<string, unknown>
  removed_all_null_columns: string[]
}

export interface MetadataResponse {
  rows: number
  columns: number
  column_names: string[]
  dtypes: Record<string, string>
  missing_values: Record<string, number>
  memory_bytes: number
  cleaning_summary: CleaningSummary | null
}