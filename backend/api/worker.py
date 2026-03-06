"""
Celery worker module for ML model inference tasks.

This module defines Celery tasks for running machine learning inference
on GitHub issues using a pre-trained logistic regression model. It includes
worker initialization with Loki logging integration and lazy model loading
for efficient resource usage.
"""

import logging
import os
from multiprocessing import Queue

import mlflow
from celery.signals import worker_process_init
from logging_loki import LokiQueueHandler

from celery_app import celery_instance
from utils.utils import preprocess_input


# Environment configuration
LOKI_ENDPOINT = os.environ.get("LOKI_ENDPOINT")

# Global model instance (lazy loaded per worker process)
model = None

# Logger for Celery worker processes
logger = logging.getLogger('celery_logger')


@worker_process_init.connect
def init_worker(**kwargs):
    """
    Initialize worker process with Loki logging handler.
    
    This function is called once per worker process on startup via
    Celery's worker_process_init signal. It configures a LokiQueueHandler
    to send logs to the Grafana Loki instance for centralized logging.
    
    Args:
        **kwargs: Arbitrary keyword arguments passed by Celery signal.
    
    Note:
        Model loading is intentionally NOT performed here to avoid
        startup hangs. Models are lazy-loaded on first task execution.
    """
    handler = LokiQueueHandler(
        Queue(-1),
        url=LOKI_ENDPOINT,
        tags={"application": "celery-worker"},
        version="1",
    )
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    logger.info("Worker process initialized and logging attached.")


@celery_instance.task(name="tasks.run_inference")
def run_inference(issue_dict):
    """
    Run ML inference on a GitHub issue to predict its classification.
    
    This task performs lazy loading of the MLflow model on first execution,
    then preprocesses the input issue data and generates a prediction using
    the champion logistic regression model.
    
    Args:
        issue_dict (dict): Dictionary containing GitHub issue data with
            fields required by the preprocessing pipeline.
    
    Returns:
        int: Predicted class label (0 or 1) for the issue.
    
    Raises:
        Exception: If model loading fails or inference encounters an error.
    
    Example:
        >>> issue = {"title": "Bug report", "body": "Application crashes"}
        >>> result = run_inference.delay(issue)
        >>> prediction = result.get()
    """
    global model
    
    # Lazy load model on first task execution
    if model is None:
        try:
            logger.info("Loading model for the first time...")
            model = mlflow.sklearn.load_model(
                "models:/logistic_regression_tfidf@champion"
            )
        except Exception as e:
            logger.error(f"Model load failed: {e}")
            raise

    # Perform inference
    try:
        processed = preprocess_input(issue_dict)
        prediction = model.predict(processed)
        logger.info(f"Inference complete. Result: {int(prediction[0])}")
        return int(prediction[0])
    except Exception as e:
        logger.error(f"Error during inference: {e}")
        raise
