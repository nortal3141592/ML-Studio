from pydantic import BaseModel, Field, ConfigDict, EmailStr, PositiveFloat, PositiveInt, NonNegativeFloat
from datetime import datetime
from typing import Any, Literal
from config import settings

from utils.enum_utils import Algorithm

class UserBase(BaseModel):
    username: str = Field(min_length=1, max_length=50)
    email: EmailStr = Field(max_length=120)

class UserUpdate(BaseModel):
    username: str | None = Field(default=None, min_length=1, max_length=50)
    email: EmailStr | None = Field(default=None, max_length=120)

class UserCreate(UserBase):
    password: str = Field(min_length=8)

class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    image_file: str | None
    image_path: str

class UserPrivate(UserPublic):
    email: EmailStr

class Token(BaseModel):
    access_token: str
    token_type: str



# ==============================
# Project related schemas
# ==============================

class ProjectPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_name: str
    status: str

    raw_dataset_path: str

    created_at: datetime
    updated_at: datetime

class MetadataResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    rows: int
    columns: int
    column_names: list[str]
    dtypes: dict[str, str]
    missing_values: dict[str, int]
    memory_bytes: int

    cleaning_summary: dict | None = Field(default=None)

class PreviewRowsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    x_rows: list[dict[str, Any]] | None = None
    y_rows: list[dict[str, Any]] | None = None

    rows: list[dict[str, Any]] | None = None

class CleaningRequest(BaseModel):
    droppable_columns : list[str] = []

class FeatureEngineeringRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    target_column: str

    train_split: int = settings.train_split
    cv_split: int = settings.cv_split
    test_split: int = settings.test_split

class SplitMetadata(BaseModel):
    x_rows: int
    x_columns: int
    y_rows: int

class FeatureEngineeringResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    target_column: str

    train: SplitMetadata
    cv: SplitMetadata
    test: SplitMetadata

    scaled_columns: list[str]

    encoded_columns: list[str]

    feature_names_after_encoding: list[str]
    number_of_features_after_encoding: int\
    
# MODEL TRAINING SCHEMAS

"""
    Linear Regression has no meaningful user-facing hyperparameters.
    Advanced parameters are exposed for completeness.
"""
class LinearRegressionHyperparameters(BaseModel):
    fit_intercept: bool = Field(default=True, description="Whether to calculate the intercept for this model.")

    copy_X: bool = Field(default=True, description="Whether to copy the input data before fitting.")

    positive: bool = Field(default=False, description="Force the coefficients to be positive.")

class RidgeHyperparameters(BaseModel):
    # =====================
    # Basic
    # =====================

    alpha: PositiveFloat = Field(default=1.0, description="Regularization strength (λ). Larger values increase regularization.")

    max_iter: PositiveInt | None = Field( default=None, description="Maximum number of iterations for the solver.")

    # =====================
    # Advanced
    # =====================

    fit_intercept: bool = Field(default=True, description="Whether to calculate the intercept for the model.")

    solver: Literal["auto", "svd", "cholesky", "lsqr", "sparse_cg", "sag", "saga", "lbfgs"] = Field(default="auto", description="Algorithm used to solve the Ridge optimization problem.")

    tol: PositiveFloat = Field(default=1e-4, description="Tolerance for the stopping criteria. Smaller values may improve convergence but increase training time.")

class LassoHyperparameters(BaseModel):
    # =====================
    # Basic
    # =====================

    alpha: PositiveFloat = Field(default=1.0, description="Regularization strength (λ). Larger values increase regularization.")

    max_iter: PositiveInt = Field(default=1000, description="Maximum number of optimization iterations.")

    # =====================
    # Advanced
    # =====================

    fit_intercept: bool = Field(default=True, description="Whether to calculate the intercept for the model.")

    selection: Literal["cyclic", "random"] = Field(default="cyclic", description="Strategy used to update coefficients during optimization.")

    tol: PositiveFloat = Field(default=1e-4, description="Tolerance for the stopping criteria. Smaller values may improve convergence but increase training time.")


