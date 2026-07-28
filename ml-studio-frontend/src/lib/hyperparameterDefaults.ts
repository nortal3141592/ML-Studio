import type { Algorithm, Hyperparameters } from './api/types/training'

export const hyperparameterDefaults: Record<Algorithm, Hyperparameters> = {
  linear_regression: { fit_intercept: true, copy_X: true, positive: false },
  ridge_regression: { alpha: 1.0, max_iter: null, fit_intercept: true, solver: 'auto', tol: 0.0001 },
  lasso_regression: { alpha: 1.0, max_iter: 1000, fit_intercept: true, selection: 'cyclic', tol: 0.0001 },
  sgd_regressor: {
    alpha: 0.0001, max_iter: 1000, loss: 'squared_error', penalty: 'l2',
    learning_rate: 'optimal', eta0: 0.01, fit_intercept: true, tol: 0.001,
  },
  logistic_regression: { C: 1.0, max_iter: 100, penalty: 'l2', solver: 'lbfgs', fit_intercept: true, tol: 0.0001 },
  decision_tree: {
    criterion: 'gini', max_depth: null, min_samples_split: 2,
    min_samples_leaf: 1, max_features: null, splitter: 'best',
  },
  random_forest: {
    n_estimators: 100, min_samples_split: 2, max_depth: null, criterion: 'gini',
    min_samples_leaf: 1, max_features: 'sqrt', bootstrap: true,
  },
  xgboost: {
    n_estimators: 100, learning_rate: 0.3, max_depth: 6, early_stopping_rounds: 20,
    subsample: 1.0, colsample_bytree: 1.0, reg_alpha: 0.0, reg_lambda: 1.0, gamma: 0.0,
  },
  neural_network: {
    hidden_layers: [{ neurons: 64, activation: 'relu' }],
    optimizer: 'adam', epochs: 100, learning_rate: 0.001, batch_size: 32,
  },
}

export const algorithmLabels: Record<Algorithm, string> = {
  linear_regression: 'Linear Regression',
  ridge_regression: 'Ridge Regression',
  lasso_regression: 'Lasso Regression',
  sgd_regressor: 'SGD Regressor',
  logistic_regression: 'Logistic Regression',
  decision_tree: 'Decision Tree',
  random_forest: 'Random Forest',
  xgboost: 'XGBoost',
  neural_network: 'Neural Network',
}