#!/usr/bin/env python3
"""Crawl Matters profile articles and export readable Markdown/plain text files.

Example:
  python3 scripts/crawl_matters_articles.py \
    --profile-url "https://matters.town/@mashbean" \
    --out "matters_export"
"""

from __future__ import annotations

import argparse
import asyncio
import datetime as dt
import json
import re
from pathlib import Path
from typing import Any


try:
    from playwright.async_api import async_playwright
except ImportError as exc:  # pragma: no cover
    raise SystemExit(
        "Missing dependency: playwright\n"
        "Install with:\n"
        "  pip3 install playwright\n"
        "  playwright install chromium"
    ) from exc


def slugify(value: str, fallback: str = "article") -> str:
    value = value.strip().lower()
    value = re.sub(r"\s+", "-", value)
    value = re.sub(r"[^\w\-]+", "", value)
    value = re.sub(r"-{2,}", "-", value).strip("-")
    return value or fallback


def to_text(markdown: str) -> str:
    text = markdown
    text = re.sub(r"```[\s\S]*?```", "", text)
    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = re.sub(r"\[([^\]]+)\]\(([^\)]+)\)", r"\1", text)
    text = re.sub(r"^#{1,6}\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip() + "\n"


def is_challenge_page(article: dict[str, Any]) -> bool:
    title = (article.get("title") or "").strip().lower()
    body = (article.get("body") or "").strip()
    marker = "正在執行安全驗證"
    if title == "matters.town":
        return True
    if marker in body:
        return True
    return False


def load_retry_urls(manifest_path: Path) -> tuple[list[str], dict[str, dict[str, Any]]]:
    payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    records = payload.get("records", [])
    url_to_record: dict[str, dict[str, Any]] = {}
    urls: list[str] = []
    for r in records:
        if not isinstance(r, dict):
            continue
        url = (r.get("url") or "").strip()
        if not url:
            continue
        url_to_record[url] = r
        title = (r.get("title") or "").strip().lower()
        has_error = bool(r.get("error"))
        if title == "matters.town" or has_error:
            urls.append(url)
    return urls, url_to_record


async def maybe_click_works_tab(page) -> None:
    selectors = [
        'a:has-text("Works")',
        'button:has-text("Works")',
        'a:has-text("作品")',
        'button:has-text("作品")',
        'a:has-text("文章")',
        'button:has-text("文章")',
        'a:has-text("寫作")',
        'button:has-text("寫作")',
    ]
    for sel in selectors:
        node = page.locator(sel).first
        if await node.count() > 0:
            try:
                await node.click(timeout=1500)
                await page.wait_for_timeout(800)
                return
            except Exception:
                pass


def normalize_article_links(raw_links: list[str], profile_url: str, page_html: str) -> list[str]:
    domain = "https://matters.town"
    profile = profile_url.rstrip("/")
    out: list[str] = []
    seen: set[str] = set()

    def add(link: str) -> None:
        link = link.strip()
        if not link:
            return
        clean = link.split("?", 1)[0].split("#", 1)[0].rstrip("/")
        if not clean:
            return
        if not clean.startswith("http"):
            clean = domain + ("" if clean.startswith("/") else "/") + clean
        if not clean.startswith(domain):
            return

        path = clean[len(domain) :]
        # Matters article URL formats seen in the wild:
        # - /a/<id>
        # - /@<author>/<slug-or-id>
        is_article = bool(re.match(r"^/a/[a-zA-Z0-9]+$", path)) or bool(re.match(r"^/@[^/]+/.+$", path))
        if not is_article:
            return
        if clean == profile:
            return
        if clean not in seen:
            seen.add(clean)
            out.append(clean)

    for link in raw_links:
        add(link)

    for m in re.finditer(r"https?://matters\.town/(a/[a-zA-Z0-9]+|@[^/\"'\s]+/[^\"'\s?#]+)", page_html):
        add("https://matters.town/" + m.group(1))
    for m in re.finditer(r"/a/[a-zA-Z0-9]{6,}", page_html):
        add(m.group(0))
    for m in re.finditer(r"/@[^/\"'\s]+/[^\"'\s?#]+", page_html):
        add(m.group(0))

    return out


async def collect_article_links(page, profile_url: str, max_scroll_rounds: int = 80) -> list[str]:
    await maybe_click_works_tab(page)

    raw_links: list[str] = []
    raw_set: set[str] = set()
    stagnant = 0
    prev_count = 0

    for _ in range(max_scroll_rounds):
        hrefs = await page.eval_on_selector_all(
            "a[href]",
            """
            (els) => els
              .map((e) => e.getAttribute('href') || '')
              .filter(Boolean)
              .map((href) => href.startsWith('http') ? href : new URL(href, location.origin).toString())
            """,
        )

        for href in hrefs:
            clean = href.split("?", 1)[0].split("#", 1)[0].rstrip("/")
            if clean not in raw_set:
                raw_links.append(clean)
                raw_set.add(clean)

        load_more = page.locator('button:has-text("Load more"), button:has-text("更多")').first
        if await load_more.count() > 0:
            try:
                await load_more.click(timeout=1200)
                await page.wait_for_timeout(900)
            except Exception:
                pass

        await page.mouse.wheel(0, 3500)
        await page.wait_for_timeout(900)

        if len(raw_links) == prev_count:
            stagnant += 1
        else:
            stagnant = 0
            prev_count = len(raw_links)

        if stagnant >= 5:
            break

    html = await page.content()
    return normalize_article_links(raw_links, profile_url=profile_url, page_html=html)


ARTICLE_EXTRACT_JS = r"""
() => {
  const pick = (sel) => document.querySelector(sel);

  const ogTitle = pick('meta[property="og:title"]')?.getAttribute('content')?.trim() || '';
  const title = ogTitle || pick('h1')?.innerText?.trim() || document.title || 'Untitled';

  const ogDesc = pick('meta[property="og:description"]')?.getAttribute('content')?.trim() || '';

  const timeEl = pick('time');
  const date = timeEl?.getAttribute('datetime') || timeEl?.innerText?.trim() || '';

  const root = pick('article') || pick('main') || document.body;

  const blocks = Array.from(root.querySelectorAll('h1,h2,h3,p,blockquote,pre,li'))
    .map((n) => n.innerText.replace(/\n{3,}/g, '\n\n').trim())
    .filter(Boolean);

  let body = blocks.join('\n\n').trim();
  if (!body) {
    body = (root.innerText || '').trim();
  }

  return {
    title,
    date,
    description: ogDesc,
    body,
    canonicalUrl: pick('link[rel="canonical"]')?.getAttribute('href') || location.href,
  };
}
"""


async def extract_article(
    page,
    url: str,
    *,
    retry_attempts: int = 5,
    challenge_wait_ms: int = 5000,
) -> dict[str, Any]:
    last: dict[str, Any] = {}
    for attempt in range(1, max(1, retry_attempts) + 1):
        await page.goto(url, wait_until="domcontentloaded", timeout=45000)
        await page.wait_for_timeout(1200)
        data = await page.evaluate(ARTICLE_EXTRACT_JS)
        data["url"] = url
        last = data
        if not is_challenge_page(data):
            return data
        # Cloudflare challenge page appeared; wait and retry.
        await page.wait_for_timeout(challenge_wait_ms)
    return last


def build_markdown(article: dict[str, Any]) -> str:
    lines = [f"# {article['title']}", "", f"Source: {article['canonicalUrl']}"]
    if article.get("date"):
        lines.append(f"Date: {article['date']}")
    lines.append("")

    body = (article.get("body") or "").strip()
    if body:
        lines.append(body)
    elif article.get("description"):
        lines.append(article["description"])
    else:
        lines.append("(No content extracted)")

    return "\n".join(lines).strip() + "\n"


async def run(args: argparse.Namespace) -> Path:
    out_dir = Path(args.out).resolve()
    md_dir = out_dir / "markdown"
    txt_dir = out_dir / "text"
    out_dir.mkdir(parents=True, exist_ok=True)
    md_dir.mkdir(parents=True, exist_ok=True)
    txt_dir.mkdir(parents=True, exist_ok=True)

    base_records_map: dict[str, dict[str, Any]] = {}
    links: list[str] = []
    if args.retry_from_manifest:
        manifest_path = Path(args.retry_from_manifest).expanduser().resolve()
        if not manifest_path.exists():
            raise RuntimeError(f"--retry-from-manifest not found: {manifest_path}")
        links, base_records_map = load_retry_urls(manifest_path)
        print(f"[1/3] Retry mode from manifest: {manifest_path}")
        print(f"  Retry targets: {len(links)}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=not args.headful)
        ctx = await browser.new_context(locale="zh-TW")
        if not links:
            page = await ctx.new_page()
            print(f"[1/3] Open profile: {args.profile_url}")
            await page.goto(args.profile_url, wait_until="domcontentloaded", timeout=45000)
            await page.wait_for_load_state("networkidle")
            await page.wait_for_timeout(1500)

            print("[2/3] Collect article links by scrolling...")
            links = await collect_article_links(page, profile_url=args.profile_url)
            await page.close()
            if args.max_articles > 0:
                links = links[: args.max_articles]
            print(f"  Found {len(links)} article URLs")
        else:
            print("[2/3] Re-crawling retry target URLs...")

        records: list[dict[str, Any]] = []
        article_page = await ctx.new_page()

        for idx, url in enumerate(links, start=1):
            try:
                data = await extract_article(
                    article_page,
                    url,
                    retry_attempts=args.retry_attempts,
                    challenge_wait_ms=int(args.challenge_wait * 1000),
                )
            except Exception as exc:
                records.append({"url": url, "error": str(exc)})
                print(f"  [{idx}/{len(links)}] failed: {url} ({exc})")
                continue

            if is_challenge_page(data):
                records.append({"url": url, "error": "cloudflare_challenge", "title": data.get("title", "")})
                print(f"  [{idx}/{len(links)}] blocked by challenge: {url}")
                if args.delay > 0:
                    await asyncio.sleep(args.delay)
                continue

            title = data.get("title") or f"Untitled-{idx}"
            canonical = data.get("canonicalUrl") or url

            original = base_records_map.get(url) or base_records_map.get(canonical) or {}
            file_md = original.get("file_markdown")
            file_txt = original.get("file_text")
            if file_md and file_txt:
                record_index = int(original.get("index", idx))
            else:
                record_index = idx
            slug = slugify(title, fallback=f"article-{idx}")
            stem = f"{record_index:04d}-{slug[:90]}"
            new_md_rel = f"markdown/{stem}.md"
            new_txt_rel = f"text/{stem}.txt"

            # If this is a retry result and old files used wrong slug (e.g. matterstown),
            # remove old files so corrected titles also correct filenames.
            if file_md and file_txt:
                old_md_path = out_dir / file_md
                old_txt_path = out_dir / file_txt
                new_md_path = out_dir / new_md_rel
                new_txt_path = out_dir / new_txt_rel
                if old_md_path != new_md_path and old_md_path.exists():
                    old_md_path.unlink()
                if old_txt_path != new_txt_path and old_txt_path.exists():
                    old_txt_path.unlink()

            markdown = build_markdown(data)
            (md_dir / f"{stem}.md").write_text(markdown, encoding="utf-8")
            (txt_dir / f"{stem}.txt").write_text(to_text(markdown), encoding="utf-8")

            records.append(
                {
                    "index": record_index,
                    "title": title,
                    "date": data.get("date", ""),
                    "url": canonical,
                    "file_markdown": new_md_rel,
                    "file_text": new_txt_rel,
                }
            )
            print(f"  [{idx}/{len(links)}] ok: {title}")

            if args.delay > 0:
                await asyncio.sleep(args.delay)

        await article_page.close()
        await ctx.close()
        await browser.close()

    if base_records_map:
        merged: dict[str, dict[str, Any]] = {}
        for url, rec in base_records_map.items():
            merged[url] = rec
        for rec in records:
            key = (rec.get("url") or "").strip()
            if key:
                merged[key] = rec
        records = sorted(
            merged.values(),
            key=lambda r: (r.get("index") is None, r.get("index", 10**9), r.get("url", "")),
        )

    summary = {
        "profile_url": args.profile_url,
        "generated_at": dt.datetime.now().isoformat(timespec="seconds"),
        "article_urls_found": len(links),
        "records_written": len([r for r in records if "file_markdown" in r]),
    }

    (out_dir / "manifest.json").write_text(
        json.dumps({"summary": summary, "records": records}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    (out_dir / "README.txt").write_text(
        "\n".join(
            [
                "Matters crawl completed.",
                f"Profile: {args.profile_url}",
                f"Found URLs: {len(links)}",
                f"Exported: {summary['records_written']}",
                "",
                "Folders:",
                "- markdown/: readable markdown files",
                "- text/: plain text files",
                "",
                "Files:",
                "- manifest.json: URL + file mapping + errors",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    return out_dir


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Crawl Matters profile articles")
    parser.add_argument("--profile-url", required=True, help="Profile URL, e.g. https://matters.town/@mashbean")
    parser.add_argument("--out", default="matters_export", help="Output directory")
    parser.add_argument("--max-articles", type=int, default=0, help="Max articles to export (0 = no limit)")
    parser.add_argument("--delay", type=float, default=0.15, help="Delay seconds between article requests")
    parser.add_argument(
        "--retry-from-manifest",
        default="",
        help="Only retry failed/challenge records from an existing manifest.json",
    )
    parser.add_argument(
        "--retry-attempts",
        type=int,
        default=5,
        help="Max attempts per article when challenge page is detected",
    )
    parser.add_argument(
        "--challenge-wait",
        type=float,
        default=5.0,
        help="Seconds to wait before retrying when challenge page is detected",
    )
    parser.add_argument("--headful", action="store_true", help="Run browser in visible mode")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    out_dir = asyncio.run(run(args))
    print(f"[3/3] Done: {out_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
