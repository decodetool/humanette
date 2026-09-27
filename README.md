# Humanette

A steady hand for browser automation. Natural, seeded pointer motion; bundled, CSS-aware SVG cursors; clear press/hold/release feedback; and an interactive Pointer Lab for finding your feel.

## Monorepo

Turborepo + Bun workspaces. The website is Next.js, React, TypeScript, and Tailwind v4, ready for Vercel. The published humanette package is framework-independent.

- apps/web: home, live demos, CSS cursor/hotspot gallery, documentation, and Dialkit workbench.
- packages/humanette: browser renderer, pure motion model, Playwright adapter, and embedded assets.
- docs: existing cursor SVG source, recording learnings, architecture, and release instructions.
- examples: deterministic real-input demo and the preserved Decode color-grid recipe.

## Run

```sh
bun install --frozen-lockfile
bun dev                    # localhost:3410
bun check                  # types, unit tests, production builds
bun run test:e2e            # real browser integration
bun run pack:check          # fresh npm consumer of the actual tarball
```

Node 22+ and Bun 1.3.14. Before browser tests, run bunx playwright install chromium from apps/web.

## Use the package

```ts
import { createHuman } from 'humanette/playwright';

const human = await createHuman(page, { seed: 42, scale: 2.5 });
await human.click('#save');
await human.type('#title', 'Start', { selectAll: true });
await human.drag('#card', '#done');
await human.dispose();
```

For a presentation-only overlay, use createHumanette from humanette. Visual play/seek does not dispatch DOM events; the Playwright adapter delivers real input. Humanette does not record or encode videos itself.

See [package API](packages/humanette/README.md), [architecture and learnings](docs/architecture.md), and [Vercel deployment / npm release](docs/release-and-deployment.md). The owner-supplied SVGs already present in docs/ are embedded and bundled; no remote asset service is needed. Confirm their provenance/redistribution permissions before release. No publish or deploy runs automatically.
