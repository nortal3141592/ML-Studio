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