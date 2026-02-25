# Astro MVP Definition

## Goal

Complete a stable, testable migration from Jekyll to Astro with minimal behavior surprises.

## Success Criteria

1. `npm run build` succeeds locally.
2. Generated site includes:
- home
- blog list
- post detail pages
- about
- 404
- rss
- sitemap
- robots
3. In production build:
- draft posts are excluded
- future-dated posts are excluded
4. GitHub Actions deploy publishes successfully to GitHub Pages.
5. Existing Jekyll `_posts` can be batch-converted by script with report output.

## Non-goals in MVP

- Full archive/tag pagination parity with Jekyll
- Full Liquid feature parity in article bodies
- Client-side search index and comments
- Theme switch and multilingual routes
