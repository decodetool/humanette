# Humanette

A steady hand for browser automation. Natural, seeded pointer motion; bundled, CSS-aware SVG cursors; clear press/hold/release feedback; and an interactive Pointer Lab for finding your feel.

## Ask your agent for a demo

Install the skill in your project and choose your coding agent when prompted:

```sh
npx skills add decodetool/humanette --skill humanette
```

In Claude Code, ask `/humanette record a demo of the new UX features in this PR`. In Codex, select the Humanette skill and describe the demo. The agent handles package and browser setup. Open browser sessions need a supported Playwright connection and an available recorder.

For a product demo, ask `/humanette create a product demo of a my to-do app`.

The [skill](skills/humanette/SKILL.md) includes a runnable local example. The npm tarball checked October 5, 2026 is still the `1.0.0` placeholder with no runtime; publish the prepared `1.1.0` runtime before using the public installation workflow. The skill uses npm and reports a missing release rather than building source.

## Monorepo

Turborepo + Bun workspaces. The website is Next.js, React, TypeScript, and Tailwind v4, ready for Vercel. The published humanette package is framework-independent.

- apps/web: home, live demos, CSS cursor/hotspot gallery, documentation, and Dialkit workbench.
- packages/humanette: browser renderer, pure motion model, Playwright adapter, and embedded assets.
- docs: existing cursor SVG source, recording learnings, architecture, and release instructions.
- examples: deterministic real-input demo and the preserved Decode color-grid recipe.
- skills/humanette: installable agent workflow and standalone to-do recording example.

## Run

```sh
bun install --frozen-lockfile
bun dev                    # localhost:3410
bun example:playwright     # record the demo (dev server must be running)
bun example:playwright:headful # watch live in Chromium, without recording
bun check                  # types, unit tests, production builds
bun run test:e2e            # real browser integration
bun run pack:check          # fresh npm consumer of the actual tarball
bun run test:skill          # local Claude CLI: one-off and reusable recording workflows
```

Node 22+ and Bun 1.3.14. Before browser tests, run bunx playwright install chromium from apps/web.

The skill harness is an opt-in local check requiring an installed, authenticated `claude` CLI. It makes real model calls in disposable projects against a disposable npm registry serving the actual packed release, installs missing recording tools, verifies real input and a decoded video, and checks that a saved walkthrough works after a fresh dependency install. It keeps transcripts and recordings in `test-results/skill-harness/` and is not part of CI or `bun check`. Run one case with `bun run test:skill --case=one-off` or `--case=saved`. After publication, use `bun run test:skill --published` to test the public npm package instead. The local registry test does not prove a public release is available. Each case has a ten-minute timeout and a $10 model-call limit; override with `HUMANETTE_SKILL_TIMEOUT_MS` and `HUMANETTE_SKILL_BUDGET_USD`.

`bun example:playwright` replaces `out/playwright-example.webm`, plus its
`playwright-example.png` screenshot and `playwright-example.json` manifest.
Old timestamped takes are left untouched.

`bun example:playwright:headful` runs the same actions visibly without recording,
so you can compare live movement against the captured video. It waits briefly before
starting and leaves the window open afterward; close the window to exit.
Run `bun dev` in another terminal first.

Playwright is pinned to `1.64.0-alpha-2026-09-28` for native Chromium recording
with `recordVideo.fps: 120`. This is an intentional prerelease dependency.
After installing/upgrading it, run `bunx playwright install chromium` from
`apps/web` to install its matching browser. Requested output FPS is not a
guarantee of 120 distinct source frames. Cursor input currently targets 60 updates
per second independently of the encoded recording rate.

## Use the package

```ts
import { createHuman } from 'humanette';

const human = await createHuman(page, { seed: 42, scale: 2.5 });
await human.click('#save');
await human.type('#title', 'Start', { selectAll: true });
await human.drag('#card', '#done');
await human.dispose();
```

The package root exports the Playwright API. Use native Playwright locators, CSS selectors, or viewport coordinates. Humanette does not record or encode videos itself. The website's looping examples are visual previews; /examples/live is the real-input fixture used by the recording script.

See [package API](packages/humanette/README.md), [architecture and learnings](docs/architecture.md), and [Vercel deployment / npm release](docs/release-and-deployment.md). The owner-supplied SVGs already present in docs/ are embedded and bundled; no remote asset service is needed. Confirm their provenance/redistribution permissions before release. No publish or deploy runs automatically.
