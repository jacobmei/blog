import type { APIRoute } from "astro";
import { buildPostUrl, getBlogPosts } from "@/utils/blog";
import { withBase } from "@/utils/paths";
import { AUTHOR_PROFILE, SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/site.config";
import { cleanPostTitle } from "@/utils/title";

export const GET: APIRoute = async ({ site, url }) => {
  const posts = await getBlogPosts();
  const base = site ? site.toString().replace(/\/$/, "") : `${url.origin}${withBase("")}`.replace(/\/$/, "");

  const lines: string[] = [
    `# ${SITE_TITLE}`,
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    "## Metadata",
    `- **Site**: ${SITE_URL}`,
    `- **Author**: ${AUTHOR_PROFILE.name}`,
    `- **Email**: ${AUTHOR_PROFILE.email}`,
    `- **License**: CC BY-NC 4.0`,
    `- **Language**: zh-TW`,
    "",
    "## Key URLs",
    `- [Home](${base}${withBase("")})`,
    `- [Blog Archives](${base}${withBase("blog/")})`,
    `- [Categories & Tags](${base}${withBase("tags/")})`,
    `- [Search](${base}${withBase("search/")})`,
    `- [RSS Feed](${base}${withBase("rss.xml")})`,
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
