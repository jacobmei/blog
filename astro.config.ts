import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
// @ts-ignore
import remarkFlexibleMarkers from "remark-flexible-markers";
// @ts-ignore
import rehypeRaw from "rehype-raw";

const site = process.env.SITE_URL ?? "https://jacobmei.com";
const rawBase = process.env.BASE_PATH ?? "/";
const normalizedBase = rawBase === "/" ? "/" : `/${rawBase.replace(/^\/+|\/+$/g, "")}`;

export default defineConfig({
  site,
  base: normalizedBase,
  trailingSlash: "always",
  output: "static",
  build: {
    format: "directory"
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
        return /^\/blog\/\d{4}\/\d{4}-[a-z0-9]{6}\/$/i.test(pathname);
      },
      serialize(item) {
        const blogMatch = item.url.match(/\/blog\/(\d{4})\/(\d{2})(\d{2})-/);
        if (blogMatch) {
          const [, year, month, day] = blogMatch;
          item.lastmod = `${year}-${month}-${day}`;
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
