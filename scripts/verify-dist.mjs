// 部署前的 dist 完整性驗證：內部死鏈 + 缺失的 _astro 資產。
// 發現問題 exit 1，用來在 CI 擋下壞掉的部署（如 Obsidian 直接 push 的文章寫錯連結）。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");

if (!fs.existsSync(DIST)) {
  console.error("[verify-dist] dist/ 不存在，請先 npm run build");
  process.exit(1);
}

function* walkHtml(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walkHtml(full);
    else if (entry.name.endsWith(".html")) yield full;
  }
}

const assetRefs = new Map(); // ref -> first page
const linkRefs = new Map();
const articlePages = new Set(); // canonical 指向自己的文章頁
let pages = 0;

for (const file of walkHtml(DIST)) {
  pages++;
  const html = fs.readFileSync(file, "utf8");
  const page = path.relative(DIST, file);

  for (const m of html.matchAll(/\/_astro\/[A-Za-z0-9._@-]+/g)) {
    if (!assetRefs.has(m[0])) assetRefs.set(m[0], page);
  }
  for (const m of html.matchAll(/href="(\/blog\/[^"]*)"/g)) {
    const clean = m[1].split(/[#?]/)[0];
    if (!linkRefs.has(clean)) linkRefs.set(clean, page);
  }

  const urlPath = "/" + page.replace(/index\.html$/, "");
  if (/^\/blog\/\d{4}\/\d{4}-[^/]+\/$/.test(urlPath)) {
    const canonical = html.match(/<link rel="canonical" href="https?:\/\/[^/"]+(\/[^"]*)"/);
    if (canonical && canonical[1] === urlPath) articlePages.add(urlPath);
  }
}

const problems = [];

for (const [ref, page] of assetRefs) {
  if (!fs.existsSync(path.join(DIST, ref))) {
    problems.push(`缺失資產 ${ref}（引用頁: ${page}）`);
  }
}

for (const [link, page] of linkRefs) {
  const target = path.join(DIST, link);
  const ok =
    fs.existsSync(path.join(target, "index.html")) ||
    (fs.existsSync(target) && fs.statSync(target).isFile());
  if (!ok) problems.push(`內部死鏈 ${link}（引用頁: ${page}）`);
}

// sitemap 必須剛好收錄所有文章頁：曾因 filter 只認 6 碼 shortCode 漏掉 319 篇
const sitemapFile = path.join(DIST, "sitemap-0.xml");
const sitemapPosts = new Set();
if (!fs.existsSync(sitemapFile)) {
  problems.push("sitemap-0.xml 不存在");
} else {
  const xml = fs.readFileSync(sitemapFile, "utf8");
  for (const m of xml.matchAll(/<loc>https?:\/\/[^/<]+(\/blog\/\d{4}\/[^<]*)<\/loc>/g)) {
    sitemapPosts.add(m[1]);
  }
}
if (articlePages.size === 0) problems.push("找不到任何文章頁，無法核對 sitemap");
for (const p of articlePages) {
  if (!sitemapPosts.has(p)) problems.push(`sitemap 漏收文章 ${p}`);
}
for (const p of sitemapPosts) {
  if (!articlePages.has(p)) problems.push(`sitemap 收了非文章頁 ${p}`);
}

console.log(
  `[verify-dist] 掃描 ${pages} 頁：_astro 引用 ${assetRefs.size} 個、內部 blog 連結 ${linkRefs.size} 條、sitemap 文章 ${sitemapPosts.size}/${articlePages.size}`
);

if (problems.length) {
  console.error(`[verify-dist] ✗ 發現 ${problems.length} 個問題：`);
  problems.forEach((p) => console.error("  - " + p));
  process.exit(1);
}
console.log("[verify-dist] ✓ 無死鏈、無缺失資產、sitemap 完整");
