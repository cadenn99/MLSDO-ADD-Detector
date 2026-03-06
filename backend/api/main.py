import logging
import os
import random
import re
from bson import ObjectId
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from logging_loki import LokiHandler
from prometheus_client import Counter
from prometheus_fastapi_instrumentator import Instrumentator
from pydantic import BaseModel
from pymongo import MongoClient
from starlette.concurrency import run_in_threadpool
from celery_app import celery_instance
from celery import group
from celery.result import GroupResult
from utils.utils import serialize_mongo_doc
from fastapi import status

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
LOKI_ENDPOINT = os.environ.get("LOKI_ENDPOINT")
MONGO_URI = os.environ.get("MONGO_URI")


# MLflow Model Registry URI used by the API to load the "champion" model.
MODEL_URI = "models:/logistic_regression_tfidf_baseline@champion"

# -----------------------------------------------------------------------------
# Logging (Loki)
# -----------------------------------------------------------------------------
if LOKI_ENDPOINT is None:
    raise RuntimeError("LOKI_ENDPOINT environment variable not set")

if MONGO_URI is None:
    raise RuntimeError("MONGO_URI environment variable not set")

loki_logs_handler = LokiHandler(
        url=LOKI_ENDPOINT,
        tags={"application": "celery-worker"},
        version="1",
    )

logger = logging.getLogger("fastapi_cli")
logger.addHandler(loki_logs_handler)

# Forward Uvicorn logs to Loki as well
logging.getLogger("uvicorn.access").addHandler(loki_logs_handler)
logging.getLogger("uvicorn.error").addHandler(loki_logs_handler)


# -----------------------------------------------------------------------------
# App + Observability (Prometheus)
# -----------------------------------------------------------------------------
app = FastAPI()

# Expose metrics at /metrics
instrumentator = Instrumentator().instrument(app).expose(app)

PREDICTION_COUNT = Counter(
    "model_prediction_samples_total",
    "Number of samples for which the model has to make predictions"
)
print(f"LOKI_ENDPOINT from env: {LOKI_ENDPOINT}")

# -----------------------------------------------------------------------------
# CORS
# -----------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://mlops.digital-lab.dev", "http://localhost"], 
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True
)

@app.get("/health")
def health_check():
    """
    Health check endpoint.

    Returns:
        A status indicating the API is running.
    """
    return {"status": "ok"}


@app.get("/random")
async def get_random_issue():
    """
    Return a random Jira issue document for demo/testing.

    This function:
    - Connects to MongoDB (`JiraRepos` database).
    - Randomly selects a Jira project collection.
    - Samples documents until it finds one with both summary and description text.
    - Runs blocking PyMongo calls in a threadpool to avoid blocking the event loop.
    - Returns a JSON-serializable representation of the MongoDB document.
    """
    client = MongoClient(MONGO_URI)
    jira_db = client["JiraRepos"]

    collections = await run_in_threadpool(jira_db.list_collection_names)
    collection = random.choice(collections)

    def sample_one_issue():
        return next(
            jira_db[collection].aggregate([{"$sample": {"size": 1}}]),
            None,
        )
    
    while True:
        random_issue = await run_in_threadpool(sample_one_issue)
        if not random_issue:
            continue

        fields = random_issue.get("fields") or {}
        if not isinstance(fields, dict):
            continue

        summary = fields.get("summary")
        description = fields.get("description")

        if bool(summary) and bool(description):
            return serialize_mongo_doc(random_issue)


class IssueText(BaseModel):
    """
    Minimal issue text payload used for model inference.
    """
    summary: str
    description: str


class PredictSingleRequest(BaseModel):
    """
    Request schema for single-issue prediction.
    """
    issue: IssueText


class PredictBatchRequest(BaseModel):
    """
    Request schema for batch prediction.
    """
    issues: list[IssueText]


