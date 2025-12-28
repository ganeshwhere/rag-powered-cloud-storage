#!/bin/bash

# Start Celery worker for RAG Document System
# Usage: ./scripts/start_celery.sh

# Set environment variables
export PYTHONPATH="${PYTHONPATH}:$(pwd)"

# Start Celery worker with appropriate settings
celery -A app.workers.celery_app worker \
    --loglevel=info \
    --concurrency=4 \
    --queues=default,document_processing \
    --hostname=worker@%h \
    --max-tasks-per-child=1000 \
    --time-limit=1800 \
    --soft-time-limit=1500

# Alternative command for development (single worker):
# celery -A app.workers.celery_app worker --loglevel=info --concurrency=1