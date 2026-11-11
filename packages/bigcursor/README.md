# bigcursor

Bigcursor makes automated browser use easier to follow, with large cursors, natural movement and typing, and live click and keyboard sounds for Playwright demos.

[Website](https://bigcursor.dev) · [Getting started](https://bigcursor.dev/docs) · [Examples](https://bigcursor.dev/#examples) · [API reference](https://bigcursor.dev/docs#api)

## Ask your agent for a demo

```sh
npx skills add seflless/bigcursor --skill bigcursor
```

Run in your project and choose your coding agent. In Claude Code, ask `/bigcursor record a demo of the new UX features in this PR`. In Codex, select the Bigcursor skill and describe the demo. The agent handles runtime and browser setup. Open sessions require a supported Playwright connection and an available recorder.

For an example without an existing app, ask the skill to record its bundled local to-do demo: add “Buy groceries,” mark it complete, and save a video and reusable script.

## Installation

The core API requires Node.js 22+; recording requires Node.js 24.11+ and Chrome/Chromium 153+. Install the current npm release and Playwright with your project's package manager, then install the matching browser:

```sh
npm install --save-dev bigcursor@latest playwright
npx --no-install playwright install chromium
```

Reuse compatible dependencies already present. For a one-off recording, install in a temporary execution workspace; for a reusable walkthrough, save the script and development dependencies in your app repository. Consuming the package requires no Bigcursor source checkout or build tools.

## Use your Playwright page

```ts
import { createCursor } from 'bigcursor';

const cursor = await createCursor(page, { scale: 4, seed: 42 });
try {
  await cursor.click(page.getByRole('button', { name: 'Save' }));
  await cursor.type(page.getByLabel('Title'), 'Start', { selectAll: true });
  await cursor.selectText(page.getByText('Select these words.'));
  await cursor.drag(page.getByTestId('card'), page.getByTestId('drop'));
  await cursor.press('Shift+2');
} finally {
  await cursor.dispose();
}
```

Pass an existing Playwright Page to createCursor. Continue to use Playwright for browser setup, navigation, assertions, app-readiness checks, and recording.

For video with app audio and click/typing sounds, use the [optional recording module](#optional-recording). `createCursor` alone does not enable audio.

## API

Targets accept Playwright Locator objects, CSS selector strings, or { x, y } in main-viewport CSS pixels. Locators are scrolled into view and centered before movement. Await each action in order.

- createCursor(page, options?): attach the cursor. Options include scale, seed (42), typing (speed/pace), settle (120 ms), fps (60 input samples/sec target), keyboard (false), autoHideTimeout (0, idle dimming disabled), hiddenOpacity (0), dimmedOpacity (0.3), and feedback appearance.
- moveTo(target, { duration?, signal? }): move without clicking.
- click(target, { duration?, signal? }): move, slow on arrival, settle, and click.
- selectText(locatorOrSelector, { duration?, signal? }): drag across visible text, including nested spans and wrapped lines. Defaults to a 1400 ms selection drag. Assumes left-to-right selectable text; use keyboard commands for inputs and specialized editors.
- drag(from, to, { duration?, signal? }): move to the source, hold, drag, and release. Defaults to a 900 ms drag.
- type(target, text, { speed?, pace?, delay?, selectAll?, signal? }): click and type with real key holds and natural pauses. Explicit delay selects fixed per-character timing.
- press(key): send a Playwright shortcut, such as ControlOrMeta+A.
- wait(milliseconds, signal?): add a short presentation hold.
- configure(appearance): update cursor size, feedback, and dimming.
- hideCursor(): fully hide the pointer until explicitly shown; input still works.
- showCursor(): restore the pointer at its last position and resume automatic dimming.
- dispose(): remove the overlay and listeners after pending actions finish; keep the page open.

Pass an AbortSignal to cancel supported actions. Held mouse input is released even when a drag is cancelled. The overlay is reinstalled after navigation on the next action. Bigcursor respects CSP and browser permissions.

## Cursor dimming

There are two cursor opacity levels: `dimmedOpacity` defaults to 0.3, and `hiddenOpacity` defaults to 0. The dimmed level applies immediately while typing or selecting text. `hiddenOpacity` is the idle level. Automatic idle dimming is off by default (autoHideTimeout: 0); set a positive millisecond delay, for example 500, to enable the 180 ms transition. Set hiddenOpacity to 0 for full hiding; autoHideTimeout: 0 disables the idle timer. Mouse movement or clicking restores the normal cursor; a held pointer preserves its drag/selection feedback. Typing stays active until 350 ms after the last key/input, without resetting the mouse idle clock. When states overlap, the lower opacity wins rather than multiplying them.

```ts
const cursor = await createCursor(page, {
  dimmedOpacity: 0.3, // Typing and text selection
  hiddenOpacity: 0, // Idle state; 0 fully hides it
  autoHideTimeout: 0, // Off by default; set e.g. 500 milliseconds to enable
});
await cursor.configure({ hiddenOpacity: 0.25 });
```

All values can change through `cursor.configure` and survive navigation.

```ts
await cursor.hideCursor(); // Fully hide cursor/trail/feedback, regardless of hiddenOpacity
await cursor.type('#title', 'Still real input');
await cursor.showCursor(); // Show at the last position; resume automatic dimming
```

Manual hiding persists through mouse activity and navigation until explicitly shown. It does not change real input, app state, keyboard badges, or interaction audio. The internal renderer uses the same `hideCursor()` / `showCursor()` methods.

The renderer stops drawing after each transition; keyboard badges and interaction sounds remain independent.

## Natural typing

Typing is natural by default, with seeded variation and word/sentence pauses. Speeds are slow (3×), default (6×), and fast (8×) relative to the original measured timing profile. Numeric pace from 0.25 to 8 overrides a preset. Wall-clock speed is approximate because browser input and minimum key holds take time.

```ts
const cursor = await createCursor(page, { typing: { speed: 'default' }, seed: 42 });
await cursor.type('#message', 'Hello, team!', { speed: 'fast' });
await cursor.type('#message', 'A custom pace.', { pace: 4, selectAll: true });
await cursor.type('#message', 'Fixed timing.', { delay: 45, selectAll: true });
```

Text stays exact, without deliberate typos. Unicode graphemes stay together; literal newlines do not become form submissions. Typing speed changes real input timing while pointer movement and sound envelopes keep their normal speed. `typingSpeeds` and the pure seeded `typingPlan` are also exported from the package root.

## Appearance

Defaults: scale 2.5, color #397ef3, filled true, motionBlur 0.2, dimmedOpacity 0.3. Examples use scale 4.

Feedback sits behind the cursor, grows on press, holds steady, then expands and fades on release. Configure pressRadius, pressDuration, pressOpacity, pressScale, holdRadius, holdOpacity, ringWidth, releaseRadius, and releaseDuration.

```ts
await cursor.configure({ scale: 4, dimmedOpacity: 0.3 });
```

`dimmedOpacity` applies while typing or holding a text cursor down. Set it to 1 to disable that dimming. Pointer size is not limited by the OS cursor settings. All 35 cursor SVGs are embedded; no asset server is required. TypeScript declarations are included.

## Optional recording

Import the recorder from `bigcursor/recording`. Recording needs Node.js 24.11+, full Chrome/Chromium 153+, and the optional dependency below. Cursor/typing-only consumers do not need it.

```sh
npm install --save-dev chrome-capture@0.1.2
```

```ts
import { chromium } from 'playwright';
import { createCursor } from 'bigcursor';
import { launchForPreset, startRecording } from 'bigcursor/recording';

const { browser, context, preset } = await launchForPreset(chromium, 'archive');
try {
  const page = await context.newPage();
  await page.goto('http://localhost:3000');
  const cursor = await createCursor(page, { scale: 4 });
  const recording = await startRecording(page, preset);
  try {
    await cursor.type(page.getByLabel('Title'), 'A new idea');
    await cursor.click(page.getByRole('button', { name: 'Save' }));
  } finally {
    try {
      console.log(await recording.stop('out/demo.mp4'));
    } finally {
      await cursor.dispose();
    }
  }
} finally {
  await browser.close();
}
```

Presets: archive (2560×1600), youtube (2560×1440), x (1920×1080), vertical (1080×1920), all requesting 60 fps. Custom viewport/DPR/fps presets are supported. `launchForPreset` enables tab audio and native pixel scale. Attached browsers keep their window size; inspect `warning` and `sourceSize` instead of assuming the requested resolution was achieved.

The recorder writes native AV1/Opus MP4 with app tab audio and quiet live click/typing sounds. Set `sounds: false` for app audio alone, `sounds: { volume: 0.1 }` for quieter effects, or `audio: false, sounds: false` for silence. For live sounds alone, call `installInteractionSounds(page)` from `bigcursor/recording` and await its `dispose()` afterward. Sounds use Cuelume Type/Press, vary per strike, and overlap at natural playback speed.

Recording includes an invisible interaction-bound capture refresh to prevent a reproduced cursor-to-typing capture stall. It stops repainting 350 ms after input and is removed at recording stop; `captureRefresh: false` disables it for diagnosis. Sounds and refresh hooks handle navigation/iframes and clean up their own resources. The app's audio contexts and the user's attached browser remain open.

No FFmpeg, extension, virtual audio driver, or permission picker is needed for native capture. Some players require a separate H.264/AAC conversion. Bigcursor does not guarantee capture FPS or lossless pixel fidelity: encoded FPS, actual input sampling, and distinct captured frames differ. The input-bound workaround does not guarantee every autonomous animation or every pixel transition is recorded.

## Boundaries

Locator positions are sampled before movement, not continuously tracked. This adapter does not implement all locator.click actionability checks. CSS cursor inference is limited for cross-origin frames, closed shadow roots, native controls, and custom cursor images. Busy artwork is static. Keyboard badges are opt-in and display modifier chords only, never typed text.

The [website](https://bigcursor.dev) includes [examples](https://bigcursor.dev/#examples), a [recording guide](https://bigcursor.dev/docs#recording), and [Pointer Lab](https://bigcursor.dev/workbench). The bigcursor/playwright subpath is an alias for the package root. No npm publishing, uploads, or telemetry happen automatically. See [NOTICE.md](https://github.com/seflless/bigcursor/blob/main/packages/bigcursor/NOTICE.md) for asset provenance.
