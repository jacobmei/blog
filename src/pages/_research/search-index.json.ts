import { getResearchPosts, getEffectiveDate } from "@/utils/blog";
import { cleanPostTitle } from "@/utils/title";
import { classifyPostTags } from "@/utils/blogTags";
import { researchTagCatalog } from "@/data/researchTagCatalog";

export async function GET() {
    const posts = await getResearchPosts();

    const searchIndex = posts.map((post) => {
        const classified = classifyPostTags({
            title: cleanPostTitle(post.data.title),
            description: post.data.description,
            body: post.body || "",
            tags: post.data.tags,
            category: post.data.category ?? undefined,
            catalog: researchTagCatalog,
        });

        return {
            title: cleanPostTitle(post.data.title),
            description: post.data.description,
            url: `/research/${post.id}/`,
            pubDate: getEffectiveDate(post).toISOString(),
            topics: classified.topics,
            tags: post.data.tags,
            content: (post.body || "").slice(0, 1000), // 取前 1000 字供搜尋
            type: "research",
        };
    });

    return new Response(JSON.stringify(searchIndex), {
        headers: {
            "Content-Type": "application/json",
        },
    });
}
