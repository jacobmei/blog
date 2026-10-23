import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
// @ts-ignore
import remarkFlexibleMarkers from "remark-flexible-markers";
// @ts-ignore
import rehypeRaw from "rehype-raw";

// 文章網址的月日以本地時區計算；CI 跑在 UTC，本機也固定 UTC 才會產出相同網址
process.env.TZ = "UTC";

const site = process.env.SITE_URL ?? "https://jacobmei.com";
const rawBase = process.env.BASE_PATH ?? "/";
const normalizedBase = rawBase === "/" ? "/" : `/${rawBase.replace(/^\/+|\/+$/g, "")}`;

// shortCode -> updatedDate，讓 sitemap lastmod 反映文章更新
const BLOG_DIR = "src/content/blog";
const updatedDates = new Map<string, string>();
for (const file of fs.readdirSync(BLOG_DIR)) {
  if (!/\.mdx?$/.test(file)) continue;
  const fm = fs.readFileSync(path.join(BLOG_DIR, file), "utf8").match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
  const shortCode = fm.match(/^shortCode:\s*["']?([^"'\s]+)/m)?.[1];
  const updated = fm.match(/^updatedDate:\s*["']?([^"'\n]+?)["']?\s*$/m)?.[1];
  if (!shortCode || !updated) continue;
  const date = new Date(updated.replace(" ", "T"));
  if (!Number.isNaN(date.getTime())) updatedDates.set(shortCode, date.toISOString());
}

export default defineConfig({
  site,
  base: normalizedBase,
  trailingSlash: "always",
  output: "static",
  build: {
    format: "directory"
  },
  redirects: {
    "/blog/2026/0130-bg-2060e8b9/": "/blog/2026/0105-bg-87205a2e/",
    "/blog/2026/0130-2060e8b9/": "/blog/2026/0105-bg-87205a2e/",
    "/blog/2026-01-30-2060e8b9/": "/blog/2026/0105-bg-87205a2e/"
  },
  integrations: [
    sitemap({
      filter: (page) => {
        const url = new URL(page);
        const pathname = url.pathname;
        if (pathname.includes("/research/")) return false;
        if (pathname.includes("/partials/")) return false;
        if (/^\/tags\/.+/.test(pathname)) return false;
        if (!pathname.startsWith("/blog/")) return true;
        return /^\/blog\/\d{4}\/\d{4}-([a-z0-9]{6,7}|bg-[0-9a-f]{8})\/$/i.test(pathname);
      },
      serialize(item) {
        const blogMatch = item.url.match(/\/blog\/(\d{4})\/(\d{2})(\d{2})-([^/]+)\//);
        if (blogMatch) {
          const [, year, month, day, shortCode] = blogMatch;
          item.lastmod = updatedDates.get(shortCode) ?? `${year}-${month}-${day}`;
        }
        return item;
      }
    })
  ],
  vite: {
    plugins: [tailwindcss()]
  },
  markdown: {
    remarkPlugins: [remarkFlexibleMarkers],
    rehypePlugins: [rehypeRaw],
    shikiConfig: {
      theme: "github-dark",
      wrap: true
    }
  }
});
