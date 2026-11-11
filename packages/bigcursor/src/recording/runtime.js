// Native recording implementation owned by bigcursor/recording.
// Native Chrome 153+ AV1/Opus MP4 capture: no JPEG pipe, ffmpeg, extension, or audio driver.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { installInteractionSounds } from './interaction-sounds.js';

export const PRESETS = {
  youtube: { viewport: { width: 1280, height: 720 }, dpr: 2, fps: 60 },
  x: { viewport: { width: 1280, height: 720 }, dpr: 1.5, fps: 60 },
  vertical: { viewport: { width: 540, height: 960 }, dpr: 2, fps: 60 },
  archive: { viewport: { width: 1280, height: 800 }, dpr: 2, fps: 60 },
};
const ownedContexts = new WeakSet();

// Chrome can retain the cursor's animated damage region for ~250ms and miss
// subsequent text-only paints. Keep full-surface damage consistent during
// interaction without visible pixels or an idle animation loop.
export async function installCaptureRefresh(page) {
  const token = crypto.randomUUID();
  let disposed = false;
  async function install(frame) {
    if (disposed) return;
    await frame.evaluate((token) => {
      const key = '__bigcursorCaptureRefresh';
      window[key]?.dispose();
      const main = window === window.top;
      const canvas = main ? document.createElement('canvas') : null;
      const ctx = canvas?.getContext('2d');
      let raf = 0,
        until = 0,
        frames = 0,
        events = 0,
        removed = false;
      if (canvas) {
        canvas.setAttribute('aria-hidden', 'true');
        canvas.inert = true;
        Object.assign(canvas.style, {
          position: 'fixed',
          inset: '0',
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: '2147483640',
        });
        document.documentElement.append(canvas);
      }
      function draw() {
        raf = 0;
        if (removed || !ctx) return;
        const width = Math.ceil(innerWidth * devicePixelRatio);
        const height = Math.ceil(innerHeight * devicePixelRatio);
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }
        ctx.clearRect(0, 0, width, height);
        if (performance.now() < until) {
          // Both alphas quantize to transparent in the capture's pixel format.
          // Drawing still invalidates the canvas's full compositor surface.
          ctx.fillStyle = `rgba(0,0,0,${++frames % 2 ? 0.0001 : 0.0002})`;
          ctx.fillRect(0, 0, width, height);
          raf = requestAnimationFrame(draw);
        }
      }
      function activate() {
        if (removed) return;
        events++;
        if (!main) {
          window.top.postMessage({ key, token }, '*');
          return;
        }
        until = performance.now() + 350;
        if (!raf) raf = requestAnimationFrame(draw);
      }
      const input = (event) => {
        if (event.isTrusted) activate();
      };
      const message = (event) => {
        if (event.data?.key === key && event.data?.token === token) activate();
      };
      const types = ['pointermove', 'pointerdown', 'pointerup', 'keydown', 'keyup', 'input'];
      for (const type of types) document.addEventListener(type, input, true);
      if (main) window.addEventListener('message', message);
      const api = {
        token,
        stats: () => ({ frames, events, active: Boolean(raf) }),
        dispose() {
          if (removed) return;
          removed = true;
          cancelAnimationFrame(raf);
          raf = 0;
          for (const type of types) document.removeEventListener(type, input, true);
          window.removeEventListener('message', message);
          canvas?.remove();
          if (window[key] === api) delete window[key];
        },
      };
      window[key] = api;
    }, token);
  }
  const navigated = (frame) => {
    void install(frame).catch(() => {});
  };
  const dispose = async () => {
    disposed = true;
    page.off('framenavigated', navigated);
    await Promise.all(
      page.frames().map((frame) =>
        frame
          .evaluate((token) => {
            const refresh = window.__bigcursorCaptureRefresh;
            if (refresh?.token === token) refresh.dispose();
          }, token)
          .catch(() => {}),
      ),
    );
  };
  page.on('framenavigated', navigated);
  try {
    await Promise.all(page.frames().map(install));
  } catch (error) {
    await dispose();
    throw error;
  }
  return {
    stats: () => page.evaluate(() => window.__bigcursorCaptureRefresh?.stats()),
    dispose,
  };
}

