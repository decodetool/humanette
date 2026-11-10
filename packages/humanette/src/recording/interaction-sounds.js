// Web Audio sounds play live and are captured with tab audio. No downloaded assets.
import { installTypingSound } from './typing-sound.js';
export async function installInteractionSounds(
  page,
  { volume = 0.18, clicks = true, keyboard = true } = {},
) {
  if (!Number.isFinite(volume) || volume < 0 || volume > 1)
    throw new RangeError('Sound volume must be 0–1.');
  const options = { volume, clicks, keyboard };
  let disposed = false;
  async function install(frame) {
    if (disposed) return;
    if (keyboard) await frame.evaluate(installTypingSound, { volume });
    await frame.evaluate(({ volume, clicks, keyboard }) => {
      const key = '__humanetteInteractionSounds';
      window[key]?.dispose();
      let audio,
        disposed = false;
      const sources = new Set(),
        counts = { clicks: 0, keys: 0, errors: 0 };
      const typing = keyboard ? window.__humanetteTypingSound : undefined;
      const listeners = [];
      let pendingKeyInput = false;
      function sound(kind, role = 'printable', gesture) {
        if (disposed || volume === 0) return;
        try {
          if (kind === 'keys') {
            if (gesture) typing.press(role, gesture);
            else typing.play(role);
            counts.keys++;
            return;
          }
          audio ??= new AudioContext();
          if (audio.state === 'suspended') void audio.resume().catch(() => counts.errors++);
          const length = kind === 'clicks' ? 0.035 : 0.022;
          const buffer = audio.createBuffer(
            1,
            Math.ceil(audio.sampleRate * length),
            audio.sampleRate,
          );
          const data = buffer.getChannelData(0);
          for (let i = 0; i < data.length; i++) {
            const t = i / data.length;
            data[i] = (Math.random() * 2 - 1) * Math.min(1, t * 25) * Math.exp(-t * 7);
          }
          const source = audio.createBufferSource(),
            filter = audio.createBiquadFilter(),
            gain = audio.createGain();
          source.buffer = buffer;
          filter.type = 'bandpass';
          filter.frequency.value = kind === 'clicks' ? 1500 : 3000;
          filter.Q.value = 0.6;
          gain.gain.value = volume;
          source.connect(filter).connect(gain).connect(audio.destination);
          source.onended = () => {
            source.disconnect();
            filter.disconnect();
            gain.disconnect();
            sources.delete(source);
          };
          sources.add(source);
          source.start();
          counts[kind]++;
        } catch {
          counts.errors++;
        }
      }
      function listen(type, fn) {
        document.addEventListener(type, fn, true);
        listeners.push([type, fn]);
      }
      const allowed = (event) =>
        event.isTrusted && (event.composedPath()[0] ?? event.target)?.type !== 'password';
      if (clicks)
        listen('pointerdown', (event) => {
          if (allowed(event)) sound('clicks');
        });
      if (keyboard) {
        const keyRole = (key) =>
          key === ' '
            ? 'space'
            : ['Backspace', 'Delete'].includes(key)
              ? 'delete'
              : ['Enter', '\n', '\r', '\r\n'].includes(key)
                ? 'enter'
                : 'printable';
        // insertText emits input without keydown; physical keys sound on keydown
        // (including shortcuts on canvases) and consume their following input event.
        listen('input', (event) => {
          // Checkbox/range/select changes also emit input, but are not typing.
          if (!(event instanceof InputEvent) || !allowed(event) || event.isComposing) return;
          if (pendingKeyInput) {
            pendingKeyInput = false;
            return;
          }
          const role = event.inputType?.startsWith('delete')
            ? 'delete'
            : ['insertLineBreak', 'insertParagraph'].includes(event.inputType)
              ? 'enter'
              : keyRole(event.data);
          sound('keys', role);
        });
        listen('keydown', (event) => {
          if (
            !allowed(event) ||
            event.isComposing ||
            ['Shift', 'Control', 'Alt', 'Meta', 'AltGraph', 'Dead', 'Unidentified'].includes(
              event.key,
            )
          )
            return;
          pendingKeyInput = true;
          sound('keys', keyRole(event.key), event.code || event.key);
        });
        listen('keyup', (event) => {
          pendingKeyInput = false;
          if (event.isTrusted) typing?.release(event.code || event.key);
        });
        listen('blur', () => {
          pendingKeyInput = false;
        });
      }
      Object.defineProperty(window, key, {
        configurable: true,
        value: {
          stats: () => {
            const type = typing?.stats();
            return {
              ...counts,
              errors: counts.errors + (type?.errors ?? 0),
              state: [audio?.state, type?.state].includes('running')
                ? 'running'
                : (audio?.state ?? type?.state ?? 'unused'),
              typing: type,
            };
          },
          dispose() {
            if (disposed) return;
            disposed = true;
            for (const [type, fn] of listeners) document.removeEventListener(type, fn, true);
            for (const source of sources) {
              source.stop();
              source.disconnect();
            }
            sources.clear();
            if (audio) void audio.close();
            typing?.dispose();
            delete window[key];
          },
        },
      });
    }, options);
  }
  const navigated = (frame) => {
    void install(frame).catch(() => {});
  };
  async function dispose() {
    disposed = true;
    page.off('framenavigated', navigated);
    await Promise.all(
      page
        .frames()
        .map((frame) =>
          frame.evaluate(() => window.__humanetteInteractionSounds?.dispose()).catch(() => {}),
        ),
    );
  }
  page.on('framenavigated', navigated);
  try {
    await Promise.all(page.frames().map(install));
  } catch (error) {
    await dispose();
    throw error;
  }
  return {
    async stats() {
      return (
        await Promise.all(
          page
            .frames()
            .map((frame) =>
              frame.evaluate(() => window.__humanetteInteractionSounds?.stats()).catch(() => null),
            ),
        )
      ).filter(Boolean);
    },
    dispose,
  };
}
