// Copy into the chosen temporary workspace or project, install dependencies, then run:
// node record-todo.mjs [output-directory]
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { createHuman } from 'humanette';

const output = resolve(process.argv[2] ?? 'out');
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: output, size: { width: 1280, height: 800 } },
  });
  const page = await context.newPage();
  const video = page.video();
  try {
    await page.setContent(`<!doctype html>
      <html lang="en"><head><meta charset="utf-8"><title>My day</title>
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; background: #f6f4ef; color: #262522; font: 22px system-ui; }
        main { width: 640px; margin: 160px auto; }
        h1 { font-size: 56px; letter-spacing: -2px; margin: 0 0 16px; }
        p { color: #6e6b63; margin-bottom: 36px; }
        label { display: block; margin-bottom: 12px; }
        form { display: flex; gap: 12px; }
        input[type="text"] { flex: 1; min-width: 0; padding: 16px; font: inherit;
          border: 1px solid #c8c5bd; border-radius: 8px; }
        button { padding: 16px 24px; font: inherit; border: 0; border-radius: 8px;
          background: #a74528; color: white; cursor: pointer; }
        ul { padding: 0; list-style: none; }
        li label { display: flex; align-items: center; gap: 16px; padding: 20px;
          background: white; border-radius: 8px; cursor: pointer; }
        input[type="checkbox"] { width: 24px; height: 24px; accent-color: #a74528; cursor: pointer; }
        input:checked + span { text-decoration: line-through; color: #6e6b63; }
      </style></head><body><main>
      <h1>My day</h1><p>A little space for the things you want to get done.</p>
      <label for="task">New task</label>
      <form><input id="task" type="text" placeholder="What needs doing?" required>
        <button>Add task</button></form><ul aria-label="Tasks"></ul>
      </main><script>
        document.querySelector('form').addEventListener('submit', (event) => {
          event.preventDefault();
          const input = document.querySelector('#task');
          const text = input.value.trim();
          if (!text) return;
          const item = document.createElement('li');
          const label = document.createElement('label');
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          const title = document.createElement('span');
          title.textContent = text;
          label.append(checkbox, title);
          item.append(label);
          document.querySelector('ul').append(item);
          input.value = '';
        });
      </script></body></html>`);
    const human = await createHuman(page, { scale: 4, seed: 42 });
    try {
      await human.wait(500);
      await human.type(page.getByLabel('New task'), 'Buy groceries');
      await human.click(page.getByRole('button', { name: 'Add task' }));
      const task = page.getByRole('checkbox', { name: 'Buy groceries' });
      await task.waitFor();
      assert.equal(await task.isChecked(), false);
      await human.wait(500);
      await human.click(task);
      assert.equal(await task.isChecked(), true, 'The task should be complete');
      await human.wait(900);
      await page.screenshot({ path: resolve(output, 'todo-demo.png') });
    } finally {
      await human.dispose();
    }
  } finally {
    await context.close();
  }
  const filename = resolve(output, 'todo-demo.webm');
  await video.saveAs(filename);
  await video.delete();
  console.log(`Recorded ${filename}; verified that Buy groceries was added and completed.`);
} finally {
  await browser.close();
}
