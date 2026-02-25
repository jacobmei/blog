#!/usr/bin/env python3
from __future__ import annotations

import argparse
import html
import json
import re
import ssl
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import quote, urlparse, urlunparse
from typing import Optional

ARTOUCH_URL_RE = re.compile(r"\[前往閱讀\]\((https://artouch\.com/[^\)]+)\)")
ARTOUCH_ANY_URL_RE = re.compile(r"https://artouch\.com/[^\s\)\]\"'>]+")
ENTRY_START = '<div class="post-content entry-content" itemprop="articleBody">'
OG_IMAGE_RE = re.compile(r'<meta property="og:image" content="([^"]+)"')


@dataclass
class ProcessResult:
    file: str
    url: str
    status: str
    message: str = ""
    og_image: str = ""
    image_count: int = 0


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Enrich local ARTouch index posts with full article content.")
    p.add_argument("--source-dir", default="src/content/blog", help="Blog content directory")
    p.add_argument("--download-dir", default="public/images/artouch", help="Downloaded image directory")
    p.add_argument("--apply", action="store_true", help="Write file changes (default: dry run)")
    p.add_argument("--limit", type=int, default=0, help="Limit number of files (0 = all)")
    p.add_argument("--report", default="reports/artouch-enrich-report.json", help="Report output path")
    return p.parse_args()


