# Recording quality and audio

Import `launchForPreset` and `startRecording` from `bigcursor/recording`. The installed package uses the optional `chrome-capture@0.1.2` dependency and Chrome 153+ native `Page.startScreenRecording`: compositor video and tab audio are encoded directly into an AV1/Opus MP4. Recording starts after page readiness and finalizes at `stop()`. Scripts do not copy runtime code from the skill.

## Presets

Choose from the destination; do not ask the user about codec, DPR, or frame rate.

| Destination               | Preset     | CSS viewport × native DPR | MP4 dimensions |
| ------------------------- | ---------- | ------------------------- | -------------- |
| YouTube                   | `youtube`  | 1280×720 × 2              | 2560×1440      |
| X / landscape social      | `x`        | 1280×720 × 1.5            | 1920×1080      |
| Reels / Shorts / vertical | `vertical` | 540×960 × 2               | 1080×1920      |
| PR, docs, unspecified     | `archive`  | 1280×800 × 2              | 2560×1600      |

All default to 60 fps. Vertical uses a 540-CSS-pixel viewport to avoid Chrome's native minimum window-width limit; it uses the app's mobile layout and fills the frame; keep key content away from platform overlays. Black safe-zone bands from the earlier FFmpeg proposal are not added by native capture. For multiple layouts, make separate takes. A custom preset can override `viewport`, `dpr`, and `fps`; Chrome's native encoder currently exposes no bitrate or CRF setting. Do not pass obsolete `crf`, `maxrate`, or `content` settings expecting them to affect encoding.

Native DPR and real content dimensions matter. `launchForPreset` sets the device scale; `startRecording` sizes contents of helper-owned windows. An attached browser retains its existing size and DPR. Check `sourceSize`, `expectedSourceSize`, and `warning`; do not upscale a smaller capture and claim it is native high-resolution video.

## Audio and live interaction sounds

`startRecording(page, preset)` defaults to tab audio **and** quiet injected interaction sounds. This records the app's tab output, not the microphone or unrelated system sounds. Media and Web Audio in the app share the tab audio track. Permissions, protected content, and the app's own mute controls still apply.

The sounds play in the page while the demo runs. Pointer presses generate a short soft click; typing uses Cuelume’s **Type / Press** cue, with per-stroke variation, key-size and cadence shaping, and a quieter release; direct insertion also works; shortcuts and other key presses use real keyboard events. Printable keys are not sounded twice. Navigation and child frames receive the listeners too. Password fields, synthetic DOM events, and intermediate IME composition are excluded. No entered text or shortcut labels are logged. Stopping recording removes listeners and closes only Bigcursor's audio contexts, leaving the app's own audio intact.

```js
// App audio only, without extra interaction sounds:
await startRecording(page, preset, { sounds: false });
// Quieter click and key sounds:
await startRecording(page, preset, { sounds: { volume: 0.1 } });
// Silent recording and silent live demo:
await startRecording(page, preset, { audio: false, sounds: false });
```

For live interactions without a recorder, call `installInteractionSounds(page, options)` from `bigcursor/recording` and await its `dispose()` when done. It uses the same package implementation as the recorder. Keyboard sound is separate from modifier-chord badges; full keyboard visualization is not implemented.

`stats.audio` means the MP4 contains an audio track. It does not prove audibility. Inspect/listen to the actual output when audio matters, and inspect sound counters/errors. App audio is captured as played; automatic narration, music ducking, loudness normalization, and external audio-file mixing are separate work, not built-in options.

## Pacing and verification

Wait for the app's actual ready state and relevant fonts/images before recording. Use short presentation holds so viewers can read each result. Keep the entire take deterministic once rehearsed, rather than waiting for an agent decision between clicks.

Native capture's encoded frame count and requested FPS are not proof of distinct visual frames. Verify decoded cursor movement, especially the transition from large app repaints to cursor-only motion. Do not report the old JPEG `medianMotionGapMs`/`p95MotionGapMs` stats: the native recorder no longer receives those source events. `stopMs` includes draining and saving the MP4; it is measured separately from take duration.

The recorder also applies a transparent full-viewport capture refresh during trusted pointer/keyboard input, including iframe input. This addresses a reproduced 250–267ms text-capture stall after cursor arrival: the app received letters while native capture held the previous image, then skipped several intermediate states. Refreshing stops 350ms after the last input and is removed at recording stop; it does not animate permanently while idle. The regression checks decoded input counters, unchanged screenshot pixels, navigation/frame handling, and cleanup. `captureRefresh: false` disables this workaround for diagnosis. Returned refresh frame counts describe the helper's activity, not distinct captured FPS.

60 fps is the default. 120 fps can work with a suitable high-refresh display and headed Chrome; do not promise it on an arbitrary machine. On hardware-accelerated macOS, do not disable VSync/frame-rate limits: this can starve capture. Keep a failure recording or screenshot when checks fail, and report unverified playback/audio honestly.

AV1/Opus MP4 playback and upload compatibility differs by destination. Preserve this native master; generate H.264/AAC separately if the destination requires it. Native recording itself needs no FFmpeg. Source: https://github.com/paulirish/chrome-capture.

## Natural typing and provenance

Natural typing is built into `createCursor` from `bigcursor`. Its measured dwell/flight profile and seeded sampling are adapted from [human-input](https://github.com/heydryft/human-input), with readable word, punctuation, and line pauses added for demos. Set `typing: { speed: 'slow' }` on `createCursor` for 3× the original typing timings, `'default'` (the default) for 6×, or `'fast'` for 8×. Per-call `cursor.type` accepts `speed` and `pace` too. An explicit numeric `pace` from 0.25 to 8 overrides the preset; higher values are faster, including `pace: 4` and `pace: 8` for quick comparisons. Browser input overhead and minimum hold times mean wall-clock typing duration is approximate. Pointer movement and presentation holds stay unchanged. Explicit per-call `delay` retains fixed timing. Text is inserted exactly, without deliberate typos. Unicode graphemes stay together and literal newlines do not become form submissions.

Change typing speed before recording; do not time-compress the video or its audio to achieve these presets. Each downstroke and release sound plays at its natural speed. Faster input starts sounds closer together, with overlapping tails; it does not shorten the sound envelopes or drop rapid keystrokes. Per-strike pitch/force/decay variation and key-role differences remain. Key-hold duration controls when the release starts, independently of either sound's envelope.

Only Cuelume’s Type cue in the Press theme is extracted, including its output/room stage, key roles, strike variation, and press/release synthesis. Bigcursor keeps envelope lengths independent of typing cadence and removes the upstream 40ms throttle so every keystroke can sound. Other Cuelume cues/themes and DOM bindings are not bundled. The package preserves upstream MIT notices, pinned source commits, and adaptation notes in NOTICE.md and its source modules. Sources: [Cuelume](https://github.com/danielwh2/cuelume), [human-input](https://github.com/heydryft/human-input).
