# humanette

Natural cursor movement and legible click feedback for Playwright product demos. TypeScript and all 35 cursor SVGs included.

## Ask your agent for a demo

```sh
npx skills add seflless/humanette --skill humanette
```

Run in your project and choose your coding agent. In Claude Code, ask `/humanette record a demo of the new UX features in this PR`. In Codex, select the Humanette skill and describe the demo. The agent handles runtime and browser setup. Open sessions require a supported Playwright connection and an available recorder.

For an example without an existing app, ask the skill to record its bundled local to-do demo: add “Buy groceries,” mark it complete, and save a video and reusable script.

## Installation

Requires Node.js 22+. Install Humanette and Playwright with your project's package manager, then install the matching browser:

```sh
npm install --save-dev humanette@^1.2.0 playwright
npx --no-install playwright install chromium
```

Reuse compatible dependencies already present. For a one-off recording, install in a temporary execution workspace; for a reusable walkthrough, save the script and development dependencies in your app repository. Consuming the package requires no Humanette source checkout or build tools.

## Use your Playwright page

```ts
import { createHuman } from 'humanette';

const human = await createHuman(page, { scale: 4, seed: 42 });
try {
  await human.click(page.getByRole('button', { name: 'Save' }));
  await human.type(page.getByLabel('Title'), 'Start', { selectAll: true });
  await human.selectText(page.getByText('Select these words.'));
  await human.drag(page.getByTestId('card'), page.getByTestId('drop'));
  await human.press('Shift+2');
} finally {
  await human.dispose();
}
```

Pass an existing Playwright Page to createHuman. Continue to use Playwright for browser setup, navigation, assertions, app-readiness checks, and recording.

## API

Targets accept Playwright Locator objects, CSS selector strings, or { x, y } in main-viewport CSS pixels. Locators are scrolled into view and centered before movement. Await each action in order.

- createHuman(page, options?): attach the cursor. Options include scale, seed (42), typing (speed/pace), settle (120 ms), fps (60 input samples/sec target), keyboard (false), and feedback appearance.
- moveTo(target, { duration?, signal? }): move without clicking.
- click(target, { duration?, signal? }): move, slow on arrival, settle, and click.
- selectText(locatorOrSelector, { duration?, signal? }): drag across visible text, including nested spans and wrapped lines. Defaults to a 1400 ms selection drag. Assumes left-to-right selectable text; use keyboard commands for inputs and specialized editors.
- drag(from, to, { duration?, signal? }): move to the source, hold, drag, and release. Defaults to a 900 ms drag.
- type(target, text, { speed?, pace?, delay?, selectAll?, signal? }): click and type with real key holds and natural pauses. Explicit delay selects fixed per-character timing.
- press(key): send a Playwright shortcut, such as ControlOrMeta+A.
- wait(milliseconds, signal?): add a short presentation hold.
- configure(appearance): update cursor size and feedback.
- dispose(): remove the overlay and listeners after pending actions finish; keep the page open.

Pass an AbortSignal to cancel supported actions. Held mouse input is released even when a drag is cancelled. The overlay is reinstalled after navigation on the next action. Humanette respects CSP and browser permissions.

## Website previews (1.2.1)

The repository’s homepage, Pointer Lab, and live demo share the package renderer and procedural click/Type-Press sound engines. The homepage typing preview uses the same seeded `typingPlan` and Slow/Default/Fast presets as real Playwright typing. Sounds are opt-in in browser previews; no audio assets are downloaded. Preview helpers are browser-safe exports of `humanette/internal`, reserved for this repository. Use `createHuman` and `humanette/recording` for product walkthroughs.

## Natural typing

Typing is natural by default, with seeded variation and word/sentence pauses. Speeds are slow (3×), default (6×), and fast (8×) relative to the original measured timing profile. Numeric pace from 0.25 to 8 overrides a preset. Wall-clock speed is approximate because browser input and minimum key holds take time.

