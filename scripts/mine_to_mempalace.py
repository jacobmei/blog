#!/usr/bin/env python3
"""把 blog 文章按 category 灌進 MemPalace，wing=blog, room=category slug."""

import os
import re
import sys
import yaml

BLOG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src", "content", "blog")

CATEGORY_TO_ROOM = {
    "生活隨筆": "life",
    "網路與社群": "internet",
    "AI與科技": "ai-tech",
    "web3": "web3",
    "運動健康": "health",
    "信仰": "faith",
    "經營與管理": "business",
    "旅遊": "travel",
    "General": "general",
    "Finance": "general",
}

WING = "blog"
PALACE_PATH = os.path.expanduser("~/.mempalace/palace")


def extract_frontmatter(text):
    match = re.match(r"^---\s*\n(.*?)\n---\s*\n", text, re.DOTALL)
    if not match:
        return {}, text
    try:
        fm = yaml.safe_load(match.group(1))
        body = text[match.end():]
        return fm or {}, body
    except yaml.YAMLError:
        return {}, text


def main():
    from mempalace.miner import get_collection, add_drawer, chunk_text

    collection = get_collection(PALACE_PATH)

    files = sorted(f for f in os.listdir(BLOG_DIR) if f.endswith(".md"))
    print(f"Found {len(files)} blog articles in {BLOG_DIR}")

    stats = {"added": 0, "chunks": 0, "skipped_draft": 0, "error": 0}
    room_counts = {}

    for i, fname in enumerate(files):
        filepath = os.path.join(BLOG_DIR, fname)
        with open(filepath, "r", encoding="utf-8") as f:
            text = f.read()

        fm, body = extract_frontmatter(text)

        if fm.get("draft", False):
            stats["skipped_draft"] += 1
            continue

        category = fm.get("category", "General")
        room = CATEGORY_TO_ROOM.get(category, "general")
        title = fm.get("title", fname)

        content = text.strip()
        if not content:
            stats["error"] += 1
            continue

        try:
            chunks = chunk_text(content, fname)
            for chunk in chunks:
                add_drawer(
                    collection=collection,
                    wing=WING,
                    room=room,
                    content=chunk["content"],
                    source_file=fname,
                    chunk_index=chunk["chunk_index"],
                    agent="mine_script",
                )
                stats["chunks"] += 1

            stats["added"] += 1
            room_counts[room] = room_counts.get(room, 0) + 1

            if (i + 1) % 50 == 0:
                print(f"  [{i+1}/{len(files)}] {title[:50]}...")
        except Exception as e:
            stats["error"] += 1
            print(f"  ERROR on {fname}: {e}")

    print(f"\nDone!")
    print(f"  Articles added: {stats['added']}")
    print(f"  Chunks total:   {stats['chunks']}")
    print(f"  Drafts skipped: {stats['skipped_draft']}")
    print(f"  Errors:         {stats['error']}")
    print(f"\nRoom breakdown:")
    for room, count in sorted(room_counts.items(), key=lambda x: -x[1]):
        print(f"  {room}: {count}")


if __name__ == "__main__":
    main()
