# Astro Migration Audit

Date: 2026-02-21  
Repo: /Users/mashbean/Codex

## 1. Current Jekyll Facts

- Jekyll theme is `minima` (theme-provided layouts are implicit).
- `_config.yml` includes:
  - `url: https://mashbean.net`
  - `baseurl: ""`
  - `timezone: Asia/Taipei`
  - `permalink: /:year/:month/:day/:title/`
  - `paginate: 10`
  - plugins: `jekyll-paginate`, `jekyll-feed`
- Present folders:
  - `_posts/`
  - `_includes/`
  - `_data/`
  - `assets/`
- Missing:
  - No `Gemfile`
  - No `_layouts/`
- Root has `CNAME` (custom domain in use).
- Custom Liquid is used in:
  - `index.html` (pagination and post cards)
  - `posts.md`
  - `tags.md`
  - `_includes/head.html`, `_includes/header.html`

## 2. Frontmatter Pattern in _posts

Most posts use:
- `title`
- `date`
- `categories`
- `tags`
- `summary`

Rare or optional fields may exist:
- `published`
- `permalink`
- `last_modified_at` / `updated`
- custom fields (import source metadata)

## 3. Migration Risks (B)

1. URL drift
- Jekyll permalink and Astro route can differ.
- Existing shared links and SEO ranking may be affected.

2. Base path mismatch (project site case)
- If `base` is wrong, CSS/JS/internal links break on GitHub Pages.

3. Timezone and future posts
- Current timezone is `Asia/Taipei`.
- Future-dated posts exist; without filtering they may be published accidentally.

4. Hidden theme behavior
- No local `_layouts`, because `minima` handles defaults.
- Astro migration must explicitly implement SEO/header/footer behavior.

5. Liquid incompatibility
- Liquid syntax cannot run in Astro templates.
- Needs manual rewrite.

6. Data and taxonomy pages
- `_data/tag_catalog.yml` and tag pages need explicit Astro implementation.
- MVP may defer full taxonomy archive pages.

7. Plugin parity
- `jekyll-feed`, `jekyll-paginate` behavior needs Astro replacements.

8. Search and interactive scripts
- Existing `assets/site.js` includes search/progress/reveal interactions.
- MVP may defer, but must be documented to avoid regression surprise.

## 4. Strategy Recommendation (C)

Recommended strategy: **same repo, dedicated migration branch**, then cutover.

- Branch name example: `codex/astro-migration`.
- Keep current Jekyll on `main` until Astro build and deploy checks pass.
- Add Astro project files in same repo root (or temporary subdir), then cutover with one PR.
- Keep rollback path: revert PR to restore Jekyll.

Alternative: parallel new repo.
- Pros: zero disturbance to current repo.
- Cons: history split, content sync overhead, DNS/pages switch complexity.

## 5. MVP Scope (D)

Must-have in MVP:
- Astro + TS + Tailwind setup
- Blog collection schema + 2 sample posts
- Pages:
  - `/`
  - `/blog/`
  - `/blog/[...slug]`
  - `/about/`
  - `404`
  - `rss.xml`
  - sitemap
  - robots
- Production filters:
  - hide `draft: true`
  - hide future posts
- Migration script:
  - convert `_posts` frontmatter
  - output conversion report
  - liquid warning detection
- GitHub Actions deploy for Pages

Out of MVP (Phase 2nd):
- MDX components in posts
- Pagefind search
- Giscus comments
- TOC + reading progress
- Dark mode
- i18n
- automated OG image generation

## 6. Jekyll Feature Replacement Guide

1. `_layouts` / `_includes`
- Jekyll `_layouts/default.html` -> `src/layouts/BaseLayout.astro`
- Jekyll `_includes/*.html` -> `src/components/*.astro`

2. `site.posts`, `page`, `site.data`
- `site.posts` -> `getCollection("blog")`
- `page.title` / `page.url` -> `Astro.props` / `Astro.url`
- `site.data.xxx` -> `src/data/*.ts` (recommended) or YAML import at build time

3. `_data/*.yml` in Astro
- MVP recommendation: convert to TypeScript constants for type safety.
- Alternative: keep YAML and parse with `yaml` package.

4. Liquid syntax replacement
- `{{ var }}` -> `{var}`
- `{% for item in list %}` -> `{list.map((item) => (...))}`
- `{% if %} / {% elsif %}` -> ternary or JS condition blocks
- `{{ date | date: "%Y-%m-%d" }}` -> `Intl.DateTimeFormat(...)`
- `{{ '/path' | relative_url }}` -> `withBase('path/')`

5. Plugin replacement
- `jekyll-feed` -> `@astrojs/rss` + `/src/pages/rss.xml.ts`
- `jekyll-sitemap` -> `@astrojs/sitemap`
- `jekyll-seo-tag` -> meta tags in `BaseLayout.astro`
- `paginate` -> Astro pagination routes (can be deferred)
- `archives` -> dedicated routes (`/archive/`, `/tag/[tag]/`) in phase 2