export function resolvePreset(name = 'archive', overrides = {}) {
  const base = typeof name === 'string' ? PRESETS[name] : name;
  if (!base) throw new Error(`Unknown preset: ${name}`);
  const preset = { ...base, ...overrides };
  const { viewport, dpr, fps } = preset;
  if (
    !viewport ||
    ![viewport.width, viewport.height].every((n) => Number.isInteger(n) && n > 0) ||
    !Number.isFinite(dpr) ||
    dpr <= 0 ||
    !Number.isFinite(fps) ||
    fps < 1 ||
    fps > 120
  )
    throw new RangeError('Use positive viewport dimensions/DPR and fps 1–120.');
  preset.frame = {
    width: Math.round(viewport.width * dpr),
    height: Math.round(viewport.height * dpr),
  };
  return preset;
}

/** @param {import('../recording.js').RecordingPresetName | import('../recording.js').RecordingPreset} [name] */
export async function launchForPreset(
  chromium,
  name = 'archive',
  { launch = {}, context = {} } = {},
) {
  const preset = resolvePreset(name);
  // This optional browser-only alias lets an older app keep its existing Playwright.
  if (!launch.executablePath) {
    try {
      chromium = (await import('bigcursor-browser')).chromium;
    } catch (error) {
      if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
    }
  }
  const browser = await chromium.launch({
    ...launch,
    channel: launch.channel ?? 'chromium',
    ignoreDefaultArgs: [
      ...new Set([
        ...(Array.isArray(launch.ignoreDefaultArgs) ? launch.ignoreDefaultArgs : []),
        '--mute-audio',
      ]),
    ],
    args: [
      ...(launch.args ?? []),
      `--force-device-scale-factor=${preset.dpr}`,
      '--autoplay-policy=no-user-gesture-required',
    ],
  });
  try {
    if (Number(browser.version().split('.')[0]) < 153)
      throw new Error(
        'Native recording requires Chrome 153+. Install a current recording browser; preserve the app’s existing Playwright version.',
      );
    const ctx = await browser.newContext({
      ...context,
      viewport: preset.viewport,
      deviceScaleFactor: preset.dpr,
    });
    ownedContexts.add(ctx);
    return { browser, context: ctx, preset };
  } catch (error) {
    await browser.close();
    throw error;
  }
}

/** @param {import('../recording.js').RecordingPresetName | import('../recording.js').RecordingPreset} [name] */
export async function startRecording(page, name = 'archive', overrides = {}) {
  const { audio = true, sounds = true, captureRefresh = true, ...appearance } = overrides;
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 24 || (major === 24 && minor < 11))
    throw new Error('Bigcursor recording requires Node.js 24.11 or newer.');
  const { startRecording: capture } = await import('chrome-capture').catch((error) => {
    if (error.code === 'ERR_MODULE_NOT_FOUND')
      throw new Error(
        'Recording requires the optional chrome-capture@0.1.2 dependency. Install it in your project.',
        { cause: error },
      );
    throw error;
  });
  const preset = resolvePreset(name, appearance);
  const cdp = await page.context().newCDPSession(page);
  let soundController, refreshController, active;
  try {
    if (ownedContexts.has(page.context())) {
      const { windowId } = await cdp.send('Browser.getWindowForTarget');
      // Size real contents: Chrome accounts for borders and toolbars across platforms.
      await cdp.send('Browser.setContentsSize', { windowId, ...preset.viewport });
    }
    if (captureRefresh) refreshController = await installCaptureRefresh(page);
    if (sounds)
      soundController = await installInteractionSounds(page, sounds === true ? {} : sounds);
    active = await capture(cdp, {
      frameRate: preset.fps,
      maxWidth: preset.frame.width,
      maxHeight: preset.frame.height,
      captureArea: 'target',
      audio,
    });
  } catch (error) {
    await soundController?.dispose();
    await refreshController?.dispose();
    await cdp.detach().catch(() => {});
    throw new Error(`Native recording could not start: ${error.message}`, { cause: error });
  }
  const started = performance.now();
  let stopped;
  return {
    preset,
    stop(outputPath) {
      if (!outputPath) return Promise.reject(new Error('Choose a durable output MP4 path.'));
      stopped ??= (async () => {
        const takeMs = performance.now() - started;
        const stopStarted = performance.now();
        let bytes, interactionSounds, captureRefreshStats;
        try {
          bytes = await active.stop();
          interactionSounds = await soundController?.stats();
          captureRefreshStats = await refreshController?.stats();
        } finally {
          await soundController?.dispose();
          await refreshController?.dispose();
          await cdp.detach().catch(() => {});
        }
        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, bytes);
        const media = inspectMp4(bytes);
        const warnings = [];
        if (!ownedContexts.has(page.context()))
          warnings.push(
            'Attached browser preserved: native source pixel dimensions are unverified; encoded dimensions alone can include scaling or padding.',
          );
        if (media.width !== preset.frame.width || media.height !== preset.frame.height)
          warnings.push(
            `Captured ${media.width}×${media.height}; requested ${preset.frame.width}×${preset.frame.height}. Inspect native sizing before delivery.`,
          );
        if (audio && !media.audio) warnings.push('The MP4 has no audio track.');
        if (
          interactionSounds?.some(
            (s) => s.errors || (s.clicks + s.keys > 0 && s.state !== 'running'),
          )
        )
          warnings.push(
            'Some interaction sounds could not play; inspect browser audio permissions.',
          );
        return {
          output: outputPath,
          ...media,
          requestedFps: preset.fps,
          expectedSourceSize: preset.frame,
          sourceSize: ownedContexts.has(page.context())
            ? { width: media.width, height: media.height }
            : null,
          encodedSize: { width: media.width, height: media.height },
          interactionSounds,
          captureRefresh: captureRefreshStats,
          takeMs: Math.round(takeMs),
          stopMs: Math.round(performance.now() - stopStarted),
          warning: warnings.length ? warnings.join(' ') : undefined,
          // Encoded counts cannot establish distinct visual FPS; decode output to verify motion.
        };
      })();
      return stopped;
    },
  };
}

