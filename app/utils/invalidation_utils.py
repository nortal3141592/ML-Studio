# from typing import Annotated
# from sqlalchemy.ext.asyncio import AsyncSession
# from database import get_db
# from fastapi import Depends

# import models
# from enum_utils import DatasetStage
# from pathlib import Path
# from sqlalchemy import delete

# from file_utils import cleanup_delete
# # ================================ ALL POSSIBLE THINGS THAT MIGHT BE NEEDED TO DELETED =======================
# """
# Currently there are two places which store data- 
# - `uploads` folder
# - the actual database

# no matter the project stage always delete - 
# - currnet_project.training runs
# - and all of the folders inside project_{project_id}/ of the type run_{run_id}/ 
# """
# # =============================================================================================================

# def invalidate_downstream(current_project: models.Project, stage: DatasetStage):
#     if stage == DatasetStage.RAW:
#         cleanup_delete(current_project.id, DatasetStage.CLEANED)
#         cleanup_delete(current_project.id, DatasetStage.ENGINEERED)

#         current_project.cleaned_dataset_path = None
#         current_project.cleaned_metadata = None

#         current_project.engineered_dataset_path = None
#         current_project.engineered_metadata = None
    
#     elif stage == DatasetStage.CLEANED:
#         cleanup_delete(current_project.id, DatasetStage.ENGINEERED)

#         current_project.engineered_dataset_path = None
#         current_project.engineered_metadata = None

    
