from time import perf_counter
import pandas as pd
import numpy as np
import tensorflow as tf

import joblib
from pathlib import Path

from config import settings

from utils.enum_utils import Algorithm, TaskType
from utils.neural_network_utils import train_neural_network
from typing import Any, Mapping, cast

from sklearn.linear_model import LinearRegression, Ridge, Lasso, LogisticRegression, SGDRegressor
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
from sklearn.base import BaseEstimator
from sklearn.metrics import mean_absolute_error, root_mean_squared_error, mean_squared_error, r2_score, log_loss, accuracy_score, precision_score, recall_score, f1_score

from schemas import RegressionMetrics, ClassificationMetrics, NeuralNetworkHyperparameters

def build_model(algorithm: Algorithm, hyperparameters: Any) -> BaseEstimator:
    params = hyperparameters.model_dump() if hasattr(hyperparameters, "model_dump") else hyperparameters

    match algorithm:
        case Algorithm.LINEAR_REGRESSION:
            return LinearRegression(**params)

        case Algorithm.RIDGE_REGRESSION:
            return Ridge(**params)

        case Algorithm.LASSO_REGRESSION:
            return Lasso(**params)

        case Algorithm.SGD_REGRESSOR:
            return SGDRegressor(random_state=settings.random_state, **params)

        case Algorithm.LOGISTIC_REGRESSION:
            return LogisticRegression(random_state=settings.random_state, **params)

        case Algorithm.DECISION_TREE:
            return DecisionTreeClassifier(random_state=settings.random_state, **params)

        case Algorithm.RANDOM_FOREST:
            return RandomForestClassifier(random_state=settings.random_state, **params)

        case Algorithm.XGBOOST:
            return XGBClassifier(random_state=settings.random_state, **params)

        case Algorithm.NEURAL_NETWORK:
            raise NotImplementedError("Neural Network trainer has not been implemented yet.")

        case _:
            raise ValueError(f"Unsupported algorithm: {algorithm}")


def fit_model(model: Any, X_train: pd.DataFrame, y_train: pd.Series) -> float:
    start_time = perf_counter()

    model.fit(X_train, y_train)

    end_time = perf_counter()

    return end_time - start_time

def predict_datasets(model: Any, algorithm: Algorithm, X_train: pd.DataFrame, X_cv: pd.DataFrame, X_test: pd.DataFrame, task_type: TaskType | None = None) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray | None, np.ndarray | None, np.ndarray | None]:
    # yhat_train = model.predict(X_train)
    # yhat_cv = model.predict(X_cv)
    # yhat_test = model.predict(X_test)

    match algorithm:
        case (Algorithm.LINEAR_REGRESSION | Algorithm.RIDGE_REGRESSION | Algorithm.LASSO_REGRESSION | Algorithm.SGD_REGRESSOR):
            yhat_train = model.predict(X_train)
            yhat_cv = model.predict(X_cv)
            yhat_test = model.predict(X_test)

            yhat_train_prob = None
            yhat_cv_prob = None
            yhat_test_prob = None

        case (Algorithm.LOGISTIC_REGRESSION| Algorithm.DECISION_TREE| Algorithm.RANDOM_FOREST| Algorithm.XGBOOST):
            yhat_train = model.predict(X_train)
            yhat_cv = model.predict(X_cv)
            yhat_test = model.predict(X_test)
            
            yhat_train_prob = model.predict_proba(X_train)
            yhat_cv_prob = model.predict_proba(X_cv)
            yhat_test_prob = model.predict_proba(X_test)

            if task_type == TaskType.BINARY_CLASSIFICATION:
                yhat_train_prob = yhat_train_prob[:, 1]
                yhat_cv_prob = yhat_cv_prob[:, 1]
                yhat_test_prob = yhat_test_prob[:, 1]
        
        case (Algorithm.NEURAL_NETWORK):
            logits_train = model.predict(X_train, verbose = 0)
            logits_cv = model.predict(X_cv, verbose = 0)
            logits_test = model.predict(X_test, verbose = 0)

            match task_type:

                case TaskType.REGRESSION:
                    yhat_train = logits_train.ravel()
                    yhat_cv = logits_cv.ravel()
                    yhat_test = logits_test.ravel()

                    yhat_train_prob = None
                    yhat_cv_prob = None
                    yhat_test_prob = None

                case TaskType.BINARY_CLASSIFICATION:
                    yhat_train_prob = tf.nn.sigmoid(logits_train).numpy().ravel()
                    yhat_cv_prob = tf.nn.sigmoid(logits_cv).numpy().ravel()
                    yhat_test_prob = tf.nn.sigmoid(logits_test).numpy().ravel()

                    yhat_train = (yhat_train_prob >= 0.5).astype(int)
                    yhat_cv = (yhat_cv_prob >= 0.5).astype(int)
                    yhat_test = (yhat_test_prob >= 0.5).astype(int)

                case TaskType.MULTICLASS_CLASSIFICATION:
                    yhat_train_prob = tf.nn.softmax(logits_train, axis=1).numpy()
                    yhat_cv_prob = tf.nn.softmax(logits_cv, axis=1).numpy()
                    yhat_test_prob = tf.nn.softmax(logits_test, axis=1).numpy()

                    yhat_train = np.argmax(yhat_train_prob, axis=1)
                    yhat_cv = np.argmax(yhat_cv_prob, axis=1)
                    yhat_test = np.argmax(yhat_test_prob, axis=1)
                
                case _:
                    raise ValueError(f"Unsupported Task type: {task_type}")


        case _:
            raise ValueError(f"Unsupported algorithm: {algorithm}")

    return yhat_train, yhat_cv, yhat_test, yhat_train_prob, yhat_cv_prob, yhat_test_prob

