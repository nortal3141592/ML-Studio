from utils.enum_utils import Metric, TaskType, Algorithm
import models
from fastapi import HTTPException, status
from schemas import InsightResponse, RegressionMetrics, ClassificationMetrics, LossCurveResponse, FeatureImportance, FeatureImportanceResponse, FeatureCoefficient, FeatureCoefficientResponse
import json

from pathlib import Path
import joblib

IS_HIGHER_BETTER_MAP = {
    Metric.LOSS: False,
    Metric.MAE: False,
    Metric.RMSE: False,
    Metric.R2: True,
    Metric.ACCURACY: True,
    Metric.PRECISION: True,
    Metric.RECALL: True,
    Metric.F1: True
}

def bar_chart_data(model_metrics: dict, task_type: str, metric: Metric)->tuple[bool, float, float, float]:
    match metric:
        case (Metric.R2 | Metric.MAE | Metric.RMSE):
            if task_type != TaskType.REGRESSION.value:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot request this metric - {metric.value} for task type - {task_type}")

        case(Metric.ACCURACY | Metric.PRECISION | Metric.RECALL | Metric.F1):
            if task_type == TaskType.REGRESSION.value:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot request this metric - {metric.value} for task type - {task_type}")

    is_higher_better = IS_HIGHER_BETTER_MAP[metric]
    train = model_metrics[f'train_{metric.value}']
    cv = model_metrics[f'cv_{metric.value}']
    test = model_metrics[f'test_{metric.value}']

    return is_higher_better, train, cv, test

def calculate_generalization_gap(model_metrics: dict, task_type: str, metric: Metric) -> tuple[float, float, float]:
    match metric:
        case (Metric.R2 | Metric.MAE | Metric.RMSE):
            if task_type != TaskType.REGRESSION.value:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot request this metric - {metric.value} for task type - {task_type}")
    
        case(Metric.ACCURACY | Metric.PRECISION | Metric.RECALL | Metric.F1):
            if task_type == TaskType.REGRESSION.value:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot request this metric - {metric.value} for task type - {task_type}")

    is_higher_better = IS_HIGHER_BETTER_MAP[metric]
    train = model_metrics[f'train_{metric.value}']
    cv = model_metrics[f'cv_{metric.value}']

    gap = cv - train
    if is_higher_better == True:
        gap = train - cv

    return train, cv, gap

def calculate_all_generalization_gap(model_metrics: dict, task_type: str) -> dict:
    regression_metric_points = [Metric.MAE, Metric.RMSE, Metric.R2]
    classification_metric_points = [Metric.ACCURACY, Metric.PRECISION, Metric.RECALL, Metric.F1]

    generalization_dict = {
        Metric.LOSS.value: {
            "train": model_metrics["train_loss"],
            "cv": model_metrics["cv_loss"],
            "gap": model_metrics['cv_loss'] - model_metrics["train_loss"]
        }
    }

    if task_type == TaskType.REGRESSION.value:
        for metric_point in regression_metric_points:
            train, cv, gap = calculate_generalization_gap(model_metrics, task_type, metric_point)

            generalization_dict.update({metric_point.value: {"train": train, "cv": cv, "gap": gap}})

    elif task_type == TaskType.BINARY_CLASSIFICATION.value or task_type == TaskType.MULTICLASS_CLASSIFICATION.value:
        for metric_point in classification_metric_points:
                train, cv, gap = calculate_generalization_gap(model_metrics, task_type, metric_point)
                generalization_dict.update({metric_point.value: {"train": train, "cv": cv, "gap": gap}})

    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid task type - {task_type}")


    return generalization_dict



