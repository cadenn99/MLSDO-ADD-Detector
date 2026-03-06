"""
Celery application configuration module.

This module initializes and configures the Celery application instance
used for distributed task processing. It uses Redis as both the message
broker and result backend for managing task queues and storing task results.
"""

import os

from celery import Celery


# Redis connection URL from environment
REDIS_URL = os.environ.get("REDIS_URL")

# Celery application instance
celery_instance = Celery(
    "prediction_tasks",
    broker=REDIS_URL,
    backend=REDIS_URL,
    result_extended=True
)
