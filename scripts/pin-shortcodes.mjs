// 把「還沒釘 shortCode」的已發布文章，用當前 build 產物的實際 slug 回填 frontmatter。
// 資料來源是 dist/content-index.json（build 產出），所以釘的值保證等於現行網址，不重算雜湊。
// 用法：npm run build 之後執行 `node scripts/pin-shortcodes.mjs`（加 --dry 只看不寫）。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import GithubSlugger from "github-slugger";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const BLOG_DIR = path.join(ROOT, "src/content/blog");
const INDEX = path.join(ROOT, "dist/content-index.json");
const DRY = process.argv.includes("--dry");

if (!fs.existsSync(INDEX)) {
  console.error("[pin-shortcodes] dist/content-index.json 不存在，請先 npm run build");
  process.exit(1);
}

const index = JSON.parse(fs.readFileSync(INDEX, "utf8"));
const byId = new Map(index.map((p) => [p.id, p]));

const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".md"));
let alreadyPinned = 0;
let written = 0;
const unmatched = [];

for (const f of files) {
  const full = path.join(BLOG_DIR, f);
  const raw = fs.readFileSync(full, "utf8");
  if (/^shortCode:/m.test(raw)) {
    alreadyPinned++;
    continue;
  }

  // Astro glob loader 的 id = 檔名（去 .md）過 github-slugger
  const id = new GithubSlugger().slug(f.replace(/\.md$/, ""));
  const entry = byId.get(id);
  if (!entry) {
    unmatched.push(f); // 草稿或未來日期文章不在 index，屬正常
    continue;
  }

  const m = entry.url.match(/^\/blog\/\d{4}\/\d{4}-([a-z0-9]{6})\/$/);
  if (!m) {
    console.error(`[pin-shortcodes] url 格式不符: ${entry.url} (${f})`);
    process.exit(1);
  }

  if (!raw.startsWith("---\n")) {
    console.error(`[pin-shortcodes] 無 frontmatter: ${f}`);
    process.exit(1);
  }
  const end = raw.indexOf("\n---", 4);
  if (end === -1) {
    console.error(`[pin-shortcodes] frontmatter 未閉合: ${f}`);
    process.exit(1);
  }

  if (!DRY) {
    fs.writeFileSync(full, raw.slice(0, end) + `\nshortCode: "${m[1]}"` + raw.slice(end));
  }
  console.log(`  釘住 ${f} → ${m[1]}`);
  written++;
}

console.log(
  `[pin-shortcodes] 檔案 ${files.length}、已釘 ${alreadyPinned}、本次寫入 ${written}${DRY ? "（dry run）" : ""}、未發布 ${unmatched.length}`
);
