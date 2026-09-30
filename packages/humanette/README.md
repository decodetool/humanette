# humanette

Natural cursor movement and legible click feedback for Playwright product demos. TypeScript and all 35 cursor SVGs included.

```sh
npm install humanette playwright
npx playwright install chromium
```

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

- createHuman(page, options?): attach the cursor. Options include scale, seed (42), settle (120 ms), fps (60 input samples/sec target), keyboard (false), and feedback appearance.
- moveTo(target, { duration?, signal? }): move without clicking.
- click(target, { duration?, signal? }): move, slow on arrival, settle, and click.
- selectText(locatorOrSelector, { duration?, signal? }): drag across visible text, including nested spans and wrapped lines. Defaults to a 1400 ms selection drag. Assumes left-to-right selectable text; use keyboard commands for inputs and specialized editors.
- drag(from, to, { duration?, signal? }): move to the source, hold, drag, and release. Defaults to a 900 ms drag.
- type(target, text, { delay?, selectAll?, signal? }): click and insert characters through Playwright keyboard input. Delay defaults to 45 ms per character.
- press(key): send a Playwright shortcut, such as ControlOrMeta+A.
- wait(milliseconds, signal?): add a short presentation hold.
- configure(appearance): update cursor size and feedback.
- dispose(): remove the overlay and listeners after pending actions finish; keep the page open.

Pass an AbortSignal to cancel supported actions. Held mouse input is released even when a drag is cancelled. The overlay is reinstalled after navigation on the next action. Humanette respects CSP and browser permissions.

## Appearance

Defaults: scale 2.5, color #397ef3, filled true, motionBlur 0.2, textSelectionOpacity 0.4. Examples use scale 4.

Feedback sits behind the cursor, grows on press, holds steady, then expands and fades on release. Configure pressRadius, pressDuration, pressOpacity, pressScale, holdRadius, holdOpacity, ringWidth, releaseRadius, and releaseDuration.

```ts
await human.configure({ scale: 4, textSelectionOpacity: 0.4 });
```

Text-selection opacity applies while a text cursor is held down. Set it to 1 to keep the cursor opaque. Pointer size is not limited by the OS cursor settings. All artwork is embedded; no asset server is required.

## Recording and boundaries

Use Playwright recordVideo or your existing screen recorder. Humanette does not encode video or guarantee capture FPS. Encoded FPS, input sampling, and distinct source frames are different measurements.

Locator positions are sampled before movement, not continuously tracked. This adapter does not implement all locator.click actionability checks. CSS cursor inference is limited for cross-origin frames, closed shadow roots, native controls, and custom cursor images. Busy artwork is static. Keyboard badges are opt-in and display modifier chords only, never typed text.

The project website includes Playwright examples, a recording guide, and Pointer Lab. The old humanette/playwright import remains a compatibility alias. No npm publishing, uploads, or telemetry happen automatically. See NOTICE.md for asset provenance.