@app.post("/predict", status_code=status.HTTP_202_ACCEPTED)
@app.post("/predict/single", status_code=status.HTTP_202_ACCEPTED)
async def predict_single(payload: PredictSingleRequest):
    """
    Predict whether a single issue contains an ADD (asynchronous inference).

    This endpoint:
    - Increments the Prometheus prediction counter.
    - Validates input against PredictSingleRequest.
    - Enqueues an inference job to a Celery worker (separate process) instead of
    performing preprocessing/prediction inside the request handler.
    - Returns immediately with HTTP 202 Accepted and a task id that can be polled.

    Args:
        payload: PredictSingleRequest containing a single issue with `summary` and
            `description`.

    Returns:
        A JSON object containing:
        - task_id: str, Celery task identifier for this inference request.

    Notes:
        Retrieve the prediction result by calling `GET /result/{task_id}`. The result
        endpoint returns the Celery task status and (once finished) the predicted
        label.

    Raises:
        HTTPException(500): If task submission to Celery fails.
    """

    PREDICTION_COUNT.inc()
    try:
        task = celery_instance.send_task("tasks.run_inference", args=[payload.issue.model_dump()])
        return {"task_id": task.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.get("/result/{task_id}")
async def get_result(task_id: str):
    """
    Retrieve the status and (if available) result of an asynchronous inference task.

    This endpoint:
    - Looks up a Celery task by its `task_id`.
    - Returns the current task state (e.g., PENDING, STARTED, SUCCESS, FAILURE).
    - Returns the prediction result in the `sentiment` field once the task has finished.

    Args:
        task_id: Celery task identifier returned by `POST /predict` or `POST /predict/single`.

    Returns:
        A JSON object containing:
        - status: str, Celery task state.
        - sentiment: int | Any, the predicted class label (0 = NOT_ADD, 1 = ADD) when
        `status == "SUCCESS"`. For non-success states, this may be `None` or an
        error/exception payload depending on Celery configuration.

    Raises:
        HTTPException(500): If the task lookup fails unexpectedly.
    """
    try:
        result = celery_instance.AsyncResult(task_id)
        return {"status": result.status, "sentiment": result.result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/predict/batch", status_code=status.HTTP_202_ACCEPTED)
async def predict_batch(payload: PredictBatchRequest):
    """
    Predict whether each issue in a batch contains an ADD (asynchronous batch inference).

    This endpoint:
    - Increments the Prometheus prediction counter.
    - Validates input against PredictBatchRequest.
    - Enqueues one Celery inference task per issue using a Celery group, allowing the
    prediction workload to run in separate worker processes.
    - Returns immediately with HTTP 202 Accepted and a batch id that can be polled.

    Notes:
        The frontend may also submit multiple single predictions in parallel. This
        endpoint exists for explicit server-side batch submission and rubric
        compliance.

    Args:
        payload: PredictBatchRequest containing a list of issues with `summary` and
            `description`.

    Returns:
        A JSON object containing:
        - batch_id: str, Celery group identifier for this batch job.

    Raises:
        HTTPException(500): If batch task submission to Celery fails.
    """
    PREDICTION_COUNT.inc()

    try:
        job = group(
            celery_instance.signature("tasks.run_inference", args=[issue.model_dump()]) 
            for issue in payload.issues
        )
        result = job.apply_async()
        result.save()
        return {
            "batch_id": result.id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.get('/batch-result/{batch_id}')
async def get_batch_result(batch_id: str):
    """
    Retrieve the status and (if available) results of an asynchronous batch inference job.

    This endpoint:
    - Restores a Celery GroupResult using the `batch_id` returned by `POST /predict/batch`.
    - Returns NOT_FOUND if the batch result cannot be restored (e.g., unknown id or
    result backend not configured / result expired).
    - Returns PENDING until all tasks in the group have completed.
    - Returns SUCCESS with the list of prediction results once the group is ready.

    Args:
        batch_id: Celery group identifier returned by `POST /predict/batch`.

    Returns:
        A JSON object containing:
        - status: str, one of {"NOT_FOUND", "PENDING", "SUCCESS"}.
        - results: list, the list of task results in submission order when
        `status == "SUCCESS"`, otherwise an empty list.

    Raises:
        HTTPException(500): If restoring or joining the batch result fails unexpectedly.
    """
    try:
        group_res = GroupResult.restore(batch_id, app=celery_instance)
        if not group_res:
            return {"status": "NOT_FOUND"}
        
        return {
                "status": "SUCCESS" if group_res.ready() else "PENDING",
                "results": group_res.join() if group_res.ready() else [],
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.get("/search")
async def search_issues(keyword: str = Query(None)):
    """
    Search stored ADD issues by keyword.

    This function:
    - Queries the `ADDIssues.issues` collection in MongoDB.
    - If no keyword is provided, returns an empty list.
    - Uses a case-insensitive regex to match the keyword in:
      - fields.summary
      - fields.description
    - Returns a list of matching MongoDB document IDs as strings.
    """
    client = MongoClient(MONGO_URI)
    add_db = client["ADDIssues"]["issues"]

    if keyword is None or keyword.strip() == "":
        return []

    regex = re.compile(keyword, re.IGNORECASE)
    mongo_query = {
        "$or": [
            {"fields.summary": regex},
            {"fields.description": regex}
        ]
    }

    results = await run_in_threadpool( 
        lambda: list(add_db.find(mongo_query, {"_id": 1}))
    )
    return [str(r["_id"]) for r in results]


@app.get("/issue/{issue_id}")
async def get_issue_by_id(issue_id: str):
    """
    Retrieve a single issue by MongoDB ObjectId.

    This function:
    - Converts the provided string `issue_id` into a BSON ObjectId.
    - Looks up the document in `ADDIssues.issues`.
    - Returns the full issue document in a JSON-serializable format.
    - Runs blocking PyMongo calls in a threadpool to avoid blocking the event loop.

    Raises:
        HTTPException(422): if the issue_id is not a valid ObjectId.
        HTTPException(404): if the issue is not found.
    """
    client = MongoClient(MONGO_URI)
    add_db = client["ADDIssues"]["issues"]

    try:
        obj_id = ObjectId(issue_id)
    except Exception as e:
        raise HTTPException(status_code=422, detail="Invalid issue ID") from e
    
    issue = await run_in_threadpool(add_db.find_one, {"_id": obj_id})
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    return serialize_mongo_doc(issue)