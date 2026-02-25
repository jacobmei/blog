#!/usr/bin/env python3
"""Import crawled Matters markdown files into Jekyll _posts with de-duplication."""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import re
from pathlib import Path

CHALLENGE_MARKERS = (
    "正在執行安全驗證",
    "驗證成功。正在等待 matters.town 回應",
)


def normalize_text(s: str) -> str:
    s = s.lower().strip()
    s = re.sub(r"\s+", " ", s)
    return s


def normalize_title(s: str) -> str:
    s = s.strip()
    # Strip common Matters suffixes like " - 豆泥 - Matters"
    s = re.sub(r"\s*-\s*[^-]+-\s*matters\s*$", "", s, flags=re.IGNORECASE)
    s = re.sub(r"\s*-\s*matters\s*$", "", s, flags=re.IGNORECASE)
    s = s.replace("…", "")
    s = s.replace("｜", "")
    s = re.sub(r"^[0-9]+\s+", "", s)  # align with titles like "1 地方的鑄造者"
    s = normalize_text(s)
    s = re.sub(r"[\W_]+", "", s)
    return s


def slugify(s: str) -> str:
    s = s.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_]+", "-", s)
    s = re.sub(r"-{2,}", "-", s).strip("-")
    return s or "post"


def split_front_matter(text: str) -> tuple[list[str], str]:
    lines = text.splitlines()
    if len(lines) < 3 or lines[0].strip() != "---":
        return [], text
    front: list[str] = []
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            body = "\n".join(lines[i + 1 :]).lstrip("\n")
            return front, body
        front.append(lines[i])
    return [], text


def parse_existing_posts(posts_dir: Path) -> tuple[set[str], set[str]]:
    title_set: set[str] = set()
    body_hash_set: set[str] = set()

    for p in sorted(posts_dir.glob("*.md")):
        text = p.read_text(encoding="utf-8", errors="ignore")
        front, body = split_front_matter(text)

        title = ""
        for line in front:
            m = re.match(r"^title\s*:\s*(.+)$", line.strip(), flags=re.IGNORECASE)
            if m:
                title = m.group(1).strip().strip('"').strip("'")
                break

        if title:
            title_set.add(normalize_title(title))

        body_norm = normalize_text(body)
        if body_norm:
            body_hash_set.add(hashlib.sha256(body_norm.encode("utf-8")).hexdigest())

    return title_set, body_hash_set


def parse_matters_file(path: Path) -> dict:
    text = path.read_text(encoding="utf-8", errors="ignore")
    lines = text.splitlines()

    title = ""
    source = ""
    date_raw = ""

    if lines and lines[0].startswith("# "):
        title = lines[0][2:].strip()

    for line in lines[:20]:
        if line.startswith("Source:"):
            source = line.split(":", 1)[1].strip()
        if line.startswith("Date:"):
            date_raw = line.split(":", 1)[1].strip()

    body_start = 0
    for i, line in enumerate(lines):
        if line.startswith("Source:"):
            body_start = i + 1
            break
    body = "\n".join(lines[body_start:]).strip()

    # Remove optional Date line from body section
    body = re.sub(r"^Date:\s*.+$", "", body, flags=re.MULTILINE).strip()

    return {
        "title": title,
        "source": source,
        "date_raw": date_raw,
        "body": body,
        "raw": text,
    }


def parse_date(date_raw: str, fallback: dt.date) -> dt.date:
    date_raw = date_raw.strip()
    if not date_raw:
        return fallback
    # Keep date part only, supports ISO-like values
    m = re.search(r"(\d{4}-\d{2}-\d{2})", date_raw)
    if m:
        return dt.date.fromisoformat(m.group(1))
    return fallback


def unique_out_path(dest: Path, name: str) -> Path:
    out = dest / name
    if not out.exists():
        return out
    n = 2
    while True:
        candidate = dest / f"{out.stem}-{n}{out.suffix}"
        if not candidate.exists():
            return candidate
        n += 1


def build_post(title: str, date_value: dt.date, source: str, body: str) -> str:
    escaped = title.replace('"', '\\"')
    header = [
        "---",
        f'title: "{escaped}"',
        f"date: {date_value.isoformat()} 10:00:00 +0800",
        "categories: [matters]",
        "tags: [matters, imported]",
        "---",
        "",
    ]
    source_line = f"來源：[{source}]({source})\n\n" if source else ""
    return "\n".join(header) + source_line + body.strip() + "\n"


def is_invalid_article(title: str, body: str) -> bool:
    if normalize_text(title) == "matters.town":
        return True
    for m in CHALLENGE_MARKERS:
        if m in body:
            return True
    return False


def main() -> int:
    parser = argparse.ArgumentParser(description="Import Matters export into Jekyll _posts")
    parser.add_argument("--source", default="matters_export/markdown", help="Source markdown directory")
    parser.add_argument("--dest", default="_posts", help="Destination Jekyll posts directory")
    parser.add_argument("--dry-run", action="store_true", help="Analyze only")
    args = parser.parse_args()

    source = Path(args.source).expanduser().resolve()
    dest = Path(args.dest).expanduser().resolve()

    if not source.exists():
        print(f"[ERROR] source not found: {source}")
        return 1
    dest.mkdir(parents=True, exist_ok=True)

    existing_titles, existing_body_hashes = parse_existing_posts(dest)

    added = 0
    skipped_invalid = 0
    skipped_dup_title = 0
    skipped_dup_body = 0

    for src in sorted(source.glob("*.md")):
        item = parse_matters_file(src)
        title = item["title"] or src.stem
        body = item["body"]
        source_url = item["source"]

        if is_invalid_article(title, body):
            skipped_invalid += 1
            continue

        title_key = normalize_title(title)
        body_key = hashlib.sha256(normalize_text(body).encode("utf-8")).hexdigest()

        if title_key in existing_titles:
            skipped_dup_title += 1
            continue
        if body_key in existing_body_hashes:
            skipped_dup_body += 1
            continue

        fallback_date = dt.date.fromtimestamp(src.stat().st_mtime)
        date_value = parse_date(item["date_raw"], fallback=fallback_date)

        filename = f"{date_value.isoformat()}-{slugify(title)}.md"
        out = unique_out_path(dest, filename)
        content = build_post(title, date_value, source_url, body)

        if args.dry_run:
            print(f"[ADD] {src.name} -> {out.name}")
        else:
            out.write_text(content, encoding="utf-8")
            print(f"[ADD] {out}")

        existing_titles.add(title_key)
        existing_body_hashes.add(body_key)
        added += 1

    print("\nImport summary")
    print(f"  source: {source}")
    print(f"  dest: {dest}")
    print(f"  added: {added}")
    print(f"  skipped_invalid: {skipped_invalid}")
    print(f"  skipped_duplicate_title: {skipped_dup_title}")
    print(f"  skipped_duplicate_body: {skipped_dup_body}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
