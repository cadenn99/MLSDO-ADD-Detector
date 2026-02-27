# MLSDO Group 4 — ADD Finder


A dockerized ML system that detects Architectural Design Decisions (ADDs) in Jira issues, supports async inference via Celery, and includes monitoring (Prometheus/Grafana) and logging (Loki).


## Services and URLs


When running locally (compose + override), you’ll typically have these endpoints available: MongoDB `localhost:27017`, MLflow `localhost:5000`, MinIO `localhost:9000` (console `localhost:9001`), Prometheus `localhost:9090`, Grafana `localhost:3000`, Loki `localhost:3100`, Redis `localhost:6379`, Mongo Express `localhost:8081`, API `localhost:8000`, Frontend `http://localhost/` (port 80).
Note: `docker-compose.yml` declares the `mlsdo` network as `external: true`, so you must create it once before the first run.


## Run locally


1) Create a `.env` file at repo root (required). At minimum you need the variables used by the compose stack and API:


- `MINIO_ROOT_PASSWORD`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MLFLOW_PASS`, `MONGO_PASS`, `PG_PASS`, `GRAFANA_PASS`
- `REDIS_URL=redis://redis:6379/0`, `MLFLOW_TRACKING_URI=http://mlflow:5000`, `MLFLOW_S3_ENDPOINT_URL=http://minio-mlflow:9000`, `MONGO_URI=mongodb://mongodb:27017`, `LOKI_ENDPOINT=http://loki:3100/loki/api/v1/push`


2) Start the stack:
```bash
docker compose up -d --build
```


This will start infra from `docker-compose.yml` plus `api` and `frontend` from `docker-compose.override.yml`.


3) Verify core health:
```bash
curl http://localhost:8000/health
```


You should get `{"status":"ok"}`.


## API usage (async inference)


Base URL: `http://localhost:8000`.


- Health:
    - `GET /health`[^2]
- Demo helper (random Jira issue from MongoDB `JiraRepos`):
    - `GET /random`
- Predict single issue (async; returns task id):
    - `POST /predict` or `POST /predict/single` → `{ "task_id": "..." }`
    - Poll: `GET /result/{task_id}` → `{ "status": "...", "sentiment": ... }`
- Predict batch (async; returns batch id):
    - `POST /predict/batch` → `{ "batch_id": "..." }`
    - Poll: `GET /batch-result/{batch_id}` → `{ "status": "PENDING|SUCCESS|NOT_FOUND", "results": [...] }`
- Keyword search over ADD-only collection:
    - `GET /search?keyword=...` → list of Mongo `_id`s
    - `GET /issue/{issue_id}` → full document from `ADDIssues.issues`


Example: enqueue single prediction and poll for result:


```bash
TASK_ID=$(curl -s -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"issue":{"summary":"Example","description":"Example description"}}' | jq -r .task_id)


curl http://localhost:8000/result/$TASK_ID
```


The first call should return `202 Accepted` and the task id; the second call returns the task status and result when ready.


We used celery to ensure that the prediction requests are non-blocking to meet the rubric requirements.  
## Data processing and training


Processing scripts (run from repo root) assume MongoDB dumps are restored into `MiningDesignDecisions` and `JiraRepos`.


- Build cleaned dataset for training:


```bash
python data/processing/etl_pipeline.py
```


This writes `data/processing/dataset_cleaned.parquet` after cleaning and Pandera validation.


- Build ADD-only MongoDB collection for search (`ADDIssues.issues`):


```bash
python data/processing/process_ADD_db.py
```


This copies only issues labeled as ADDs into a dedicated collection used by the API `/search` and `/issue/{id}` endpoints.


- Train baseline model + register to MLflow:


```bash
python data/training/train_model.py
```


This logs metrics to MLflow and registers the best run as a model with alias `champion`.


Important consistency note: `train_model.py` registers the model as `logistic_regression_tfidf`, while the API is currently configured to load `models:/logistic_regression_tfidf_baseline@champion`—these names must match for the API to load the trained model from the registry.


## CI/CD (GitLab → remote VM)


The pipeline builds backend/frontend images in GitLab CI, pushes them to the GitLab Container Registry, then deploys to a long-lived VM (rsync repo, create `.env`, pull images, run compose).


It also supports data + ML automation on the VM: `dvc pull`, Mongo restore from archives, building the ADD-only Mongo collection, running ETL, running training, and finally deploying API and frontend containers.




## Versioning of Data
In this project we version the raw dataset and the new labelled data using DVC. The DVC pulls the latest data. We conducted data transformations using the etl_pipeline and validated using panderas. We versioned the final training of the model using MLflow to determine and select the best model corresponding on the F1-score, giving it the alias "champion".




## API documentation
API documentation can be found at this URL:
https://mlops.digital-lab.dev/docs?warpgate-target=Group%204%20HTTP%20Backend#/
