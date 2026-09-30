# Frame-stepped product-video rendering

Research date: 2026-09-28. These are findings and a proposed direction, not a shipped recording API.

## Conclusion

Use elapsed logical time for motion, independently of frame rate. For live interaction, sample the trajectory when updates can actually be delivered; do not add a full frame's sleep after an already-expensive input command. For premium recorded output, make a separate offline mode: advance logical time to `frame * 1000 / fps`, deliver input, render that state, await its image, then advance. Slow rendering or encoding should increase wall-clock completion time, not skip movie frames. This is an architectural recommendation based on the precedents below.

“Record at 120 fps” and “render 120 distinct, correctly timed states per second of movie time” are different contracts. A video frame count alone does not prove the latter.

## Chromium has an explicit frame-control precedent

`HeadlessExperimental.beginFrame` accepts a frame timestamp and interval, waits for frame completion, and can return a screenshot of that frame. It requires a target created with BeginFrameControl enabled. This provides the necessary rendering acknowledgment; it is not an ordinary headed-browser refresh-rate setting. [Protocol contract](https://chromedevtools.github.io/devtools-protocol/tot/HeadlessExperimental/).

Chromium's own [basic RAF compositor test](https://github.com/chromium/chromium/blob/main/headless/test/data/protocol/virtual-time/compositor-basic-raf.js) combines virtual-time budgets, `virtualTimeBudgetExpired`, explicit frames, and screenshots. Its [VirtualTimeController helper](https://github.com/chromium/chromium/blob/main/headless/test/data/protocol/helpers/virtual-time-controller.js) is concrete example code for coordinating the clocks. Do not blindly copy its default 16 ms interval when targeting exact 60/120 fps; choose timestamps from frame indices and validate fractional-time behavior.

The [compositor test harness](https://github.com/chromium/chromium/blob/main/headless/test/headless_compositor_browsertest.cc) configures compositor/animation flags and disables the suite on macOS. Some CSS-animation cases are also disabled for flakiness. This is an experimental foundation that needs pinned-browser tests, not proof of universal deterministic rendering.

### Confirmed local limitation

On this project's installed Playwright `1.64.0-alpha-2026-09-28`, Chromium `155.0.8059.12`, macOS, the coordinating agent tested:

```js
await browserCDP.send('Target.createTarget', {
  url: 'about:blank',
  enableBeginFrameControl: true,
});
```

It failed with `BeginFrameControl is not supported on MacOS yet`. The same platform guard exists in Chromium's [target handler](https://github.com/chromium/chromium/blob/main/headless/lib/browser/protocol/target_handler.cc). A separate default-headless probe hung; that is inconclusive beyond that configuration. A Linux headless-shell worker is the appropriate next proof of concept, not a promise of current support on this Mac. Chromium's maintainer distinguishes headless-shell frame control from unified/headed Chrome in this [first-party explanation](https://groups.google.com/a/chromium.org/g/headless-dev/c/WgNE0CAlx-8/m/qMtbfgbBCQAJ).

## Playwright's clock is not compositor frame control

`page.clock` replaces JavaScript timing APIs, including RAF, timers, `performance`, and `Date`; it does not document control of every browser subsystem. [Clock documentation](https://playwright.dev/docs/clock).

Its current [injected source](https://github.com/microsoft/playwright/blob/main/packages/injected/src/clock.ts) schedules mocked RAF on 16 ms boundaries. Consequently, calling `runFor(1000 / 120)` cannot by itself guarantee a fresh RAF-driven application state at every 120-fps sample. CSS/WAAPI animation timing requires separate coordination; neither a fake JavaScript clock nor waiting for a screenshot is sufficient evidence that all clocks agree.

Keep input through Playwright/CDP where actual browser interaction is needed. Chromium's [Playwright input implementation](https://github.com/microsoft/playwright/blob/main/packages/playwright-core/src/server/chromium/crInput.ts) uses `Input.dispatchMouseEvent`. Moving only Humanette's visual overlay, or calling DOM `dispatchEvent`, is not an equivalent replacement for browser input and its default selection/drag behavior.

## Portable precedent: cooperative frame seeking

Remotion derives composition state from [the current frame](https://www.remotion.dev/docs/use-current-frame), renders [image sequences](https://www.remotion.dev/docs/renderer/render-frames), and provides [readiness barriers](https://www.remotion.dev/docs/delay-render) for asynchronous work. Its documentation explicitly requires [third-party animations to synchronize](https://www.remotion.dev/docs/third-party). This demonstrates slower-than-real-time rendering without requiring a 120 Hz display, but does not turn arbitrary web apps into seekable compositions.

Humanette could support a cooperative mode with `renderAt(time)` and an app-provided readiness hook, while preserving browser input where required. CSS/WAAPI, canvas/WebGL simulations, video/audio, animated images, workers, cross-origin frames, and network-driven UI must each be synchronized, frozen, mocked, or explicitly unsupported. Real network completion remains nondeterministic; use fixtures and explicit readiness instead of arbitrary delays. These are integration requirements inferred from the distinct clock/control surfaces above, not verified universal limitations of every Chromium configuration.

## Acceptance criteria

For either offline approach, pin browser/version, await fonts/assets, use bounded readiness timeouts, apply encoder backpressure, and preserve one numbered image per requested timestamp. Verify elapsed-time motion, input outcomes, moving-region frame differences, CSS/JS animation progression, total frame count, and duration. Repeated identical frames are legitimate during holds; unexplained duplicates while moving are not. Do not claim smooth 120-fps rendering solely because the container reports 120 fps.
