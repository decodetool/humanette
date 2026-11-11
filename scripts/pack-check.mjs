import { mkdtemp, writeFile, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { verifyNativeRecording } from './verify-native-recording.mjs';
const root = resolve(import.meta.dirname, '..');
const scratch = await mkdtemp(join(tmpdir(), 'humanette-consumer-'));
const packed = JSON.parse(
  execFileSync('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', scratch], {
    cwd: join(root, 'packages/humanette'),
    encoding: 'utf8',
  }),
)[0];
const files = packed.files.map((f) => f.path);
for (const file of [
  'dist/index.js',
  'dist/index.d.ts',
  'dist/playwright.js',
  'dist/playwright.d.ts',
  'dist/recording.js',
  'dist/recording.d.ts',
  'dist/typing.d.ts',
  'dist/humanette.global.js',
  'dist/assets/default.svg',
  'LICENSE',
  'LICENSE-APACHE-2.0',
  'NOTICE.md',
])
  assert.ok(files.includes(file), file + ' missing from tarball');
assert.equal(files.filter((p) => p.endsWith('.svg')).length, 35);
assert.ok(
  !files.some((p) => p.startsWith('apps/') || p.includes('.env') || p.includes('node_modules')),
);
await writeFile(join(scratch, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
execFileSync(
  'npm',
  [
    'install',
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    join(scratch, packed.filename),
    'playwright-core@1.65.0',
    '@types/node@22',
  ],
  { cwd: scratch, stdio: 'pipe' },
);
await writeFile(
  join(scratch, 'consumer.mjs'),
  "import assert from 'node:assert/strict'; import {cursors,createHumanette,createPreviewAudio,typingPlan as previewTypingPlan} from 'humanette/internal'; import {humanPoint} from 'humanette/motion'; import {createHuman,typingSpeeds,typingPlan} from 'humanette'; import {startRecording,launchForPreset,installInteractionSounds} from 'humanette/recording'; if(!cursors.default.src.startsWith('data:')||typeof createHuman!=='function'||typeof createHumanette!=='function'||humanPoint({x:0,y:0},{x:2,y:3},1).x!==2)throw Error('consumer failed'); assert.equal(typeof createPreviewAudio,'function');assert.deepEqual(previewTypingPlan('Hi'),typingPlan('Hi'));assert.deepEqual(typingSpeeds,{slow:3,default:6,fast:8});assert.equal(typingPlan('Hi 👩‍💻!').map(s=>s.text).join(''),'Hi 👩‍💻!');assert.equal(typeof launchForPreset,'function');assert.equal(typeof installInteractionSounds,'function');await assert.rejects(startRecording(null),/optional chrome-capture|Node.js 24.11/); console.log('Fresh npm consumer: root/recording imports, natural typing, optional dependency boundary, and embedded assets OK');",
);
execFileSync(process.execPath, ['consumer.mjs'], { cwd: scratch, stdio: 'inherit' });
await writeFile(
  join(scratch, 'consumer.ts'),
  "import {createHumanette,type TimelineEvent} from 'humanette/internal'; import {createHuman,typingPlan,type TypingSpeed} from 'humanette'; import {startRecording,type RecordingStats} from 'humanette/recording'; import type {Page} from 'playwright-core'; const events:TimelineEvent[]=[{at:0,type:'move',x:1,y:2,duration:300}]; const speed:TypingSpeed='fast';const make=async(page:Page)=>{const h=await createHuman(page,{typing:{speed},autoHideTimeout:500,hiddenOpacity:0.5,dimmedOpacity:0.3});await h.configure({autoHideTimeout:0});await h.hideCursor();await h.showCursor();await h.click('#save');await h.type('#message','Hi',{speed:'slow',pace:4});const r=await startRecording(page,'vertical',{sounds:{volume:0.1}});const stats:RecordingStats=await r.stop('out/demo.mp4');}; const pointer=()=>createHumanette({scale:2.5}).play(events);",
);
execFileSync(
  process.execPath,
  [
    join(root, 'node_modules/typescript/bin/tsc'),
    '--noEmit',
    '--strict',
    '--skipLibCheck',
    '--target',
    'ES2022',
    '--module',
    'NodeNext',
    '--moduleResolution',
    'NodeNext',
    'consumer.ts',
  ],
  { cwd: scratch, stdio: 'inherit' },
);
const source = await readFile(join(scratch, 'node_modules/humanette/dist/index.js'), 'utf8');
assert.ok(!source.includes('/Users/'), 'No machine-specific asset paths');
const notices = await readFile(join(scratch, 'node_modules/humanette/NOTICE.md'), 'utf8');
assert.ok(
  notices.includes('Daniel Belyi') && notices.includes('heydryft'),
  'Adapted MIT source notices must ship',
);
console.log(
  'Tarball verified: ' +
    packed.filename +
    ' (' +
    packed.size +
    ' bytes), 35 SVGs, browser bundle, declarations, licenses. Temp consumer: ' +
    scratch,
);

if (process.argv.includes('--record')) {
  const output = join(root, 'test-results/package-consumer', String(Date.now()));
  const env = {
    ...process.env,
    PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH ?? join(scratch, 'browsers'),
  };
  execFileSync('npm', ['install', '--no-audit', '--no-fund', 'chrome-capture@0.1.2'], {
    cwd: scratch,
    env,
    stdio: 'pipe',
  });
  execFileSync(process.execPath, ['node_modules/playwright-core/cli.js', 'install', 'chromium'], {
    cwd: scratch,
    env,
    stdio: 'inherit',
  });
  // The example is only app flow/assertions; all runtime behavior resolves from
  // the installed npm tarball. No source checkout or copied runtime helpers.
  const demo = (
    await readFile(join(root, 'skills/humanette/scripts/record-todo.mjs'), 'utf8')
  ).replace("from 'playwright'", "from 'playwright-core'");
  await writeFile(join(scratch, 'demo.mjs'), demo);
  for (const take of ['initial', 'fresh-install']) {
    if (take === 'fresh-install')
      execFileSync('npm', ['ci', '--no-audit', '--no-fund'], { cwd: scratch, env, stdio: 'pipe' });
    const out = join(output, take);
    execFileSync(process.execPath, ['demo.mjs', out], { cwd: scratch, env, stdio: 'inherit' });
    const media = verifyNativeRecording(join(out, 'todo-demo.mp4'));
    await writeFile(join(out, 'media.json'), JSON.stringify(media, null, 2));
  }
  console.log(`Fresh package recording and npm-ci rerun passed. Artifacts: ${output}`);
}
