---
name: humanette
description: Record an agent demonstrating a browser feature, or create a repeatable Playwright product walkthrough, with Humanette's readable cursors and click feedback. Use when asked for a browser demo, tutorial, or product video with Humanette.
---

# Humanette

Turn the user's requested browser flow into a local video with legible cursor movement and real application interactions. Prioritize recording the agent demonstrating the feature. Handle missing dependencies yourself as part of the demo.

## Choose where the work belongs

| Request                                                                                                                           | Scripts and dependencies                                                                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Record new UX features in a PR, show a bug, or deliver a one-off video                                                            | A unique temporary workspace from the OS temp directory (`mktemp -d` or `fs.mkdtemp(os.tmpdir())`). Keep the app's manifest, lockfile, and source unchanged. |
| Create a product walkthrough or tutorial for the current app repository, save a script, add a demo command, or make it rerunnable | A named script in the repository's existing scripts/demo location, with missing packages added as development dependencies using its package manager.        |
| Product demo without a repository, or ambiguous intent                                                                            | Start in a temporary workspace. Promote the script into a project if the user later asks to keep it.                                                         |

Explicit instructions such as "video only," "do not change my repo," or a requested script path override these defaults. A request to record something does not by itself mean adding Playwright to the app. State the chosen approach briefly and continue; routine local setup does not need another confirmation.

In temporary mode, scripts must resolve packages from the temporary workspace. Changing cwd alone does not let a script in `/tmp` import a project's packages. Give the workspace its own private package.json and install there, or deliberately resolve an existing compatible installation. Save the final video and failed-check artifacts to a durable output directory outside the disposable tools directory before cleaning up. Do not remove shared caches or the installed skill.

## Choose the browser and starting state

- Use the user's named app, open board, and starting state. Inspect the page before choosing targets. Ask only for missing information that prevents the demonstration.
- Humanette requires a real Playwright `Page` in the same JavaScript process as the actions. Reuse an available page/session, or attach through a browser tool's supported Playwright/CDP connection. A screenshot or opaque browser-tool handle is not a Playwright page. Do not invent a connection endpoint or inject a decorative cursor while continuing to click through another tool.
- On an existing page, use an available screen recorder. Playwright `recordVideo` must be configured when creating the context; it cannot start recording an existing context retroactively. If no recorder or supported connection is available, explain the limitation and obtain the missing connection or use a fresh recording context that can reproduce the requested starting state. Do not silently replace an open authenticated board with a new empty session.
- For a standalone example with no app specified, use the bundled [local to-do demo](scripts/record-todo.mjs). Copy it into the chosen execution workspace so it resolves that workspace's dependencies. It needs no account, server, or production app. Do not substitute it for the user's real app.

## Install the runtime for the user

Follow [dependency setup](references/setup.md) before running the flow. Inspect the chosen workspace, reuse compatible packages, install missing Humanette/Playwright and the matching Chromium automatically, and prove they work with an import and browser-launch smoke check. Do not stop at telling the user to run install commands. Install the published package; do not search for or build Humanette source. Keep missing runtimes task-local, and never upgrade the project's existing Playwright just to use the latest recorder options.

## Perform and record the flow

```js
import { createHuman } from 'humanette';

const human = await createHuman(page, { scale: 4, seed: 42 });
try {
  await human.click(page.getByRole('button', { name: 'Add' }));
  await human.type(page.getByLabel('Task'), 'Buy groceries');
  // Use the actual app's locators and verify its resulting state.
} finally {
  await human.dispose();
}
```

- Keep browser setup, navigation, readiness checks, assertions, and recording in Playwright. Use `createHuman` from `humanette`; `humanette/internal` only paints previews and does not operate the app.
- Route demonstrated pointer actions through `human.moveTo`, `human.click`, `human.drag`, and `human.selectText`. `human.type` clicks and types; `human.press` sends shortcuts. Targets accept native locators, selectors, or main-viewport CSS coordinates; text selection needs a locator or selector. Canvas tools such as a rectangle tool often need a real drag at inspected coordinates.
- Await each action sequentially. Await the running action before `human.dispose()` in `finally`. Do not use parallel actions on the same cursor. Use Playwright waits/assertions for readiness, and `human.wait(ms)` only for short presentation holds.
- Keyboard badges are opt-in with `keyboard: true` and currently show modifier chords only, not ordinary typed characters or every keypress. Do not promise full keyboard visualization.
- When creating a recording context, set an explicit viewport and matching `recordVideo.size` (for example, 1280 × 800). Capture `page.video()` before closing the context, close the context to finalize it, then `video.saveAs()` a descriptive local filename. Delete the generated duplicate after saving. Keep an attached user's browser open; close only browsers/contexts created for this task.
- Verify the requested result through actual application state. For canvas content, use the app's supported state/selection checks where available and capture the visible result. Do not fabricate results through DOM mutation or fake events.

## Deliver the result

Inspect the finalized recording when video/frame tools are available: cursor visibility, actual interactions, pacing, and final state. A high-FPS file does not prove distinct captured frames. Preserve failed-check screenshots and recordings. If playback inspection is unavailable, state that limitation instead of claiming visual verification.

Return the local video link, what was demonstrated, and the actual verification result. For a reusable walkthrough, also provide the script and rerun command, the packages added, and any runtime requirement. Ensure it runs after temporary execution directories are removed: no imports, package dependencies, scripts, or lockfile entries may point at `/tmp` or a personal machine path. Keep recordings local unless the user asks to share them, and use non-sensitive demo data. Demonstrating a feature does not authorize unrelated destructive actions, publishing, or deployment.