def generate_regression_insights(metrics: RegressionMetrics) -> list[InsightResponse]:
    insights: list[InsightResponse] = []

    # =========================================================================
    # R² Interpretation
    # =========================================================================

    if metrics.test_r2 >= 0.90:
        insights.append(
            InsightResponse(
                title="Excellent explanatory power",
                description=f"The model explains approximately {metrics.test_r2 * 100:.1f}% of the variance in the target variable on the test dataset.",
                severity="success",
            )
        )

    elif metrics.test_r2 >= 0.70:
        insights.append(
            InsightResponse(
                title="Strong explanatory power",
                description=f"The model explains approximately {metrics.test_r2 * 100:.1f}% of the variance in the target variable on the test dataset.",
                severity="info",
            )
        )

    elif metrics.test_r2 >= 0:
        insights.append(
            InsightResponse(
                title="Limited explanatory power",
                description=f"The model explains approximately {metrics.test_r2 * 100:.1f}% of the variance in the target variable. There is still substantial unexplained variation.",
                severity="warning",
            )
        )

    else:
        insights.append(
            InsightResponse(
                title="Negative R² score",
                description="The model performs worse than simply predicting the average target value, suggesting it has failed to capture useful relationships in the data.",
                severity="error",
            )
        )

    # =========================================================================
    # RMSE vs MAE
    # =========================================================================

    ratio = metrics.test_rmse / metrics.test_mae

    if ratio >= 1.5:
        insights.append(
            InsightResponse(
                title="Large prediction errors detected",
                description="RMSE is substantially larger than MAE, suggesting a small number of predictions have much larger errors than the rest.",
                severity="warning",
            )
        )

    elif ratio >= 1.2:
        insights.append(
            InsightResponse(
                title="Some large prediction errors",
                description="RMSE is moderately larger than MAE, indicating the presence of a few larger prediction errors.",
                severity="info",
            )
        )

    else:
        insights.append(
            InsightResponse(
                title="Prediction errors are fairly consistent",
                description="RMSE and MAE are relatively close, indicating prediction errors are fairly evenly distributed without many extreme outliers.",
                severity="success",
            )
        )

    # =========================================================================
    # Generalization
    # =========================================================================

    r2_gap = metrics.train_r2 - metrics.cv_r2

    if r2_gap >= 0.15:
        insights.append(
            InsightResponse(
                title="Possible overfitting",
                description="Training performance is noticeably better than cross-validation performance, suggesting the model may not generalize well to unseen data.",
                severity="warning",
            )
        )

    elif r2_gap <= -0.05:
        insights.append(
            InsightResponse(
                title="Validation outperforms training",
                description="Cross-validation performance is slightly better than training performance. This can happen due to randomness or regularization and is usually not a concern.",
                severity="info",
            )
        )

    else:
        insights.append(
            InsightResponse(
                title="Good generalization",
                description="Training and cross-validation performance are similar, suggesting the model generalizes well.",
                severity="success",
            )
        )

    return insights

def generate_classification_insights(metrics: ClassificationMetrics) -> list[InsightResponse]:
    insights: list[InsightResponse] = []

    # =========================================================================
    # Overall Accuracy
    # =========================================================================

    if metrics.test_accuracy >= 0.90:
        insights.append(
            InsightResponse(
                title="Excellent classification accuracy",
                description=f"The model correctly classifies approximately {metrics.test_accuracy * 100:.1f}% of the test samples.",
                severity="success",
            )
        )

    elif metrics.test_accuracy >= 0.75:
        insights.append(
            InsightResponse(
                title="Strong classification accuracy",
                description=f"The model correctly classifies approximately {metrics.test_accuracy * 100:.1f}% of the test samples.",
                severity="info",
            )
        )

    elif metrics.test_accuracy >= 0.50:
        insights.append(
            InsightResponse(
                title="Moderate classification accuracy",
                description="The model performs better than random guessing on many problems, but there is considerable room for improvement.",
                severity="warning",
            )
        )

    else:
        insights.append(
            InsightResponse(
                title="Low classification accuracy",
                description="The model struggles to correctly classify samples and may require better features, additional data, or different hyperparameters.",
                severity="error",
            )
        )

    # =========================================================================
    # Precision vs Recall
    # =========================================================================

    difference = abs(metrics.test_precision - metrics.test_recall)

    if difference <= 0.05:
        insights.append(
            InsightResponse(
                title="Balanced precision and recall",
                description="The classifier maintains a good balance between avoiding false positives and detecting positive cases.",
                severity="success",
            )
        )

    elif metrics.test_precision > metrics.test_recall:
        insights.append(
            InsightResponse(
                title="Precision prioritized over recall",
                description="The classifier makes relatively few false positive predictions but misses more actual positive cases. This behavior is desirable when false positives are expensive.",
                severity="info",
            )
        )

    else:
        insights.append(
            InsightResponse(
                title="Recall prioritized over precision",
                description="The classifier detects most positive cases but produces more false positives. This behavior is desirable when missing a positive case is more costly than investigating extra false alarms.",
                severity="info",
            )
        )

    # =========================================================================
    # F1 Score
    # =========================================================================

    if metrics.test_f1 >= 0.90:
        insights.append(
            InsightResponse(
                title="Excellent overall balance",
                description="The F1 score indicates an excellent balance between precision and recall.",
                severity="success",
            )
        )

    elif metrics.test_f1 >= 0.75:
        insights.append(
            InsightResponse(
                title="Good precision-recall balance",
                description="The F1 score suggests the classifier maintains a healthy balance between precision and recall.",
                severity="info",
            )
        )

    elif metrics.test_f1 >= 0.50:
        insights.append(
            InsightResponse(
                title="Moderate precision-recall balance",
                description="The classifier achieves a reasonable balance between precision and recall, but improvements are still possible.",
                severity="warning",
            )
        )

    else:
        insights.append(
            InsightResponse(
                title="Poor precision-recall balance",
                description="The low F1 score suggests the classifier struggles to balance precision and recall effectively.",
                severity="error",
            )
        )

    # =========================================================================
    # Generalization
    # =========================================================================

    accuracy_gap = metrics.train_accuracy - metrics.cv_accuracy

    if accuracy_gap >= 0.10:
        insights.append(
            InsightResponse(
                title="Possible overfitting",
                description="Training accuracy is noticeably higher than cross-validation accuracy, suggesting the model may have memorized training patterns rather than learning relationships that generalize well.",
                severity="warning",
            )
        )

    elif accuracy_gap <= -0.03:
        insights.append(
            InsightResponse(
                title="Validation outperforms training",
                description="Cross-validation accuracy is slightly higher than training accuracy. Small differences like this are usually caused by randomness or regularization and are not generally a concern.",
                severity="info",
            )
        )

    else:
        insights.append(
            InsightResponse(
                title="Good generalization",
                description="Training and cross-validation accuracy are very similar, indicating the classifier generalizes well to unseen data.",
                severity="success",
            )
        )

    return insights