```ts
const human = await createHuman(page, { typing: { speed: 'default' }, seed: 42 });
await human.type('#message', 'Hello, team!', { speed: 'fast' });
await human.type('#message', 'A custom pace.', { pace: 4, selectAll: true });
await human.type('#message', 'Fixed timing.', { delay: 45, selectAll: true });
```

Text stays exact, without deliberate typos. Unicode graphemes stay together; literal newlines do not become form submissions. Typing speed changes real input timing while pointer movement and sound envelopes keep their normal speed. `typingSpeeds` and the pure seeded `typingPlan` are also exported from the package root.

## Appearance

Defaults: scale 2.5, color #397ef3, filled true, motionBlur 0.2, textSelectionOpacity 0.4. Examples use scale 4.

Feedback sits behind the cursor, grows on press, holds steady, then expands and fades on release. Configure pressRadius, pressDuration, pressOpacity, pressScale, holdRadius, holdOpacity, ringWidth, releaseRadius, and releaseDuration.

```ts
await human.configure({ scale: 4, textSelectionOpacity: 0.4 });
```

Text-selection opacity applies while a text cursor is held down. Set it to 1 to keep the cursor opaque. Pointer size is not limited by the OS cursor settings. All artwork is embedded; no asset server is required.

## Optional recording

Import the recorder from `humanette/recording`. Recording needs Node.js 24.11+, full Chrome/Chromium 153+, and the optional dependency below. Cursor/typing-only consumers do not need it.

```sh
npm install --save-dev chrome-capture@0.1.2
```

```ts
import { chromium } from 'playwright';
import { createHuman } from 'humanette';
import { launchForPreset, startRecording } from 'humanette/recording';

const { browser, context, preset } = await launchForPreset(chromium, 'archive');
try {
  const page = await context.newPage();
  await page.goto('http://localhost:3000');
  const human = await createHuman(page, { scale: 4 });
  const recording = await startRecording(page, preset);
  try {
    await human.type(page.getByLabel('Title'), 'A new idea');
    await human.click(page.getByRole('button', { name: 'Save' }));
  } finally {
    try {
      console.log(await recording.stop('out/demo.mp4'));
    } finally {
      await human.dispose();
    }
  }
} finally {
  await browser.close();
}
```

Presets: archive (2560×1600), youtube (2560×1440), x (1920×1080), vertical (1080×1920), all requesting 60 fps. Custom viewport/DPR/fps presets are supported. `launchForPreset` enables tab audio and native pixel scale. Attached browsers keep their window size; inspect `warning` and `sourceSize` instead of assuming the requested resolution was achieved.

The recorder writes native AV1/Opus MP4 with app tab audio and quiet live click/typing sounds. Set `sounds: false` for app audio alone, `sounds: { volume: 0.1 }` for quieter effects, or `audio: false, sounds: false` for silence. For live sounds alone, call `installInteractionSounds(page)` from `humanette/recording` and await its `dispose()` afterward. Sounds use Cuelume Type/Press, vary per strike, and overlap at natural playback speed.

Recording includes an invisible interaction-bound capture refresh to prevent a reproduced cursor-to-typing capture stall. It stops repainting 350 ms after input and is removed at recording stop; `captureRefresh: false` disables it for diagnosis. Sounds and refresh hooks handle navigation/iframes and clean up their own resources. The app's audio contexts and the user's attached browser remain open.

No FFmpeg, extension, virtual audio driver, or permission picker is needed for native capture. Some players require a separate H.264/AAC conversion. Humanette does not guarantee capture FPS or lossless pixel fidelity: encoded FPS, actual input sampling, and distinct captured frames differ. The input-bound workaround does not guarantee every autonomous animation or every pixel transition is recorded.

## Boundaries

Locator positions are sampled before movement, not continuously tracked. This adapter does not implement all locator.click actionability checks. CSS cursor inference is limited for cross-origin frames, closed shadow roots, native controls, and custom cursor images. Busy artwork is static. Keyboard badges are opt-in and display modifier chords only, never typed text.

The project website includes Playwright examples, a recording guide, and Pointer Lab. The old humanette/playwright import remains a compatibility alias. No npm publishing, uploads, or telemetry happen automatically. See NOTICE.md for asset provenance.
