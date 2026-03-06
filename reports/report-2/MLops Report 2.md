# MLOps Report 2

This report provides a comprehensive architectural specification of the proposed MLOps system for automated recognition of Architectural Design Decisions (ADDs) in Jira issues using a logistic regression classifier. It first presents the system architecture using the C4 model, with diagrams at multiple abstraction levels that detail all deployed infrastructure and explicitly characterize interactions between components, including frontend API communication, the API’s integration with the trained model for inference, and the use of asynchronous processing. The report further specifies the system’s observability design through the integration of Prometheus, Loki, and Grafana, and defines the monitoring approach by identifying relevant logs and operational metrics and motivating their relevance. Second, it describes the pipeline architecture and CI/CD strategy implemented with GitLab CI/CD, including a complete flow diagram and a stage-wise account of testing, data management, model training, deployment automation, and security controls applied during continuous integration and deployment.

## 1 System Architecture

![C1: System Context Diagram](report_2/c1.png)

![C2: Container Diagram](report_2/c2.png)

![C3: Component Diagram (API level)](report_2/c3.png)

## 2 Approach to System Monitoring:
Firstly, as part of deployment and operations, certain logs and metrics will be collected. We will monitor the number of issues for which the model has to make predictions and the latency of the distribution of response time, which are critical for ensuring the service can handle load. We will also track the number of issues for which the model has to make predictions and the percentage of issues classified as having inclusion of an ADD. Prometheus stores these metrics so we can set up alerts (for example, alert if error rate exceeds a threshold or if no requests are coming through, which might mean the service is down).

Secondly the application logs each request outcome with its issueID which provides an audit trail of predictions made. Additionally, any exceptions (such as a Pandera validation error or an internal error) are logged as errors. Loki aggregates these logs in a centralised manner which is crucial for debugging as when a misclassification or system failure is reported, developers can search the logs in Grafana (using Loki’s query language) to pinpoint what went wrong. We also rely on basic container metrics (CPU, memory usage of the app) to watch for performance issues. The monitoring setup includes host metrics as well to ensure the VM is healthy, such as CPU utilization and average load on the CPU, used up and free remaining RAM memory, disk space usage and network metrics like network throughput. 

The monitoring and logging setup is designed with observability in mind, so we can follow the principle of designing for observability. This means that we build the system in such a manner that the information needed to understand its behavior in production is always conveyed. These measures collectively improve fault tolerance and reliability so if something goes wrong the monitoring system will catch it, and maintainers can quickly diagnose the issue via logs and solve the problem. While the model and FastAPI service are fairly deterministic, external issues like the VM losing network, or bad data causing an exception could occur. By implementing CI/CD and anticipating these in order to handle unexpected input gracefully, the application builds robustness. We also have considered where to tolerate faults, for example if the classification system fails for one request then the system returns an error for that request but we ensure that it still remains up for the next request in order to avoid a global crash in relation to a possible one time fault. 

## 3 Pipeline Architecture

![CI/CD Architecture](report_2/cicd.png)

Our CI/CD pipeline was implemented with GitLab CI/CD and consisted of 6 stages, to automate the deployment of our pipeline: build, setup, fetchdata, processdata, training and deploy. The different stages are triggered by specific file changes or manual intervention, this ensures computational efficiency.

### Data management script
The stages in our pipeline responsible for data management are the `fetchdata` and `processdata` stages, each of these ensure the freshest possible data.
- `fetchdata` stage: In this stage the latest data gets pulled from the cloud using `dvc pull`, if there is a mismatch between the local data and the data in the cloud. 
After the latest data is pulled it is restored and loaded into MongoDB, ready to be processed.
- `processdata` stage: In this stage the `etl_pipeline.py` script gets executed in a Docker container with access to the restored archive files loaded in MongoDB by the previous stage. The `summary` and `description` of each of the documents gets extracted and artefacts get removed. After cleaning the `summary` and `descriptions` get concatenated. The cleaned dataset gets saved as a parquet file ready for training. Pandera validation schemas enforce a strict data quality constraint before transformation.

Both these stages are triggered by changes to the dvc files (`dvc.loc` and/or `*.dvc`) or the data folders in general.

### Model training script
This stage in our pipeline is responsible for taking the processed data and training the model (logistic regression). The `train_baseline.py` script is run in a containerized environment with access to the cleaned text. 

- **Feature Engineering:** Before the model can be trained the raw text gets converted into a matrix of TF-IDF features, where each numerical value represents the importance of that word in the document relative to the entire dataset. The vectorizer is configured to both capture unigrams and bigrams with a minimum document frequency of 3.
- **Classifier Training:** A logistic regression model is trained using a “balanced” class weight to handle dataset imbalances
- **MLflow Integration:** To log parameters, store performance metrics and keep track of different model versions we made use of MLFlow. 
- **Model Registry:** When a model is trained successfully it is stored in the MLflow Model Registry with the alias Champion, it is then available for API deployment without manual intervention.

### Deployment strategy
The deployment strategy had a focus on minimizing downtime between updates and environment consistency. This was done using a `deployapi` job, which automates the deployment of the API to the production VM:
- **Automated Container Deployment:** The pipeline connected to the VM using SSH, stopped the running API container and redeployed a new container using the latest image pulled from the GitLab registry.
- **Network Isolation:** The API is deployed on a dedicated Docker network (MLSDO) which allows for communication with backend services such as MLFlow while only exposing the 8080 port to the host.
- **Dependency Isolation:** Each of the services run in their own Docker container, failure in one of the containers, such as retraining a model won’t kill the `api` service as they are entirely separate.
- All backend logic and shared dependencies are packaged into a single Docker image, this ensures that OS and dependencies are identical in every stage of the pipeline, allowing for predictable execution, debugging and prevent version mismatches.

### Security Measures in GitLab CI/CD
To protect infrastructure and maintain code integrity a couple of steps have been taken, such as managing secrets and automated quality control.
- **Secret Management:** Sensitive credentials such as `CI_REGISTRY_PASSWORD`, `AWS_ACCESS_ID` and `AWS_SECRET_KEY` are stored in protected GitLab variables and are not hardcoded. These variables are injected at runtime in containers which require them.
- **Automated Quality Control:** The `quality` stage in the CI/CD pipeline runs pylint on all the Python files which have been changed. If the code quality drops below 5.0 it fails, preventing potentially buggy code from being deployed to production.

## Authors

- Caden Kamminga (s4370732)
- Tex McGinley (s4299035)
- Raghav Chawla (s4241657)