#!/usr/bin/env python3
import argparse
import datetime as dt
import html
import re
import ssl
import urllib.request
from pathlib import Path
from urllib.parse import urljoin


BASE_URL = "https://artouch.com/category/artouch-column/mintmint-column"


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Import ARTouch mintmint column links into Jekyll posts.")
    p.add_argument("--dest", default="_posts", help="Destination posts directory (default: _posts)")
    p.add_argument("--max-pages", type=int, default=3, help="Max archive pages to crawl (default: 3)")
    p.add_argument("--apply", action="store_true", help="Write files (default is dry-run)")
    return p.parse_args()


def fetch(url: str) -> str:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (compatible; MashbeanBlogImporter/1.0)"},
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.read().decode("utf-8", errors="replace")
    except Exception:
        # Some local Python environments lack CA bundles; fallback for scraping-only usage.
        ctx = ssl._create_unverified_context()
        with urllib.request.urlopen(req, timeout=20, context=ctx) as r:
            return r.read().decode("utf-8", errors="replace")


def strip_tags(s: str) -> str:
    s = re.sub(r"<[^>]+>", "", s)
    return html.unescape(" ".join(s.split()))


def slugify(text: str) -> str:
    t = text.lower()
    t = re.sub(r"[^\w\u4e00-\u9fff\s-]", "", t)
    t = re.sub(r"[\s_]+", "-", t)
    t = re.sub(r"-{2,}", "-", t).strip("-")
    return t or "artouch-post"


def find_page_urls(first_html: str, max_pages: int) -> list[str]:
    urls = {BASE_URL}
    for m in re.finditer(r'href="(https://artouch\.com/category/artouch-column/mintmint-column/page/\d+)"', first_html):
        urls.add(m.group(1).rstrip("/"))
    # keep only within max pages
    kept = [BASE_URL]
    for u in sorted(urls):
        mm = re.search(r"/page/(\d+)$", u)
        if mm and int(mm.group(1)) <= max_pages:
            kept.append(u)
    return kept


def parse_posts(page_html: str) -> list[dict]:
    # pairs title block + nearest date block
    title_pat = re.compile(
        r'<div class="post-title"><h5><a href="(?P<url>https://artouch\.com/[^"]+)"[^>]*><span>(?P<title>.*?)</span></a></h5></div>\s*<div class="post-excerpt">(?P<excerpt>.*?)</div>',
        re.S,
    )
    date_pat = re.compile(r'<span class="post-date">(\d{4}\.\d{2}\.\d{2})</span>')
    posts = []
    for m in title_pat.finditer(page_html):
        url = m.group("url").strip()
        title = strip_tags(m.group("title"))
        excerpt = strip_tags(m.group("excerpt"))
        tail = page_html[m.end() : m.end() + 900]
        dm = date_pat.search(tail)
        if not dm:
            continue
        d = dm.group(1).replace(".", "-")
        posts.append({"url": url, "title": title, "excerpt": excerpt, "date": d})
    return posts


def render_post(item: dict) -> str:
    summary = item["excerpt"] or f"收錄自 ARTouch 薄荷薄荷專欄：{item['title']}"
    summary = summary.replace('"', '\\"')
    title = item["title"].replace('"', '\\"')
    body = (
        f"本文為外部文章索引，原文發表於 ARTouch 薄荷薄荷專欄。\n\n"
        f"- 原文標題：{item['title']}\n"
        f"- 原文連結：[前往閱讀]({item['url']})\n"
    )
    return (
        "---\n"
        f'title: "{title}"\n'
        f"date: {item['date']} 10:00:00 +0800\n"
        "categories: [blog]\n"
        "tags: [薄荷薄荷專欄]\n"
        f'summary: "{summary}"\n'
        "---\n\n"
        f"{body}"
    )


def main() -> int:
    args = parse_args()
    dest = Path(args.dest).resolve()
    dest.mkdir(parents=True, exist_ok=True)

    first_html = fetch(BASE_URL)
    page_urls = find_page_urls(first_html, args.max_pages)
    all_posts: list[dict] = []
    seen = set()
    for url in page_urls:
        html_text = first_html if url == BASE_URL else fetch(url)
        for p in parse_posts(html_text):
            if p["url"] in seen:
                continue
            seen.add(p["url"])
            all_posts.append(p)

    created = 0
    skipped = 0
    for p in all_posts:
        name = f"{p['date']}-{slugify(p['title'])}-artouch.md"
        out = dest / name
        if out.exists():
            skipped += 1
            continue
        content = render_post(p)
        if args.apply:
            out.write_text(content, encoding="utf-8")
        created += 1
        print(f"{'[WRITE]' if args.apply else '[DRY]'} {out.name}")

    print(f"done total_found={len(all_posts)} created={created} skipped_existing={skipped} apply={args.apply}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