// Read native MP4 headers and fragment sample counts without ffmpeg or another dependency.
export function inspectMp4(bytes) {
  function boxes(start, end) {
    const result = [];
    for (let at = start; at + 8 <= end;) {
      const small = bytes.readUInt32BE(at),
        header = small === 1 ? 16 : 8;
      if (at + header > end) throw new Error('Truncated MP4 box.');
      const size = small === 1 ? Number(bytes.readBigUInt64BE(at + 8)) : small || end - at;
      if (size < header || at + size > end) throw new Error('Invalid MP4 box size.');
      result.push({
        type: bytes.toString('ascii', at + 4, at + 8),
        data: at + header,
        end: at + size,
      });
      at += size;
    }
    return result;
  }
  const children = (box) => boxes(box.data, box.end);
  const top = boxes(0, bytes.length),
    moov = top.find((b) => b.type === 'moov');
  if (!moov) throw new Error('Recording has no MP4 movie header.');
  let width,
    height,
    videoId,
    audio = false,
    encodedFrames = 0;
  for (const trak of children(moov).filter((b) => b.type === 'trak')) {
    const parts = children(trak),
      tkhd = parts.find((b) => b.type === 'tkhd');
    const mdia = parts.find((b) => b.type === 'mdia');
    if (!tkhd || !mdia) continue;
    const media = children(mdia),
      hdlr = media.find((b) => b.type === 'hdlr');
    const type = hdlr && bytes.toString('ascii', hdlr.data + 8, hdlr.data + 12);
    if (type === 'soun') audio = true;
    if (type !== 'vide') continue;
    videoId = bytes.readUInt32BE(tkhd.data + (bytes[tkhd.data] === 1 ? 20 : 12));
    width = bytes.readUInt32BE(tkhd.end - 8) / 65536;
    height = bytes.readUInt32BE(tkhd.end - 4) / 65536;
  }
  for (const moof of top.filter((b) => b.type === 'moof')) {
    for (const traf of children(moof).filter((b) => b.type === 'traf')) {
      const parts = children(traf),
        tfhd = parts.find((b) => b.type === 'tfhd');
      if (tfhd && bytes.readUInt32BE(tfhd.data + 4) === videoId)
        for (const trun of parts.filter((b) => b.type === 'trun'))
          encodedFrames += bytes.readUInt32BE(trun.data + 4);
    }
  }
  if (!width || !height || !encodedFrames)
    throw new Error('Recording has no encoded video frames.');
  return {
    width,
    height,
    audio,
    encodedFrames,
    videoCodec: 'av1',
    audioCodec: audio ? 'opus' : undefined,
  };
}
