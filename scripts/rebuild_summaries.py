#!/usr/bin/env python3
import argparse
import re
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate one-line summaries for Jekyll posts.")
    parser.add_argument("--posts-dir", default="_posts", help="Posts directory")
    parser.add_argument("--apply", action="store_true", help="Write summary back to files")
    return parser.parse_args()


def split_front_matter(text: str) -> tuple[list[str], str]:
    lines = text.splitlines()
    if len(lines) < 3 or lines[0].strip() != "---":
        return [], text
    fm = []
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            body = "\n".join(lines[i + 1 :])
            return fm, body
        fm.append(lines[i])
    return [], text


def clean_body(body: str) -> str:
    lines = []
    for raw in body.splitlines():
        line = raw.strip()
        if not line:
            continue
        if line.startswith("+") and "matters.town/tags/" in line:
            continue
        if line.startswith("## "):
            continue
        if re.match(r"^\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日", line):
            continue
        if line.startswith("![]("):
            continue
        if line in {"* * *", "---"}:
            continue
        lines.append(line)
    text = " ".join(lines)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def pick_sentence(text: str, max_len: int = 90) -> str:
    if not text:
        return "本文討論數位社會中的公共議題與實作觀察。"
    parts = re.split(r"(?<=[。！？!?])\s*", text)
    for s in parts:
        s = s.strip(" \"'“”")
        if len(s) >= 12:
            s = s.replace("#", "")
            if len(s) > max_len:
                s = s[: max_len - 1].rstrip() + "…"
            return s
    fallback = text[: max_len - 1].rstrip() + "…" if len(text) > max_len else text
    return fallback.replace("#", "")


def replace_summary(front_matter: list[str], summary: str) -> tuple[list[str], bool]:
    new_line = f'summary: "{summary.replace(chr(34), chr(92) + chr(34))}"'
    out = []
    replaced = False
    changed = False
    for line in front_matter:
        if line.strip().lower().startswith("summary:"):
            replaced = True
            if line != new_line:
                changed = True
            out.append(new_line)
        else:
            out.append(line)
    if not replaced:
        out.append(new_line)
        changed = True
    return out, changed


def main() -> int:
    args = parse_args()
    posts_dir = Path(args.posts_dir).resolve()
    files = sorted(posts_dir.glob("*.md"))
    if not files:
        print(f"[INFO] no markdown files found in {posts_dir}")
        return 0

    changed_count = 0
    for p in files:
        text = p.read_text(encoding="utf-8")
        fm, body = split_front_matter(text)
        if not fm:
            continue
        summary = pick_sentence(clean_body(body))
        new_fm, changed = replace_summary(fm, summary)
        if changed:
            changed_count += 1
        if args.apply and changed:
            output = "---\n" + "\n".join(new_fm) + "\n---\n" + body.lstrip("\n")
            p.write_text(output, encoding="utf-8")

    print(f"posts={len(files)} changed={changed_count} apply={args.apply}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
