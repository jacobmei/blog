#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const root = process.cwd();
const blogDir = path.join(root, "src", "content", "blog");

function splitFrontmatter(raw) {
  if (!raw.startsWith("---\n")) return { frontmatter: "", body: raw };
  const end = raw.indexOf("\n---\n", 4);
  if (end === -1) return { frontmatter: "", body: raw };
  const fm = raw.slice(0, end + 5);
  const body = raw.slice(end + 5);
  return { frontmatter: fm, body };
}

function hasMarkdownHeading(body) {
  if (/(^|\n)#{1,6}\s+\S/.test(body)) return true;
  const lines = body.split(/\r?\n/);
  for (let i = 0; i < lines.length - 1; i++) {
    const a = lines[i].trim();
    const b = lines[i + 1].trim();
    if (!a || !b) continue;
    if (/^=+$/.test(b) || /^-+$/.test(b)) return true;
  }
  return false;
}

function isBlockedLine(line) {
  return (
    /^[-*+]\s/.test(line) ||
    /^\d+\.\s/.test(line) ||
    /^>\s/.test(line) ||
    /^```/.test(line) ||
    /^!\[/.test(line) ||
    /^\|/.test(line) ||
    /^<\/?[a-z]/i.test(line)
  );
}

function canPromoteLine(lines, idx) {
  const raw = lines[idx];
  const line = raw.trim();
  if (!line) return false;
  if (/^#{1,6}\s+/.test(line)) return false;
  if (isBlockedLine(line)) return false;
  if (/^來源[:：]/.test(line)) return false;
  if (/^https?:\/\//i.test(line)) return false;

  const prev = idx > 0 ? lines[idx - 1].trim() : "";
  const next = idx < lines.length - 1 ? lines[idx + 1].trim() : "";
  const len = line.length;

  const numbered = /^\d{1,2}\s*[\/／、.-]\s*\S+/.test(line);
  if (numbered && len <= 42) return true;

  const surroundedShort = !prev && !next && len >= 4 && len <= 40 && !/[。；;，,！!？?]$/.test(line);
  if (surroundedShort) return true;

  const leadIn = !prev && !!next && len >= 4 && len <= 24 && /[：:?？]$/.test(line);
  if (leadIn) return true;

  return false;
}

function firstParagraphIndex(lines) {
  let skippedTitleLike = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (/^來源[:：]/.test(line)) continue;
    if (/^原文(連結|網址)?[:：]/.test(line)) continue;

    const next = i < lines.length - 1 ? lines[i + 1].trim() : "";
    const titleLike = line.length <= 60 && !/[。；;，,！!？?]$/.test(line) && !next;
    if (!skippedTitleLike && titleLike) {
      skippedTitleLike = true;
      continue;
    }
    return i;
  }
  return -1;
}

function addHeadings(body) {
  const lines = body.split(/\r?\n/);
  const out = [...lines];
  let inCodeFence = false;
  let promoted = 0;

  for (let i = 0; i < out.length; i++) {
    const line = out[i];
    if (/^```/.test(line.trim())) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;
    if (!canPromoteLine(out, i)) continue;
    out[i] = `## ${line.trim()}`;
    promoted++;
  }

  if (promoted === 0) {
    const idx = firstParagraphIndex(out);
    if (idx >= 0) {
      out.splice(idx, 0, "## 內文", "");
      promoted++;
    }
  }

  return { body: out.join("\n"), promoted };
}

async function main() {
  const names = (await fs.readdir(blogDir)).filter((n) => /\.(md|mdx)$/i.test(n));
  names.sort();

  let scanned = 0;
  let noHeading = 0;
  let changed = 0;
  const touched = [];

  for (const name of names) {
    const full = path.join(blogDir, name);
    const raw = await fs.readFile(full, "utf8");
    const { frontmatter, body } = splitFrontmatter(raw);
    scanned++;

    if (hasMarkdownHeading(body)) continue;
    noHeading++;

    const { body: nextBody, promoted } = addHeadings(body);
    if (!promoted || nextBody === body) continue;

    changed++;
    touched.push(name);

    if (!dryRun) {
      await fs.writeFile(full, `${frontmatter}${nextBody}`, "utf8");
    }
  }

  console.log(JSON.stringify({ scanned, noHeading, changed, dryRun }, null, 2));
  if (touched.length) {
    console.log("\\nchanged files:");
    for (const n of touched) console.log(n);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
