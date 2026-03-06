import os
import subprocess

import mlflow
import mlflow.sklearn  
import pandas as pd
from mlflow import MlflowClient
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, accuracy_score, f1_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from mlflow.entities import ViewType
from mlflow.exceptions import MlflowException

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
DATA_PATH = "./data/processing/dataset_cleaned.parquet"

MLFLOW_TRACKING_URI = os.getenv("MLFLOW_TRACKING_URI", "http://localhost:5000")
MLFLOW_S3_ENDPOINT_URL = os.getenv("MLFLOW_S3_ENDPOINT_URL", "http://localhost:9000")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID", "minio_access_key")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "minio_secret_key")


def configure_mlflow_env() -> None:
    """
    Configure MLflow-related environment variables.

    This function:
    - Ensures MLflow tracking URI is set (where runs/metrics are logged).
    - Ensures the S3 endpoint is set (where artifacts/models are stored; e.g. MinIO).
    - Ensures credentials are present for the artifact store.
    """
    os.environ["MLFLOW_TRACKING_URI"] = MLFLOW_TRACKING_URI
    os.environ["MLFLOW_S3_ENDPOINT_URL"] = MLFLOW_S3_ENDPOINT_URL
    os.environ["AWS_ACCESS_KEY_ID"] = AWS_ACCESS_KEY_ID
    os.environ["AWS_SECRET_ACCESS_KEY"] = AWS_SECRET_ACCESS_KEY


def ensure_data() -> None:
    """
    Ensure the cleaned dataset is available locally.

    This function:
    - Checks whether DATA_PATH exists.
    - If missing, tries to pull it via DVC (expects a matching .dvc file).
    - Raises FileNotFoundError if the dataset is still missing after the pull.
    """
    if not os.path.exists(DATA_PATH):
        print(f"{DATA_PATH} not found, attempting to pull with DVC")
        subprocess.run(["dvc", "pull", DATA_PATH + ".dvc", "-q"], check=True)

    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(
            f"Could not find {DATA_PATH} even after 'dvc pull'."
        )


def build_pipeline() -> Pipeline:
    """
    Build the scikit-learn training pipeline.

    The pipeline consists of:
    - TfidfVectorizer to convert text into TF-IDF features.
    - LogisticRegression as a linear classifier.

    Returns:
        A scikit-learn Pipeline ready to be fit.
    """
    return Pipeline(
        steps=[
            (
                "tfidf",
                TfidfVectorizer(
                    max_features=20_000,
                    ngram_range=(1, 2),
                    min_df=3,
                ),
            ),
            (
                "logreg",
                LogisticRegression(
                    max_iter=1000,
                    class_weight="balanced",
                    n_jobs=-1,
                ),
            ),
        ]
    )


def main() -> None:
    """
    Run training, evaluation, and MLflow registration.

    This function:
    - Configures MLflow environment variables.
    - Loads the cleaned dataset.
    - Splits it into train/test sets with stratification.
    - Trains the model pipeline.
    - Evaluates performance and logs metrics.
    - Logs/registers the model and sets the "champion" alias to the model with the highest test_f1_macro score.
    """
    configure_mlflow_env()

    # Uncomment if you want to pull data via DVC when it's not present.
    # ensure_data()

    print(f"Loading data from {DATA_PATH}")
    df = pd.read_parquet(DATA_PATH)

    X = df["clean_text"]
    y = df["any_add"].astype(int)

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    clf = build_pipeline()

    mlflow.set_experiment("ADD Classifier" )
    mlflow.autolog(log_models=False)

    with mlflow.start_run(run_name="logistic_regression_tfidf"):

        print("Training model") 
        clf.fit(X_train, y_train)

        print("Evaluating on test set")
        y_pred = clf.predict(X_test)

        print(classification_report(y_test, y_pred, digits=3))

        test_acc = accuracy_score(y_test, y_pred)
        test_f1_macro = f1_score(y_test, y_pred, average="macro")
        test_f1_pos = f1_score(y_test, y_pred, pos_label=1)

        mlflow.log_metric("test_accuracy", test_acc)
        mlflow.log_metric("test_f1_macro", test_f1_macro)
        mlflow.log_metric("test_f1_add_class", test_f1_pos)

        mlflow.sklearn.log_model(
            clf,
            name='trained-model'
        )

    best_run_id = mlflow.search_runs(
        experiment_names=["ADD Classifier"],
        run_view_type=ViewType.ACTIVE_ONLY,
        order_by=["metrics.test_f1_macro DESC"]
    ).iloc[0]["run_id"]
    
    client = MlflowClient()
    
    try:
        champion_id = client.get_model_version_by_alias('logistic_regression_tfidf', 'champion').run_id
        if champion_id == best_run_id:
            print("Best model is already the champion, no update needed.")
            return
    except MlflowException:
        print("No existing champion model found, proceeding to register the best model as champion.")
        
    mv = mlflow.register_model(f"runs:/{best_run_id}/trained-model", 'logistic_regression_tfidf')
    client.set_registered_model_alias(
        name='logistic_regression_tfidf',
        alias='champion',
        version=mv.version
    )

if __name__ == "__main__":
    main()
