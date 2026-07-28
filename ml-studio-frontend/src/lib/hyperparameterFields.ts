import type { Algorithm } from './api/types/training'

type FieldType = 'number' | 'boolean' | 'select' | 'nullable_number'

export interface FieldConfig {
  key: string
  label: string
  type: FieldType
  options?: { value: string; label: string }[]
  step?: number
}

export const hyperparameterFields: Record<Exclude<Algorithm, 'neural_network'>, FieldConfig[]> = {
  linear_regression: [
    { key: 'fit_intercept', label: 'Fit intercept', type: 'boolean' },
    { key: 'copy_X', label: 'Copy X', type: 'boolean' },
    { key: 'positive', label: 'Force positive coefficients', type: 'boolean' },
  ],
  ridge_regression: [
    { key: 'alpha', label: 'Alpha', type: 'number', step: 0.1 },
    { key: 'max_iter', label: 'Max iterations', type: 'nullable_number' },
    { key: 'fit_intercept', label: 'Fit intercept', type: 'boolean' },
    { key: 'solver', label: 'Solver', type: 'select', options: ['auto', 'svd', 'cholesky', 'lsqr', 'sparse_cg', 'sag', 'saga', 'lbfgs'].map((v) => ({ value: v, label: v })) },
    { key: 'tol', label: 'Tolerance', type: 'number', step: 0.0001 },
  ],
  lasso_regression: [
    { key: 'alpha', label: 'Alpha', type: 'number', step: 0.1 },
    { key: 'max_iter', label: 'Max iterations', type: 'number' },
    { key: 'fit_intercept', label: 'Fit intercept', type: 'boolean' },
    { key: 'selection', label: 'Selection', type: 'select', options: [{ value: 'cyclic', label: 'cyclic' }, { value: 'random', label: 'random' }] },
    { key: 'tol', label: 'Tolerance', type: 'number', step: 0.0001 },
  ],
  sgd_regressor: [
    { key: 'alpha', label: 'Alpha', type: 'number', step: 0.0001 },
    { key: 'max_iter', label: 'Max iterations', type: 'number' },
    { key: 'loss', label: 'Loss', type: 'select', options: ['squared_error', 'huber', 'epsilon_insensitive', 'squared_epsilon_insensitive'].map((v) => ({ value: v, label: v })) },
    { key: 'penalty', label: 'Penalty', type: 'select', options: [{ value: 'l2', label: 'l2' }, { value: 'l1', label: 'l1' }, { value: 'elasticnet', label: 'elasticnet' }] },
    { key: 'learning_rate', label: 'Learning rate schedule', type: 'select', options: ['constant', 'optimal', 'invscaling', 'adaptive'].map((v) => ({ value: v, label: v })) },
    { key: 'eta0', label: 'Initial learning rate (eta0)', type: 'number', step: 0.001 },
    { key: 'fit_intercept', label: 'Fit intercept', type: 'boolean' },
    { key: 'tol', label: 'Tolerance', type: 'number', step: 0.0001 },
  ],
  logistic_regression: [
    { key: 'C', label: 'C (inverse regularization)', type: 'number', step: 0.1 },
    { key: 'max_iter', label: 'Max iterations', type: 'number' },
    { key: 'penalty', label: 'Penalty', type: 'select', options: [{ value: 'l2', label: 'l2' }, { value: 'l1', label: 'l1' }, { value: 'elasticnet', label: 'elasticnet' }] },
    { key: 'solver', label: 'Solver', type: 'select', options: ['lbfgs', 'liblinear', 'newton-cg', 'newton-cholesky', 'sag', 'saga'].map((v) => ({ value: v, label: v })) },
    { key: 'fit_intercept', label: 'Fit intercept', type: 'boolean' },
    { key: 'tol', label: 'Tolerance', type: 'number', step: 0.0001 },
  ],
  decision_tree: [
    { key: 'criterion', label: 'Criterion', type: 'select', options: [{ value: 'gini', label: 'gini' }, { value: 'entropy', label: 'entropy' }, { value: 'log_loss', label: 'log_loss' }] },
    { key: 'max_depth', label: 'Max depth', type: 'nullable_number' },
    { key: 'min_samples_split', label: 'Min samples split', type: 'number' },
    { key: 'min_samples_leaf', label: 'Min samples leaf', type: 'number' },
    { key: 'max_features', label: 'Max features', type: 'select', options: [{ value: '', label: 'None' }, { value: 'sqrt', label: 'sqrt' }, { value: 'log2', label: 'log2' }] },
    { key: 'splitter', label: 'Splitter', type: 'select', options: [{ value: 'best', label: 'best' }, { value: 'random', label: 'random' }] },
  ],
  random_forest: [
    { key: 'n_estimators', label: 'Number of trees', type: 'number' },
    { key: 'min_samples_split', label: 'Min samples split', type: 'number' },
    { key: 'max_depth', label: 'Max depth', type: 'nullable_number' },
    { key: 'criterion', label: 'Criterion', type: 'select', options: [{ value: 'gini', label: 'gini' }, { value: 'entropy', label: 'entropy' }, { value: 'log_loss', label: 'log_loss' }] },
    { key: 'min_samples_leaf', label: 'Min samples leaf', type: 'number' },
    { key: 'max_features', label: 'Max features', type: 'select', options: [{ value: 'sqrt', label: 'sqrt' }, { value: 'log2', label: 'log2' }] },
    { key: 'bootstrap', label: 'Bootstrap', type: 'boolean' },
  ],
  xgboost: [
    { key: 'n_estimators', label: 'Number of trees', type: 'number' },
    { key: 'learning_rate', label: 'Learning rate', type: 'number', step: 0.01 },
    { key: 'max_depth', label: 'Max depth', type: 'number' },
    { key: 'early_stopping_rounds', label: 'Early stopping rounds', type: 'nullable_number' },
    { key: 'subsample', label: 'Subsample fraction', type: 'number', step: 0.1 },
    { key: 'colsample_bytree', label: 'Column sample per tree', type: 'number', step: 0.1 },
    { key: 'reg_alpha', label: 'L1 regularization (alpha)', type: 'number', step: 0.1 },
    { key: 'reg_lambda', label: 'L2 regularization (lambda)', type: 'number', step: 0.1 },
    { key: 'gamma', label: 'Gamma', type: 'number', step: 0.1 },
  ],
}