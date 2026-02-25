import type { APIRoute } from "astro";
import { withBase } from "@/utils/paths";

export const GET: APIRoute = ({ site }) => {
  const sitemapPath = withBase("sitemap-index.xml");
  const sitemapURL = site ? new URL(sitemapPath, site).toString() : sitemapPath;
  const llmsPath = withBase("llms.txt");
  const llmsURL = site ? new URL(llmsPath, site).toString() : llmsPath;
  const contentIndexPath = withBase("content-index.json");
  const contentIndexURL = site ? new URL(contentIndexPath, site).toString() : contentIndexPath;

  const body = `User-agent: *
Allow: /

Sitemap: ${sitemapURL}
# Machine-readable entry points
AI-Index: ${llmsURL}
Content-Index: ${contentIndexURL}
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
};
