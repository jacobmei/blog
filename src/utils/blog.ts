import { getCollection, type CollectionEntry } from "astro:content";
import { withBase } from "@/utils/paths";

export type BlogEntry = CollectionEntry<"blog">;

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
      if (!includeDrafts && post.data.draft) return false;
      if (!includeFuture && post.data.pubDate.getTime() > now) return false;
      return true;
    })
    .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
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
  const identity = `${post.id}|${post.data.pubDate.toISOString()}|${post.data.slug ?? ""}`;
  return hashText(identity).toString(36).padStart(6, "0").slice(0, 6);
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function getPostCanonicalPathSegment(post: BlogEntry): string {
  const year = post.data.pubDate.getFullYear();
  const monthDay = `${pad2(post.data.pubDate.getMonth() + 1)}${pad2(post.data.pubDate.getDate())}`;
  const shortCode = getShortCode(post);
  return `${year}/${monthDay}-${shortCode}`;
}

export function getLegacyPostPathSegment(post: BlogEntry): string {
  return post.id;
}

function getVerbosePathSegment(post: BlogEntry): string {
  const year = post.data.pubDate.getFullYear();
  const monthDay = `${pad2(post.data.pubDate.getMonth() + 1)}${pad2(post.data.pubDate.getDate())}`;
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
