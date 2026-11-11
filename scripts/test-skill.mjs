// Opt-in local Claude Code integration test. Requires an authenticated claude CLI.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createWriteStream } from 'node:fs';
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { verifyNativeRecording } from './verify-native-recording.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const options = process.argv.slice(2);
const selected = options.find((arg) => arg.startsWith('--case='))?.slice(7);
const legacy = options.includes('--legacy');
assert.ok(!legacy || selected === 'saved', '--legacy requires --case=saved');
assert.ok(
  !selected || ['one-off', 'saved'].includes(selected),
  'Use --case=one-off or --case=saved',
);
const timeoutMs = Number(process.env.BIGCURSOR_SKILL_TIMEOUT_MS ?? 600_000);
const budget = process.env.BIGCURSOR_SKILL_BUDGET_USD ?? '10';
for (const binary of ['ffmpeg', 'ffprobe']) {
  try {
    execFileSync(binary, ['-version'], { stdio: 'ignore' });
  } catch {
    throw new Error(
      `The local harness needs ${binary} for independent media analysis; consumer recording does not require it.`,
    );
  }
}
const claude = execFileSync('which', ['claude'], { encoding: 'utf8' }).trim();
const cliVersion = execFileSync(claude, ['--version'], { encoding: 'utf8' }).trim();
const suite = await mkdtemp(join(tmpdir(), 'bigcursor-agent-test-'));
const results = resolve(
  root,
  'test-results/skill-harness',
  new Date().toISOString().replaceAll(':', '-'),
);
await mkdir(results, { recursive: true });
console.log(`Local harness: ${cliVersion}. Artifacts: ${results}`);
console.log(`Disposable projects: ${suite}`);
console.log(`Real model calls, up to $${budget} per case; not part of CI or bun check.`);

async function run(command, args, { cwd, env, log } = {}) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: env ?? process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform !== 'win32',
    });
    let stdout = '',
      stderr = '';
    const transcript = log ? createWriteStream(log) : undefined;
    const timer = setTimeout(() => {
      if (process.platform === 'win32') child.kill('SIGTERM');
      else process.kill(-child.pid, 'SIGTERM');
    }, timeoutMs);
    child.stdout.on('data', (data) => {
      stdout += data;
      transcript?.write(data);
    });
    child.stderr.on('data', (data) => {
      stderr += data;
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      transcript?.end();
      reject(error);
    });
    child.on('close', async (code, signal) => {
      clearTimeout(timer);
      try {
        if (transcript) await new Promise((done) => transcript.end(done));
        if (log) await writeFile(log, stdout + (stderr ? `\n${stderr}` : ''));
        assert.equal(
          code,
          0,
          `${command} failed (${signal ?? code}): ${stderr.slice(-2000)}; see ${log ?? 'output'}`,
        );
        resolveRun(stdout);
      } catch (error) {
        reject(error);
      }
    });
  });
}

// Before publication, serve the exact packed release through a disposable registry.
// Claude gets no source checkout or local artifact path; it installs by package name.
const published = options.includes('--published');
let registryUrl = 'https://registry.npmjs.org';
let registry;
let preparedVersion;
if (!published) {
  await run('bun', ['run', '--cwd', 'packages/bigcursor', 'build'], { cwd: root });
  const packed = JSON.parse(
    await run('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', suite], {
      cwd: join(root, 'packages/bigcursor'),
    }),
  )[0];
  const manifest = JSON.parse(
    await readFile(join(root, 'packages/bigcursor/package.json'), 'utf8'),
  );
  preparedVersion = manifest.version;
  const tarball = await readFile(join(suite, packed.filename));
  registry = createServer((req, res) => {
    if (req.url === `/bigcursor/-/${packed.filename}`) {
      res.setHeader('content-type', 'application/octet-stream');
      res.end(tarball);
    } else if (req.url === '/bigcursor' || req.url === `/bigcursor/${manifest.version}`) {
      const version = {
        ...manifest,
        dist: {
          tarball: `${registryUrl}/bigcursor/-/${packed.filename}`,
          integrity: packed.integrity,
          shasum: packed.shasum,
        },
      };
      res.setHeader('content-type', 'application/json');
      res.end(
        JSON.stringify(
          req.url === '/bigcursor'
            ? {
                name: 'bigcursor',
                'dist-tags': { latest: manifest.version },
                versions: { [manifest.version]: version },
              }
            : version,
        ),
      );
    } else {
      res.writeHead(302, { location: `https://registry.npmjs.org${req.url}` });
      res.end();
    }
  });
  await new Promise((done) => registry.listen(0, '127.0.0.1', done));
  registryUrl = `http://127.0.0.1:${registry.address().port}`;
}
console.log(
  published
    ? 'Testing the public npm release.'
    : 'Testing a disposable npm registry serving the packed release; not proof of publication.',
);

