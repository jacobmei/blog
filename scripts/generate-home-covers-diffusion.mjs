#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import matter from "gray-matter";

const ROOT = process.cwd();
const BLOG_DIR = path.join(ROOT, "src", "content", "blog");
const PUBLIC_COVER_DIR_REL = path.posix.join("images", "covers", "home");
const PUBLIC_COVER_DIR_ABS = path.join(ROOT, "public", "images", "covers", "home");
const PROMPTS_PATH = path.join(ROOT, "scripts", "home-cover-prompts.json");
const REPORT_PATH = path.join(ROOT, "scripts", "home-cover-report.json");
const HOMEPAGE_LIMIT = 12;

const BASE_PROMPT =
  "playful naive storybook illustration, hand-cut paper collage, visible torn paper edges, wax crayon and dry gouache texture, imperfect hand-drawn ink outlines, childlike animal characters, airy editorial composition, mint + apricot + cream + sky blue palette, cozy creative studio mood, no text, no typography, no letters, no watermark, no logo";
const NEGATIVE_PROMPT =
  "text, typography, letters, watermark, logo, signature, caption, UI, screenshot, photo, photorealistic, 3d render, ugly, low quality, dark red, maroon, burgundy";

const ZH_STOPWORDS = new Set([
  "我們",
  "你們",
  "他們",
  "這個",
  "這些",
  "那個",
  "那些",
  "以及",
  "可以",
  "如果",
  "因為",
  "但是",
  "就是",
  "不是",
  "一個",
  "一種",
  "平台",
  "內容",
  "文章",
  "目前",
  "這樣",
  "其中",
  "更多",
  "開始",
  "如何",
  "沒有",
  "自己",
  "使用者",
  "第一",
  "第二",
  "第三",
  "因此",
  "然而"
]);

const EN_STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "into",
  "will",
  "your",
  "about",
  "have",
  "has",
  "been",
  "are",
  "was",
  "were",
  "not",
  "more",
  "than"
]);

function normalizeText(input = "") {
  return String(input)
    .normalize("NFKC")
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .trim();
}

function stripMarkdown(md = "") {
  return normalizeText(md)
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/^>\s?/gm, "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/[|]/g, " ")
    .replace(/\n{2,}/g, "\n")
    .replace(/\s+/g, " ")
    .trim();
}

