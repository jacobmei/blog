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

console.log(
  `[verify-dist] 掃描 ${pages} 頁：_astro 引用 ${assetRefs.size} 個、內部 blog 連結 ${linkRefs.size} 條`
);

if (problems.length) {
  console.error(`[verify-dist] ✗ 發現 ${problems.length} 個問題：`);
  problems.forEach((p) => console.error("  - " + p));
  process.exit(1);
}
console.log("[verify-dist] ✓ 無死鏈、無缺失資產");
