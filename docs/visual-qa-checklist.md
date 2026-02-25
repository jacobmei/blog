# Visual QA Checklist

## Scope
- Release target: UI regressions for key reader flows
- Execute on desktop (>=1280px) and mobile (~390px)
- Browser baseline: Safari + Chrome

## Routes
- / 
- /blog/
- /tags/
- /search/
- /blog/[single-post]
- /tags-graph/

## Global Checks
- Header does not overlap content when scrolling.
- No horizontal overflow on mobile.
- Typography line-height remains readable in Chinese long-form text.
- Primary actions are keyboard-focus visible.

## Home (/)
- Hero card + compact cards spacing is consistent.
- Social drawer opens/closes cleanly and does not shift layout.
- Cover images (or fallback covers) render without distortion.

## Archive (/blog/)
- Year accordions open/close smoothly without left-right page jump.
- Year subtitle aligns to the right of year title on desktop.
- Topic quick filter updates counts and hides irrelevant years correctly.
- Recent update badge appears for posts within 90 days (updatedDate or pubDate fallback).

## Tags (/tags/)
- Tag accordions open/close animation is smooth.
- Year quick filter updates tag counts and visibility correctly.
- Emoji icons and titles render consistently.

## Search (/search/)
- State transitions are correct:
  - loading
  - idle
  - empty result
  - error
- Pagefind mode and fallback mode both return readable cards.
- Search result card left padding and breathing space are consistent on desktop/mobile.

## Article (/blog/[single-post])
- Enter page in focus-reading mode by default.
- Focus toggle remains accessible at bottom and switches mode reliably.
- TOC active state tracks reading section and anchor jumps are not obscured by header.
- Share button copies canonical link correctly.

## Graph MVP (/tags-graph/)
- Mobile default is list mode; can switch to 3D mode.
- Node type toggles (topic/keyword/post) update graph and list correctly.
- Topic filter + search work together without stale selection.
- Dragging does not trigger accidental article navigation.
- Article node requires deliberate second tap/click to navigate.

## Accessibility Spot Checks
- Tab order is logical in header, filters, and graph controls.
- `aria-live` statuses update in search and graph result counters.
- Interactive controls have visible focus styles.

## Release Gate
- All route checks pass on desktop and mobile.
- No critical layout shift or blocking interaction bug.
- If any fail: fix before merge or add a tracked follow-up issue.
