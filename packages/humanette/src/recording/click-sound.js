// Shared live click synthesis. Self-contained for Playwright serialization.
export function installClickSound({ volume = 0.18, global = true } = {}) {
  if (!Number.isFinite(volume) || volume < 0 || volume > 1)
    throw new RangeError('Sound volume must be 0–1.');
  if (global) window.__humanetteClickSound?.dispose();
  let context,
    disposed = false;
  const sources = new Set();
  const counts = { played: 0, errors: 0 };
  function bus() {
    if (disposed) throw new Error('Click sound is disposed.');
    context ??= new AudioContext();
    return context;
  }
  const api = {
    async resume() {
      const audio = bus();
      if (audio.state === 'suspended') await audio.resume();
    },
    play() {
      if (disposed || volume === 0) return false;
      try {
        const audio = bus();
        if (audio.state === 'suspended') void audio.resume().catch(() => counts.errors++);
        const length = 0.035;
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
        filter.frequency.value = 1500;
        filter.Q.value = 0.6;
        gain.gain.value = volume;
        source.connect(filter).connect(gain).connect(audio.destination);
        sources.add(source);
        source.onended = () => {
          source.disconnect();
          filter.disconnect();
          gain.disconnect();
          sources.delete(source);
        };
        source.start();
        counts.played++;
        return true;
      } catch {
        counts.errors++;
        return false;
      }
    },
    stats: () => ({ ...counts, state: context?.state ?? 'unused' }),
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const source of sources) {
        source.stop();
        source.disconnect();
      }
      sources.clear();
      if (context) void context.close();
      if (window.__humanetteClickSound === api) delete window.__humanetteClickSound;
    },
  };
  if (global) window.__humanetteClickSound = api;
  return api;
}
