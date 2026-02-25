#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import matter from "gray-matter";

const ROOT = process.cwd();
const BLOG_DIR = path.join(ROOT, "src", "content", "blog");
const COVER_DIR_REL = path.posix.join("images", "covers", "home");
const COVER_DIR_ABS = path.join(ROOT, "public", "images", "covers", "home");
const REPORT_PATH = path.join(ROOT, "scripts", "home-cover-report.json");
const HOMEPAGE_LIMIT = 12;

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
  "使用者"
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

function escapeXml(input = "") {
  return String(input)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

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

function makeRng(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function addKeyword(map, key, weight = 1) {
  if (!key) return;
  const norm = normalizeText(key).toLocaleLowerCase("zh-TW");
  if (!norm) return;
  map.set(norm, (map.get(norm) ?? 0) + weight);
}

function extractKeywords({ title, description, body, tags, category }) {
  const score = new Map();
  const source = [title, description, body].filter(Boolean).join("\n");
  const plain = stripMarkdown(source);

  for (const tag of tags ?? []) addKeyword(score, tag, 6);
  if (category) addKeyword(score, category, 5);
  addKeyword(score, title, 4);

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

  const sorted = [...score.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([key]) => key);

  return sorted.length ? sorted : ["網路", "社群", "公民科技"];
}

function pickMotif(keywords) {
  const joined = keywords.join(" ");
  if (/隱私|匿名|privacy|cipher|zk|crypt|加密/.test(joined)) return "privacy";
  if (/身分|identity|wallet|did|憑證/.test(joined)) return "identity";
  if (/民主|治理|policy|law|政府|公民/.test(joined)) return "governance";
  if (/nft|藝術|art|gallery|創作/.test(joined)) return "art";
  if (/網路|社群|platform|network|matters/.test(joined)) return "network";
  if (/esim|旅遊|travel|國際|global/.test(joined)) return "globe";
  return "abstract";
}

function buildPaper(rng) {
  const hue = 34 + Math.floor(rng() * 8);
  const sat = 23 + Math.floor(rng() * 12);
  const light = 90 + Math.floor(rng() * 5);
  const light2 = light - 5;
  return {
    bg1: `hsl(${hue} ${sat}% ${light}%)`,
    bg2: `hsl(${hue + 4} ${sat - 4}% ${light2}%)`,
    ink: `hsl(${210 + Math.floor(rng() * 20)} 10% 32%)`,
    inkSoft: `hsl(${210 + Math.floor(rng() * 20)} 8% 45%)`
  };
}

function randomCurve(rng, width, height) {
  const x1 = 60 + rng() * (width - 120);
  const y1 = 60 + rng() * (height - 120);
  const x2 = 60 + rng() * (width - 120);
  const y2 = 60 + rng() * (height - 120);
  const cx1 = 60 + rng() * (width - 120);
  const cy1 = 60 + rng() * (height - 120);
  const cx2 = 60 + rng() * (width - 120);
  const cy2 = 60 + rng() * (height - 120);
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${cx1.toFixed(1)} ${cy1.toFixed(1)}, ${cx2.toFixed(1)} ${cy2.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

function motifSvg(motif, rng, ink, inkSoft) {
  if (motif === "privacy") {
    return `
    <g transform="translate(760 150)">
      <path d="M180 26 L304 88 L304 228 C304 298 254 350 180 388 C106 350 56 298 56 228 L56 88 Z" fill="none" stroke="${ink}" stroke-width="4"/>
      <ellipse cx="180" cy="200" rx="72" ry="52" fill="none" stroke="${inkSoft}" stroke-width="3"/>
      <circle cx="180" cy="200" r="22" fill="none" stroke="${ink}" stroke-width="3"/>
      <path d="M110 286 C148 266 210 266 250 286" fill="none" stroke="${inkSoft}" stroke-width="3"/>
    </g>`;
  }

  if (motif === "identity") {
    return `
    <g transform="translate(734 132)">
      <rect x="0" y="0" width="396" height="364" rx="26" fill="none" stroke="${ink}" stroke-width="4"/>
      <circle cx="112" cy="120" r="52" fill="none" stroke="${inkSoft}" stroke-width="3"/>
      <path d="M58 216 C92 176 136 176 168 216" fill="none" stroke="${inkSoft}" stroke-width="3"/>
      <line x1="208" y1="92" x2="336" y2="92" stroke="${ink}" stroke-width="3"/>
      <line x1="208" y1="132" x2="348" y2="132" stroke="${inkSoft}" stroke-width="2.6"/>
      <line x1="62" y1="276" x2="338" y2="276" stroke="${inkSoft}" stroke-width="2.6"/>
      <line x1="62" y1="312" x2="338" y2="312" stroke="${inkSoft}" stroke-width="2.6"/>
    </g>`;
  }

  if (motif === "governance") {
    return `
    <g transform="translate(742 148)">
      <path d="M36 108 L190 34 L342 108" fill="none" stroke="${ink}" stroke-width="4"/>
      <line x1="54" y1="108" x2="54" y2="290" stroke="${inkSoft}" stroke-width="3"/>
      <line x1="126" y1="86" x2="126" y2="290" stroke="${inkSoft}" stroke-width="3"/>
      <line x1="198" y1="72" x2="198" y2="290" stroke="${inkSoft}" stroke-width="3"/>
      <line x1="270" y1="86" x2="270" y2="290" stroke="${inkSoft}" stroke-width="3"/>
      <line x1="342" y1="108" x2="342" y2="290" stroke="${inkSoft}" stroke-width="3"/>
      <line x1="24" y1="308" x2="364" y2="308" stroke="${ink}" stroke-width="4"/>
    </g>`;
  }

  if (motif === "art") {
    return `
    <g transform="translate(742 132)">
      <rect x="34" y="26" width="314" height="214" rx="10" fill="none" stroke="${ink}" stroke-width="4"/>
      <path d="M56 210 L130 144 L186 176 L242 122 L328 210" fill="none" stroke="${inkSoft}" stroke-width="3"/>
      <circle cx="116" cy="82" r="18" fill="none" stroke="${inkSoft}" stroke-width="3"/>
      <path d="M88 268 C140 234 232 234 304 268" fill="none" stroke="${ink}" stroke-width="3.2"/>
      <rect x="64" y="284" width="252" height="82" rx="10" fill="none" stroke="${inkSoft}" stroke-width="2.8"/>
    </g>`;
  }

  if (motif === "globe") {
    return `
    <g transform="translate(760 132)">
      <circle cx="190" cy="178" r="122" fill="none" stroke="${ink}" stroke-width="4"/>
      <ellipse cx="190" cy="178" rx="88" ry="122" fill="none" stroke="${inkSoft}" stroke-width="2.8"/>
      <ellipse cx="190" cy="178" rx="46" ry="122" fill="none" stroke="${inkSoft}" stroke-width="2.6"/>
      <path d="M68 178 H312 M84 132 H296 M84 224 H296" fill="none" stroke="${inkSoft}" stroke-width="2.6"/>
      <path d="M114 330 C164 286 214 286 264 330" fill="none" stroke="${ink}" stroke-width="3.2"/>
    </g>`;
  }

  if (motif === "network") {
    const points = Array.from({ length: 9 }, () => ({ x: 760 + rng() * 360, y: 126 + rng() * 360 }));
    const lines = [];
    for (let i = 0; i < points.length; i += 1) {
      const a = points[i];
      const b = points[(i + 2) % points.length];
      lines.push(`<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${inkSoft}" stroke-width="2.3"/>`);
    }
    const nodes = points.map(
      (p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${(7 + rng() * 9).toFixed(1)}" fill="none" stroke="${ink}" stroke-width="2.6"/>`
    );
    return `<g>${lines.join("\n")}${nodes.join("\n")}</g>`;
  }

  return `
  <g>
    <path d="M752 168 C828 84 924 84 1092 148" fill="none" stroke="${ink}" stroke-width="4"/>
    <path d="M752 262 C846 202 926 214 1100 318" fill="none" stroke="${inkSoft}" stroke-width="3"/>
    <path d="M752 360 C844 318 944 342 1098 450" fill="none" stroke="${ink}" stroke-width="3.4"/>
    <circle cx="820" cy="432" r="28" fill="none" stroke="${inkSoft}" stroke-width="3"/>
    <circle cx="932" cy="216" r="20" fill="none" stroke="${inkSoft}" stroke-width="3"/>
  </g>`;
}

function createSketchSvg({ seed, motif, keywords, prompt }) {
  const rng = makeRng(seed);
  const paper = buildPaper(rng);

  const scribbles = Array.from({ length: 16 }, () => {
    const pathData = randomCurve(rng, 1200, 630);
    const width = (0.7 + rng() * 1.2).toFixed(2);
    const opacity = (0.11 + rng() * 0.16).toFixed(2);
    return `<path d="${pathData}" fill="none" stroke="${paper.inkSoft}" stroke-width="${width}" opacity="${opacity}"/>`;
  }).join("\n");

  const hatch = Array.from({ length: 20 }, (_, i) => {
    const y = 62 + i * 24 + rng() * 8;
    const x1 = 56 + rng() * 40;
    const x2 = 700 + rng() * 120;
    return `<line x1="${x1.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${(y + rng() * 4).toFixed(1)}" stroke="${paper.inkSoft}" stroke-width="0.9" opacity="0.18"/>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="cover image">
  <metadata>
    ${escapeXml(`keywords: ${keywords.join(", ")}`)}
    ${escapeXml(`prompt: ${prompt}`)}
    ${escapeXml(`motif: ${motif}`)}
  </metadata>
  <defs>
    <filter id="grain" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.86" numOctaves="2" stitchTiles="stitch" />
      <feColorMatrix type="saturate" values="0" />
      <feComponentTransfer>
        <feFuncA type="table" tableValues="0 0.045" />
      </feComponentTransfer>
    </filter>
    <linearGradient id="paper" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${paper.bg1}" />
      <stop offset="100%" stop-color="${paper.bg2}" />
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#paper)" />
  <rect width="1200" height="630" filter="url(#grain)" />

  <g>${hatch}</g>
  <g>${scribbles}</g>

  <g>
    <rect x="66" y="74" width="1068" height="482" rx="24" fill="none" stroke="${paper.ink}" stroke-width="1.4" opacity="0.48" />
    <rect x="82" y="90" width="620" height="450" rx="18" fill="none" stroke="${paper.inkSoft}" stroke-width="1.1" opacity="0.36" />
  </g>

  ${motifSvg(motif, rng, paper.ink, paper.inkSoft)}
</svg>`;
}

function hasExplicitNoPublish(data) {
  return data.published === false || data.draft === true;
}

function toDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
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

    posts.push({
      filePath,
      fileName: path.basename(filePath),
      raw,
      data: doc.data,
      body: doc.content,
      pubDate
    });
  }

  posts.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
  const targets = posts.slice(0, HOMEPAGE_LIMIT);
  await fs.mkdir(COVER_DIR_ABS, { recursive: true });

  const report = [];

  for (const post of targets) {
    const relName = post.fileName.replace(/\.md$/i, ".svg");
    const coverRelPath = `${COVER_DIR_REL}/${relName}`;
    const coverAbsPath = path.join(COVER_DIR_ABS, relName);

    const keywords = extractKeywords({
      title: post.data.title,
      description: post.data.description,
      body: post.body,
      tags: post.data.tags,
      category: post.data.category
    });

    const motif = pickMotif(keywords);
    const prompt = "minimal pencil sketch, bologna illustration style, no text, editorial cover art";
    const seed = hashText(`${post.fileName}|${keywords.join("|")}|${motif}`);

    const svg = createSketchSvg({ seed, motif, keywords, prompt });
    await fs.writeFile(coverAbsPath, svg, "utf8");

    const coverAlt = `${post.data.title} cover illustration (${keywords.slice(0, 4).join(", ")})`;
    const nextRaw = upsertFrontmatter(post.raw, {
      cover: coverRelPath,
      coverAlt
    });
    await fs.writeFile(post.filePath, nextRaw, "utf8");

    report.push({
      file: post.fileName,
      cover: coverRelPath,
      keywords: keywords.slice(0, 6),
      motif,
      prompt
    });
  }

  await fs.writeFile(REPORT_PATH, `${JSON.stringify({ generatedAt: new Date().toISOString(), items: report }, null, 2)}\n`, "utf8");

  console.log("[home-cover-gen] done");
  console.log(`Generated ${report.length} covers.`);
  console.log(`Report: ${path.relative(ROOT, REPORT_PATH)}`);
}

main().catch((error) => {
  console.error("[home-cover-gen] failed:", error);
  process.exitCode = 1;
});
