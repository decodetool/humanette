// Shared by the HTML docs and their agent-readable Markdown representation.
export const setup = `import { chromium } from 'playwright';
import { createHuman } from 'humanette';

const browser = await chromium.launch({ headless: false });
try {
  const page = await browser.newPage();
  await page.goto('http://localhost:3000'); // Your app
  const human = await createHuman(page, { scale: 4 });

  try {
    await human.click(page.getByRole('button', { name: 'Save' }));
    await human.type(page.getByLabel('Title'), 'Start', { selectAll: true });
    await human.selectText(page.getByText('Select these words.'));
    await human.drag(page.getByTestId('card'), page.getByTestId('drop'));
  } finally {
    await human.dispose();
  }
} finally {
  await browser.close();
}`;
export const recording = `import { chromium } from 'playwright';
import { createHuman } from 'humanette';

const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    recordVideo: {
      dir: 'out',
      size: { width: 1280, height: 800 },
    },
  });
  const page = await context.newPage();
  const video = page.video()!;
  try {
    await page.goto('http://localhost:3000');
    await page.getByRole('button', { name: 'Save' }).waitFor();
    const human = await createHuman(page, { scale: 4, seed: 42 });
    try {
      await human.click(page.getByRole('button', { name: 'Save' }));
      await human.wait(600); // Brief hold on the result
    } finally {
      await human.dispose();
    }
  } finally {
    await context.close(); // Finalize the video before saving
  }
  await video.saveAs('out/demo.webm');
  await video.delete(); // Remove Playwright’s generated filename
} finally {
  await browser.close();
}`;
export const api = [
  [
    'createHuman(page, options?)',
    'Attach to your existing Playwright page. Options include scale (cursor size), seed (repeatable paths), settle (aim pause, 120 ms by default), and fps (input sampling target, not recording FPS).',
  ],
  [
    'human.click(target, { duration?, signal? })',
    'Move to the target, slow down on approach, pause to aim, then send real mouse down/up.',
  ],
  [
    'human.moveTo(target, { duration?, signal? })',
    'Move without clicking. A locator resolves to its center after scrolling into view. Coordinates are CSS pixels relative to the main viewport.',
  ],
  [
    'human.selectText(locator, { duration?, signal? })',
    'Drag from the first visible text line to the last. Accepts a locator or selector for ordinary selectable text, including nested spans and wrapped lines. For inputs, use type with selectAll or a keyboard shortcut.',
  ],
  [
    'human.drag(from, to, { duration?, signal? })',
    'Move to the source, hold the mouse, drag to the destination, then release. Sources and destinations may be locators, selectors, or coordinates. The mouse is released even when the drag is cancelled.',
  ],
  [
    'human.type(target, text, { delay?, selectAll?, signal? })',
    'Click the target and insert text through Playwright keyboard input. Set selectAll to replace existing contents. Delay is per character in milliseconds.',
  ],
  [
    'human.press(key)',
    'Send a Playwright keyboard shortcut, for example ControlOrMeta+A or Shift+2.',
  ],
  [
    'human.wait(milliseconds, signal?)',
    'Add a short presentation pause. Use Playwright assertions or locator waits for application readiness.',
  ],
  [
    'human.configure(appearance)',
    'Change cursor size and feedback while the script is running. For example, await human.configure({ scale: 4, textSelectionOpacity: 0.4 }).',
  ],
  [
    'human.dispose()',
    'Remove the cursor overlay and its listeners. Await any running action before cleanup. Your Playwright page stays open.',
  ],
];
