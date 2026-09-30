'use client';
import { CodeBlock } from './code-block';
import { ExamplePlayer, type Scene } from './example-player';
const actions: Record<Scene, string> = {
  click: "await human.click(page.getByRole('button', { name: 'Click me' }));",
  text: "await human.selectText(page.getByText('these words', { exact: true }));",
  drag: "await human.drag(\n  page.getByText('Drag me', { exact: true }),\n  page.getByText('Drop here', { exact: true }),\n  { duration: 1400 },\n);",
};
export function Examples() {
  const scale = 4;
  return (
    <>
      <div className="mt-8 space-y-10">
        {(
          [
            ['click', 'Move and click'],
            ['text', 'Text selection'],
            ['drag', 'Drag & Drop'],
          ] as const
        ).map(([scene, title]) => (
          <section key={scene} aria-label={title}>
            <h2 className="mb-2 text-2xl font-semibold tracking-tight">{title}</h2>
            <ExamplePlayer scene={scene} scale={scale} />
            <div className="mt-1">
              <CodeBlock
                label={`${title} example`}
                code={`import { chromium } from 'playwright';\nimport { createHuman } from 'humanette';\n\nconst browser = await chromium.launch({ headless: false });\ntry {\n  const page = await browser.newPage();\n  // Replace this URL and the locator below with your app's.\n  await page.goto('https://your-app.example');\n\n  const human = await createHuman(page, { scale: ${scale} });\n${actions[
                  scene
                ]
                  .split('\n')
                  .map((line) => '  ' + line)
                  .join('\n')}\n  await human.dispose();\n} finally {\n  await browser.close();\n}`}
              />
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
