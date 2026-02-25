import type { APIRoute } from "astro";
import { buildPostUrl, getBlogPosts } from "@/utils/blog";
import { withBase } from "@/utils/paths";
import { cleanPostTitle } from "@/utils/title";

export const GET: APIRoute = async ({ site, url }) => {
  const posts = await getBlogPosts();
  const base = site ? site.toString().replace(/\/$/, "") : `${url.origin}${withBase("")}`.replace(/\/$/, "");

  const lines: string[] = [
    "# mashbean blog",
    "",
    "Site: mashbean.net",
    "Description: 站在單向鏡後方觀看世界應對加速科技的方式。",
    "",
    "## Key URLs",
    `${base}${withBase("")}`,
    `${base}${withBase("blog/")}`,
    `${base}${withBase("tags/")}`,
    `${base}${withBase("search/")}`,
    `${base}${withBase("rss.xml")}`,
    `${base}${withBase("sitemap-index.xml")}`,
    `${base}${withBase("content-index.json")}`,
    "",
    "## Recent Posts"
  ];

  for (const post of posts.slice(0, 80)) {
    lines.push(`- ${cleanPostTitle(post.data.title)} | ${base}${buildPostUrl(post)}`);
  }

  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=600"
    }
  });
};
