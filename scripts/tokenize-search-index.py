"""Build-time tokenization: read search-index.json, add bigram fields via trad-zh-search."""

import json
import re
import sys

from trad_zh_search import tokenize

INPUT = "dist/search-index.json"
OUTPUT = "dist/search-tokenized.json"

_LATIN_WORDS = re.compile(r"[a-zA-Z0-9][\w\-]*[a-zA-Z0-9]|[a-zA-Z0-9]")


def bigram_field(text: str) -> str:
    if not text or not text.strip():
        return ""
    result = tokenize(text, max_chars=12000)
    latin_words = [w.lower() for w in _LATIN_WORDS.findall(text) if len(w) >= 2]
    tokens = result.bigrams + latin_words
    return " ".join(tokens)


def main():
    with open(INPUT, encoding="utf-8") as f:
        docs = json.load(f)

    for doc in docs:
        doc["title_bigrams"] = bigram_field(doc.get("title", ""))
        doc["desc_bigrams"] = bigram_field(doc.get("description", ""))
        doc["content_bigrams"] = bigram_field(doc.get("content", ""))
        doc["tags_bigrams"] = bigram_field(" ".join(doc.get("tags", [])))

    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(docs, f, ensure_ascii=False)

    print(f"[search] Tokenized {len(docs)} docs → {OUTPUT}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"[search] Tokenization failed: {e}", file=sys.stderr)
        sys.exit(1)
