# Provenance

Humanette's motion model, feedback defaults, and stable-canvas approach originated in the custom recording cursor work in https://github.com/seflless/agent-browser (branch feat/custom-recording-cursor, source checkout af79d4081bd2366c2f0dffbd4de912fa63149f14 plus the subsequent Pointer Lab/CSS-tour work).

Agent-browser is licensed under Apache-2.0. The accompanying LICENSE-APACHE-2.0 preserves that license for derived portions. The implementation here has been modified: TypeScript modules, reusable instances, public configuration, a Node Playwright adapter, seekable timelines, embedded assets, and lifecycle cleanup replace the original CLI injection interface. New Humanette code follows the repository's ISC license.

Cursor artwork is copied unchanged at build time from this repository's existing docs/*.svg files, introduced before this implementation at main commit 28a204f. These are the owner-supplied Humanette assets, not a new download of Apple assets and not MDN's GIF/PNG examples. No official Apple affiliation or native hotspot metadata is claimed. Hotspots are visually calibrated and can be overridden with a custom theme. The package includes static artwork for busy/progress.

The website uses Dialkit (MIT) and Motion (MIT); they are not runtime dependencies of the published browser package. Original source artwork stays in docs/ so any future provenance or licensing changes can be made in one place.
