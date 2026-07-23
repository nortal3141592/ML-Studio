from time import perf_counter
import json
from pathlib import Path

import pandas as pd

from keras.models import Sequential
from keras.layers import Dense, Input
from keras.optimizers import Adam, SGD, RMSprop, AdamW, Adagrad, Adadelta, Adamax, Nadam, Ftrl
from keras.losses import MeanSquaredError, BinaryCrossentropy, SparseCategoricalCrossentropy
from keras.metrics import MeanAbsoluteError, RootMeanSquaredError, Accuracy, BinaryAccuracy, SparseCategoricalAccuracy
from keras.callbacks import History

from schemas import NeuralNetworkHyperparameters

from utils.enum_utils import TaskType

def get_output_neurons(task_type: TaskType, num_classes: int) -> int:
    if task_type == TaskType.REGRESSION or task_type == TaskType.BINARY_CLASSIFICATION:
        return 1
    
    return num_classes

def build_neural_network(hyperparameters: NeuralNetworkHyperparameters, input_shape: int, task_type: TaskType, output_neurons: int) -> Sequential:
    model = Sequential()

    model.add(Input(shape = (input_shape,)))

    for layer in hyperparameters.hidden_layers:
        model.add(Dense(units = layer.neurons, activation=layer.activation))
    
    model.add(Dense(units=output_neurons))

    return model

def compile_neural_network(model: Sequential, hyperparameters: NeuralNetworkHyperparameters, task_type: TaskType) -> None:
    match hyperparameters.optimizer.lower():
        case "adam":
            optimizer = Adam(learning_rate=hyperparameters.learning_rate)
        case "sgd":
            optimizer = SGD(learning_rate=hyperparameters.learning_rate)
        case "rmsprop":
            optimizer = RMSprop(learning_rate=hyperparameters.learning_rate)
        case "adamw":
            optimizer = AdamW(learning_rate=hyperparameters.learning_rate)
        case "adagrad":
            optimizer = Adagrad(learning_rate=hyperparameters.learning_rate)
        case "adadelta":
            optimizer = Adadelta(learning_rate=hyperparameters.learning_rate)
        case "adamax":
            optimizer = Adamax(learning_rate=hyperparameters.learning_rate)
        case "nadam":
            optimizer = Nadam(learning_rate=hyperparameters.learning_rate)
        case "ftrl":
            optimizer = Ftrl(learning_rate=hyperparameters.learning_rate)
        case _:
            raise ValueError(f"Unsupported optimizer")

    
    match task_type:
        case TaskType.REGRESSION:
            loss = MeanSquaredError()
        case TaskType.BINARY_CLASSIFICATION:
            loss = BinaryCrossentropy(from_logits=True)
        case TaskType.MULTICLASS_CLASSIFICATION:
            loss = SparseCategoricalCrossentropy(from_logits=True)
        case _:
            raise ValueError("Unsupported task")
    
    match task_type:
        case TaskType.REGRESSION:
            metrics = [MeanAbsoluteError(), RootMeanSquaredError()]
        case TaskType.BINARY_CLASSIFICATION:
            metrics = [BinaryAccuracy()]
        case TaskType.MULTICLASS_CLASSIFICATION:
            metrics = [SparseCategoricalAccuracy()]
        
        case _:
            metrics = [Accuracy()]

    model.compile(
        optimizer=optimizer,
        loss = loss,
        metrics = metrics
    )

def fit_neural_network(
    model: Sequential, hyperparameters: NeuralNetworkHyperparameters,
    X_train: pd.DataFrame, X_cv: pd.DataFrame,
    y_train: pd.Series, y_cv: pd.Series
) -> tuple[float, History]:
    start_time = perf_counter()

    history = model.fit(
        X_train, y_train, validation_data=(X_cv, y_cv), 
        epochs=hyperparameters.epochs,
        batch_size=hyperparameters.batch_size,
        verbose = 0 # pyright: ignore
    )

    end_time = perf_counter()

    return end_time - start_time, history

def save_neural_network(model: Sequential, project_id: int, run_id: int) -> str:
    model_dir = Path(f"uploads/project_{project_id}/runs/run_{run_id}")
    model_dir.mkdir(parents=True, exist_ok=True)

    model_path = model_dir / "model.keras"

    model.save(model_path)

    return str(model_path)

def save_history(history: History, project_id: int, run_id: int) -> str:
    model_dir = Path(f"uploads/project_{project_id}/runs/run_{run_id}")
    model_dir.mkdir(parents=True, exist_ok=True)

    history_path = model_dir / "history.json"

    clean_history = {k: [float(i) for i in v] for k, v in history.history.items()}

    with open(history_path, "w", encoding='utf-8') as f:
        json.dump(clean_history, f, indent=4, default=float)

    return str(history_path)

def train_neural_network(
    hyperparameters: NeuralNetworkHyperparameters,
    task_type: TaskType,
    X_train: pd.DataFrame, X_cv: pd.DataFrame,
    y_train: pd.Series, y_cv: pd.Series,
    project_id: int, run_id: int, num_classes: int
) -> tuple[Sequential, str, str, float]:
    
    # determine output layer size
    output_neurons = get_output_neurons(task_type, num_classes)
    
    # building our neural network
    model = build_neural_network(hyperparameters=hyperparameters, input_shape=X_train.shape[1], task_type=task_type, output_neurons=output_neurons)

    # compiling the model
    compile_neural_network(model, hyperparameters, task_type)

    # fitting the model onto the data
    training_time, history = fit_neural_network(model, hyperparameters, X_train, X_cv, y_train, y_cv)

    # saving the model
    model_path = save_neural_network(model, project_id, run_id)

    # save history
    history_path = save_history(history, project_id, run_id)

    return model, model_path, history_path, training_time



