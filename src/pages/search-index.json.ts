import type { APIRoute } from "astro";
import { buildPostUrl, getBlogPosts, getEffectiveDate } from "@/utils/blog";
import { classifyPostTags, getTopicAliasKeywords } from "@/utils/blogTags";
import { withBase } from "@/utils/paths";
import { cleanPostTitle } from "@/utils/title";

interface SearchDocument {
  id: string;
  title: string;
  description: string;
  url: string;
  type: "post" | "page";
  pubDate?: string;
  content: string;
  tags: string[];
  topics?: string[];
}

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

  const postDocs: SearchDocument[] = posts.map((post) => {
    const classified = classifyPostTags({
      title: cleanPostTitle(post.data.title),
      description: post.data.description,
      body: post.body,
      tags: post.data.tags
    });
    const tags = [...classified.topics, ...classified.keywords, ...classified.secondaryKeywords];
    const aliasTerms = classified.topics.flatMap((topic) => getTopicAliasKeywords(topic));
    const searchableBody = normalizeForIndex(post.body ?? "").slice(0, 2800);
    const searchableText = [
      post.data.description,
      post.data.category ?? "",
      classified.topics.join(" "),
      classified.keywords.join(" "),
      classified.secondaryKeywords.join(" "),
      aliasTerms.join(" "),
      searchableBody
    ]
      .filter(Boolean)
      .join(" ");

    return {
      id: `post:${post.id}`,
      title: cleanPostTitle(post.data.title),
      description: post.data.description,
      url: buildPostUrl(post),
      type: "post",
      pubDate: getEffectiveDate(post).toISOString(),
      content: searchableText,
      tags,
      topics: classified.topics
    };
  });

  return new Response(JSON.stringify(postDocs), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=600"
    }
  });
};