def generate_insights(model_metrics: dict, task_type: str) -> list[InsightResponse]:
    if task_type == TaskType.REGRESSION.value:
        return generate_regression_insights(RegressionMetrics.model_validate(model_metrics))

    elif task_type == TaskType.BINARY_CLASSIFICATION.value or task_type == TaskType.MULTICLASS_CLASSIFICATION.value:
        return generate_classification_insights(ClassificationMetrics.model_validate(model_metrics))

    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail = f"Invalid task type - {task_type}")

def load_loss_curve(algorithm: str, history_path: str) -> LossCurveResponse:
    if algorithm != Algorithm.NEURAL_NETWORK.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail = f"Cannot generate loss curve for {algorithm}. Loss curves can only be generated for {Algorithm.NEURAL_NETWORK.value}s")

    
    with open(history_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    if "loss" not in data or "val_loss" not in data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail = "History file is missing loss information.")

    if len(data["loss"]) != len(data["val_loss"]):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail = "Training and validation loss have different lengths.")

    epochs = list(range(1, len(data["loss"]) + 1))


    return LossCurveResponse(
        epochs=epochs,
        train_loss=data["loss"],
        cv_loss = data['val_loss']
    )

def load_training_model(model_path: str):
    path = Path(model_path)

    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail = f"Model file not found: {model_path}")

    return joblib.load(path)

def load_preprocessor(preprocessor_path: str):
    path = Path(preprocessor_path)

    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail = f"Preprocessor file not found : {preprocessor_path}")

    return joblib.load(path)

def extract_feature_importance(model_path: str, preprocessor_path: str) -> FeatureImportanceResponse:
    model, preprocessor = load_training_model(model_path), load_preprocessor(preprocessor_path)

    if not hasattr(model, "feature_importances_"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail = "This model does not expose feature importances")

    feature_names = preprocessor.get_feature_names_out()

    feature_importances = model.feature_importances_

    if len(feature_names) != len(feature_importances):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail = "Feature names and feature importances have different lengths.")

    pairs = list(zip(feature_names, feature_importances))

    sorted_pairs = sorted(pairs, key = lambda pair: pair[1], reverse=True)

    features = []

    for feature_name, importance in sorted_pairs:
        features.append(FeatureImportance(feature=feature_name, importance=float(importance)))

    return FeatureImportanceResponse(features=features)

def extract_feature_coefficients(model_path: str, preprocessor_path: str) -> FeatureCoefficientResponse:
    model, preprocessor = load_training_model(model_path), load_preprocessor(preprocessor_path)

    if not hasattr(model, "coef_"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail = "This model does not expose coefficients")

    coefficients = model.coef_

    if coefficients.ndim == 2:
        if coefficients.shape[0] == 1:
            coefficients = coefficients[0]
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail = "Coefficient visualization is currently only supported for regression and binary classification")

    feature_names = preprocessor.get_feature_names_out()

    if len(feature_names) != len(coefficients):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail = "Feature names and coefficients have different lengths.")

    pairs = list(zip(feature_names, coefficients))

    sorted_pairs = sorted(pairs, key = lambda pair: abs(pair[1]), reverse=True)

    features = []

    for feature_name, coeff in sorted_pairs:
        features.append(FeatureCoefficient(feature=feature_name, coefficient=float(coeff)))

    return FeatureCoefficientResponse(features=features)