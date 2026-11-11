/*!
 * Cuelume's `type` cue, `press` theme, normal emphasis — extracted and adapted
 * from src/sounds/{press,layers,context}.ts and src/audio/{render,output}.ts.
 * https://github.com/danielwh2/cuelume/tree/2a1ba4fc1b67e8371c9f37e37a51e61353166335
 * Adaptations: typing-only API, injected factory, explicit ownership/cleanup,
 * direct-input fallback, aggregate diagnostics, fixed envelope lengths across
 * typing speeds, and no keystroke throttle. No other cues, themes or bind().
 *
 * MIT License
 * Copyright (c) 2026 Daniel Belyi
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

// Self-contained so Playwright can serialize this function into each frame.
// Browser callers may also invoke it directly; importing the module is SSR-safe.
export function installTypingSound({ volume = 0.18, global = true } = {}) {
  if (!Number.isFinite(volume) || volume < 0 || volume > 1)
    throw new RangeError('Typing volume must be 0–1.');
  if (global) window.__bigcursorTypingSound?.dispose();
  let context,
    bus,
    disposed = false,
    lastPlayedAt = -Infinity,
    lastVoice;
  const held = new Map(),
    sources = new Set(),
    timers = new Set(),
    nodes = new Set();
  const counts = { played: 0, released: 0, suppressed: 0, errors: 0 };
  const nudge = (amount) => 1 + (Math.random() * 2 - 1) * amount;
  const seeded = (seed) => () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 2 ** 32;
  };
  const ring = (frequency, peak, q = 8) => ({
    kind: 'noise',
    frequency,
    q,
    peak,
    attack: 0.001,
    decay: 0.0055,
  });
  const knock = (frequency, decay, peak) => ({
    kind: 'tone',
    frequency: frequency * 1.6,
    glideTo: frequency,
    glideTime: 0.018,
    peak,
    attack: 0.001,
    decay,
  });
  const pressLayers = [ring(4200, 0.25), ring(4200 * 0.675, 0.125, 2), knock(305, 0.0288, 0.04)];
  const releaseLayers = [ring(4100, 0.08), ring(1000, 0.06, 2), knock(414, 0.0216, 0.012)];
  const roles = {
    printable: { pitch: 1, level: 1, length: 1, bright: 1 },
    space: { pitch: 0.86, level: 1.08, length: 1.15, bright: 1 },
    delete: { pitch: 0.92, level: 0.9, length: 1, bright: 0.8 },
    enter: { pitch: 0.8, level: 1.12, length: 1.25, bright: 1 },
  };
  function track(node) {
    nodes.add(node);
    return node;
  }
  function later(fn, ms) {
    const timer = setTimeout(() => {
      timers.delete(timer);
      if (!disposed) fn();
    }, ms);
    timers.add(timer);
    return timer;
  }
  function createBus() {
    context = new AudioContext();
    const output = track(context.createGain());
    output.gain.value = 5.8;
    const subsonic = track(context.createBiquadFilter());
    subsonic.type = 'highpass';
    subsonic.frequency.value = 40;
    subsonic.Q.value = -3;
    const clip = track(context.createWaveShaper());
    clip.curve = Float32Array.from({ length: 1025 }, (_, i) => {
      const level = (2 * i) / 1024 - 1,
        over = Math.abs(level) - 0.7;
      return over <= 0 ? level : Math.sign(level) * (0.7 + over - (over * over) / 0.6);
    });
    output.connect(subsonic).connect(clip).connect(context.destination);
    const noise = context.createBuffer(1, Math.floor(2 * context.sampleRate), context.sampleRate);
    const random = seeded(1),
      data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = 2 * random() - 1;
    const impulse = context.createBuffer(
      2,
      Math.floor(0.25 * context.sampleRate),
      context.sampleRate,
    );
    [3110, 5639].forEach((seed, channel) => {
      const rng = seeded(seed),
        reflections = new Float32Array(12000);
      let energy = 0;
      for (let i = 0; i < reflections.length; i++) {
        const t = i / 48000;
        reflections[i] = t < 0.008 ? 0 : (2 * rng() - 1) * Math.exp((-Math.log(1000) * t) / 0.25);
        energy += reflections[i] ** 2;
      }
      const samples = impulse.getChannelData(channel),
        scale = 1 / Math.sqrt(energy);
      for (let i = 0; i < reflections.length; i++) {
        const at = (i / 48000) * context.sampleRate,
          sample = Math.floor(at),
          late = at - sample;
        if (sample < samples.length) samples[sample] += reflections[i] * scale * (1 - late);
        if (sample + 1 < samples.length) samples[sample + 1] += reflections[i] * scale * late;
      }
    });
    const walls = track(context.createBiquadFilter());
    walls.type = 'lowpass';
    walls.frequency.value = 3500;
    walls.Q.value = -3;
    const room = track(context.createConvolver());
    room.normalize = false;
    room.buffer = impulse;
    walls.connect(room).connect(output);
    return { output, room: walls, noise };
  }
  function render(layers, shape, release = false) {
    bus ??= createBus();
    if (context.state === 'suspended') void context.resume().catch(() => counts.errors++);
    const now = context.currentTime,
      voice = track(context.createGain()),
      send = track(context.createGain());
    voice.gain.value = 0.297 * volume;
    send.gain.value = 0.08;
    voice.connect(bus.output);
    voice.connect(send).connect(bus.room);
    if (!release) {
      if (lastVoice) {
        lastVoice.gain.setValueAtTime(lastVoice.gain.value, now);
        lastVoice.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
      }
      lastVoice = voice;
    }
    // One strike's pitch and force move together across all its layers.
    const pitch = nudge(0.08),
      force = nudge(0.15);
    let end = 0;
    const shaped = layers.map((layer) => {
      const tuning =
        Math.min(1.25, Math.max(0.75, shape.pitch)) *
        pitch *
        (layer.kind === 'tone' ? nudge(0.005) : force);
      const decay = layer.decay * Math.min(1.6, Math.max(0.6, shape.length)) * nudge(0.1);
      const peak =
        layer.peak *
        Math.min(1.5, shape.level * (layer.frequency >= 2500 ? shape.bright : 1)) *
        force;
      return { ...layer, tuning, decay, peak };
    });
    for (const layer of shaped) {
      const { tuning, decay, peak } = layer;
      const gain = context.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(peak, now + layer.attack);
      gain.gain.setTargetAtTime(0, now + layer.attack, decay / Math.log(1000));
      gain.connect(voice);
      const source =
        layer.kind === 'tone' ? context.createOscillator() : context.createBufferSource();
      const filter = layer.kind === 'noise' ? context.createBiquadFilter() : null;
      if (filter) {
        source.buffer = bus.noise;
        source.loop = true;
        filter.type = 'bandpass';
        filter.Q.value = layer.q;
        filter.frequency.setValueAtTime(layer.frequency * tuning, now);
        source.connect(filter).connect(gain);
      } else {
        source.type = 'sine';
        source.frequency.setValueAtTime(layer.frequency * tuning, now);
        source.frequency.exponentialRampToValueAtTime(
          layer.glideTo * tuning,
          now + layer.glideTime,
        );
        source.connect(gain);
      }
      sources.add(source);
      source.onended = () => {
        source.disconnect();
        filter?.disconnect();
        gain.disconnect();
        sources.delete(source);
      };
      if (filter) source.start(now, Math.random() * 2);
      else source.start(now);
      const duration = layer.attack + decay + 0.05;
      source.stop(now + duration);
      end = Math.max(end, duration);
    }
    later(
      () => {
        if (lastVoice === voice) lastVoice = undefined;
        voice.disconnect();
        send.disconnect();
        nodes.delete(voice);
        nodes.delete(send);
      },
      (end + 0.05) * 1000,
    );
  }
  function press(role = 'printable', gesture = 'type') {
    if (disposed || volume === 0) return false;
    const now = performance.now(),
      since = now - lastPlayedAt;
    lastPlayedAt = now;
    const speed = Math.min(1, Math.max(0, (220 - since) / 150));
    const key = roles[role] ?? roles.printable;
    const shape = {
      pitch: key.pitch,
      level: key.level * (1 - 0.22 * speed),
      // Faster typing starts more voices; it never time-compresses a strike.
      length: key.length,
      bright: key.bright * (1 - 0.2 * speed),
    };
    try {
      render(pressLayers, shape);
      held.set(gesture, shape);
      counts.played++;
      return true;
    } catch {
      counts.errors++;
      return false;
    }
  }
  function release(gesture = 'type') {
    const shape = held.get(gesture);
    held.delete(gesture);
    if (!shape || disposed) return;
    try {
      render(releaseLayers, shape, true);
      counts.released++;
    } catch {
      counts.errors++;
    }
  }
  const api = {
    async resume() {
      if (disposed) throw new Error('Typing sound is disposed.');
      bus ??= createBus();
      if (context.state === 'suspended') await context.resume();
    },
    press,
    release,
    play(role = 'printable') {
      // insertText has no real keyup, so use Cuelume's 90ms quick-press release.
      const gesture = Symbol();
      if (press(role, gesture)) later(() => release(gesture), 90);
    },
    stats: () => ({
      ...counts,
      theme: 'press',
      state: context?.state ?? 'unused',
      activeSources: sources.size,
      pendingTimers: timers.size,
    }),
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const timer of timers) clearTimeout(timer);
      timers.clear();
      held.clear();
      for (const source of sources) {
        source.stop();
        source.disconnect();
      }
      sources.clear();
      for (const node of nodes) node.disconnect();
      nodes.clear();
      if (context) void context.close();
      bus = undefined;
      if (window.__bigcursorTypingSound === api) delete window.__bigcursorTypingSound;
    },
  };
  if (global) window.__bigcursorTypingSound = api;
  return api;
}
