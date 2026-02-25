# Usability Cadence

## Purpose
Establish a repeatable UX/UI review cycle tied to product behavior metrics.

## Cadence
- Frequency: once per month, and before major UI release
- Owner: maintainer on duty
- Inputs:
  - `/docs/visual-qa-checklist.md`
  - Plausible dashboard (events + page trends)

## Review Steps
1. Run route checks on desktop and mobile.
2. Capture analytics deltas:
   - article bounce trend (`/blog/*`)
   - archive/tag click-through proxy (`Archive Post Click`)
   - search conversion proxy (`Search Result Click` / `Search Query Submitted`)
3. Open a `Usability Review` issue using template.
4. Triage findings into P1/P2/P3 with owners and due dates.

## Exit Criteria
- No critical interaction blockers.
- No new mobile overflow/overlap regressions.
- At least one measurable behavior improvement or a tracked corrective plan.