def extract_regression_metrics(y_train: pd.Series, y_cv: pd.Series, y_test: pd.Series, yhat_train: np.ndarray, yhat_cv: np.ndarray, yhat_test: np.ndarray) -> RegressionMetrics:
    train_loss = mean_squared_error(y_train, yhat_train)
    cv_loss = mean_squared_error(y_cv, yhat_cv)
    test_loss = mean_squared_error(y_test, yhat_test)

    train_samples = y_train.shape[0]
    cv_samples = y_cv.shape[0]
    test_samples = y_test.shape[0]

    train_mae = mean_absolute_error(y_train, yhat_train)
    cv_mae = mean_absolute_error(y_cv, yhat_cv)
    test_mae = mean_absolute_error(y_test, yhat_test)
   

    train_rmse = root_mean_squared_error(y_train, yhat_train)
    cv_rmse = root_mean_squared_error(y_cv, yhat_cv)
    test_rmse = root_mean_squared_error(y_test, yhat_test)

    train_r2 = r2_score(y_train, yhat_train)
    cv_r2 = r2_score(y_cv, yhat_cv)
    test_r2 = r2_score(y_test, yhat_test)

    return RegressionMetrics(
        train_loss = train_loss, 
        cv_loss = cv_loss, 
        test_loss = test_loss,

        train_samples = train_samples, 
        cv_samples = cv_samples, 
        test_samples = test_samples,

        train_mae = train_mae, 
        cv_mae = cv_mae, 
        test_mae = test_mae,

        train_rmse = train_rmse, 
        cv_rmse = cv_rmse, 
        test_rmse = test_rmse,

        train_r2 = train_r2, 
        cv_r2 = cv_r2, 
        test_r2 = test_r2,
    )

def extract_classification_metrics(y_train: pd.Series, y_cv: pd.Series, y_test: pd.Series, yhat_train: np.ndarray, yhat_cv: np.ndarray, yhat_test: np.ndarray, yhat_train_prob: np.ndarray, yhat_cv_prob: np.ndarray, yhat_test_prob: np.ndarray) -> ClassificationMetrics:
    train_loss = log_loss(y_train, yhat_train_prob)
    cv_loss = log_loss(y_cv, yhat_cv_prob)
    test_loss = log_loss(y_test, yhat_test_prob)

    train_samples = y_train.shape[0]
    cv_samples = y_cv.shape[0]
    test_samples = y_test.shape[0]

    train_accuracy = accuracy_score(y_train, yhat_train)
    cv_accuracy = accuracy_score(y_cv, yhat_cv)
    test_accuracy = accuracy_score(y_test, yhat_test)

    train_precision = precision_score(y_train, yhat_train, average = "weighted", zero_division=0)
    cv_precision = precision_score(y_cv, yhat_cv, average = "weighted", zero_division=0)
    test_precision = precision_score(y_test, yhat_test, average = "weighted", zero_division=0)

    train_recall = recall_score(y_train, yhat_train, average = "weighted", zero_division=0)
    cv_recall = recall_score(y_cv, yhat_cv, average = "weighted", zero_division=0)
    test_recall = recall_score(y_test, yhat_test, average = "weighted", zero_division=0)

    train_f1 = f1_score(y_train, yhat_train, average = "weighted", zero_division=0)
    cv_f1 = f1_score(y_cv, yhat_cv, average = "weighted", zero_division=0)
    test_f1 = f1_score(y_test, yhat_test, average = "weighted", zero_division=0)

    return ClassificationMetrics(
        train_loss = float(train_loss),
        cv_loss = float(cv_loss),
        test_loss = float(test_loss),

        train_samples = train_samples,
        cv_samples = cv_samples,
        test_samples = test_samples,

        train_accuracy = float(train_accuracy),
        cv_accuracy = float(cv_accuracy),
        test_accuracy = float(test_accuracy),

        train_precision = float(train_precision),
        cv_precision = float(cv_precision),
        test_precision = float(test_precision),

        train_recall = float(train_recall),
        cv_recall = float(cv_recall),
        test_recall = float(test_recall),

        train_f1 = float(train_f1),
        cv_f1 = float(cv_f1),
        test_f1 = float(test_f1),
    )

