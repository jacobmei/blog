#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import fg from "fast-glob";
import matter from "gray-matter";

const ROOT = process.cwd();
const BLOG_DIR = path.join(ROOT, "src", "content", "blog");
const PROMPTS_PATH = path.join(ROOT, "scripts", "home-cover-prompts.json");

function parseArgs(argv) {
  const args = {
    file: "",
    apiBase: "https://api.openai.com/v1",
    model: "gpt-image-1",
    size: "1536x1024",
    quality: "high",
    outputQuality: 82,
    dryRun: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--file") args.file = argv[++i] ?? "";
    if (token === "--api-base") args.apiBase = argv[++i] ?? args.apiBase;
    if (token === "--model") args.model = argv[++i] ?? args.model;
    if (token === "--size") args.size = argv[++i] ?? args.size;
    if (token === "--quality") args.quality = argv[++i] ?? args.quality;
    if (token === "--output-quality") args.outputQuality = Number(argv[++i] ?? args.outputQuality);
    if (token === "--dry-run") args.dryRun = true;
  }
  return args;
}

function normalizeDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function hasExplicitNoPublish(data) {
  return data.published === false || data.draft === true;
}

async function findLatestPublishedPost(fileArg) {
  if (fileArg) {
    const filePath = path.join(BLOG_DIR, fileArg);
    const raw = await fs.readFile(filePath, "utf8");
    const doc = matter(raw);
    return {
      fileName: fileArg,
      filePath,
      raw,
      data: doc.data,
      body: doc.content
    };
  }

  const files = await fg("*.md", { cwd: BLOG_DIR, absolute: true });
  const now = Date.now();
  const posts = [];

  for (const filePath of files) {
    const raw = await fs.readFile(filePath, "utf8");
    const doc = matter(raw);
    const pubDate = normalizeDate(doc.data.pubDate ?? doc.data.date);
    if (!pubDate) continue;
    if (hasExplicitNoPublish(doc.data)) continue;
    if (pubDate.getTime() > now) continue;

    posts.push({ filePath, fileName: path.basename(filePath), raw, data: doc.data, body: doc.content, pubDate });
  }

  if (posts.length === 0) throw new Error("No published post found");
  posts.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
  return posts[0];
}

async function refreshPrompts() {
  execFileSync("node", ["scripts/generate-home-covers-diffusion.mjs"], { stdio: "inherit", cwd: ROOT });
}

async function loadPromptItem(fileName) {
  const raw = await fs.readFile(PROMPTS_PATH, "utf8");
  const payload = JSON.parse(raw);
  const items = Array.isArray(payload.items) ? payload.items : [];
  const item = items.find((x) => x.file === fileName);
  if (!item) {
    throw new Error(`Prompt item not found for ${fileName}. Make sure this article is in homepage window.`);
  }
  return { payload, item };
}

async function generateImage({ apiBase, apiKey, model, size, quality, prompt }) {
  const res = await fetch(`${apiBase.replace(/\/+$/, "")}/images/generations`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      prompt,
      size,
      quality,
      output_format: "jpeg",
      output_compression: 85
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`images api failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  const image = data?.data?.[0]?.b64_json;
  if (!image) throw new Error("images api returned no b64_json");
  return Buffer.from(image, "base64");
}

function postProcessToSocialCover(tempPath, outPath, outputQuality) {
  execFileSync("sips", ["-c", "630", "1200", tempPath], { stdio: "ignore" });
  execFileSync("sips", ["-z", "630", "1200", tempPath], { stdio: "ignore" });
  execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", String(outputQuality), tempPath, "--out", outPath], {
    stdio: "ignore"
  });
}

function replaceCoverPathInFrontmatter(raw, nextCoverPath) {
  if (!raw.startsWith("---\n")) throw new Error("File has no YAML frontmatter block.");
  const end = raw.indexOf("\n---", 4);
  if (end < 0) throw new Error("Frontmatter closing marker not found.");

  const head = raw.slice(4, end);
  const tail = raw.slice(end + 4);
  let nextHead = head;

  const lineRegex = /^cover:\s*.*$/m;
  if (lineRegex.test(nextHead)) {
    nextHead = nextHead.replace(lineRegex, `cover: ${nextCoverPath}`);
  } else {
    nextHead = `${nextHead.replace(/\n+$/g, "")}\ncover: ${nextCoverPath}\n`;
  }

  const normalizedHead = `${nextHead.replace(/^\n+/, "").replace(/\n*$/g, "")}\n`;
  return `---\n${normalizedHead}---${tail}`;
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const apiKey = process.env.OPENAI_API_KEY;
  if (!args.dryRun && !apiKey) throw new Error("OPENAI_API_KEY is required");

  const post = await findLatestPublishedPost(args.file);
  if (!args.dryRun) {
    await refreshPrompts();
  }
  const { item } = await loadPromptItem(post.fileName);

  const outRel = String(item.coverPng);
  const outAbs = path.join(ROOT, "public", ...outRel.split("/"));
  const tempAbs = path.join(ROOT, "tmp", `${post.fileName.replace(/\.md$/i, "")}.cover.raw.jpg`);
  await fs.mkdir(path.dirname(outAbs), { recursive: true });
  await fs.mkdir(path.dirname(tempAbs), { recursive: true });

  const prompt = item.negativePrompt ? `${item.prompt}. Avoid: ${item.negativePrompt}` : item.prompt;

  console.log(`[cover-latest] target=${post.fileName}`);
  console.log(`[cover-latest] output=${outRel}`);

  if (args.dryRun) {
    console.log("[cover-latest] dry-run only");
    return;
  }

  const image = await generateImage({
    apiBase: args.apiBase,
    apiKey,
    model: args.model,
    size: args.size,
    quality: args.quality,
    prompt
  });

  await fs.writeFile(tempAbs, image);
  postProcessToSocialCover(tempAbs, outAbs, args.outputQuality);
  await fs.unlink(tempAbs).catch(() => {});

  const nextRaw = replaceCoverPathInFrontmatter(post.raw, outRel);
  await fs.writeFile(post.filePath, nextRaw, "utf8");

  console.log(`[cover-latest] done: ${outRel}`);
}

run().catch((error) => {
  console.error("[cover-latest] failed:", error);
  process.exitCode = 1;
});