class SGDRegressorHyperparameters(BaseModel):
    # =====================
    # Basic
    # =====================

    alpha: PositiveFloat = Field(default=0.0001, description="Regularization strength.")

    max_iter: PositiveInt = Field(default=1000, description="Maximum number of epochs over the training data.")

    # =====================
    # Advanced
    # =====================

    loss: Literal["squared_error", "huber", "epsilon_insensitive", "squared_epsilon_insensitive"] = Field(default="squared_error", description="Loss function optimized during training.")

    penalty: Literal["l2", "l1", "elasticnet", None] = Field(default="l2", description="Regularization penalty applied to the model weights.")

    learning_rate: Literal["constant", "optimal", "invscaling", "adaptive"] = Field(default="optimal", description="Strategy used to adjust the learning rate during training.")

    eta0: PositiveFloat = Field(default=0.01, description="Initial learning rate used by certain learning rate schedules.")

    fit_intercept: bool = Field(default=True, description="Whether to calculate the intercept for the model.")

    tol: PositiveFloat = Field(default=1e-3, description="Tolerance for the stopping criteria. Training stops when improvements become smaller than this value.")


class LogisticRegressionHyperparameters(BaseModel):
    # =====================
    # Basic
    # =====================

    C: PositiveFloat = Field(default=1.0, description="Inverse of regularization strength. Smaller values increase regularization.")

    max_iter: PositiveInt = Field(default=100, description="Maximum number of optimization iterations.")

    # =====================
    # Advanced
    # =====================

    penalty: Literal["l2", "l1", "elasticnet", None] = Field(default="l2", description="Type of regularization applied to the model.")

    solver: Literal["lbfgs", "liblinear", "newton-cg", "newton-cholesky", "sag", "saga"] = Field(default="lbfgs", description="Optimization algorithm used to fit the model.")

    fit_intercept: bool = Field(default=True, description="Whether to calculate the intercept for the model.")

    tol: PositiveFloat = Field(default=1e-4, description="Tolerance for the stopping criteria.")

class DecisionTreeHyperparameters(BaseModel):
    # =====================
    # Basic
    # =====================

    criterion: Literal["gini", "entropy", "log_loss"] = Field(default="gini", description="Function used to measure the quality of a split.")

    max_depth: PositiveInt | None = Field(default=None, description="Maximum depth of the tree. None allows the tree to grow until all leaves are pure or other stopping criteria are met.")

    min_samples_split: PositiveInt = Field(default=2,description="Minimum number of samples required to split an internal node.")

    # =====================
    # Advanced
    # =====================


    min_samples_leaf: PositiveInt = Field(default=1,description="Minimum number of samples required to be at a leaf node.")

    max_features: Literal["sqrt", "log2"] | None = Field(default=None,description="Number of features to consider when looking for the best split.")

    splitter: Literal["best","random"] = Field(default="best",description="Strategy used to choose the split at each node.")

class RandomForestHyperparameters(BaseModel):
    # =====================
    # Basic
    # =====================

    n_estimators: PositiveInt = Field(default=100, description="Number of trees in the forest.")
    min_samples_split: PositiveInt = Field(default=2, description="Minimum number of samples required to split an internal node.")
    max_depth: PositiveInt | None = Field(default=None, description="Maximum depth of each tree.")

    criterion: Literal["gini", "entropy", "log_loss"] = Field(default="gini", description="Function used to measure the quality of a split.")


    # =====================
    # Advanced
    # =====================


    min_samples_leaf: PositiveInt = Field(default=1, description="Minimum number of samples required to be at a leaf node.")

    max_features: Literal["sqrt", "log2"] = Field(default="sqrt", description="Number of features considered when searching for the best split.")

    bootstrap: bool = Field(default=True,description="Whether bootstrap samples are used when building trees.")

class XGBoostHyperparameters(BaseModel):
    # =====================
    # Basic
    # =====================

    n_estimators: PositiveInt = Field(default=100, description="Number of boosting rounds (trees).")

    learning_rate: PositiveFloat = Field(default=0.3, description="Step size used after each boosting iteration.")

    max_depth: PositiveInt = Field(default=6, description="Maximum depth of each tree.")

    early_stopping_rounds: PositiveInt | None = Field(default=20, description="Stops training if the validation score does not improve for this many consecutive boosting rounds.")

    # =====================
    # Advanced
    # =====================

    subsample: PositiveFloat = Field(default=1.0, description="Fraction of training samples used to build each tree.")

    colsample_bytree: PositiveFloat = Field(default=1.0, description="Fraction of features sampled for each tree.")

    reg_alpha: NonNegativeFloat = Field(default=0.0, description="L1 regularization term on weights.")

    reg_lambda: PositiveFloat = Field(default=1.0, description="L2 regularization term on weights.")

    gamma: NonNegativeFloat = Field(default=0.0, description="Minimum loss reduction required to make a further partition.")