// The consuming agent needs Node/npm, not Bigcursor's maintainer build tools.
const bin = join(suite, 'bin');
await mkdir(bin);
for (const name of ['node', 'npm', 'npx']) {
  const executable = execFileSync('which', [name], { encoding: 'utf8' }).trim();
  await symlink(executable, join(bin, name));
}

async function snapshot(folder) {
  const files = {};
  async function visit(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (['.git', '.claude', 'node_modules'].includes(entry.name)) continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await visit(path);
      else
        files[relative(folder, path)] = createHash('sha256')
          .update(await readFile(path))
          .digest('hex');
    }
  }
  await visit(folder);
  return files;
}

async function inside(path, folder) {
  const child = relative(await realpath(folder), await realpath(path));
  return child !== '' && child !== '..' && !child.startsWith('..' + sep) && !isAbsolute(child);
}

const app = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Tasks</title>
<style>body{background:#e9f0e8;color:#203824;font:22px system-ui;margin:100px auto;max-width:640px}h1{font-size:52px}label{display:block;margin:20px 0}input,button{font:inherit;padding:14px}button,label:has(input[type=checkbox]){cursor:pointer}input[type=checkbox]{width:24px;height:24px}input:checked+span{text-decoration:line-through}li{list-style:none;background:white;padding:8px 20px;margin:12px 0}ul{padding:0}</style>
<canvas id="barcode" width="432" height="32" style="position:fixed;top:0;left:0;pointer-events:none"></canvas><h1>My to-do app</h1><form><label for="task">New task</label><input id="task" required><button>Add task</button></form><ul></ul>
<script>
let frame=0;const canvas=document.querySelector('#barcode'),ctx=canvas.getContext('2d');function tick(){frame++;for(let b=0;b<18;b++){ctx.fillStyle=(b===0||(b>1&&((frame>>(17-b))&1)))?'white':'black';ctx.fillRect(b*24,0,24,32)}requestAnimationFrame(tick)}tick();
function chime(hz){const ac=new AudioContext(),o=ac.createOscillator(),g=ac.createGain();o.frequency.value=hz;g.gain.setValueAtTime(.12,ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.5);o.connect(g).connect(ac.destination);o.start();o.stop(ac.currentTime+.5);o.onended=()=>ac.close()}
const send=(url,data)=>fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});
async function render(){const tasks=await(await fetch('/api/tasks')).json();document.querySelector('ul').replaceChildren(...tasks.map(task=>{const li=document.createElement('li');const label=document.createElement('label');const box=document.createElement('input');box.type='checkbox';box.checked=task.done;const text=document.createElement('span');text.textContent=task.title;box.addEventListener('change',async event=>{chime(660);await send('/api/complete',{id:task.id,trusted:event.isTrusted});await render()});label.append(box,text);li.append(label);return li}))}
document.querySelector('form').addEventListener('submit',async event=>{event.preventDefault();chime(440);await send('/api/add',{title:document.querySelector('#task').value,trusted:event.isTrusted});document.querySelector('#task').value='';await render()});
document.addEventListener('pointerdown',event=>send('/api/input',{type:'pointerdown',trusted:event.isTrusted,at:performance.now()}));
document.addEventListener('keydown',event=>send('/api/input',{type:'keydown',trusted:event.isTrusted,at:performance.now()}));render();
document.addEventListener('keyup',event=>send('/api/input',{type:'keyup',trusted:event.isTrusted,at:performance.now()}));
document.addEventListener('input',event=>send('/api/input',{type:'input',trusted:event.isTrusted,inputType:event.inputType??null,at:performance.now()}));
</script></html>`;

try {
  for (const name of ['one-off', 'saved'].filter((name) => !selected || selected === name)) {
    const caseDir = join(suite, name);
    const project = join(caseDir, 'app');
    const output = join(results, name);
    await mkdir(project, { recursive: true });
    await mkdir(output, { recursive: true });
    await writeFile(
      join(project, 'package.json'),
      JSON.stringify(
        {
          name: 'todo-fixture',
          private: true,
          type: 'module',
          scripts: {},
          ...(legacy ? { devDependencies: { 'playwright-core': '1.58.0' } } : {}),
        },
        null,
        2,
      ) + '\n',
    );
    await writeFile(join(project, 'index.html'), app);
    await writeFile(join(project, '.gitignore'), 'node_modules/\n*.tgz\n');
    execFileSync('git', ['init', '-q'], { cwd: project });
    await cp(join(root, 'skills/bigcursor'), join(project, '.claude/skills/bigcursor'), {
      recursive: true,
    });
    const before = await snapshot(project);
    const tasks = [],
      inputs = [];
    let recording;
    const server = createServer(async (req, res) => {
      try {
        if (req.url === '/__recording' && recording) {
          res.setHeader('content-type', 'video/mp4');
          res.end(await readFile(recording));
          return;
        }
        if (req.url === '/__viewer') {
          res.setHeader('content-type', 'text/html');
          res.end('<video src="/__recording" muted></video>');
          return;
        }
        if (req.url === '/api/tasks') {
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify(tasks));
          return;
        }
        if (req.method === 'POST') {
          let body = '';
          for await (const chunk of req) body += chunk;
          const event = JSON.parse(body);
          if (req.url === '/api/add')
            tasks.push({ id: tasks.length + 1, title: event.title, done: false });
          if (req.url === '/api/complete') tasks.find((task) => task.id === event.id).done = true;
          inputs.push({ ...event, route: req.url });
          res.setHeader('content-type', 'application/json');
          res.end('{}');
          return;
        }
        res.setHeader('content-type', 'text/html');
        res.end(app);
      } catch (error) {
        res.statusCode = 500;
        res.end(String(error));
      }
    });
    await new Promise((resolveServer) => server.listen(0, '127.0.0.1', resolveServer));
    const url = `http://127.0.0.1:${server.address().port}`;
    const env = {
      ...process.env,
      PATH: `${bin}:/usr/bin:/bin:/usr/sbin:/sbin`,
      SHELL: '/bin/bash',
      TMPDIR: caseDir,
      npm_config_cache: join(suite, 'npm-cache'),
      npm_config_registry: registryUrl,
      PLAYWRIGHT_BROWSERS_PATH: join(caseDir, 'browsers'),
    };
    delete env.BASH_ENV;
    delete env.CLAUDECODE;
    const schema = {
      type: 'object',
      properties: {
        video: { type: 'string' },
        script: { type: ['string', 'null'] },
        dependencyRoot: { type: 'string' },
      },
      required: ['video', 'script', 'dependencyRoot'],
      additionalProperties: false,
    };
    const request =
      name === 'one-off'
        ? `/bigcursor record a demo of the new UX features in this PR. I only need the video.`
        : `/bigcursor create a product demo of my to-do app. Save a reusable script in this repository and add an npm run demo command.`;
    const prompt = `${request}${preparedVersion ? `\nThis is a release-candidate test. The supplied registry serves bigcursor@${preparedVersion}; use this explicit version instead of the public default in the skill.` : ''}\nThe app is running at ${url}. Show adding "Buy groceries" and marking it complete. Save the finalized video under ${output}. The app's source is index.html.${name === 'saved' ? ' Let the saved command accept DEMO_URL and DEMO_OUT environment variables; the test will provide the app address and output directory when rerunning it.' : ''} Return the final video path, saved script path (null for video-only), and directory from which your demonstration resolves its dependencies.`;
    await writeFile(join(output, 'prompt.txt'), prompt);
    console.log(
      `${name}: starting Claude with no installed app dependencies, no Bun on PATH, and a fresh browser cache.`,
    );
    try {
      const tools = 'Bash,Read,Write,Edit,Glob,Grep,Skill';
      const stdout = await run(
        claude,
        [
          '--print',
          '--verbose',
          '--output-format',
          'stream-json',
          '--json-schema',
          JSON.stringify(schema),
          '--no-session-persistence',
          '--no-chrome',
          '--setting-sources',
          'project',
          '--strict-mcp-config',
          '--mcp-config',
          '{"mcpServers":{}}',
          '--settings',
          '{"disableAllHooks":true}',
          '--permission-mode',
          'dontAsk',
          '--tools',
          tools,
          '--allowedTools',
          tools,
          '--max-budget-usd',
          budget,
          '--append-system-prompt',
          `This is an authorized local demo test. Use the supplied local app and install packages using the configured npm registry. Scope task writes to ${caseDir} and ${output}; npm caches may use ${suite}. The browser cache is fixed at ${env.PLAYWRIGHT_BROWSERS_PATH}: keep PLAYWRIGHT_BROWSERS_PATH unchanged in every command, including install, recording and media checks. Do not install global packages, modify shell profiles, use sudo, publish, deploy, access credentials, or send messages. Retain task workspaces for independent inspection; the test runner handles cleanup.`,
          prompt,
        ],
        { cwd: project, env, log: join(output, 'claude.jsonl') },
      );
      const events = stdout
        .split('\n')
        .filter(Boolean)
        .flatMap((line) => {
          try {
            return [JSON.parse(line)];
          } catch {
            return [];
          }
        });
      const result = events.findLast((event) => event.type === 'result');
      assert.ok(
        result && !result.is_error,
        `Claude did not finish successfully: ${result?.subtype}`,
      );
      const report = result.structured_output;
      assert.ok(report, 'Claude did not provide its structured artifact paths');
      await writeFile(join(output, 'agent-result.json'), JSON.stringify(result, null, 2));
      await writeFile(
        join(output, 'app-observations.json'),
        JSON.stringify({ tasks, inputs, report }, null, 2),
      );
      assert.ok(
        events.some((event) => event.type === 'system' && event.skills?.includes('bigcursor')) ||
          events.some((event) =>
            event.message?.content?.some(
              (part) => part.name === 'Skill' && part.input?.skill === 'bigcursor',
            ),
          ),
        'Bigcursor skill was not discovered/invoked',
      );
      recording = resolve(project, report.video);
      assert.ok(await inside(recording, output), 'Final video must be outside disposable tools');
      assert.ok((await stat(recording)).size > 1000, 'Video is missing or empty');
      assert.ok(
        tasks.some((task) => task.title === 'Buy groceries' && task.done),
        'Real app task was not completed',
      );
      assert.ok(
        inputs.some((input) => input.type === 'pointerdown' && input.trusted),
        'No trusted pointer input reached the app',
      );
      assert.ok(
        inputs.some((input) => ['input', 'keydown'].includes(input.type) && input.trusted),
        'No trusted text input reached the app',
      );
      assert.ok(
        inputs.filter((input) => input.type === 'keydown' && input.trusted).length >= 10,
        'Natural typing must produce actual key presses, not fixed-rate insertText only',
      );
      const typed = inputs.filter(
        (input) => input.type === 'input' && input.inputType === 'insertText' && input.trusted,
      );
      const gaps = typed.slice(1).map((event, i) => event.at - typed[i].at);
      assert.ok(
        new Set(gaps.map((gap) => Math.round(gap / 5))).size >= 4,
        'Actual typing cadence is too uniform',
      );
      if (name === 'one-off') {
        assert.deepEqual(
          await snapshot(project),
          before,
          'Video-only request changed the application repo',
        );
        assert.equal(
          report.script,
          null,
          'Video-only request should not leave a saved project script',
        );
        assert.ok(
          (await inside(report.dependencyRoot, caseDir)) &&
            !(await inside(report.dependencyRoot, project)),
          'One-off dependencies belong in the temporary workspace',
        );
      } else {
        const manifest = JSON.parse(await readFile(join(project, 'package.json'), 'utf8'));
        if (legacy) {
          assert.equal(
            manifest.devDependencies['playwright-core'],
            '1.58.0',
            'Existing Playwright must be preserved',
          );
          assert.ok(
            manifest.devDependencies['bigcursor-browser'],
            'Old app needs a separate recording browser',
          );
        }
        assert.ok(manifest.scripts.demo, 'Saved demo is missing npm run demo');
        assert.ok(
          !manifest.devDependencies?.bigcursor?.startsWith('file:'),
          'Bigcursor must be a registry dependency',
        );
        assert.ok(
          manifest.devDependencies?.bigcursor &&
            manifest.devDependencies?.['chrome-capture'] &&
            (manifest.devDependencies?.playwright ||
              manifest.devDependencies?.['@playwright/test'] ||
              manifest.devDependencies?.['playwright-core']),
          'Missing repository recording development dependencies',
        );
        const script = resolve(project, report.script);
        assert.ok(await inside(script, project), 'Reusable script must be saved in the app repo');
        assert.equal(
          await realpath(report.dependencyRoot),
          await realpath(project),
          'Saved script must resolve repository dependencies',
        );
        const saved = await readFile(script, 'utf8');
        assert.ok(
          saved.includes('createCursor'),
          'Saved script does not use the real Bigcursor API',
        );
        for (const file of ['package.json', 'package-lock.json', relative(project, script)]) {
          const text = await readFile(join(project, file), 'utf8');
          assert.ok(
            !text.includes(suite) && !text.includes(root) && !text.includes('/tmp/'),
            `${file} refers to temporary or host-specific paths`,
          );
        }
      }
      const media = verifyNativeRecording(recording, { barcode: true, appTones: [440, 660] });
      await writeFile(join(output, 'native-media.json'), JSON.stringify(media, null, 2));
      const require = createRequire(join(resolve(report.dependencyRoot), 'package.json'));
      const installedManifest = require('bigcursor/package.json');
      assert.ok(
        installedManifest.exports['./recording'],
        'Installed package lacks its recording API',
      );
      if (name === 'saved') {
        const source = await readFile(resolve(project, report.script), 'utf8');
        assert.ok(
          source.includes('bigcursor/recording'),
          'Saved flow must use the package recorder',
        );
        assert.ok(
          !source.includes('withNaturalTyping'),
          'Typing belongs in createCursor, not a copied wrapper',
        );
      }
      const moduleName = [
        'bigcursor-browser',
        'playwright',
        '@playwright/test',
        'playwright-core',
      ].find((name) => {
        try {
          require.resolve(name);
          return true;
        } catch {
          return false;
        }
      });
      assert.ok(moduleName, 'Agent did not install a usable Playwright runtime');
      process.env.PLAYWRIGHT_BROWSERS_PATH = env.PLAYWRIGHT_BROWSERS_PATH;
      const { chromium } = require(moduleName);
      const executablePath = chromium.executablePath();
      assert.ok(
        executablePath.startsWith(caseDir + sep),
        'Fresh matching browser was not installed in the requested cache',
      );
      const browser = await chromium.launch({ executablePath, channel: 'chromium' });
      try {
        const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
        // Inline the small clip so seeks don't depend on HTTP Range support.
        const videoData = (await readFile(recording)).toString('base64');
        await page.setContent('<video muted></video>');
        const decoded = await page.locator('video').evaluate(async (video, source) => {
          await new Promise((resolveVideo, reject) => {
            video.onloadeddata = resolveVideo;
            video.onerror = () => reject(new Error('Could not decode recording'));
            video.src = source;
            video.load();
          });
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const context = canvas.getContext('2d');
          const hashes = [];
          for (const fraction of [0.1, 0.3, 0.5, 0.7, 0.9]) {
            await new Promise((resolveSeek) => {
              video.onseeked = resolveSeek;
              video.currentTime = video.duration * fraction;
            });
            context.drawImage(video, 0, 0);
            const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
            let hash = 0;
            for (let i = 0; i < pixels.length; i += 64) hash = (hash * 31 + pixels[i]) >>> 0;
            hashes.push(hash);
          }
          video.style.width = '100%';
          return {
            duration: video.duration,
            width: video.videoWidth,
            height: video.videoHeight,
            distinctSamples: new Set(hashes).size,
          };
        }, `data:video/mp4;base64,${videoData}`);
        await page.screenshot({ path: join(output, 'recording-frame.png') });
        await writeFile(
          join(output, 'verification.json'),
          JSON.stringify({ decoded, media, tasks, inputs, report }, null, 2),
        );
        assert.ok(
          decoded.duration >= 1 && decoded.width > 0 && decoded.distinctSamples >= 3,
          'Recording did not decode into changing source images',
        );
      } finally {
        await browser.close();
      }
      if (name === 'saved') {
        // A fresh install must work without any build copy or existing node_modules.
        for (const entry of await readdir(caseDir))
          if (!['app', 'browsers'].includes(entry))
            await rm(join(caseDir, entry), { recursive: true, force: true });
        await rm(join(project, 'node_modules'), { recursive: true, force: true });
        await run('npm', ['ci', '--no-audit', '--no-fund'], {
          cwd: project,
          env,
          log: join(output, 'fresh-install.log'),
        });
        tasks.length = 0;
        inputs.length = 0;
        await run('npm', ['run', 'demo'], {
          cwd: project,
          env: { ...env, DEMO_URL: url, DEMO_OUT: join(output, 'rerun') },
          log: join(output, 'rerun.log'),
        });
        assert.ok(
          tasks.some((task) => task.title === 'Buy groceries' && task.done),
          'Saved command failed after removing temporary setup and reinstalling dependencies',
        );
        const rerunDir = join(output, 'rerun');
        async function findVideos(dir) {
          const files = [];
          for (const entry of await readdir(dir, { withFileTypes: true })) {
            const path = join(dir, entry.name);
            if (entry.isDirectory()) files.push(...(await findVideos(path)));
            else if (entry.name.endsWith('.mp4')) files.push(path);
          }
          return files;
        }
        const rerunVideos = await findVideos(rerunDir);
        assert.ok(rerunVideos.length, 'Rerun produced no finalized MP4');
        const rerunMedia = verifyNativeRecording(rerunVideos[0], {
          barcode: true,
          appTones: [440, 660],
        });
        await writeFile(join(output, 'rerun-media.json'), JSON.stringify(rerunMedia, null, 2));
      }
      console.log(
        `${name}: PASS — real input, decoded high-frame-rate AV1/Opus with app tones, dependency placement${name === 'saved' ? ', fresh-install rerun' : ', unchanged app repo'}.`,
      );
    } catch (error) {
      console.error(`${name}: FAIL. Preserved workspace: ${caseDir}. Artifacts: ${output}`);
      throw error;
    } finally {
      await new Promise((resolveClose) => server.close(resolveClose));
    }
  }
  console.log(`Skill harness passed. Workspaces retained for inspection: ${suite}`);
} finally {
  if (registry) await new Promise((done) => registry.close(done));
}
