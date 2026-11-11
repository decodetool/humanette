'use client';
import { useState } from 'react';
import { type TypingSpeed } from 'humanette/internal';
import { DemoSoundToggle } from './demo-audio';
import { CodeBlock } from './code-block';
import { ExamplePlayer, type Scene } from './example-player';
const actions: Record<Scene, string> = {
  click: "await human.click(page.getByRole('button', { name: 'Click me' }));",
  text: "await human.selectText(page.getByText('these words', { exact: true }));",
  typing: "await human.type(page.getByLabel('Demo title'), 'Make something great.');",
  dimming:
    "await human.configure({ autoHideTimeout: 500 });\nawait human.moveTo(page.getByText('Pause here', { exact: true }));\nawait human.wait(1400);",
  drag: "await human.drag(\n  page.getByText('Drag me', { exact: true }),\n  page.getByText('Drop here', { exact: true }),\n  { duration: 1400 },\n);",
};
export function Examples() {
  const scale = 4;
  const [speed, setSpeed] = useState<TypingSpeed>('default');
  return (
    <>
      <div className="mt-6 flex justify-center text-center">
        <DemoSoundToggle prominent />
      </div>
      <div className="mt-8 space-y-10">
        {(
          [
            ['click', 'Move and click'],
            ['typing', 'Natural typing'],
            ['text', 'Text selection'],
            ['drag', 'Drag & Drop'],
            ['dimming', 'Auto dimming'],
          ] as const
        ).map(([scene, title]) => (
          <section key={scene} aria-label={title}>
            <h2 className="mb-2 text-center text-2xl font-semibold tracking-tight">{title}</h2>
            {scene === 'typing' && (
              <label className="flex items-center justify-center gap-2 text-sm text-muted">
                Typing speed
                <select
                  aria-label="Typing speed"
                  className="rounded border border-line bg-surface p-1"
                  value={speed}
                  onChange={(e) => setSpeed(e.target.value as TypingSpeed)}
                >
                  <option value="slow">Slow</option>
                  <option value="default">Default</option>
                  <option value="fast">Fast</option>
                </select>
              </label>
            )}
            <ExamplePlayer scene={scene} scale={scale} speed={speed} />
            <div className="mt-1">
              <CodeBlock
                label={`${title} example`}
                code={
                  scene === 'typing' && speed !== 'default'
                    ? `await human.type(page.getByLabel('Demo title'), 'Make something great.', { speed: '${speed}' });`
                    : actions[scene]
                }
              />
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