# METRICS SCHEMAS
class MetricsBase(BaseModel):
    train_loss: float
    cv_loss: float
    test_loss: float

    train_samples: PositiveInt
    cv_samples: PositiveInt
    test_samples: PositiveInt

class RegressionMetrics(MetricsBase):
    train_mae: NonNegativeFloat
    cv_mae: NonNegativeFloat
    test_mae: NonNegativeFloat

    train_rmse: NonNegativeFloat
    cv_rmse: NonNegativeFloat
    test_rmse: NonNegativeFloat

    train_r2: float
    cv_r2: float
    test_r2: float

class ClassificationMetrics(MetricsBase):
    train_accuracy: float
    cv_accuracy: float
    test_accuracy: float

    train_precision: float
    cv_precision: float
    test_precision: float

    train_recall: float
    cv_recall: float
    test_recall: float

    train_f1: float
    cv_f1: float
    test_f1: float

class NeuralNetworkMetrics(MetricsBase):
    pass

# ====================================================================================
# NEURAL NETWORK SCHEMAS
# ====================================================================================

class LayerConfig(BaseModel):
    neurons: PositiveInt = Field(description="Number of neurons in this hidden layer.")

    activation: Literal["relu", "sigmoid", "tanh", "elu", "selu", "gelu", "swish", "softplus", "softsign", "linear"] = Field(default="relu", description="Activation function for this hidden layer.")


class NeuralNetworkHyperparameters(BaseModel):
    # =====================
    # Architecture
    # =====================

    hidden_layers: list[LayerConfig] = Field(description="Configuration of every hidden layer in the neural network.")

    # =====================
    # Basic
    # =====================

    optimizer: Literal["adam", "sgd", "rmsprop", "adamw", "adagrad", "adadelta", "adamax", "nadam", "ftrl"] = Field(default="adam", description="Optimizer used during training.")

    # loss: Literal["mean_squared_error", "mean_absolute_error", "binary_crossentropy", "categorical_crossentropy", "sparse_categorical_crossentropy", "huber"] = Field(description="Loss function used during training.")

    epochs: PositiveInt = Field(default=100, description="Number of training epochs.")

    # =====================
    # Advanced
    # =====================

    learning_rate: PositiveFloat = Field(default=0.001, description="Learning rate used by the optimizer.")

    batch_size: PositiveInt = Field(default=32, description="Number of samples processed before updating model weights.")

# =================================================================
# MODEL TRAINING BACKEND SCHEMAS
# =================================================================

TrainingHyperparameters = (LinearRegressionHyperparameters | RidgeHyperparameters | LassoHyperparameters | SGDRegressorHyperparameters | LogisticRegressionHyperparameters | DecisionTreeHyperparameters | RandomForestHyperparameters | XGBoostHyperparameters | NeuralNetworkHyperparameters)

class TrainingRequest(BaseModel):
    algorithm: Algorithm
    hyperparameters: TrainingHyperparameters
    random_seed: PositiveInt = settings.random_state

class TrainingResponse(BaseModel):
    message: str
    run_id: int
    status: str

ALGORITHM_TO_HYPERPARAMETER_SCHEMA = {
    Algorithm.LINEAR_REGRESSION: LinearRegressionHyperparameters,
    Algorithm.RIDGE_REGRESSION: RidgeHyperparameters,
    Algorithm.LASSO_REGRESSION: LassoHyperparameters,
    Algorithm.SGD_REGRESSOR: SGDRegressorHyperparameters,
    Algorithm.LOGISTIC_REGRESSION: LogisticRegressionHyperparameters,
    Algorithm.DECISION_TREE: DecisionTreeHyperparameters,
    Algorithm.RANDOM_FOREST: RandomForestHyperparameters,
    Algorithm.XGBOOST: XGBoostHyperparameters,
    Algorithm.NEURAL_NETWORK: NeuralNetworkHyperparameters,
}

class TrainingRunStatusResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    algorithm: str
    

    status: str
    progress: int
    status_message: str | None
    
    metrics: dict[str, Any] | None
    training_time_seconds: float | None
    
    error_message: str | None
    
    created_at: datetime
    updated_at: datetime