#!/usr/bin/env python3
import argparse
import datetime as dt
import os
import re
from pathlib import Path


DATE_IN_NAME = re.compile(
    r"(?P<y>\d{4})[-_](?P<m>\d{2})[-_](?P<d>\d{2})|(?P<y2>\d{4})(?P<m2>\d{2})(?P<d2>\d{2})"
)
FRONT_MATTER_DATE = re.compile(r"^date\s*:\s*(.+)$", re.IGNORECASE)
FRONT_MATTER_TITLE = re.compile(r"^title\s*:\s*(.+)$", re.IGNORECASE)
HEADING = re.compile(r"^\s*#\s+(.+?)\s*$")
JEKYLL_POST_NAME = re.compile(r"^\d{4}-\d{2}-\d{2}-.+\.md$", re.IGNORECASE)


def stem_without_leading_date(stem: str) -> str:
    cleaned = re.sub(r"^\d{4}[-_]?\d{2}[-_]?\d{2}[\s_-]*", "", stem).strip()
    return cleaned or stem


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert Markdown files to Jekyll _posts format."
    )
    parser.add_argument("source", help="Source directory containing markdown files.")
    parser.add_argument(
        "--dest",
        default="_posts",
        help="Destination directory (default: _posts).",
    )
    parser.add_argument(
        "--recursive",
        action="store_true",
        help="Recursively read markdown files from source.",
    )
    parser.add_argument(
        "--category",
        default="blog",
        help="Default category if front matter is missing (default: blog).",
    )
    parser.add_argument(
        "--tag",
        default="imported",
        help="Default tag if front matter is missing (default: imported).",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite destination files if they already exist.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show planned changes without writing files.",
    )
    parser.add_argument(
        "--include-jekyll",
        action="store_true",
        help="Also process files already named like Jekyll posts (default: skip).",
    )
    return parser.parse_args()


def split_front_matter(text: str) -> tuple[list[str], str]:
    lines = text.splitlines()
    if len(lines) < 3 or lines[0].strip() != "---":
        return [], text

    front = []
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            body = "\n".join(lines[i + 1 :]).lstrip("\n")
            return front, body
        front.append(lines[i])
    return [], text


def unquote(s: str) -> str:
    s = s.strip()
    if len(s) >= 2 and ((s[0] == '"' and s[-1] == '"') or (s[0] == "'" and s[-1] == "'")):
        return s[1:-1].strip()
    return s


def extract_title(front: list[str], body: str, file_path: Path) -> str:
    for line in front:
        m = FRONT_MATTER_TITLE.match(line.strip())
        if m:
            title = unquote(m.group(1))
            if title:
                return title
    for line in body.splitlines():
        m = HEADING.match(line)
        if m:
            return m.group(1).strip()
    return stem_without_leading_date(file_path.stem)


def parse_date_string(raw: str) -> dt.date | None:
    raw = unquote(raw.strip())
    candidates = [
        "%Y-%m-%d",
        "%Y/%m/%d",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y/%m/%d %H:%M:%S",
        "%Y/%m/%d %H:%M",
    ]
    for fmt in candidates:
        try:
            return dt.datetime.strptime(raw, fmt).date()
        except ValueError:
            continue
    return None


def extract_date(front: list[str], file_path: Path) -> dt.date:
    for line in front:
        m = FRONT_MATTER_DATE.match(line.strip())
        if m:
            parsed = parse_date_string(m.group(1))
            if parsed:
                return parsed

    name_match = DATE_IN_NAME.search(file_path.stem)
    if name_match:
        if name_match.group("y"):
            return dt.date(
                int(name_match.group("y")),
                int(name_match.group("m")),
                int(name_match.group("d")),
            )
        return dt.date(
            int(name_match.group("y2")),
            int(name_match.group("m2")),
            int(name_match.group("d2")),
        )

    return dt.date.fromtimestamp(file_path.stat().st_mtime)


def slugify(text: str) -> str:
    normalized = text.lower().strip()
    normalized = re.sub(r"[^\w\s-]", "", normalized)
    normalized = re.sub(r"[\s_]+", "-", normalized)
    normalized = re.sub(r"-{2,}", "-", normalized).strip("-")
    if not normalized:
        return "post"
    return normalized


def get_front_value(front: list[str], key: str) -> str | None:
    pattern = re.compile(rf"^{re.escape(key)}\s*:\s*(.+)$", re.IGNORECASE)
    for line in front:
        m = pattern.match(line.strip())
        if m:
            return m.group(1).strip()
    return None


def collect_markdown_files(source: Path, recursive: bool) -> list[Path]:
    pattern = "**/*.md" if recursive else "*.md"
    return sorted(source.glob(pattern))


def ensure_unique_path(path: Path) -> Path:
    if not path.exists():
        return path
    n = 2
    while True:
        candidate = path.with_name(f"{path.stem}-{n}{path.suffix}")
        if not candidate.exists():
            return candidate
        n += 1


def build_post_content(
    title: str,
    date_value: dt.date,
    category: str,
    tag: str,
    body: str,
    front: list[str],
) -> str:
    escaped_title = title.replace('"', '\\"')
    categories = get_front_value(front, "categories") or f"[{category}]"
    tags = get_front_value(front, "tags") or f"[{tag}]"
    header = [
        "---",
        f'title: "{escaped_title}"',
        f"date: {date_value.isoformat()} 10:00:00 +0800",
        f"categories: {categories}",
        f"tags: {tags}",
        "---",
        "",
    ]
    return "\n".join(header) + body.strip() + "\n"


def main() -> int:
    args = parse_args()
    source = Path(args.source).expanduser().resolve()
    dest = Path(args.dest).expanduser().resolve()

    if not source.exists() or not source.is_dir():
        print(f"[ERROR] Source directory not found: {source}")
        return 1

    files = collect_markdown_files(source, args.recursive)
    if not files:
        print(f"[INFO] No markdown files found in {source}")
        return 0

    if not args.dry_run:
        dest.mkdir(parents=True, exist_ok=True)

    converted = 0
    skipped = 0

    for src in files:
        if not args.include_jekyll and JEKYLL_POST_NAME.match(src.name):
            print(f"[SKIP] already-jekyll-name: {src}")
            skipped += 1
            continue

        text = src.read_text(encoding="utf-8")
        front, body = split_front_matter(text)
        title = extract_title(front, body, src)
        date_value = extract_date(front, src)
        slug = slugify(title)
        out_name = f"{date_value.isoformat()}-{slug}.md"
        out_path = dest / out_name

        if out_path.exists() and not args.overwrite:
            out_path = ensure_unique_path(out_path)

        output = build_post_content(title, date_value, args.category, args.tag, body, front)

        if args.dry_run:
            print(f"[DRY-RUN] {src} -> {out_path}")
            converted += 1
            continue

        try:
            out_path.write_text(output, encoding="utf-8")
            print(f"[OK] {src} -> {out_path}")
            converted += 1
        except OSError as exc:
            print(f"[SKIP] {src}: {exc}")
            skipped += 1

    print(f"\nDone. converted={converted}, skipped={skipped}, dest={dest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
