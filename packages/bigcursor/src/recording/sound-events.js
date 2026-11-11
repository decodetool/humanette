// Shared trusted-event binding for native recordings and live browser demos.
// Self-contained so Playwright can serialize it without eval or imported closures.
/** @param {{volume?: number, clicks?: boolean, keyboard?: boolean, root?: Document | HTMLElement, typeSound?: any, clickSound?: any, global?: boolean, ownsSounds?: boolean}} [options] */
export function bindSoundEvents({
  volume = 0.18,
  clicks = true,
  keyboard = true,
  root = document,
  typeSound = window.__bigcursorTypingSound,
  clickSound = window.__bigcursorClickSound,
  global = true,
  ownsSounds = true,
} = {}) {
  const key = '__bigcursorInteractionSounds';
  if (global) window[key]?.dispose();
  let disposed = false;
  const counts = { clicks: 0, keys: 0, errors: 0 };
  const typing = keyboard ? typeSound : undefined;
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
      clickSound?.play();
      counts[kind]++;
    } catch {
      counts.errors++;
    }
  }
  function listen(type, fn) {
    root.addEventListener(type, fn, true);
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
        ['Shift', 'Control', 'Alt', 'Meta', 'AltGraph', 'Dead', 'Unidentified'].includes(event.key)
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
  const api = {
    stats: () => {
      const type = typing?.stats(),
        click = clickSound?.stats();
      return {
        ...counts,
        errors: counts.errors + (type?.errors ?? 0) + (click?.errors ?? 0),
        state: [click?.state, type?.state].includes('running')
          ? 'running'
          : (click?.state ?? type?.state ?? 'unused'),
        typing: type,
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const [type, fn] of listeners) root.removeEventListener(type, fn, true);
      if (ownsSounds) {
        clickSound?.dispose();
        typing?.dispose();
      }

      if (window[key] === api) delete window[key];
    },
  };
  if (global) Object.defineProperty(window, key, { configurable: true, value: api });
  return api;
}
