import os
import re
import sys

import pandas as pd
import pandera.pandas as pa
from pymongo import MongoClient


# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
OUTPUT_FILE = "data/processing/dataset_cleaned.parquet"


# -----------------------------------------------------------------------------
# Validation schema
# -----------------------------------------------------------------------------
schema = pa.DataFrameSchema({
    "issue_key": pa.Column(
        str, 
        checks=[
            pa.Check.str_matches(r"^[A-Z0-9]{1,10}-[1-9][0-9]*$"),
            pa.Check.str_length(min_value=3)
        ],
        unique=True,
        nullable=False
    ),
    "clean_text": pa.Column(
        str,
        checks=[
            pa.Check.str_length(min_value=10),
            pa.Check(lambda s: ~s.str.fullmatch(r"\s*")),
            pa.Check(lambda s: ~s.str.contains(r"<[^>]+>", regex=True))
        ],
        nullable=False
    ),
    "any_add": pa.Column(bool, checks=[pa.Check.isin([True, False])], nullable=False),
    "project": pa.Column(str, nullable=False),
}, strict=False)


def fetch_data() -> pd.DataFrame:
    """
    Extract raw labeled issue data from MongoDB.

    This function:
    - Reads label documents from MiningDesignDecisions.IssueLabels
      (only those tagged with "has-label").
    - Uses the label document _id (<PROJECT>-<ISSUE_ID>) to find the full Jira issue
      document in JiraRepos.<PROJECT>.
    - Builds a row-oriented list of records with summary/description and a boolean
      target label (any_add).

    Returns:
        A DataFrame containing one row per labeled issue.
    """
    client = MongoClient(MONGO_URI)
    labels_coll = client["MiningDesignDecisions"]["IssueLabels"]
    jira_db = client["JiraRepos"]
    
    rows = []
    cursor = labels_coll.find({"tags": "has-label"})
    
    for doc in cursor:
        try:
            project, issue_id = doc["_id"].split("-", 1)
        except ValueError:
            continue

        issue = jira_db[project].find_one({"id": issue_id})
        if not issue:
            continue

        rows.append(
            {
                "project": project,
                "issue_id": issue_id,
                "issue_key": issue.get("key"),
                "summary": issue["fields"].get("summary", ""),
                "description": issue["fields"].get("description", ""),
                "any_add": any(
                    [
                        doc.get("existence"), 
                        doc.get("executive"), 
                        doc.get("property")
                    ]
                ),
            }
        )
    
    return pd.DataFrame(rows)


def clean_text(text: str) -> str:
    """
    Normalize issue text into a model-friendly string.

    This function:
    - Removes Jira/Markdown code blocks, HTML tags, URLs, and Jira user mentions.
    - Collapses repeated whitespace to single spaces.
    - Lowercases the text.

    Args:
        text: Input text (expected to be a string, but can be non-string).

    Returns:
        A cleaned, lowercase string (empty string if input is not a string).
    """
    if not isinstance(text, str):
        return ""
    
    text = re.sub(r"{code.*?}{code}", "", text, flags=re.DOTALL)
    text = re.sub(r"```.*?```", "", text, flags=re.DOTALL)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"http\S+", "", text)
    text = re.sub(r"\[~[^]]+\]", "", text)
    text = re.sub(r"\s+", " ", text).strip().lower()
    return text

def main():
    """
    Run the end-to-end ETL process and write the cleaned dataset.

    This function:
    1) Extracts labeled issues from MongoDB.
    2) Builds raw_text (summary + description) and produces clean_text.
    3) Filters obviously invalid rows (very short cleaned text).
    4) Validates the DataFrame using the Pandera schema (SCHEMA).
    5) Writes the resulting dataset to OUTPUT_FILE as Parquet.

    Exits:
        Uses sys.exit(1) if extraction returns no rows or schema validation fails.
    """
    print(f"Starting ETL pipeline...")
    
    df = fetch_data()
    if df.empty:
        print("No data found. Exiting.")
        sys.exit(1)

    df["raw_text"] = df["summary"].fillna("") + " " + df["description"].fillna("")
    df["clean_text"] = df["raw_text"].apply(clean_text)
    
    df = df[df["clean_text"].str.len() > 10].copy()

    try:
        df = schema.validate(df, lazy=True)
    except pa.errors.SchemaErrors as err:
        print("Schema validation failed:")
        print(err.failure_cases)
        sys.exit(1)

    df.to_parquet(OUTPUT_FILE, index=False)
    print(f"Successfully processed {len(df)} records to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
