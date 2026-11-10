// Browser-only facade over the exact sound engines/event binding used by recording.
import { installClickSound } from './recording/click-sound.js';
import { installTypingSound } from './recording/typing-sound.js';
import { bindSoundEvents } from './recording/sound-events.js';
export type KeySoundRole = 'printable' | 'space' | 'delete' | 'enter';
/** Internal site previews only. Call resume synchronously from a user gesture. */
export function createPreviewAudio({ volume = 0.18 }: { volume?: number } = {}) {
  if (typeof window === 'undefined') throw new Error('Preview audio needs a browser.');
  const click = installClickSound({ volume, global: false });
  const typing = installTypingSound({ volume, global: false });
  const bindings = new Set<ReturnType<typeof bindSoundEvents>>();
  return {
    resume: () => Promise.all([click.resume(), typing.resume()]),
    click: () => click.play(),
    keyDown: (role: KeySoundRole, gesture: string) => typing.press(role, gesture),
    keyUp: (gesture: string) => typing.release(gesture),
    bind(root: HTMLElement) {
      const binding = bindSoundEvents({
        root,
        volume,
        typeSound: typing,
        clickSound: click,
        global: false,
        ownsSounds: false,
      });
      bindings.add(binding);
      return () => {
        binding.dispose();
        bindings.delete(binding);
      };
    },
    stats: () => ({ click: click.stats(), typing: typing.stats() }),
    dispose() {
      for (const binding of bindings) binding.dispose();
      bindings.clear();
      click.dispose();
      typing.dispose();
    },
  };
}
export type PreviewAudio = ReturnType<typeof createPreviewAudio>;
