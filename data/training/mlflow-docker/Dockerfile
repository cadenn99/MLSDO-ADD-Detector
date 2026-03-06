FROM python:3.12-slim
RUN pip install mlflow psycopg2-binary boto3
CMD mlflow server \
    --backend-store-uri $POSTGRES_URL \
    --artifacts-destination s3://$BUCKET \
    --host 0.0.0.0 \
    --port 5000