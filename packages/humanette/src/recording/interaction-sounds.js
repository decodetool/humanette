// Web Audio sounds play live and are captured with tab audio. No downloaded assets.
import { installTypingSound } from './typing-sound.js';
import { installClickSound } from './click-sound.js';
import { bindSoundEvents } from './sound-events.js';
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
    if (clicks) await frame.evaluate(installClickSound, { volume });
    await frame.evaluate(bindSoundEvents, options);
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
