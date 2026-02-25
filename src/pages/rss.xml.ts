import type { APIRoute } from "astro";
import rss from "@astrojs/rss";
import { SITE_DESCRIPTION, SITE_TITLE } from "@/site.config";
import { buildPostUrl, getBlogPosts } from "@/utils/blog";
import { cleanPostTitle } from "@/utils/title";

export const GET: APIRoute = async ({ site }) => {
  const posts = await getBlogPosts();

  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: site ?? "https://username.github.io",
    items: posts.map((post) => ({
      title: cleanPostTitle(post.data.title),
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: buildPostUrl(post)
    })),
    customData: `<language>zh-TW</language>`
  });
};