function hashText(input = "") {
  let hash = 2166136261;
  for (const ch of input) {
    hash ^= ch.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function addKeyword(score, key, weight = 1) {
  if (!key) return;
  const norm = normalizeText(key).toLocaleLowerCase("zh-TW");
  if (!norm) return;
  score.set(norm, (score.get(norm) ?? 0) + weight);
}

function extractKeywords({ title, description, body, tags, category }) {
  const score = new Map();
  const source = [title, description, body].filter(Boolean).join("\n");
  const plain = stripMarkdown(source)
    .replace(/^來源[:：]?\s*/gim, "")
    .replace(/^source[:：]?\s*/gim, "")
    .trim();

  for (const tag of tags ?? []) addKeyword(score, tag, 8);
  if (category) addKeyword(score, category, 7);
  if (title) addKeyword(score, title, 5);

  const zhTokens = plain.match(/[\p{Script=Han}]{2,8}/gu) ?? [];
  for (const token of zhTokens) {
    if (ZH_STOPWORDS.has(token)) continue;
    addKeyword(score, token, 2);
  }

  const enTokens = plain.match(/[A-Za-z][A-Za-z0-9/+.-]{2,}/g) ?? [];
  for (const tokenRaw of enTokens) {
    const token = tokenRaw.toLocaleLowerCase("en-US");
    if (EN_STOPWORDS.has(token)) continue;
    addKeyword(score, token, 1);
  }

  return [...score.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([key]) => key);
}

function pickMotif(keywords) {
  const joined = keywords.join(" ");
  if (/隱私|匿名|privacy|cipher|zk|crypt|加密/.test(joined)) return "privacy";
  if (/身分|identity|wallet|did|憑證/.test(joined)) return "identity";
  if (/民主|治理|policy|law|政府|公民/.test(joined)) return "governance";
  if (/nft|藝術|art|gallery|創作/.test(joined)) return "art";
  if (/esim|旅遊|travel|國際|global/.test(joined)) return "globe";
  if (/網路|社群|platform|network|matters/.test(joined)) return "network";
  return "abstract";
}

function motifPrompt(motif) {
  switch (motif) {
    case "privacy":
      return "symbolic lock, shield, hidden patterns, privacy by design";
    case "identity":
      return "identity card silhouette, wallet motif, credential layers, subtle geometric frames";
    case "governance":
      return "civic architecture, columns, assembly, structured grid, governance";
    case "art":
      return "gallery frame, brush strokes, abstract sculpture, creative tools";
    case "globe":
      return "globe lines, travel map, routes, connection arcs";
    case "network":
      return "nodes and links, community graph, connection lines, constellation";
    default:
      return "abstract shapes, calm geometry, editorial composition";
  }
}

function toDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function hasExplicitNoPublish(data) {
  return data.published === false || data.draft === true;
}

function upsertFrontmatter(raw, updates) {
  if (!raw.startsWith("---\n")) throw new Error("File has no YAML frontmatter block.");
  const end = raw.indexOf("\n---", 4);
  if (end < 0) throw new Error("Frontmatter closing marker not found.");

  const head = raw.slice(4, end);
  const tail = raw.slice(end + 4);
  let nextHead = head;

  for (const [key, value] of Object.entries(updates)) {
    const encoded = String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"');
    const lineRegex = new RegExp(`^${key}:\\s*.*$`, "m");
    if (lineRegex.test(nextHead)) {
      nextHead = nextHead.replace(lineRegex, `${key}: "${encoded}"`);
    } else {
      nextHead = `${nextHead.replace(/\n+$/g, "")}\n${key}: "${encoded}"\n`;
    }
  }

  const normalizedHead = `${nextHead.replace(/^\n+/, "").replace(/\n*$/g, "")}\n`;
  return `---\n${normalizedHead}---${tail}`;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const apply = args.has("--apply");
  const dryRun = args.has("--dry-run");

  const files = await fg("*.md", { cwd: BLOG_DIR, absolute: true });
  const now = Date.now();
  const posts = [];

  for (const filePath of files) {
    const raw = await fs.readFile(filePath, "utf8");
    const doc = matter(raw);
    const pubDate = toDate(doc.data.pubDate ?? doc.data.date);
    if (!pubDate) continue;
    if (hasExplicitNoPublish(doc.data)) continue;
    if (pubDate.getTime() > now) continue;
    posts.push({ filePath, fileName: path.basename(filePath), raw, data: doc.data, body: doc.content, pubDate });
  }

  posts.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
  const targets = posts.slice(0, HOMEPAGE_LIMIT);

  await fs.mkdir(PUBLIC_COVER_DIR_ABS, { recursive: true });

  const items = [];

  for (const post of targets) {
    const baseName = post.fileName.replace(/\.md$/i, "");
    const jpgName = `${baseName}.jpg`;
    const coverRelJpg = `${PUBLIC_COVER_DIR_REL}/${jpgName}`;
    const coverAbsJpg = path.join(PUBLIC_COVER_DIR_ABS, jpgName);

    const keywords = extractKeywords({
      title: post.data.title,
      description: post.data.description,
      body: post.body,
      tags: post.data.tags,
      category: post.data.category
    });
    const motif = pickMotif(keywords);
    const seed = hashText(`${post.fileName}|${keywords.join("|")}|${motif}`);

    const prompt = `${BASE_PROMPT}, ${motifPrompt(motif)}, keywords: ${keywords.slice(0, 6).join(", ")}`;

    items.push({
      file: post.fileName,
      title: post.data.title ?? "",
      coverPng: coverRelJpg,
      width: 1200,
      height: 630,
      seed,
      prompt,
      negativePrompt: NEGATIVE_PROMPT,
      keywords: keywords.slice(0, 8),
      motif
    });

    if (!apply) continue;

    let exists = false;
    try {
      await fs.access(coverAbsJpg);
      exists = true;
    } catch {
      exists = false;
    }

    if (!exists) continue;
    const nextRaw = upsertFrontmatter(post.raw, { cover: coverRelJpg });
    if (!dryRun) await fs.writeFile(post.filePath, nextRaw, "utf8");
  }

  const payload = { generatedAt: new Date().toISOString(), basePrompt: BASE_PROMPT, negativePrompt: NEGATIVE_PROMPT, items };
  if (!dryRun) {
    await fs.writeFile(PROMPTS_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    await fs.writeFile(REPORT_PATH, `${JSON.stringify({ generatedAt: payload.generatedAt, items: items.map((x) => ({ file: x.file, coverPng: x.coverPng, keywords: x.keywords, motif: x.motif })) }, null, 2)}\n`, "utf8");
  }

  console.log("[home-cover-diffusion] prompts ready");
  console.log(`Targets: ${items.length}`);
  console.log(`Prompts: ${path.relative(ROOT, PROMPTS_PATH)}`);
  console.log(`Report: ${path.relative(ROOT, REPORT_PATH)}`);
  if (apply) console.log("Applied: cover updated where PNG exists.");
}

main().catch((error) => {
  console.error("[home-cover-diffusion] failed:", error);
  process.exitCode = 1;
});
