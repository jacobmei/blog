import type { APIRoute } from "astro";
import { buildPostUrl, getBlogPosts } from "@/utils/blog";
import { classifyPostTags } from "@/utils/blogTags";
import { cleanPostTitle } from "@/utils/title";

function normalizeForIndex(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1 ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[>*_#\-~]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const GET: APIRoute = async () => {
  const posts = await getBlogPosts();

  const data = posts.map((post) => {
    const classified = classifyPostTags({
      title: cleanPostTitle(post.data.title),
      description: post.data.description,
      body: post.body,
      tags: post.data.tags
    });

    return {
      id: post.id,
      title: cleanPostTitle(post.data.title),
      description: post.data.description,
      url: buildPostUrl(post),
      pubDate: post.data.pubDate.toISOString(),
      updatedDate: post.data.updatedDate?.toISOString(),
      category: post.data.category ?? null,
      topics: classified.topics,
      keywords: classified.keywords,
      secondaryKeywords: classified.secondaryKeywords,
      keywordScores: classified.keywordScores,
      content: normalizeForIndex(post.body ?? "").slice(0, 3000)
    };
  });

  return new Response(JSON.stringify(data), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=600"
    }
  });
};
