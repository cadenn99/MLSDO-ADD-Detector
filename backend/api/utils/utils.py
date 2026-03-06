import re

def clean_text(text: str) -> str:
    """Normalizes text by removing artifacts (HTML, code blocks, URLs)."""
    if not isinstance(text, str):
        return ""
    
    text = re.sub(r"{code.*?}{code}", "", text, flags=re.DOTALL)
    text = re.sub(r"```.*?```", "", text, flags=re.DOTALL)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"http\S+", "", text)
    text = re.sub(r"\[~[^]]+\]", "", text)
    text = re.sub(r"\s+", " ", text).strip().lower()
    return text

def preprocess_input(issue: list[dict] | dict) -> str:
    # 1. Combine fields (handling None/Empty) exactly like training
    cleaned_input = []
    if isinstance(issue, dict):
        summary = issue.get("summary", "")
        description = issue.get("description", "")
        cleaned_input.append(clean_text((summary or "") + " " + (description or "")))
    elif isinstance(issue, list):
        issues = []
        for i in issue:
            summary = i.get("summary", "")
            description = i.get("description", "")
            raw_text = (summary or "") + " " + (description or "")
            issues.append(clean_text(raw_text))
        cleaned_input = issues
    
    return cleaned_input

def serialize_mongo_doc(doc: dict) -> dict:
    doc["_id"] = str(doc["_id"])
    return doc
