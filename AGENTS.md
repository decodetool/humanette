# Humanette

Use Bun 1.3.14 and Turborepo. The site is apps/web (Next.js App Router, React, TypeScript, Tailwind v4). The publishable npm package is packages/humanette; root and site are private.

Preserve the distinction between visual playback and real input. createHumanette never changes product state. createHuman from humanette/playwright uses real Playwright input. Never sell visual mock interactions as an E2E result.

Keep workbench and production on the same package renderer/model. Maintain frame-rate-independent motion, a minimum duration for short moves, slow arrivals, configurable settle time, scaled hotspots, behind-icon feedback, and full lifecycle cleanup. No permanent idle rendering.

Cursor source assets are docs/*.svg; do not bundle docs/mdn reference images. Update provenance notices if artwork changes. The build embeds SVG data URLs and emits standalone files. Do not introduce personal absolute paths or auth data.

Before a PR: bun check, bun run test:e2e, bun run pack:check. Browser install: cd apps/web && bunx playwright install chromium. Preserve screenshots from failed checks, fix failures, and report limitations honestly. Do not publish npm, deploy production, or merge unless explicitly requested.

Read docs/architecture.md and docs/history/cursor-capture-investigation.md before changing capture-facing animation. A 60-fps file is not proof of 60 distinct captured frames.
