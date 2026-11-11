# Humanette

A steady hand for browser automation. Natural, seeded pointer motion; bundled, CSS-aware SVG cursors; clear press/hold/release feedback; natural typing with live click/key sounds; and an interactive Pointer Lab for finding your feel.

## Ask your agent for a demo

Install the skill in your project and choose your coding agent when prompted:

```sh
npx skills add seflless/humanette --skill humanette
```

In Claude Code, ask `/humanette record a demo of the new UX features in this PR`. In Codex, select the Humanette skill and describe the demo. The agent handles package and browser setup, records native high-resolution MP4 with tab audio, and injects quiet live click/typing sounds. The skill recorder needs Node 24.11+ and Chrome 153+; it installs missing tools in the chosen workspace. Open browser sessions need a supported Playwright connection and an available recorder.

For a product demo, ask `/humanette create a product demo of a my to-do app`.

The [skill](skills/humanette/SKILL.md) includes a runnable local example. The published `humanette@1.2.0` tarball was verified November 11, 2026: natural typing, sounds, recording, and capture fixes are owned by the package. It includes the root API, optional `humanette/recording` module, types, browser bundle, cursor assets, and license notices. The skill installs from npm; no Humanette source checkout or build tools are needed.

The pending 1.2.1 patch shares those sound engines and the typing model with the website previews. The homepage includes a natural typing demo with Slow, Default, and Fast presets. Enable sound to hear click and key effects; audio starts only after that gesture. The Pointer Lab and live demo use the same packaged engines. Visual previews illustrate actions; the Playwright examples deliver real input.

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
bun run test:package        # record and rerun in a fresh tarball consumer
bun run test:recording      # native capture, real input sounds, presets, cleanup
bun run test:skill          # local Claude CLI: one-off and reusable recording workflows
```

Node 22+ and Bun 1.3.14. Before browser tests, run bunx playwright install chromium from apps/web.

The recording checks require Node 24.11+, matching full Chromium, and ffmpeg/ffprobe for independent media analysis. These analysis tools are not consumer recording dependencies. The skill harness also requires an installed, authenticated `claude` CLI. It makes real model calls in disposable projects against a disposable npm registry serving the actual packed release, installs missing recording tools, verifies real input, native AV1/Opus video, distinct visual FPS from decoded frame barcodes, and audible app tones, and checks that a saved walkthrough works after a fresh dependency install. It keeps transcripts and recordings in `test-results/skill-harness/` and is not part of CI or `bun check`. Run one case with `bun run test:skill --case=one-off` or `--case=saved`. Use `bun run test:skill --published` to test the public npm package instead. The local registry test does not prove a public release is available. Add `--published --case=saved --legacy` to verify an app on Playwright 1.58 keeps that dependency while the skill installs a separate current recording browser. Each case has a ten-minute timeout and a $10 model-call limit; override with `HUMANETTE_SKILL_TIMEOUT_MS` and `HUMANETTE_SKILL_BUDGET_USD`.

`bun example:playwright` replaces `out/playwright-example.mp4`, plus its
`playwright-example.png` screenshot and `playwright-example.json` manifest.
Old timestamped takes are left untouched.

`bun example:playwright:headful` runs the same actions visibly without recording,
so you can compare live movement against the captured video. It waits briefly before
starting and leaves the window open afterward; close the window to exit.
Run `bun dev` in another terminal first.

The repository uses Playwright `1.64.0-alpha-2026-09-28`; skill consumers can use stable Playwright. The recording example uses the package’s native AV1/Opus capture with app audio, live sounds, and natural typing. It requires Node 24.11+ and full Chromium 153+. Requested FPS does not guarantee distinct captured frames. Cursor input targets 60 updates per second independently of the encoded recording rate.

## Use the package

```ts
import { createHuman } from 'humanette';

const human = await createHuman(page, { seed: 42, scale: 2.5 });
await human.click('#save');
await human.type('#title', 'Start', { selectAll: true });
await human.drag('#card', '#done');
await human.dispose();
```

The package root exports the Playwright API. Use native Playwright locators, CSS selectors, or viewport coordinates. Optional native capture, live interaction sounds, and capture stabilization are available from `humanette/recording`. The website's looping examples are visual previews; /examples/live is the real-input fixture used by the recording script.

See [package API](packages/humanette/README.md), [architecture and learnings](docs/architecture.md), and [Vercel deployment / npm release](docs/release-and-deployment.md). The owner-supplied SVGs already present in docs/ are embedded and bundled; no remote asset service is needed. Confirm their provenance/redistribution permissions before release. No publish or deploy runs automatically.

## Influences and references

- [human-input](https://github.com/heydryft/human-input): a reference for natural browser input. Its measured key-hold and inter-key timing profiles influenced the package's [natural typing model](packages/humanette/src/typing.ts), which adds word and punctuation pauses. Worth exploring for future input improvements.
