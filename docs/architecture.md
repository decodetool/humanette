# Architecture and migration

## Workspaces

- packages/humanette: zero-dependency browser runtime, pure motion model, embedded cursor catalog, separate Node/Playwright adapter. Build-time esbuild and TypeScript are workspace tooling, not runtime dependencies.
- apps/web: Next.js App Router, React, TypeScript, Tailwind v4. Server-rendered home/docs; client demo islands. Dialkit loads only on the Pointer Lab route.
- docs/*.svg: existing user-supplied asset source of truth. Build embeds data URLs and emits individual SVG exports.
- examples: deterministic scripts, plus clearly marked legacy agent-browser recipes.

## Intentional separation

createHumanette paints a cursor, press feedback, and optionally modifier chords. play/seek are presentation only. They never simulate product state through DOM mutation or dispatchEvent.

createHuman(page) delivers real input through Playwright. It centers locators, scrolls them into view, samples motion against elapsed time, awaits delivery, adds a small aim pause, and releases held input on failures. It rejects parallel actions. It does not implement a recorder.

The package root exports the Playwright API. The old humanette/playwright import remains a compatibility alias; humanette/internal is reserved for the site's renderer and workbench. Future automation adapters can use their own subpaths without changing the current Playwright-first documentation.

The workbench imports the shared renderer and pure model; its controls are the same options consumers receive. The /examples page shows three explicitly labeled visual previews with matching Playwright snippets. They autoplay while visible, respect reduced motion, pause offscreen, and return the cursor home before looping. They do not dispatch real DOM input. The /examples/live route retains the real-input fixture, motion reference, and CSS cursor gallery used by Playwright tests and the recording example. /demos redirects to /examples.

selectText(locator) measures visible text runs (including nested spans and wrapped lines) and performs a real drag. It assumes left-to-right selectable text; specialized editors and form fields should use explicit coordinates or keyboard commands.

## Preserved learnings

The stable, DPR-aware full-surface canvas came from the agent-browser investigation in docs/history/cursor-capture-investigation.md. Small moving DOM overlays caused capture sampler stalls after large canvas repaints. More requested input steps and blur did not repair missing source frames.

Cursor geometry and feedback use CSS pixels; SVG hotspot coordinates are scaled with the image. For short moves there is a minimum duration. Cubic ease-out makes travel start quickly and slow into the target, including the curve's lateral bend. Pressed movement follows input exactly; free movement has elapsed-time smoothing. No idle paint loop or perpetual held-disk animation.

Clamp playback progress to both ends of 0–1. The first requestAnimationFrame timestamp can precede a performance.now() start sample, so an upper-only clamp emits negative timeline time. The browser regression covers this offset through the actual Play demo button, not just the pure motion model.

Capture before/after checks belong outside the recorded sequence. Rehearse and batch the take, without an LLM decision loop. Check actual source pixels, not only encoded dimensions/FPS. Enter/keyup, settle, select all inside the editor, insert text, Escape avoids the leading-newline label bug. Persistent tools/styles should not be redundantly reselected.

## Known limits

CSS auto inference is conservative, with text glyph hit testing. Cursor URLs use their final CSS keyword fallback. Shadow-root handling is limited to open roots. Iframes need their own overlay; cross-origin access is not bypassed. Classic bundle injection respects CSP. Native menus and OS cursors are outside page capture.

The busy icons are static; keyboard badges show modifier chords only and are opt-in. Pure motion is deterministic; wall-clock delivery still depends on browser acknowledgements and workload. This implementation does not claim to solve every Electron/CDP capture issue.
