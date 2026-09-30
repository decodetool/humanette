# Humanette

Use Bun 1.3.14 and Turborepo. The site is apps/web (Next.js App Router, React, TypeScript, Tailwind v4). The publishable npm package is packages/humanette; root and site are private.

The public root import is Playwright-first: createHuman from humanette uses real Playwright input and accepts native locators, selectors, or coordinates. Keep documentation focused on this API. humanette/playwright remains a compatibility alias. humanette/internal exposes the visual engine for this repository's previews and workbench, not the public getting-started API. createHumanette never changes product state; never sell visual mock interactions as an E2E result.

Keep workbench and production on the same package renderer/model. Maintain frame-rate-independent motion, a minimum duration for short moves, slow arrivals, configurable settle time, scaled hotspots, behind-icon feedback, and full lifecycle cleanup. No permanent idle rendering.

Cursor source assets are docs/*.svg; do not bundle docs/mdn reference images. Update provenance notices if artwork changes. The build embeds SVG data URLs and emits standalone files. Do not introduce personal absolute paths or auth data.

Before a PR: bun check, bun run test:e2e, bun run pack:check. Browser install: cd apps/web && bunx playwright install chromium. Preserve screenshots from failed checks, fix failures, and report limitations honestly. Do not publish npm, deploy production, or merge unless explicitly requested.

Read docs/architecture.md and docs/history/cursor-capture-investigation.md before changing capture-facing animation. A 60-fps file is not proof of 60 distinct captured frames.
