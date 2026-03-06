import os

from pymongo import MongoClient


# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")

LABEL_DB = "MiningDesignDecisions"
LABEL_COLL = "IssueLabels"
JIRA_DB = "JiraRepos"

OUTPUT_DB = "ADDIssues"
OUTPUT_COLL = "issues"


def is_add(label_doc: dict) -> bool:
    """
    Return True if a label document indicates an ADD.

    The dataset provides three boolean label fields:
    - existence
    - executive
    - property

    If any of them is True, the issue is treated as an ADD.
    """
    return any(
        [
            label_doc.get("existence", False),
            label_doc.get("executive", False),
            label_doc.get("property", False),
        ]
    )


def main():
    """
    Populates the ADDIssues.issues collection from labeled source data.

    This function:
    - Connects to MongoDB at MONGO_URI.
    - Iterates over label documents tagged with "has-label".
    - Parses label_doc["_id"] in the format "<PROJECT>-<ISSUE_ID>".
    - Fetches the full Jira issue document from JiraRepos.<PROJECT>.
    - Upserts the issue into OUTPUT_DB.OUTPUT_COLL using the original MongoDB _id.

    Prints:
        Counts of processed ADD issues and skipped label entries.
    """
    print("Starting ADD-only collection pipeline...")   

    client = MongoClient(MONGO_URI)

    labels_coll = client[LABEL_DB][LABEL_COLL]
    jira_db = client[JIRA_DB]
    output_coll = client[OUTPUT_DB][OUTPUT_COLL]

    cursor = labels_coll.find({"tags": "has-label"})

    processed = 0
    skipped = 0

    for label_doc in cursor:
        raw_id = label_doc.get("_id")
        if not raw_id or "-" not in raw_id:
            skipped += 1
            continue

        project, issue_id = raw_id.split("-", 1)

        issue = jira_db[project].find_one({"id": issue_id})
        if not issue:
            skipped += 1
            continue

        if not is_add(label_doc):
            continue

        output_coll.update_one(
            {"_id": issue["_id"]},  
            {"$set": issue},
            upsert=True
        )

        processed += 1

    print(f"Processed ADDs: {processed}")
    print(f"Skipped:        {skipped}")
    print("Finished.")


if __name__ == "__main__":
    main()
 