def extract_metrics(
    algorithm: Algorithm,
    y_train: pd.Series, y_cv: pd.Series, y_test: pd.Series,
    yhat_train: np.ndarray,yhat_cv: np.ndarray,yhat_test: np.ndarray,
    yhat_train_prob: np.ndarray | None,yhat_cv_prob: np.ndarray | None,yhat_test_prob: np.ndarray | None,
    task_type: TaskType | None = None
) -> RegressionMetrics | ClassificationMetrics:
    match algorithm:
        case(Algorithm.LINEAR_REGRESSION | Algorithm.RIDGE_REGRESSION | Algorithm.LASSO_REGRESSION | Algorithm.SGD_REGRESSOR):
            return extract_regression_metrics(y_train,y_cv,y_test,yhat_train,yhat_cv,yhat_test)

        case(Algorithm.LOGISTIC_REGRESSION| Algorithm.DECISION_TREE| Algorithm.RANDOM_FOREST| Algorithm.XGBOOST):
            if(yhat_train_prob is None or yhat_cv_prob is None or yhat_test_prob is None):
                raise ValueError("Predicted probabilities are required for classification metrics.")

            return extract_classification_metrics(y_train, y_cv, y_test, yhat_train, yhat_cv, yhat_test, yhat_train_prob, yhat_cv_prob, yhat_test_prob,)

        case Algorithm.NEURAL_NETWORK:
            match task_type:
                case TaskType.REGRESSION:
                    return extract_regression_metrics(y_train, y_cv, y_test, yhat_train, yhat_cv, yhat_test)

                case (TaskType.BINARY_CLASSIFICATION | TaskType.MULTICLASS_CLASSIFICATION):
                    if(yhat_train_prob is None or yhat_cv_prob is None or yhat_test_prob is None):
                        raise ValueError("Predicted probabilities are required")
                
                    return extract_classification_metrics(y_train, y_cv, y_test, yhat_train, yhat_cv, yhat_test, yhat_train_prob, yhat_cv_prob, yhat_test_prob)
                
                case _:
                    raise ValueError(f"Unsupported task type: {task_type}")

        case _:
            raise ValueError(f"Unsupported algorithm: {algorithm}")
        

def save_model(model: BaseEstimator, project_id: int, run_id: int) -> str:
    model_dir = Path(f"uploads/project_{project_id}/runs/run_{run_id}")

    model_dir.mkdir(parents=True, exist_ok=True)

    model_path = model_dir / "model.joblib"

    joblib.dump(model, model_path)

    return str(model_path)

def train_model(
    algorithm: Algorithm, hyperparameters: Mapping[str, Any],
    X_train: pd.DataFrame, X_cv: pd.DataFrame, X_test: pd.DataFrame,
    y_train: pd.Series, y_cv: pd.Series, y_test: pd.Series,
    project_id: int, run_id: int, task_type: TaskType, num_classes: int
) -> tuple[str, str | None, RegressionMetrics | ClassificationMetrics, float]:
    match algorithm:
        case (Algorithm.LINEAR_REGRESSION | Algorithm.LASSO_REGRESSION | Algorithm.RIDGE_REGRESSION | Algorithm.SGD_REGRESSOR | Algorithm.LOGISTIC_REGRESSION | Algorithm.DECISION_TREE | Algorithm.RANDOM_FOREST | Algorithm.XGBOOST):
            # initialising model
            model = build_model(algorithm, hyperparameters)

            # training the model and getting the training time
            training_time = fit_model(model, X_train, y_train)

            # predictions
            yhat_train, yhat_cv, yhat_test, yhat_train_prob, yhat_cv_prob, yhat_test_prob = predict_datasets(model = model, algorithm=algorithm, X_train=X_train, X_cv=X_cv, X_test=X_test)

            # metrics
            metrics = extract_metrics(
                algorithm, 
                y_train, y_cv, y_test, 
                yhat_train, yhat_cv, yhat_test,
                yhat_train_prob, yhat_cv_prob ,yhat_test_prob
            )

            model_path = save_model(model, project_id, run_id)
            history_path = None
        case Algorithm.NEURAL_NETWORK:
            model, model_path, history_path, training_time = train_neural_network(hyperparameters = cast(NeuralNetworkHyperparameters, hyperparameters), task_type=task_type, X_train=X_train, X_cv=X_cv, y_train=y_train, y_cv=y_cv, project_id=project_id, run_id=run_id, num_classes=num_classes)

            yhat_train, yhat_cv, yhat_test, yhat_train_prob, yhat_cv_prob, yhat_test_prob = predict_datasets(model=model, algorithm = algorithm, X_train = X_train, X_cv = X_cv, X_test = X_test, task_type = task_type)

            metrics = extract_metrics(algorithm, y_train, y_cv, y_test, yhat_train, yhat_cv, yhat_test, yhat_train_prob, yhat_cv_prob, yhat_test_prob, task_type=task_type)

    return model_path,history_path, metrics, training_time




