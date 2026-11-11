// Shared by the HTML docs and their agent-readable Markdown representation.
export const setup = `import { chromium } from 'playwright';
import { createCursor } from 'bigcursor';

const browser = await chromium.launch({ headless: false });
try {
  const page = await browser.newPage();
  await page.goto('http://localhost:3000'); // Your app
  const cursor = await createCursor(page, { scale: 4 });

  try {
    await cursor.click(page.getByRole('button', { name: 'Save' }));
    await cursor.type(page.getByLabel('Title'), 'Start', { selectAll: true });
    await cursor.selectText(page.getByText('Select these words.'));
    await cursor.drag(page.getByTestId('card'), page.getByTestId('drop'));
  } finally {
    await cursor.dispose();
  }
} finally {
  await browser.close();
}`;
export const typingSpeedNote =
  "Natural typing is built into createCursor. Set typing: { speed: 'slow' } (3×), 'default' (6×, used when omitted), or 'fast' (8×), or pass speed to cursor.type for one action. Numeric pace (0.25–8) overrides the preset. Only real typing timing changes; pointer movement, presentation holds, and individual sounds stay at normal speed. Explicit delay selects fixed timing. Record at the chosen speed rather than time-compressing video or audio.";

export const recording = `import { chromium } from 'playwright';
import { createCursor } from 'bigcursor';
import { launchForPreset, startRecording } from 'bigcursor/recording';

const { browser, context, preset } = await launchForPreset(chromium, 'archive');
try {
  const page = await context.newPage();
  await page.goto('http://localhost:3000');
  await page.getByRole('button', { name: 'Save' }).waitFor();
  const cursor = await createCursor(page, { scale: 4, seed: 42 });
  const recording = await startRecording(page, preset); // App audio + live click/key sounds
  try {
    await cursor.type(page.getByLabel('Title'), 'Make something great.');
    await cursor.click(page.getByRole('button', { name: 'Save' }));
    await cursor.wait(900);
  } finally {
    try {
      const stats = await recording.stop('out/demo.mp4');
      console.log(stats); // Actual dimensions, audio track, warnings, finalization time
    } finally {
      await cursor.dispose();
    }
  }
} finally {
  await browser.close();
}`;
export const api = [
  [
    'createCursor(page, options?)',
    'Attach to your existing Playwright page. Options include scale (cursor size), seed (repeatable paths and typing), typing (speed or numeric pace), settle (aim pause, 120 ms by default), fps (input sampling target, not recording FPS), autoHideTimeout (0 by default; positive milliseconds enable idle dimming), hiddenOpacity (0), and dimmedOpacity (0.3).',
  ],
  [
    'cursor.click(target, { duration?, signal? })',
    'Move to the target, slow down on approach, pause to aim, then send real mouse down/up.',
  ],
  [
    'cursor.moveTo(target, { duration?, signal? })',
    'Move without clicking. A locator resolves to its center after scrolling into view. Coordinates are CSS pixels relative to the main viewport.',
  ],
  [
    'cursor.selectText(locator, { duration?, signal? })',
    'Drag from the first visible text line to the last. Accepts a locator or selector for ordinary selectable text, including nested spans and wrapped lines. For inputs, use type with selectAll or a keyboard shortcut.',
  ],
  [
    'cursor.drag(from, to, { duration?, signal? })',
    'Move to the source, hold the mouse, drag to the destination, then release. Sources and destinations may be locators, selectors, or coordinates. The mouse is released even when the drag is cancelled.',
  ],
  [
    'cursor.type(target, text, { speed?, pace?, delay?, selectAll?, signal? })',
    'Click the target and type with varied real key holds and word/sentence pauses. Speeds are slow (3×), default (6×), and fast (8×). Numeric pace overrides the preset. Set selectAll to replace contents; explicit delay selects fixed per-character timing in milliseconds. Unicode graphemes stay together and literal newlines do not submit forms.',
  ],
  [
    'cursor.press(key)',
    'Send a Playwright keyboard shortcut, for example ControlOrMeta+A or Shift+2.',
  ],
  [
    'cursor.wait(milliseconds, signal?)',
    'Add a short presentation pause. Use Playwright assertions or locator waits for application readiness.',
  ],
  [
    'cursor.configure(appearance)',
    'Change cursor size and feedback while the script is running. For example, await cursor.configure({ scale: 4, dimmedOpacity: 0.3 }).',
  ],
  [
    'cursor.hideCursor()',
    'Fully hide the cursor, its trail, and pointer feedback until showCursor is called. Mouse and keyboard input still work; the override survives navigation. This ignores hiddenOpacity.',
  ],
  [
    'cursor.showCursor()',
    'Restore the cursor at its last known position and resume automatic dimming. It resets the inactivity deadline and clears temporary typing dimming.',
  ],
  [
    'cursor.dispose()',
    'Remove the cursor overlay and its listeners. Await any running action before cleanup. Your Playwright page stays open.',
  ],
];

export const demoNote =
  'The homepage has click, natural typing, selection, drag, and auto-dimming previews, using the package renderer, seeded typing timing, and the same procedural click and Type/Press sound engines as native recording. Audio is synthesized with Web Audio; no sound files are bundled or downloaded. Enable sound to hear the previews; they start muted. Slow, Default, and Fast change typing cadence without speeding up individual sounds. These are visual previews; the accompanying Playwright snippets perform real input. For live effects in your own Playwright session without recording, call installInteractionSounds(page) from bigcursor/recording and dispose the returned controller afterward. createCursor alone does not enable audio.';

export const cursorDimmingNote =
  'In the verified bigcursor 1.0.0 release: dimmedOpacity (0.3 by default) is the cursor level while typing or selecting text. Automatic idle dimming is off by default: autoHideTimeout: 0 disables it. A positive timeout such as 500 starts the 180 ms dimming transition after that many milliseconds without mouse activity. Its target is hiddenOpacity (0 by default, fully transparent). Editing dims immediately and lasts 350 ms after the last key/input; mouse movement or clicking clears it, and held pointers keep their drag/selection feedback. The lower applicable opacity wins, without multiplying effects. All three settings work with createCursor and cursor.configure and survive navigation. hideCursor fully hides pointer artwork until showCursor resumes automatic behavior; manual hiding also survives navigation. The homepage gesture demos disable dimming; a dedicated Auto dimming example opts in.';
