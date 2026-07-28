import type { Algorithm } from './api/types/training'

export const TREE_BASED_ALGORITHMS: Algorithm[] = ['decision_tree', 'random_forest', 'xgboost']
export const LINEAR_ALGORITHMS: Algorithm[] = ['linear_regression', 'ridge_regression', 'lasso_regression', 'sgd_regressor', 'logistic_regression']