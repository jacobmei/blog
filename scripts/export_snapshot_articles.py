#!/usr/bin/env python3
"""Export articles from a Snapshot IPNS registry to Markdown and plain text.

Usage example:
  python3 scripts/export_snapshot_articles.py \
    --ipns "ipns://storage.snapshot.page/registry/.../mashbean.eth" \
    --out "snapshot_export"
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import re
import shutil
import ssl
import subprocess
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any

DEFAULT_GATEWAY = "https://ipfs.io"
ALT_GATEWAYS = [
    "http://ipfs.io",
    "https://cloudflare-ipfs.com",
    "http://dweb.link",
    "https://w3s.link",
    "https://dweb.link",
]

ARTICLE_TEXT_KEYS = (
    "content",
    "body",
    "text",
    "md",
    "markdown",
    "message",
    "article",
    "description",
)
TITLE_KEYS = (
    "title",
    "name",
    "subject",
    "headline",
)
DATE_KEYS = (
    "date",
    "created",
    "createdAt",
    "published",
    "publishedAt",
    "timestamp",
    "time",
)
SLUG_KEYS = (
    "slug",
    "id",
    "uid",
)
URL_KEYS = (
    "url",
    "link",
    "permalink",
)


@dataclass
class Article:
    title: str
    content: str
    date: str | None
    slug: str
    source: str


def log(msg: str) -> None:
    print(msg, file=sys.stderr)


def slugify(value: str, fallback: str = "article") -> str:
    value = value.strip().lower()
    value = re.sub(r"\s+", "-", value)
    value = re.sub(r"[^\w\-]+", "", value)
    value = re.sub(r"-{2,}", "-", value).strip("-")
    return value or fallback


def normalize_ipns(ipns: str) -> str:
    ipns = ipns.strip()
    if ipns.startswith("ipns://"):
        return ipns[len("ipns://") :]
    if ipns.startswith("/ipns/"):
        return ipns[len("/ipns/") :]
    return ipns


def build_direct_ipns_urls(ipns_path: str) -> list[str]:
    # For DNSLink-like IPNS paths such as:
    # storage.snapshot.page/registry/.../name.eth
    parts = ipns_path.split("/", 1)
    if len(parts) < 2:
        return []
    host, rest = parts[0].strip(), parts[1].strip()
    if "." not in host or not rest:
        return []
    return [f"https://{host}/{rest}", f"http://{host}/{rest}"]


def http_get(url: str, timeout: int = 30, insecure: bool = False) -> bytes:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "snapshot-exporter/1.0",
            "Accept": "application/json, text/plain;q=0.9, */*;q=0.8",
        },
    )
    context = ssl._create_unverified_context() if insecure else None
    with urllib.request.urlopen(req, timeout=timeout, context=context) as resp:
        return resp.read()


def curl_get(url: str, timeout: int = 30, insecure: bool = False) -> bytes:
    cmd = ["curl", "-fsSL", "--max-time", str(timeout)]
    if insecure:
        cmd.append("-k")
    cmd.append(url)
    proc = subprocess.run(cmd, capture_output=True, check=False)
    if proc.returncode != 0:
        stderr = proc.stderr.decode("utf-8", errors="replace").strip()
        raise RuntimeError(stderr or f"curl exited with code {proc.returncode}")
    return proc.stdout


def fetch_with_fallback(
    path: str,
    kind: str,
    gateways: list[str],
    *,
    insecure: bool = False,
    timeout: int = 30,
) -> tuple[bytes, str]:
    errors: list[str] = []
    has_curl = shutil.which("curl") is not None
    for gateway in gateways:
        url = f"{gateway.rstrip('/')}/{path.lstrip('/')}"
        try:
            data = http_get(url, timeout=timeout, insecure=insecure)
            return data, gateway
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{gateway} (urllib): {exc}")
        if has_curl:
            try:
                data = curl_get(url, timeout=timeout, insecure=insecure)
                return data, gateway
            except Exception as exc:  # noqa: BLE001
                errors.append(f"{gateway} (curl): {exc}")
    joined = "\n".join(errors)
    raise RuntimeError(f"Failed to fetch {kind}:\n{joined}")


def fetch_url_with_fallback(
    urls: list[str],
    kind: str,
    *,
    insecure: bool = False,
    timeout: int = 30,
) -> tuple[bytes, str]:
    errors: list[str] = []
    has_curl = shutil.which("curl") is not None
    for url in urls:
        try:
            data = http_get(url, timeout=timeout, insecure=insecure)
            return data, url
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{url} (urllib): {exc}")
        if has_curl:
            try:
                data = curl_get(url, timeout=timeout, insecure=insecure)
                return data, url
            except Exception as exc:  # noqa: BLE001
                errors.append(f"{url} (curl): {exc}")
    joined = "\n".join(errors)
    raise RuntimeError(f"Failed to fetch {kind}:\n{joined}")


def try_parse_json(data: bytes) -> Any | None:
    text = data.decode("utf-8", errors="replace").strip()
    if not text:
        return None
    if text[0] not in "[{\"" and not text.startswith(("true", "false", "null")):
        return None
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None


def iter_strings(node: Any):
    if isinstance(node, str):
        yield node
    elif isinstance(node, dict):
        for v in node.values():
            yield from iter_strings(v)
    elif isinstance(node, list):
        for v in node:
            yield from iter_strings(v)


def extract_ipfs_refs(node: Any) -> set[str]:
    refs: set[str] = set()
    for text in iter_strings(node):
        for m in re.finditer(r"ipfs://([^\s\"'>)]+)", text):
            refs.add(m.group(1).strip("/"))
    return refs


def looks_like_article_text(text: str) -> bool:
    t = text.strip()
    if len(t) < 120:
        return False
    if t.count("\n") >= 2:
        return True
    if len(re.findall(r"[。！？.!?]", t)) >= 3:
        return True
    return False


def choose_first_str(d: dict[str, Any], keys: tuple[str, ...]) -> str | None:
    for key in keys:
        val = d.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip()
    return None


def pick_content(node: Any) -> str | None:
    if isinstance(node, str):
        return node if looks_like_article_text(node) else None
    if not isinstance(node, dict):
        return None

    for key in ARTICLE_TEXT_KEYS:
        val = node.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip()

    # Generic fallback: longest meaningful string field
    candidates: list[str] = []
    for val in node.values():
        if isinstance(val, str) and looks_like_article_text(val):
            candidates.append(val.strip())
    if candidates:
        return sorted(candidates, key=len, reverse=True)[0]
    return None


def walk_objects(node: Any):
    if isinstance(node, dict):
        yield node
        for v in node.values():
            yield from walk_objects(v)
    elif isinstance(node, list):
        for v in node:
            yield from walk_objects(v)


def extract_articles_from_json(node: Any, source: str) -> list[Article]:
    articles: list[Article] = []
    seen_hashes: set[str] = set()

    for obj in walk_objects(node):
        content = pick_content(obj)
        if not content:
            continue

        digest = hashlib.sha256(content.encode("utf-8", errors="ignore")).hexdigest()
        if digest in seen_hashes:
            continue
        seen_hashes.add(digest)

        title = choose_first_str(obj, TITLE_KEYS) or "Untitled"
        date_val = choose_first_str(obj, DATE_KEYS)
        slug_val = choose_first_str(obj, SLUG_KEYS) or title

        article = Article(
            title=title,
            content=content,
            date=date_val,
            slug=slugify(slug_val, fallback=digest[:12]),
            source=source,
        )
        articles.append(article)

    return articles


def markdown_to_text(md: str) -> str:
    text = md
    text = re.sub(r"```[\s\S]*?```", "", text)
    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = re.sub(r"!\[[^\]]*\]\([^\)]+\)", "", text)
    text = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", text)
    text = re.sub(r"^#{1,6}\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"^[>*-]\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip() + "\n"


def write_article(out_dir: Path, idx: int, article: Article) -> None:
    md_dir = out_dir / "markdown"
    txt_dir = out_dir / "text"
    md_dir.mkdir(parents=True, exist_ok=True)
    txt_dir.mkdir(parents=True, exist_ok=True)

    prefix = f"{idx:04d}-{article.slug[:80]}"
    md_path = md_dir / f"{prefix}.md"
    txt_path = txt_dir / f"{prefix}.txt"

    header_lines = [f"# {article.title}", "", f"Source: {article.source}"]
    if article.date:
        header_lines.append(f"Date: {article.date}")
    header_lines.append("")
    markdown = "\n".join(header_lines) + article.content.strip() + "\n"

    md_path.write_text(markdown, encoding="utf-8")
    txt_path.write_text(markdown_to_text(markdown), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Export Snapshot IPNS articles")
    parser.add_argument("--ipns", required=True, help="IPNS URI/path")
    parser.add_argument("--out", default="", help="Output directory")
    parser.add_argument(
        "--gateway",
        default=DEFAULT_GATEWAY,
        help="Primary IPFS gateway (default: https://ipfs.io)",
    )
    parser.add_argument(
        "--sleep",
        type=float,
        default=0.0,
        help="Optional delay seconds between CID requests",
    )
    parser.add_argument(
        "--insecure",
        action="store_true",
        help="Skip TLS certificate verification (use only if your network/certs are broken)",
    )
    parser.add_argument(
        "--index-file",
        default="",
        help="Use a local IPNS index JSON file instead of fetching from network",
    )
    args = parser.parse_args()

    ts = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    out_dir = Path(args.out or f"snapshot-export-{ts}").resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    raw_dir = out_dir / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)

    ipns_path = normalize_ipns(args.ipns)
    gateways = [args.gateway] + [g for g in ALT_GATEWAYS if g != args.gateway]

    log(f"[1/4] Fetching IPNS index: {ipns_path}")
    index_gateway = ""
    if args.index_file:
        index_path_local = Path(args.index_file).expanduser().resolve()
        if not index_path_local.exists():
            raise RuntimeError(f"--index-file not found: {index_path_local}")
        index_bytes = index_path_local.read_bytes()
        index_gateway = f"file://{index_path_local}"
        log(f"  Using local index file: {index_path_local}")
    else:
        direct_urls = build_direct_ipns_urls(ipns_path)
        if direct_urls:
            try:
                index_bytes, index_source = fetch_url_with_fallback(
                    direct_urls,
                    "ipns index (direct url)",
                    insecure=args.insecure,
                )
                index_gateway = index_source
                log(f"  Using direct source: {index_source}")
            except Exception as exc:  # noqa: BLE001
                log(f"  Direct fetch failed, fallback to gateways: {exc}")
                index_bytes, index_gateway = fetch_with_fallback(
                    f"ipns/{ipns_path}",
                    "ipns index",
                    gateways,
                    insecure=args.insecure,
                )
        else:
            index_bytes, index_gateway = fetch_with_fallback(
                f"ipns/{ipns_path}",
                "ipns index",
                gateways,
                insecure=args.insecure,
            )
    index_path = out_dir / "index.json"
    index_path.write_bytes(index_bytes)

    index_json = try_parse_json(index_bytes)
    if index_json is None:
        raise RuntimeError(f"Index is not JSON, cannot continue: {index_path}")

    refs = sorted(extract_ipfs_refs(index_json))
    (out_dir / "cids.txt").write_text("\n".join(refs) + ("\n" if refs else ""), encoding="utf-8")
    log(f"[2/4] Found {len(refs)} IPFS refs from index ({index_gateway})")

    articles: list[Article] = []
    manifests: list[dict[str, Any]] = []

    for i, ref in enumerate(refs, start=1):
        cid = ref.split("/", 1)[0]
        if not cid:
            continue
        if args.sleep > 0:
            time.sleep(args.sleep)

        try:
            blob, gw = fetch_with_fallback(
                f"ipfs/{cid}",
                f"cid {cid}",
                gateways,
                insecure=args.insecure,
            )
        except Exception as exc:  # noqa: BLE001
            log(f"[warn] Failed CID {cid}: {exc}")
            continue

        raw_path = raw_dir / f"{cid}.bin"
        raw_path.write_bytes(blob)

        item_json = try_parse_json(blob)
        item_articles: list[Article] = []
        if item_json is not None:
            json_path = raw_dir / f"{cid}.json"
            json_path.write_text(
                json.dumps(item_json, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            item_articles = extract_articles_from_json(item_json, source=f"{gw}/ipfs/{cid}")
        else:
            text = blob.decode("utf-8", errors="replace")
            if looks_like_article_text(text):
                digest = hashlib.sha256(text.encode("utf-8", errors="ignore")).hexdigest()[:12]
                item_articles = [
                    Article(
                        title=f"Untitled-{cid[:8]}",
                        content=text,
                        date=None,
                        slug=digest,
                        source=f"{gw}/ipfs/{cid}",
                    )
                ]

        articles.extend(item_articles)
        manifests.append(
            {
                "cid": cid,
                "gateway": gw,
                "raw_file": str(raw_path.name),
                "article_count": len(item_articles),
            }
        )

        if i % 10 == 0 or i == len(refs):
            log(f"  Progress: {i}/{len(refs)} CIDs")

    # Deduplicate final articles by content hash across all CIDs
    uniq: list[Article] = []
    seen: set[str] = set()
    for article in articles:
        digest = hashlib.sha256(article.content.encode("utf-8", errors="ignore")).hexdigest()
        if digest in seen:
            continue
        seen.add(digest)
        uniq.append(article)

    log(f"[3/4] Writing {len(uniq)} extracted articles")
    for idx, article in enumerate(uniq, start=1):
        write_article(out_dir, idx, article)

    summary = {
        "ipns": args.ipns,
        "resolved_ipns_path": ipns_path,
        "index_gateway": index_gateway,
        "output_dir": str(out_dir),
        "cid_count": len(refs),
        "article_count": len(uniq),
        "generated_at": dt.datetime.now().isoformat(timespec="seconds"),
    }
    (out_dir / "manifest.json").write_text(
        json.dumps({"summary": summary, "cids": manifests}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    readme = out_dir / "README.txt"
    readme.write_text(
        "\n".join(
            [
                "Snapshot export completed.",
                f"IPNS: {args.ipns}",
                f"CIDs discovered: {len(refs)}",
                f"Articles extracted: {len(uniq)}",
                "",
                "Folders:",
                "- raw/: downloaded IPFS payloads",
                "- markdown/: extracted readable Markdown articles",
                "- text/: plain text versions",
                "",
                "Files:",
                "- index.json: original IPNS index payload",
                "- cids.txt: unique CIDs discovered from index",
                "- manifest.json: fetch and extraction summary",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    log(f"[4/4] Done. Output: {out_dir}")
    print(str(out_dir))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
