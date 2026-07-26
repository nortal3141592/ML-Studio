from typing import Annotated

from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db

from starlette.concurrency import run_in_threadpool

from auth import CurrentProject
import models
from utils.enum_utils import Metric, TaskType
from utils.evaluation_utils import bar_chart_data, calculate_generalization_gap, calculate_all_generalization_gap, generate_insights, load_loss_curve, extract_feature_importance, extract_feature_coefficients, build_leaderboard, build_metric_comparison

from schemas import ClassificationMetrics, RegressionMetrics, MetricComparisonResponse, GeneralizationGapResponse, InsightResponse, LossCurveResponse, FeatureImportanceResponse, FeatureCoefficientResponse, LeaderBoardResponse, MultiModelComparisonResponse

router = APIRouter()

DBSession = Annotated[AsyncSession, Depends(get_db)]

@router.get("/{project_id}/runs/{run_id}/metrics", response_model=ClassificationMetrics | RegressionMetrics)
async def get_metrics(current_project: CurrentProject, run_id: int, db: DBSession):
    result = await db.execute(select(models.TrainingRun).where(models.TrainingRun.id == run_id, models.TrainingRun.project_id == current_project.id))
    training_run = result.scalars().first()

    if not training_run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="The training run that you requested cannot be found or does not exist")

    if training_run.metrics is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Metrics are not available for this training run.")

    return training_run.metrics

@router.get("/{project_id}/runs/{run_id}/bar-chart", response_model = MetricComparisonResponse)
async def get_bar_chart_data(current_project: CurrentProject, run_id: int, metric: Metric, db: DBSession):
    result = await db.execute(select(models.TrainingRun).where(models.TrainingRun.id == run_id, models.TrainingRun.project_id == current_project.id))
    training_run = result.scalars().first()
    
    if not training_run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="The training run that you requested cannot be found or does not exist")

    model_metrics = training_run.metrics
    if model_metrics is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Metrics are not available for this training run.")
    
    task_type = current_project.task_type
    if task_type is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="the task type hasn't been determined yet")

    is_higher_better, train, cv, test = bar_chart_data(model_metrics, task_type, metric)

    return MetricComparisonResponse(
        metric=metric.value,
        higher_is_better = is_higher_better,
        train = train,
        cv = cv,
        test = test
    )

@router.get("/{project_id}/runs/{run_id}/generalization-gap", response_model=GeneralizationGapResponse)
async def get_generalization_gap(current_project: CurrentProject, run_id: int, metric: Metric, db: DBSession):
    result = await db.execute(select(models.TrainingRun).where(models.TrainingRun.id == run_id, models.TrainingRun.project_id == current_project.id))
    training_run = result.scalars().first()
    
    if not training_run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="The training run that you requested cannot be found or does not exist")

    model_metrics = training_run.metrics
    if model_metrics is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Metrics are not available for this training run.")

    task_type = current_project.task_type
    if task_type is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="the task type hasn't been determined yet")   

    train, cv, gap = calculate_generalization_gap(model_metrics, task_type, metric)

    return GeneralizationGapResponse(
        metric = metric.value,
        train = train,
        cv = cv,
        gap = gap
    ) 

@router.get("/{project_id}/runs/{run_id}/generalization-gaps")
async def get_generalization_gaps(current_project: CurrentProject, run_id: int, db: DBSession):
    result = await db.execute(select(models.TrainingRun).where(models.TrainingRun.id == run_id, models.TrainingRun.project_id == current_project.id))
    training_run = result.scalars().first()
    
    if not training_run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="The training run that you requested cannot be found or does not exist")

    model_metrics = training_run.metrics
    if model_metrics is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Metrics are not available for this training run.")

    task_type = current_project.task_type
    if task_type is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="the task type hasn't been determined yet")   

    generalization_gaps = calculate_all_generalization_gap(model_metrics, task_type)

    return generalization_gaps

@router.get("/{project_id}/runs/{run_id}/insights", response_model=list[InsightResponse])
async def get_insights(current_project: CurrentProject, run_id: int, db: DBSession):
    result = await db.execute(select(models.TrainingRun).where(models.TrainingRun.id == run_id, models.TrainingRun.project_id == current_project.id))
    training_run = result.scalars().first()
    
    if not training_run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="The training run that you requested cannot be found or does not exist")

    model_metrics = training_run.metrics
    if model_metrics is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Metrics are not available for this training run.")

    task_type = current_project.task_type
    if task_type is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="the task type hasn't been determined yet")   

    insights = generate_insights(model_metrics, task_type)

    return insights

@router.get("/{project_id}/runs/{run_id}/loss-curve", response_model=LossCurveResponse)
async def get_nn_loss_curve(current_project: CurrentProject, run_id: int, db: DBSession):
    result = await db.execute(select(models.TrainingRun).where(models.TrainingRun.id == run_id, models.TrainingRun.project_id == current_project.id))
    training_run = result.scalars().first()
    
    if not training_run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="The training run that you requested cannot be found or does not exist")

    algorithm = training_run.algorithm
    if algorithm is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Algorithm not found or not specified")

    history_path = training_run.history_path
    if history_path is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="History file not found")

    loss_curve_data = await run_in_threadpool(load_loss_curve, algorithm, history_path)
    return loss_curve_data

@router.get("/{project_id}/runs/{run_id}/feature-importance", response_model=FeatureImportanceResponse)
async def get_feature_importances(current_project: CurrentProject, run_id: int, db: DBSession):
    result = await db.execute(select(models.TrainingRun).where(models.TrainingRun.id == run_id, models.TrainingRun.project_id == current_project.id))
    training_run = result.scalars().first()
    
    if not training_run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="The training run that you requested cannot be found or does not exist")

    if current_project.preprocessor_path is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Preprocessor not found, Data needs to be engineered first")

    if training_run.model_path is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model hasn't been trained yet")

    feature_importance_data = await run_in_threadpool(extract_feature_importance, training_run.model_path, current_project.preprocessor_path)

    return feature_importance_data

@router.get("/{project_id}/runs/{run_id}/coefficients", response_model=FeatureCoefficientResponse)
async def get_coefficients(current_project: CurrentProject, run_id: int, db: DBSession):
    result = await db.execute(select(models.TrainingRun).where(models.TrainingRun.id == run_id, models.TrainingRun.project_id == current_project.id))
    training_run = result.scalars().first()
    
    if not training_run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="The training run that you requested cannot be found or does not exist")

    if current_project.preprocessor_path is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Preprocessor not found, Data needs to be engineered first")

    if training_run.model_path is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model hasn't been trained yet")


    feature_coefficient_data = await run_in_threadpool(extract_feature_coefficients, training_run.model_path, current_project.preprocessor_path)

    return feature_coefficient_data

@router.get("/{project_id}/dashboard/leaderboard", response_model = LeaderBoardResponse)
async def get_project_leaderboard(current_project: CurrentProject,sort_by: Metric, db: DBSession):
    if current_project.task_type is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="the task type of this project hasn't been determined yet")
    return await build_leaderboard(current_project.task_type, current_project.id, db, sort_by)

@router.get("/{project_id}/dashboard/metric-comparison", response_model=MultiModelComparisonResponse)
async def get_multi_model_comparison(current_project: CurrentProject, metric: Metric, db: DBSession):
    if current_project.task_type is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="the task type for this project hasn't been determined yet")

    return await build_metric_comparison(current_project.task_type, current_project.id, metric, db)