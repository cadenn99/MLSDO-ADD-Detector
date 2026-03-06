

MLOps Report 1

Caden Kamminga (s4370732)  
Tex McGinley (s4299035)  
     Raghav Chawla (s4241657)

           December 14th, 2025

**1	Introduction**  
As industries incorporate machine learning into their solutions, the need to grasp the unique operational aspects of these projects is growing. MLOps allows machine learning pipelines scalable, sustainable, and adaptable to business needs and employs the practices, and tools required to deploy, maintain, and improve machine systems effectively. The following report presents the initial development and early results in the development of a machine learning pipeline for identifying Architecture Design Decisions (ADDs) in issue tracking systems. This task requires a concerted effort to tackle because ADD-related information is often implicit, inconsistently documented, and scattered rather than captured in a standardized way. Firstly, the report defines the system scope and context by framing the problem the system aims to solve, describing the intended users, and stating key assumptions and constraints that shape the solution. Further on, it details how the data was sourced, managed, and versioned using DVC, and explains cleaning, filtering, and transforming the raw issue data in order to train it while also including data quality validation with Pandera and initial insights from exploratory analysis. Finally, it describes the selected machine learning approach for classifying issues that contain ADDs, including model selection and training, and shows how MLflow was used to track experiments, performance metrics concluding with an evaluation of early results and a concise summary of the model’s key characteristics, limitations, and areas for improvement.

**2	System Scope and Context**  
The goal of this project is to develop a *Machine Learning (ML)* pipeline that is capable of classifying *Architectural Design Decisions (ADDs)* in a large data base of Jira issues. An issue in Jira is an item of work or task that has to be completed. These issues are tracked in the popular project management tool, Jira. In which each issue contains information such as a title, description, status, assignee, and more (GeeksforGeeks, 2023). This information can be used to document bugs, features, and/or development tasks. For this project, the Jira issues of interest are the source of data where ADDs may be documented. The motivation for developing this system is to aid researchers and architects to locate and reuse existing ADDs. The system has three main capabilities; classifying a single issue, batch classification of many issues, and searching for ADDs based on keywords and/or by type.   
   
ADDS are important high-level decisions on how a system is designed and built. These decisions cover a range of different developmental choices, such as system structure, technology stack, the qualities the system should have regarding scalability and reliability. Often these decisions lack proper documentation, making them difficult to locate. Past research has investigated methods to analyze emails, blogs and issue reports to automatically find ADDs of interest (Dieu et al., 2022). Prior techniques include, but not limited to; keyword searchers, code change analysis, and making use of *Large Language Models (LLMs)*, like BERT,  for aiding in the search and classification of ADDs in large code bases (Maarleveld & Dekker, 2023). 

The project was guided by a few key goals relating to the system, users and the model:

* **System goals:**  
  * Ensure a response API, even throughout asynchronous tasks involving computation expensive operations.  
  * Ease of integration into existing workflows by providing clear endpoints for single-issue predictions, batch-predictions, and keyword-based search.  
  * Ensure predictions are traceable to a specific data version and model run by making use of data version control (DVC) and MLflow.   
* **User goals:**  
  * Allow end users to easily submit issues, run searches and view results without having any knowledge of machine learning.  
  * Display the results in a way that is intuitive and easy to understand, including confidence scores.  
  * Have an easy to use organized user interface,  
* **Model goals:**   
  * Achieve strong and reliable ADD detection performance on our test set.  
  * Keep false negatives and false positives low.  
  * The model should be able to generalize well across different types of ADDs

To quantify the goals in metrics we have set out the following *Key Performance Indicators (KPI)*: 

