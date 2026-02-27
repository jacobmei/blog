import { getCollection, type CollectionEntry } from "astro:content";
import { withBase } from "@/utils/paths";

export type BlogEntry = CollectionEntry<"blog">;

/**
 * 取得文章的有效發布日期。
 * 優先順序：Frontmatter pubDate > 檔名開頭日期 (YYYY-MM-DD) > 目前日期。
 */
export function getEffectiveDate(post: BlogEntry): Date {
  if (post.data.pubDate) {
    return post.data.pubDate;
  }

  // 嘗試從 post.id (通常是檔名) 擷取日期，例如 2026-02-25-xxx.md
  const match = post.id.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) {
    const date = new Date(match[1]);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  return new Date();
}

interface GetBlogPostsOptions {
  includeDrafts?: boolean;
  includeFuture?: boolean;
}

export async function getBlogPosts(options: GetBlogPostsOptions = {}): Promise<BlogEntry[]> {
  const includeDrafts = options.includeDrafts ?? !import.meta.env.PROD;
  const includeFuture = options.includeFuture ?? !import.meta.env.PROD;
  const now = Date.now();

  const posts = await getCollection("blog");

  return posts
    .filter((post) => {
      const effectiveDate = getEffectiveDate(post);
      if (!includeDrafts && post.data.draft) return false;
      if (!includeFuture && effectiveDate.getTime() > now) return false;
      return true;
    })
    .sort((a, b) => {
      const aFeatured = a.data.featured ? 1 : 0;
      const bFeatured = b.data.featured ? 1 : 0;
      if (bFeatured !== aFeatured) return bFeatured - aFeatured;
      return getEffectiveDate(b).getTime() - getEffectiveDate(a).getTime();
    });
}

function normalizeSlug(input: string): string {
  return input
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("zh-TW")
    .replace(/[/\\]+/g, "-")
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{Letter}\p{Number}-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function hashText(input: string): number {
  let hash = 2166136261;
  for (const ch of input) {
    hash ^= ch.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function stripLegacyPartsFromId(id: string): string {
  return id
    .replace(/^\d{4}-\d{2}-\d{2}-/, "")
    .replace(/-(豆泥-matters|matters|artouch|medium)$/iu, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getShortCode(post: BlogEntry): string {
  // 如果 Frontmatter 中有手動指定 shortCode，優先使用它，實現「更名不改網址」
  if (post.data.shortCode) {
    return post.data.shortCode;
  }

  const effectiveDate = getEffectiveDate(post);
  const identity = `${post.id}|${effectiveDate.toISOString()}|${post.data.slug ?? ""}`;
  return hashText(identity).toString(36).padStart(6, "0").slice(0, 6);
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function getPostCanonicalPathSegment(post: BlogEntry): string {
  const effectiveDate = getEffectiveDate(post);
  const year = effectiveDate.getFullYear();
  const monthDay = `${pad2(effectiveDate.getMonth() + 1)}${pad2(effectiveDate.getDate())}`;
  const shortCode = getShortCode(post);
  return `${year}/${monthDay}-${shortCode}`;
}

export function getLegacyPostPathSegment(post: BlogEntry): string {
  return post.id;
}

function getVerbosePathSegment(post: BlogEntry): string {
  const effectiveDate = getEffectiveDate(post);
  const year = effectiveDate.getFullYear();
  const monthDay = `${pad2(effectiveDate.getMonth() + 1)}${pad2(effectiveDate.getDate())}`;
  const rawSlug = post.data.slug ?? stripLegacyPartsFromId(post.id);
  const normalized = normalizeSlug(rawSlug);
  const shortened = normalized.length > 40 ? normalized.slice(0, 40).replace(/-+$/g, "") : normalized;
  return `${year}/${monthDay}-${shortened || "post"}`;
}

export function getPostPathCandidates(post: BlogEntry): string[] {
  const candidates = [
    getPostCanonicalPathSegment(post),
    getVerbosePathSegment(post),
    getLegacyPostPathSegment(post)
  ];
  return [...new Set(candidates)];
}

export function buildPostUrl(post: BlogEntry): string {
  return withBase(`blog/${getPostCanonicalPathSegment(post)}/`);
}
