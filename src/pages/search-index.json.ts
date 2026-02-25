import type { APIRoute } from "astro";
import { buildPostUrl, getBlogPosts } from "@/utils/blog";
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

const staticPages: SearchDocument[] = [
  {
    id: "page:home",
    title: "首頁",
    description: "站在單向鏡後方觀看世界應對加速科技的方式。",
    url: withBase(""),
    type: "page",
    content: "首頁 最新文章 精選內容",
    tags: ["首頁", "導覽"]
  },
  {
    id: "page:blog",
    title: "文章列表",
    description: "依日期瀏覽所有文章。",
    url: withBase("blog/"),
    type: "page",
    content: "文章列表 年份導覽 歷史文章",
    tags: ["文章", "年份", "歸檔"]
  },
  {
    id: "page:tags",
    title: "標籤",
    description: "依主題標籤探索文章。",
    url: withBase("tags/"),
    type: "page",
    content: "標籤 主題分類 探索",
    tags: ["標籤", "分類"]
  },
  {
    id: "page:about",
    title: "關於",
    description: "站點介紹與作者資訊。",
    url: withBase("about/"),
    type: "page",
    content: "關於 作者 網站介紹",
    tags: ["關於", "作者"]
  },
  {
    id: "page:subscribe",
    title: "RSS 訂閱",
    description: "使用 RSS Reader 訂閱本站更新。",
    url: withBase("subscribe/"),
    type: "page",
    content: "RSS 訂閱 Feed Reader",
    tags: ["RSS", "訂閱"]
  },
  {
    id: "page:search",
    title: "全站搜尋",
    description: "搜尋文章與站內頁面內容。",
    url: withBase("search/"),
    type: "page",
    content: "全站搜尋 站內搜尋",
    tags: ["搜尋"]
  }
];

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
      pubDate: post.data.pubDate.toISOString(),
      content: searchableText,
      tags,
      topics: classified.topics
    };
  });

  return new Response(JSON.stringify([...staticPages, ...postDocs]), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=600"
    }
  });
};
