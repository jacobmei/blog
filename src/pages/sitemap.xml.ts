import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
    const target = new URL('/sitemap-index.xml', site).toString();
    return new Response(null, {
        status: 301,
        headers: {
            'Location': target
        }
    });
};