def fetch(url: str) -> str:
    safe = normalize_url(url)
    req = urllib.request.Request(
        safe,
        headers={"User-Agent": "Mozilla/5.0 (compatible; MashbeanArtouchImporter/2.0)"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.read().decode("utf-8", errors="replace")
    except Exception:
        ctx = ssl._create_unverified_context()
        with urllib.request.urlopen(req, timeout=30, context=ctx) as resp:
            return resp.read().decode("utf-8", errors="replace")


def fetch_bytes(url: str) -> bytes:
    safe = normalize_url(url)
    req = urllib.request.Request(
        safe,
        headers={"User-Agent": "Mozilla/5.0 (compatible; MashbeanArtouchImporter/2.0)"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.read()
    except Exception:
        ctx = ssl._create_unverified_context()
        with urllib.request.urlopen(req, timeout=30, context=ctx) as resp:
            return resp.read()


def normalize_url(url: str) -> str:
    parsed = urlparse(url)
    if not parsed.scheme:
        return url
    path = quote(parsed.path, safe="/%:@()!+,;=-._~")
    query = quote(parsed.query, safe="=&%:@()!+,;/-._~")
    return urlunparse((parsed.scheme, parsed.netloc, path, parsed.params, query, parsed.fragment))


def candidate_article_urls(url: str) -> list[str]:
    urls = [url]
    # Some ARTouch pages moved from /artouch-column/mintmint-column/content-xxxxx.html
    # to /artouch-column/content-xxxxx.html
    moved = re.sub(r"/artouch-column/mintmint-column/", "/artouch-column/", url)
    if moved != url:
        urls.append(moved)
    return urls


def split_frontmatter(raw: str) -> tuple[str, str]:
    if not raw.startswith("---"):
        raise ValueError("Missing frontmatter start")
    parts = raw.split("---", 2)
    if len(parts) < 3:
        raise ValueError("Invalid frontmatter structure")
    frontmatter = parts[1].strip("\n")
    body = parts[2].lstrip("\n")
    return frontmatter, body


def find_post_url(body: str) -> Optional[str]:
    m = ARTOUCH_URL_RE.search(body)
    if m:
        return m.group(1).strip()
    any_m = ARTOUCH_ANY_URL_RE.search(body)
    return any_m.group(0).strip() if any_m else None


def extract_entry_html(page_html: str) -> str:
    start = page_html.find(ENTRY_START)
    if start < 0:
        raise ValueError("Article body start marker not found")
    cursor = start + len(ENTRY_START)
    div_depth = 1
    token_re = re.compile(r"</?div\b[^>]*>", re.I)
    for token in token_re.finditer(page_html, cursor):
        tag = token.group(0)
        if tag.startswith("</"):
            div_depth -= 1
        else:
            div_depth += 1
        if div_depth == 0:
            return page_html[cursor: token.start()].strip()
    raise ValueError("Failed to locate article body end")


def normalize_html_chunk(chunk: str) -> str:
    out = chunk
    out = re.sub(r"<!--.*?-->", "", out, flags=re.S)
    out = re.sub(r"<script[\s\S]*?</script>", "", out, flags=re.I)
    out = re.sub(r"<style[\s\S]*?</style>", "", out, flags=re.I)
    out = re.sub(r"\s+(srcset|sizes|loading|decoding|fetchpriority)=\"[^\"]*\"", "", out, flags=re.I)
    out = re.sub(r"\s+class=\"[^\"]*\"", "", out, flags=re.I)
    out = re.sub(r"\s+style=\"[^\"]*\"", "", out, flags=re.I)
    out = re.sub(r"\s+id=\"[^\"]*\"", "", out, flags=re.I)
    out = re.sub(r"\s+target=\"_blank\"", "", out, flags=re.I)
    out = re.sub(r"\s+rel=\"[^\"]*\"", "", out, flags=re.I)
    out = re.sub(r"\n{3,}", "\n\n", out)
    return out.strip()


def inline_html_to_md(text: str) -> str:
    s = text
    s = re.sub(r"<br\s*/?>", "  \n", s, flags=re.I)
    s = re.sub(
        r"<a\s+[^>]*href=\"([^\"]+)\"[^>]*>([\s\S]*?)</a>",
        lambda m: f"[{inline_html_to_md(m.group(2))}]({m.group(1).strip()})",
        s,
        flags=re.I,
    )
    s = re.sub(r"<strong[^>]*>([\s\S]*?)</strong>", lambda m: f"**{inline_html_to_md(m.group(1))}**", s, flags=re.I)
    s = re.sub(r"<em[^>]*>([\s\S]*?)</em>", lambda m: f"*{inline_html_to_md(m.group(1))}*", s, flags=re.I)
    s = re.sub(r"<code[^>]*>([\s\S]*?)</code>", lambda m: f"`{html.unescape(m.group(1).strip())}`", s, flags=re.I)
    s = re.sub(r"<[^>]+>", "", s)
    s = html.unescape(s)
    s = s.replace("\xa0", " ")
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r" *\n *", "\n", s)
    return s.strip()


def rewrite_and_download_images(article_html: str, post_key: str, download_root: Path, apply: bool) -> tuple[str, int]:
    img_re = re.compile(r"<img\b[^>]*\bsrc=\"([^\"]+)\"[^>]*>", re.I)
    srcs = []
    for m in img_re.finditer(article_html):
        src = m.group(1).strip()
        if src and src not in srcs:
            srcs.append(src)

    mapping: dict[str, str] = {}
    count = 0
    folder_rel = f"images/artouch/{post_key}"
    folder_abs = download_root / post_key
    if apply:
        folder_abs.mkdir(parents=True, exist_ok=True)

    for idx, src in enumerate(srcs, start=1):
        parsed = urlparse(src)
        ext = Path(parsed.path).suffix.lower()
        if ext not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
            ext = ".jpg"
        name = f"img-{idx:02d}{ext}"
        rel = f"/{folder_rel}/{name}"
        mapping[src] = rel
        downloaded = False
        if apply:
            out = folder_abs / name
            if out.exists():
                downloaded = True
            else:
                try:
                    out.write_bytes(fetch_bytes(src))
                    downloaded = True
                except Exception:
                    downloaded = False
        if downloaded or not apply:
            count += 1
        else:
            # Keep remote source when download fails, don't break full import.
            mapping.pop(src, None)

    out_html = article_html
    for old, new in mapping.items():
        out_html = out_html.replace(f'src="{old}"', f'src="{new}"')

    return out_html, count


def figure_to_md(inner: str) -> str:
    img_m = re.search(r"<img\b[^>]*\bsrc=\"([^\"]+)\"[^>]*>", inner, re.I)
    if not img_m:
        return ""
    src = img_m.group(1).strip()
    alt_m = re.search(r"<img\b[^>]*\balt=\"([^\"]*)\"[^>]*>", inner, re.I)
    alt = inline_html_to_md(alt_m.group(1)) if alt_m else ""
    cap_m = re.search(r"<figcaption[^>]*>([\s\S]*?)</figcaption>", inner, re.I)
    caption = inline_html_to_md(cap_m.group(1)) if cap_m else ""
    md = f"![{alt}]({src})"
    if caption:
        md += f"\n\n*{caption}*"
    return md


def blockquote_to_md(inner: str) -> str:
    cite_m = re.search(r"<cite[^>]*>([\s\S]*?)</cite>", inner, re.I)
    cite = inline_html_to_md(cite_m.group(1)) if cite_m else ""
    body = re.sub(r"<cite[^>]*>[\s\S]*?</cite>", "", inner, flags=re.I)
    paras = re.findall(r"<p[^>]*>([\s\S]*?)</p>", body, flags=re.I)
    lines = [inline_html_to_md(p) for p in paras if inline_html_to_md(p)]
    if not lines:
        text = inline_html_to_md(body)
        if text:
            lines = [text]
    quoted = "\n".join(f"> {line}" for line in lines)
    if cite:
        quoted += f"\n> — {cite}"
    return quoted.strip()


def list_to_md(tag: str, inner: str) -> str:
    items = re.findall(r"<li[^>]*>([\s\S]*?)</li>", inner, flags=re.I)
    out = []
    for i, item in enumerate(items, start=1):
        text = inline_html_to_md(item)
        if not text:
            continue
        if tag.lower() == "ol":
            out.append(f"{i}. {text}")
        else:
            out.append(f"- {text}")
    return "\n".join(out).strip()


def convert_html_to_markdown(article_html: str) -> str:
    html_chunk = article_html.replace("\r\n", "\n")
    block_re = re.compile(
        r"<(h[1-6]|p|figure|blockquote|ul|ol)\b[^>]*>([\s\S]*?)</\1>|<hr\b[^>]*?/?>",
        flags=re.I,
    )

    blocks: list[str] = []
    for m in block_re.finditer(html_chunk):
        whole = m.group(0)
        tag = (m.group(1) or "").lower()
        inner = m.group(2) or ""

        if whole.lower().startswith("<hr"):
            blocks.append("---")
            continue

        if tag.startswith("h"):
            level = int(tag[1])
            text = inline_html_to_md(inner)
            if text:
                blocks.append(f"{'#' * level} {text}")
            continue

        if tag == "p":
            text = inline_html_to_md(inner)
            if text:
                blocks.append(text)
            continue

        if tag == "figure":
            md = figure_to_md(inner)
            if md:
                blocks.append(md)
            continue

        if tag == "blockquote":
            md = blockquote_to_md(inner)
            if md:
                blocks.append(md)
            continue

        if tag in {"ul", "ol"}:
            md = list_to_md(tag, inner)
            if md:
                blocks.append(md)
            continue

    out = "\n\n".join(blocks)
    out = re.sub(r"\n{3,}", "\n\n", out).strip()
    return out


def render_new_body(url: str, article_md: str) -> str:
    return (
        "## 內文\n\n"
        "> 本文同步自 ARTouch 薄荷薄荷專欄，並已轉為本地可維護格式（含圖片本地化）。\n"
        f"> [原文連結]({url})\n\n"
        f"{article_md}\n\n"
        "---\n\n"
        f"[原文連結]({url})\n"
    )


def process_file(path: Path, download_root: Path, apply: bool) -> ProcessResult:
    raw = path.read_text(encoding="utf-8")
    frontmatter, body = split_frontmatter(raw)
    url = find_post_url(body)
    if not url:
        return ProcessResult(str(path), "", "skipped", "No ARTouch source url found")

    page_html = ""
    last_error: Exception | None = None
    final_url = url
    for candidate in candidate_article_urls(url):
        try:
            page_html = fetch(candidate)
            final_url = candidate
            break
        except urllib.error.HTTPError as exc:
            last_error = exc
            if exc.code != 404:
                raise
        except Exception as exc:
            last_error = exc
    if not page_html:
        if isinstance(last_error, urllib.error.HTTPError) and last_error.code == 404:
            return ProcessResult(str(path), url, "skipped", "ARTouch source returned 404")
        if last_error:
            raise last_error
        raise ValueError("Unable to fetch ARTouch article")
    article_html = normalize_html_chunk(extract_entry_html(page_html))
    if not article_html:
        return ProcessResult(str(path), url, "failed", "Extracted article body is empty")

    post_key = path.stem
    localized_html, image_count = rewrite_and_download_images(article_html, post_key, download_root, apply=apply)
    article_md = convert_html_to_markdown(localized_html)
    if not article_md:
        return ProcessResult(str(path), url, "failed", "Markdown conversion output is empty")

    og_image = ""
    og = OG_IMAGE_RE.search(page_html)
    if og:
        og_image = og.group(1).strip()

    new_body = render_new_body(final_url, article_md)
    next_raw = f"---\n{frontmatter}\n---\n\n{new_body}"

    if apply and next_raw != raw:
        path.write_text(next_raw, encoding="utf-8")
        return ProcessResult(str(path), final_url, "updated", f"markdown_size={len(article_md)}", og_image=og_image, image_count=image_count)
    if next_raw == raw:
        return ProcessResult(str(path), final_url, "unchanged", "No diff after normalization", og_image=og_image, image_count=image_count)
    return ProcessResult(str(path), final_url, "dry-run", f"would_update markdown_size={len(article_md)}", og_image=og_image, image_count=image_count)


def is_mintmint_index(raw: str, filename: str) -> bool:
    if not filename.endswith("-artouch.md"):
        return False
    if "薄荷薄荷專欄" not in raw:
        return False
    return "artouch.com/" in raw


def main() -> int:
    args = parse_args()
    source_dir = Path(args.source_dir).resolve()
    download_root = Path(args.download_dir).resolve()
    files = sorted(source_dir.glob("*-artouch.md"))

    selected: list[Path] = []
    for f in files:
        try:
            text = f.read_text(encoding="utf-8")
        except Exception:
            continue
        if is_mintmint_index(text, f.name):
            selected.append(f)

    if args.limit > 0:
        selected = selected[: args.limit]

    results: list[ProcessResult] = []
    for path in selected:
        try:
            results.append(process_file(path, download_root=download_root, apply=args.apply))
        except Exception as exc:
            results.append(ProcessResult(str(path), "", "failed", str(exc)))

    summary = {
        "source_dir": str(source_dir),
        "download_dir": str(download_root),
        "apply": bool(args.apply),
        "total_candidates": len(selected),
        "updated": sum(1 for r in results if r.status == "updated"),
        "dry_run": sum(1 for r in results if r.status == "dry-run"),
        "unchanged": sum(1 for r in results if r.status == "unchanged"),
        "skipped": sum(1 for r in results if r.status == "skipped"),
        "failed": sum(1 for r in results if r.status == "failed"),
        "images_downloaded_total": sum(r.image_count for r in results if r.status in {"updated", "unchanged", "dry-run"}),
        "results": [r.__dict__ for r in results],
    }

    report_path = Path(args.report).resolve()
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")

    print(
        f"done candidates={summary['total_candidates']} updated={summary['updated']} "
        f"dry_run={summary['dry_run']} unchanged={summary['unchanged']} failed={summary['failed']} "
        f"images={summary['images_downloaded_total']}"
    )
    print(f"report: {report_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