1. **Search speed:** Measured by the average time taken for the system to successfully provide results given a keyword or issue (measured in seconds).  
2. **ADDs detection accuracy**: The percentage of correctly classified issues containing ADDs (measured using metrics such as recall, precision, and F1-score).  
3. **User friendliness:** The number of processes a user must complete in order to submit an issue, search for ADDs, and save the result. The goal is to have as little steps as possible (measured in the number operation needed)   
4. **Trustworthiness:** The percentage of high-confidence (confidence \> 80%) predictions that are correctly classified.   
5. **Reliability:** The percentage of successful predictions and searches, with no errors or crashes, measured over a to be decided set period.

**3	Data management and Preprocessing**  
The system utilizes data from two MongoDB dumps: one containing around 2.8 million Jira issues from a range of different trackers (JiraRepos), and one containing manually annotated labels for roughly 6200 issues (MiningDesignDesicions). Following the assignment instructions, both MongoDB dumps were loaded into a local MongoDB instance. The labeled issues were matched to their corresponding Jira issues, following the format \<collection\>-\<id\>. By doing this, it allows us to construct a dataset in which each row includes:

* Jira summary   
* Description  
* ADD labels   
* Metadata tags

The constructed dataset is then exported in a .parquet format allowing further processing into a local training dataset containing fields like, issue\_id, project, summary, description, any\_add, and optional labels for each ADD type. 

To aid in ensuring reproducibility and to help with database management we employed DVC. Rather than tracking large files such as dataset\_cleaned.parquet in Git, we track them with DVC combined with a remote storage (shared google drive) so that all team members can get the exact same version by using dvc pull. Our DVC pipeline for this project consists of four steps:

1. Restoring and loading the MongoDB dumps  
2. Joining the labels and Jira data into a new raw dataset  
3. Preprocess and clean the new dataset  
4. Validate and save the new cleaned dataset in a .parquet file for future training  
   

The unprocessed joined raw dataset contains a lot of noise and irregularities that make it unfit for our ML purposes. For instance, Jira issues frequently contain HTML tags, Jira-specific markup (such as code blocks denoted by {code}...{code} and …), and placeholder text that can make ML models struggle. Furthermore, the model performance would also be affected by text field issues such as inconsistent formatting, varying whitespaces, and inconsistent capitalizations. Trying to use the raw joined dataset without proper preprocessing would most likely result in poor predictions and degraded model performance. With that in mind, proper preprocessing that cleans and standardizes the data is an essential step in creating a successful ML model for this project. 

With all this in mind our preprocessing steps focus on cleaning and standardizing the raw joined dataset to make it usable for ML models. Our preprocessing steps are as follows:

