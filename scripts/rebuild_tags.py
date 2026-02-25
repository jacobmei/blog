#!/usr/bin/env python3
import argparse
import re
from collections import Counter
from pathlib import Path


TAXONOMY = {
    "NFT": [
        "nft",
        "token",
        "tezos",
        "xtz",
        "opensea",
        "loot",
        "akaswap",
        "鑄造",
        "錢包",
        "皮夾",
        "智能合約",
    ],
    "數位藝術": [
        "藝術",
        "藝術家",
        "生成藝術",
        "展覽",
        "美術館",
        "收藏",
        "策展",
        "林茲",
        "作品",
        "創作",
    ],
    "治理與民主": [
        "治理",
        "民主",
        "審議",
        "voting",
        "投票",
        "polis",
        "vtaiwan",
        "公投",
        "共識",
        "參與式",
        "alignment",
    ],
    "公共網路": [
        "公共",
        "社群",
        "公民",
        "社會",
        "國家",
        "政策",
        "補助",
        "公益",
        "媒體",
        "教育",
        "出版",
    ],
    "AI與科技": [
        "ai",
        "人工智慧",
        "llm",
        "chatgpt",
        "數位身分",
        "did",
        "科技",
        "演算法",
        "資料",
        "機器學習",
        "網路國家",
    ],
}


FM_SPLIT = re.compile(r"^---\s*$", re.MULTILINE)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Rebuild post tags with a fixed 5-tag taxonomy.")
    parser.add_argument("--posts-dir", default="_posts", help="Posts directory (default: _posts)")
    parser.add_argument("--apply", action="store_true", help="Write changes to files")
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


def score_text(text: str, tag: str) -> int:
    score = 0
    low = text.lower()
    for kw in TAXONOMY[tag]:
        k = kw.lower()
        score += low.count(k)
    return score


def choose_tags(title: str, body: str) -> list[str]:
    text = f"{title}\n{title}\n{body}"
    scores = {tag: score_text(text, tag) for tag in TAXONOMY}
    ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)

    primary, primary_score = ranked[0]
    if primary_score == 0:
        return ["公共網路"]

    selected = [primary]
    secondary, secondary_score = ranked[1]
    if secondary_score >= max(2, int(primary_score * 0.45)):
        selected.append(secondary)
    return selected


def extract_title(front_matter: list[str], file_path: Path) -> str:
    for line in front_matter:
        if line.strip().lower().startswith("title:"):
            value = line.split(":", 1)[1].strip()
            if value.startswith('"') and value.endswith('"') and len(value) >= 2:
                value = value[1:-1]
            return value
    return file_path.stem


def replace_tags(front_matter: list[str], tags: list[str]) -> list[str]:
    new_line = "tags: [" + ", ".join(tags) + "]"
    replaced = False
    out = []
    for line in front_matter:
        if line.strip().lower().startswith("tags:"):
            out.append(new_line)
            replaced = True
        else:
            out.append(line)
    if not replaced:
        out.append(new_line)
    return out


def rebuild_file(path: Path, apply: bool) -> tuple[list[str], bool]:
    text = path.read_text(encoding="utf-8")
    fm, body = split_front_matter(text)
    if not fm:
        return ["公共網路"], False
    title = extract_title(fm, path)
    tags = choose_tags(title, body)
    new_fm = replace_tags(fm, tags)
    changed = new_fm != fm
    if apply and changed:
        output = "---\n" + "\n".join(new_fm) + "\n---\n" + body.lstrip("\n")
        path.write_text(output, encoding="utf-8")
    return tags, changed


def main() -> int:
    args = parse_args()
    posts_dir = Path(args.posts_dir).resolve()
    files = sorted(posts_dir.glob("*.md"))
    if not files:
        print(f"[INFO] no markdown files found in {posts_dir}")
        return 0

    tag_counts: Counter[str] = Counter()
    changed_count = 0

    for path in files:
        tags, changed = rebuild_file(path, args.apply)
        tag_counts.update(tags)
        if changed:
            changed_count += 1

    print(f"posts={len(files)} changed={changed_count} apply={args.apply}")
    print("tag_distribution:")
    for tag in TAXONOMY:
        print(f"- {tag}: {tag_counts[tag]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
