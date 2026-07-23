from enum import Enum

class DatasetStage(str, Enum):
    RAW = "raw"
    CLEANED = "cleaned"
    ENGINEERED = "engineered"

class ProjectStatus(str, Enum):
    UPLOADED = "uploaded"
    CLEANING = "cleaning"
    READY = "ready"
    TRAINING = "training"
    COMPLETED = "completed"
    FAILED = "failed"

class DatasetSplit(str, Enum):
    TRAIN = "train"
    CV = "cv"
    TEST = "test"

class Algorithm(str, Enum):
    LINEAR_REGRESSION = "linear_regression"
    RIDGE_REGRESSION = "ridge_regression"
    LASSO_REGRESSION = "lasso_regression"
    SGD_REGRESSOR = "sgd_regressor"

    LOGISTIC_REGRESSION = "logistic_regression"

    DECISION_TREE = "decision_tree"
    RANDOM_FOREST = "random_forest"
    XGBOOST = "xgboost"

    NEURAL_NETWORK = "neural_network"

class TaskType(str, Enum):
    REGRESSION = "regression"
    BINARY_CLASSIFICATION = "binary_classification"
    MULTICLASS_CLASSIFICATION = "multiclass_classification"

class TrainingStatus(str, Enum):
    QUEUED = "QUEUED"
    INITIALIZING = "INITIALIZING"
    TRAINING = "TRAINING"
    SAVING_MODEL = "SAVING_MODEL"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"