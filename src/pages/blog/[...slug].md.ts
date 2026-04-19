import type { APIRoute } from "astro";
import { buildPostUrl, getBlogPosts, getEffectiveDate, getPostCanonicalPathSegment } from "@/utils/blog";
import { cleanPostTitle } from "@/utils/title";
import { AUTHOR_PROFILE, SITE_URL } from "@/site.config";

export async function getStaticPaths() {
  const posts = await getBlogPosts();
  return posts.map((post) => ({
    params: { slug: getPostCanonicalPathSegment(post) },
    props: { post }
  }));
}

export const GET: APIRoute = ({ props }) => {
  const { post } = props as { post: Awaited<ReturnType<typeof getBlogPosts>>[number] };
  const title = cleanPostTitle(post.data.title);
  const pubDate = getEffectiveDate(post).toISOString().slice(0, 10);
  const updated = post.data.updatedDate?.toISOString().slice(0, 10);
  const canonicalUrl = `${SITE_URL}${buildPostUrl(post)}`;
  const tags = post.data.tags?.length ? post.data.tags.join(", ") : undefined;

  const frontmatter = [
    "---",
    `title: ${JSON.stringify(title)}`,
    `description: ${JSON.stringify(post.data.description ?? "")}`,
    `pubDate: ${pubDate}`,
    updated ? `updatedDate: ${updated}` : null,
    `author: ${JSON.stringify(post.data.author ?? AUTHOR_PROFILE.name)}`,
    post.data.category ? `category: ${JSON.stringify(post.data.category)}` : null,
    tags ? `tags: [${tags}]` : null,
    `canonical: ${canonicalUrl}`,
    "lang: zh-TW",
    "license: CC BY-NC 4.0",
    "---"
  ].filter(Boolean).join("\n");

  const body = `${frontmatter}\n\n# ${title}\n\n${post.body ?? ""}\n`;

  return new Response(body, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=600"
    }
  });
};
