# Analytics MVP (Plausible)

## Goal
Measure the four success metrics with minimum overhead:
- Reduced bounce on article pages
- Increased archive/tag page click-through
- Higher search-to-article conversion
- Lower mobile layout bug rate (paired with QA process)

## What is integrated
- Lightweight analytics provider: Plausible
- Global tracker wrapper: `window.mbTrack(name, props)`
- Works only when `PUBLIC_PLAUSIBLE_DOMAIN` is configured

## Files changed
- `src/layouts/BaseLayout.astro`
- `src/pages/search.astro`
- `src/pages/blog/index.astro`
- `src/pages/tags.astro`
- `src/pages/blog/[...slug].astro`
- `.github/workflows/deploy.yml`

## Setup (GitHub Pages + Actions)
Set repository variables in GitHub:
1. `PUBLIC_PLAUSIBLE_DOMAIN` = `mashbean.net`
2. (Optional) `PUBLIC_PLAUSIBLE_SCRIPT_SRC` = custom script host

Path:
- GitHub repo -> Settings -> Secrets and variables -> Actions -> Variables

## Events captured
- `Search Shortcut Used`
- `Search Query Submitted` (`mode`, `query_length`, `filter`)
- `Search Result Click` (`mode`)
- `Archive Filter Used` (`topic`)
- `Tags Filter Used` (`year`)
- `Archive Post Click` (`source`)
- `Article Focus Mode` (`state`)
- `Article Engaged` (`signal`: `scroll_50` / `time_45s`)
- `Article Share Copy`
- `Article Share Copy Failed`

## Metric mapping
1. Reduced bounce on article pages
- Use Plausible page-level bounce rate for `/blog/*`
- Cross-check with `Article Engaged` trend

2. Increased archive/tag click-through
- CTR proxy = `Archive Post Click` / pageviews of `/blog/` and `/tags/`
- Breakdown by `source`

3. Higher search-to-article conversion
- Conversion proxy = `Search Result Click` / `Search Query Submitted`
- Split by `mode` (`pagefind` vs `fallback`)

4. Lower mobile layout bug rate
- Use `docs/visual-qa-checklist.md` as release gate
- (Optional next step) add error reporting (Sentry) for client UI exceptions

## Validation checklist
- Build and deploy with variables set
- Open site, trigger search/filter/share interactions
- Verify custom events appear in Plausible dashboard within a few minutes
