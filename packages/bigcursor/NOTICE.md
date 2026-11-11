# Provenance

Bigcursor's motion model, feedback defaults, and stable-canvas approach originated in the custom recording cursor work in https://github.com/seflless/agent-browser (branch feat/custom-recording-cursor, source checkout af79d4081bd2366c2f0dffbd4de912fa63149f14 plus the subsequent Pointer Lab/CSS-tour work).

Agent-browser is licensed under Apache-2.0. The accompanying LICENSE-APACHE-2.0 preserves that license for derived portions. The implementation here has been modified: TypeScript modules, reusable instances, public configuration, a Node Playwright adapter, seekable timelines, embedded assets, and lifecycle cleanup replace the original CLI injection interface. New Bigcursor code follows the repository's ISC license.

Cursor artwork is copied unchanged at build time from this repository's existing docs/*.svg files, introduced before this implementation at main commit 28a204f. These are the owner-supplied Bigcursor assets, not a new download of Apple assets and not MDN's GIF/PNG examples. No official Apple affiliation or native hotspot metadata is claimed. Hotspots are visually calibrated and can be overridden with a custom theme. The package includes static artwork for busy/progress.

The website uses Dialkit (MIT) and Motion (MIT); they are not runtime dependencies of the published browser package. Original source artwork stays in docs/ so any future provenance or licensing changes can be made in one place.

## Natural typing: human-input

Timing profile, inverse-CDF sampling and seeded RNG adapted from human-input:
https://github.com/heydryft/human-input/tree/39975cd057329dabfe5dc0f0ca09d6659773ed886
src/profile.ts and src/random.ts. No recorded corpus or mouse engine included.
Bigcursor additions: word/clause/sentence pauses, word-level pace, literal
Unicode insertion, cancellation, fixed-delay opt-out, and serialized actions.

MIT License
Copyright (c) 2026 heydryft

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Typing sounds: Cuelume Type / Press

Cuelume's `type` cue, `press` theme, normal emphasis — extracted and adapted
from src/sounds/{press,layers,context}.ts and src/audio/{render,output}.ts.
https://github.com/danielwh2/cuelume/tree/2a1ba4fc1b67e8371c9f37e37a51e61353166335
Adaptations: typing-only API, injected factory, explicit ownership/cleanup,
direct-input fallback, aggregate diagnostics, fixed envelope lengths across
typing speeds, and no keystroke throttle. No other cues, themes or bind().

MIT License
Copyright (c) 2026 Daniel Belyi

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