* Removing HTML tags  
* Removing URLs  
* Removing user mentions  
* Removing Jira code blocks (denoted by {code}...{code} and ...  
* Normalizing whitespace and converting everything to lowercase

After the dataset is cleaned and preprocessed, we validate the dataset using Pandera to ensure it follows the desired schema and is ready to use for training. The created validation script, validate.py, verifies that each issue has a valid issue\_key in the correct Jira format, that clean\_text is there, not empty, and does not have any remaining HTML. Additionally it checks that the any\_add label is a non-null boolean. If any rows fail to meet these requirements, they will fail the validation step. This allows for problems to be caught before proceeding to model training. 

Before proceeding with model training, we perform data exploration to understand our created cleaned dataset. The explore\_data.py contains the basic data exploration we conducted. From our exploration we found the following:

* The labelled subset contains:  
  * 1498 existence decisions   
  * 886 executive decisions   
  * 1599 property decisions   
  * 2672 of the issues have at least one ADD (any\_add \= True)   
* The average summary length is around 53 characters  
* The average description length is around 1170 characters

* The top 5 projects distributions:  
  * Apache (5759 instances)  
  * RedHat (268 instances)  
  * Jira (47 instances)  
  * Sonatype (46 instances)  
  * Spring (41 instances)  
* The any\_add label distribution is roughly 57 % False and 43 % True

From this exploration we can see that there are a few areas of potential bias and mistakes. Firstly there is a heavy skew in the project distributions with the vast majority of labelled issues coming from Apache projects. This could lead to the model learning project-specific patterns instead of more general ADD indicators. For now we will take note of this and monitor the performance per project and per label group. If these later reviews indicate clear bias, we will address this by either rebalancing or reweighting the data per project before retraining the model. 

Additionally, there is a small skew in the any\_add label (around 57% False vs around 53% True). We will take note of this skew in the any\_add labels but as it is a relatively small skew we won’t currently correct for it. 

**4	Model Development and Performance Tracking**  
For this project, we considered several modelling methods for classifying ADDs from Jira issues. We implemented a simple logistic regression classifier using TF-IDF features computed from the cleaned summary and description fields. It is an easy to interpret and fast to train baseline model, but it has some limitations, such as failing to capture context and long range dependencies in the text due to the bag-of-words representation. To improve on the baseline's performance, we chose a transformer-based architecture, namely a pre-trained BERT-like encoder from Hugging Face as our primary model.

The logistic regression baseline makes use of the TF-IDF vectorizer in the scikit-learn library, and is applied to the cleaned text followed by the logistic regression classifier. The vectorizer is configured to make use of 20000 features, using uni grams and bigrams, and reject rare terms. This allows us to cover frequent occurring terminology and maintain a manageable feature space. The logistic regression model was trained using L2 regularization and corrected for the slight dataset imbalance. For the baseline we used a standard 80/20 train-test split, where 80% was used for training and 20% for testing. 

The workflow integrated MLflow by including a mlflow.db file in which there is a backend store defined through SQlite which logs several experimental parameters on which we interpret the results and an artifact store on the computer filesystem to allow for larger outputs to separate artificact storage from backend metadata. The experiment and model run log around 42 parameters and metrics. This tracking was done in order to make the model development reproducible and auditable. For the baseline experiment, the MLflow captured a single finished model run and recorded the parameters, training entry point and the Git commit so in the future, the exact reconstruction of the specific results from the code are possible. A model artifact was also logged under the run and supports consistent model versioning alongside tracked metrics and parameters. 

The model has been initially evaluated against performance metrics which include the F1-score, AUC and the training confusion matrix. These metrics are critical in the judgment of the accuracy and precision of the model and bring their own set of strengths and weaknesses. The AUC (area-under-curve) is the area under a true positive rate and a false positive rate graph line plot across all possible thresholds which measures how well the model separates classes overall and ranks a randomly chosen positive example over a randomly chosen negative example (Fawcett, 2005). The benefits of the AUC are that it is threshold independent of the performance across all classification cutoffs and captures ranking quality and separability of the results (developers.google.com, n.d). However its disadvantages are that it can be over-optimistic on highly imbalanced datasets and not correctly represent practical performance, as well as not being able to explain performance at the specific threshold of deployment (developers.google.com, n.d). The F1-score on the other hand represents the harmonic mean of precision and recall and allows for balancing low recall and low precision when classes are imbalanced and is very interpretable by the virtue of being an only number so it is simple to explain in terms of false positives and false negatives. However it also has disadvantages being that it ignores true negatives, and does not classify the negative class, depends on a single decision threshold and thus can get different F1-score by changing the threshold, and can lead to suboptimal F1-score at a bad threshold even when the model ranks well (Powers, 2015)(scikit-learn.org, n.d). Lastly, the confusion training matrix is a table  which counts how often the classifier predicts each class compared to the true class, and the table is summarised by including the ratios between the true labels and predicted labels. The benefits of the confusion matrix is that it is very interpretable to see in what way the model is making mistakes, can allow for further derivation of other evaluation metrics based on the TP/FP/TN/FN such as the F1-score and is good for diagnosing overfitting when the training confusion matrix looks to good to be true, and there is a performance gap while testing the model (scikit-learn.org, n.d). On the other hand, the training confusion matrix often hides poor generalisations and the need for validation and test confusion matrices is still needed (scikit-learn.org, n.d). Also, the confusion matrix is probability threshold-dependent and so it does not summarize performance across thresholds. Lastly the confusion matrix is a snapshot of one threshold and does not tell you whether positives are consistently scored higher than negatives or if probabilities are well calibrated ​​(Saito and Rehmsmeier, 2015).

Initial performance metrics indicate strong separability between the two classes. Firstly, a confusion matrix was made row-normalised over the true labels and shows that for true class 0, the model correctly predicts the true class about 0.86 of the time (with 0.14 misclassified as 1), while for true class 1, it correctly predicts 1 about 0.91 of the time (with 0.087 misclassified as 0). Interpreted as rates, this corresponds to high specificity for class 0 and high recall/TPR for class 1 at the chosen decision threshold, with remaining errors concentrated in false positives and false negatives. The precision–recall curve further shows a strong precision–recall trade off across thresholds, summarized by Average Precision (AP) which was calculated to be 0.93, meaning the model maintains high precision over a wide range of recall values, which is particularly useful when the positive class is relatively rare. Finally, the ROC curve reports an AUC of 0.95, indicating excellent overall ranking ability (high TPR achievable at comparatively low FPR) across thresholds. Since these plots are computed on the training set, they primarily demonstrate fit and class separability but they need to and will be compared against validation and test curves in the future to confirm generalization and rule out overfitting.

There are a few strategies we can employ in order to improve the model performance in the future of this project. To improve classification performance for detecting ADD related jira issues, we can perform cross-validation hyperparameter tuning over both the TF-IDF vectorizer and classifier (n-gram range, min/max document frequency, regularization strength) using a systematic search to maximize a chosen score. We can also tune the decision threshold rather than falling back on a default preset to further optimise ADD related jira issue classification and the evaluation metrics. Moving on, we can restructure and expand the labels and prioritize the most informative issues first in order to reduce the labeling and effort and improve model quality. Lastly, to deal with multiple generalisations of a single ADD related jira issue, we can use text representations to capture the meaning of an issue in memory and to recognize the same in a different jira issue number with the same problem. 

In conclusion, we have created a model card which summarizes key characteristics and limitations of the model below:  
Model Details:

- Task: Binary text classification to predict whether a Jira issue contains any Architectural Design Decision (ADD).  
- Type: Model type: scikit-learn Pipeline \= Logistic Regression classifier using TF-IDF text vectorization from the scikit-learn pipeline.  
- Hyperparameters:   
* TF-IDF – maximum features: 20000, ngram range: 1 or 2, min\_df: 3\.  
* Logistic Regression – class weight: balanced, solver: lbfgs, maximum iterations: 1000, C=1.0.  
- MLflow Tracking: Run metadata, parameters, metrics, and model artifact logged via MLflow

Intended Use: 

- Primary users: software architects, researchers, and engineering teams who want to locate and reuse existing ADDs in large Jira datasets.  
- System capabilities supported: single-issue classification, batch classification, and keyword/type-based search.  
- Appropriate use: decision support but not a fully automated “ground truth” label.

Preprocessing and Training Data:

- Data sources:  
* JiraRepos MongoDB dump (\~2.8M issues)  
* MiningDesignDecisions labeled subset (\~6200 annotated issues), joined to Jira issues by \<collection\>-\<id\>.  
- Input fields used for modelling: cleaned issue text derived from summary \+ description (and associated metadata available for analysis).  
- Preprocessing (text cleaning): remove HTML tags, URLs, user mentions, Jira markup/code blocks ({code}...{code}), normalize whitespace, lowercase.  
- Data validation: Pandera checks schema constraints (valid issue key format, non-empty clean\_text without HTML remnants, any\_add is non-null boolean).  
- Exploration highlights / potential bias: labeled issues heavily dominated by Apache projects (5,759 instances), with smaller representation from RedHat (268), Jira (47), Sonatype (46), Spring (41). Label balance for any\_add is \~57% False / 43% True.

Evaluation: 

- **Training-set metrics (MLflow):**  
  - Accuracy: **0.885071**  
  - Precision: **0.888877**  
  - Recall: **0.885071**  
  - F1-score: **0.885543**  
  - ROC-AUC: **0.953109**  
  - Log loss: **0.406746**

- **Training normalized confusion matrix (row-normalized by true label):**  
  - True 0-Pred 0: **0.86**, True 0-Pred 1: **0.14**  
  - True 1-Pred 0: **0.087**, True 1-Pred 1: **0.91**  
    Interpretation: strong recall for the positive class at the chosen threshold (0.91), with remaining errors split between false positives (0.14) and false negatives (0.087).

- **Training threshold curves (from plots):**  
  - Precision–Recall: **Average Precision (AP) \= 0.93** (high precision maintained across a wide recall range).  
  - ROC curve: **AUC \= 0.95** (excellent ranking/separability across thresholds).

- **Test-set metrics (MLflow, baseline):**  
  - Accuracy **0.746988**  
  - F1 (macro) **0.744199**  
  - F1 (ADD/positive class) **0.717489**  
    Interpretation: there is a noticeable drop from training to test, suggesting either expected generalization gap, domain shift across projects, and/or remaining noise/ambiguity in labels and text fields.

Limitations

- Project/domain bias: the labeled set is heavily skewed toward Apache projects, risking learning project-specific wording rather than general ADD cues; performance may degrade on underrepresented trackers.  
- Implicit/ambiguous language: ADDs are often described indirectly, inconsistently, or spread across text, increasing false negatives and label noise.  
- Threshold dependence: false positives vs false negatives are sensitive to the chosen threshold.  
- Training metrics can be optimistic and deployment decisions should be based on validation/test metrics as well.

Improvements:

- Tune TF-IDF and logistic regression via cross-validated hyperparameter search  
- Threshold optimization by maximizing F1, or recall at a minimum precision and by using PR curves and confusion matrices on validation/test.  
- Expand labels efficiently to improve generalization across diverse Jira issues and different contexts for the same ADD expressions.

Reproducibility: 

- Data versions are controlled with DVC (datasets pulled from a shared remote so all team members train on identical inputs).  
- Model experiments are tracked with MLflow (parameters, metrics, run metadata, and stored model artifacts), enabling end-to-end traceability from data version to model artifact.

# **Works Cited.**

developers.google.com, “Classification: ROC and AUC.” Machine Learning Crash Course,  
Google Developers, n.d.

Dieu, Musengamana Jean, et al. “Mining Architectural Information: A Systematic  
Mapping Study.” arXiv, 26 Dec. 2022, arXiv:2212.13179.

Fawcett, Tom. “An Introduction to ROC Analysis.”, *Pattern Recognition Letters* 27.8:   
861-874, Institute for the Study of Learning and Expertise, 2005\.

Maarleveld, Jesse and Dekker, Arjan. “Developing Deep Learning Approaches to Find and  
Classify Architectural Design Decisions in Issue Tracking Systems.” *Master’s Thesis*,   
University of Groningen, 2023\.

Powers, David M. W. *What the F-measure doesn’t measure…: Features, Flaws, Fallacies and*  
*Fixes*. Flinders University, Technical Report KIT-14-001, 2015\.

Saito, Takaya, and Rehmsmeier, Marc. “The Precision-Recall Plot Is More Informative than   
The ROC Plot When Evaluating Binary Classifiers on Imbalanced Datasets.” *PLOS ONE*   
10.3, 2015\.

scikit-learn.org. “confusion\_matrix.” *scikit-learn Documentation* (v1.8.0), scikit-learn  
developers, n.d.

scikit-learn.org. “f1\_score.” *scikit-learn Documentation* (v1.8.0), scikit-learn   
developers, n.d.

GeeksforGeeks. “JIRA Issues.” *GeeksforGeeks*, 27 Oct. 2023,  
[www.geeksforgeeks.org/software-testing/jira-issues/](http://www.geeksforgeeks.org/software-testing/jira-issues/) . 

