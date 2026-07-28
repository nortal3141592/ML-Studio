export type Algorithm =
  | 'linear_regression'
  | 'ridge_regression'
  | 'lasso_regression'
  | 'sgd_regressor'
  | 'logistic_regression'
  | 'decision_tree'
  | 'random_forest'
  | 'xgboost'
  | 'neural_network'
export type TrainingStatus = 'QUEUED' | 'INITIALIZING' | 'TRAINING' | 'SAVING_MODEL' | 'COMPLETED' | 'FAILED' | 'CANCELLED'

export interface LinearRegressionHyperparameters {
  fit_intercept?: boolean
  copy_X?: boolean
  positive?: boolean
}

export interface RidgeHyperparameters {
  alpha?: number
  max_iter?: number | null
  fit_intercept?: boolean
  solver?: 'auto' | 'svd' | 'cholesky' | 'lsqr' | 'sparse_cg' | 'sag' | 'saga' | 'lbfgs'
  tol?: number
}

export interface LassoHyperparameters {
  alpha?: number
  max_iter?: number
  fit_intercept?: boolean
  selection?: 'cyclic' | 'random'
  tol?: number
}

export interface SGDRegressorHyperparameters {
  alpha?: number
  max_iter?: number
  loss?: 'squared_error' | 'huber' | 'epsilon_insensitive' | 'squared_epsilon_insensitive'
  penalty?: 'l2' | 'l1' | 'elasticnet' | null
  learning_rate?: 'constant' | 'optimal' | 'invscaling' | 'adaptive'
  eta0?: number
  fit_intercept?: boolean
  tol?: number
}

export interface LogisticRegressionHyperparameters {
  C?: number
  max_iter?: number
  penalty?: 'l2' | 'l1' | 'elasticnet' | null
  solver?: 'lbfgs' | 'liblinear' | 'newton-cg' | 'newton-cholesky' | 'sag' | 'saga'
  fit_intercept?: boolean
  tol?: number
}

export interface DecisionTreeHyperparameters {
  criterion?: 'gini' | 'entropy' | 'log_loss'
  max_depth?: number | null
  min_samples_split?: number
  min_samples_leaf?: number
  max_features?: 'sqrt' | 'log2' | null
  splitter?: 'best' | 'random'
}

export interface RandomForestHyperparameters {
  n_estimators?: number
  min_samples_split?: number
  max_depth?: number | null
  criterion?: 'gini' | 'entropy' | 'log_loss'
  min_samples_leaf?: number
  max_features?: 'sqrt' | 'log2'
  bootstrap?: boolean
}

export interface XGBoostHyperparameters {
  n_estimators?: number
  learning_rate?: number
  max_depth?: number
  early_stopping_rounds?: number | null
  subsample?: number
  colsample_bytree?: number
  reg_alpha?: number
  reg_lambda?: number
  gamma?: number
}

export interface LayerConfig {
  neurons: number
  activation?: 'relu' | 'sigmoid' | 'tanh' | 'elu' | 'selu' | 'gelu' | 'swish' | 'softplus' | 'softsign' | 'linear'
}

export interface NeuralNetworkHyperparameters {
  hidden_layers: LayerConfig[]
  optimizer?: 'adam' | 'sgd' | 'rmsprop' | 'adamw' | 'adagrad' | 'adadelta' | 'adamax' | 'nadam' | 'ftrl'
  epochs?: number
  learning_rate?: number
  batch_size?: number
}

export type Hyperparameters =
  | LinearRegressionHyperparameters
  | RidgeHyperparameters
  | LassoHyperparameters
  | SGDRegressorHyperparameters
  | LogisticRegressionHyperparameters
  | DecisionTreeHyperparameters
  | RandomForestHyperparameters
  | XGBoostHyperparameters
  | NeuralNetworkHyperparameters

export interface TrainingRequest {
  algorithm: Algorithm
  hyperparameters: Hyperparameters
  random_seed?: number
}

export interface TrainingResponse {
  message: string
  run_id: number
  status: string
}

export interface TrainingRunStatusResponse {
  id: number
  project_id: number
  algorithm: string
  hyperparameters: Record<string, unknown>
  random_seed: number
  status: string
  progress: number
  status_message: string | null
  model_path: string | null
  history_path: string | null
  metrics: Record<string, unknown> | null
  training_time_seconds: number | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface SplitMetadata {
  x_rows: number
  x_columns: number
  y_rows: number
}

export interface FeatureEngineeringRequest {
  target_column: string
  train_split?: number
  cv_split?: number
  test_split?: number
}

export interface FeatureEngineeringResponse {
  target_column: string
  train: SplitMetadata
  cv: SplitMetadata
  test: SplitMetadata
  scaled_columns: string[]
  encoded_columns: string[]
  feature_names_after_encoding: string[]
  number_of_features_after_encoding: number
}