import { mkdtemp, writeFile, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
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
    'playwright-core@1.64.0-alpha-2026-09-28',
    '@types/node@22',
  ],
  { cwd: scratch, stdio: 'pipe' },
);
await writeFile(
  join(scratch, 'consumer.mjs'),
  "import {cursors,createHumanette} from 'humanette/internal'; import {humanPoint} from 'humanette/motion'; import {createHuman} from 'humanette'; if(!cursors.default.src.startsWith('data:')||typeof createHuman!=='function'||typeof createHumanette!=='function'||humanPoint({x:0,y:0},{x:2,y:3},1).x!==2)throw Error('consumer failed'); console.log('Fresh npm consumer: runtime imports and embedded assets OK');",
);
execFileSync(process.execPath, ['consumer.mjs'], { cwd: scratch, stdio: 'inherit' });
await writeFile(
  join(scratch, 'consumer.ts'),
  "import {createHumanette,type TimelineEvent} from 'humanette/internal'; import {createHuman} from 'humanette'; import type {Page} from 'playwright-core'; const events:TimelineEvent[]=[{at:0,type:'move',x:1,y:2,duration:300}]; const make=async(page:Page)=>{const h=await createHuman(page);await h.click('#save');}; const pointer=()=>createHumanette({scale:2.5}).play(events);",
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
console.log(
  'Tarball verified: ' +
    packed.filename +
    ' (' +
    packed.size +
    ' bytes), 35 SVGs, browser bundle, declarations, licenses. Temp consumer: ' +
    scratch,
);
