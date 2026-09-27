# humanette

Natural pointer movement and legible feedback for product walkthroughs, agent recordings, and browser tests. Framework-independent. TypeScript included. SVGs bundled and embedded; no asset hosting required.

```sh
npm install humanette
# or pnpm add humanette / bun add humanette
```

## Follow real input

```ts
import { createHumanette } from 'humanette';

const pointer = createHumanette({ follow: true, scale: 2.5 });
await pointer.ready;
// Record with your existing tool.
pointer.dispose();
```

Importing is SSR-safe; call createHumanette only in a browser (in a React effect). Return pointer.dispose from the effect cleanup. The overlay is inert, hidden from accessibility, and removes its event listeners, timers, and temporary native-cursor styles when disposed.

## Real Playwright actions

```ts
import { createHuman } from 'humanette/playwright';

const human = await createHuman(page, { seed: 42, settle: 120 });
await human.click(page.getByRole('button', { name: 'Save' }));
await human.type('#title', 'Start', { selectAll: true });
await human.drag('#card', '#destination', { duration: 1100 });
await human.press('Shift+2');
await human.dispose();
```

Install Playwright separately. Targets may be CSS selectors, Playwright locators, or {x,y} viewport coordinates in CSS pixels. Actions use real Playwright input. Await them in order. Aborting a drag still releases the mouse. The adapter reinjects the overlay after navigation when the next action begins. It does not bypass CSP or browser permissions.

## Browser / visual API

- createHumanette({root?, follow?, hideNative?, keyboard?, theme?, ...appearance}): create a viewport overlay or a scoped preview. A custom root must be positioned with CSS.
- ready: await image decoding before a take.
- moveTo({x,y}, {duration?, seed?, signal?}): seeded curve with fast departure and slow arrival; positive duration in ms.
- setPosition({x,y}), down(), up(): feed your own adapter.
- configure(appearance), setCursor(cssKeyword), setTheme(theme): change appearance and artwork on the fly.
- play(events, {rate?, signal?, onFrame?, initial?}), seek(events,time,initial?): deterministic visual playback/scrubbing.
- stop(), hide(), dispose(): cancel playback, hide, or fully tear down.

**Visual methods do not dispatch DOM events or alter product state.** Use the Playwright adapter for real clicks, text selection (drag across measured text bounds), typing, and pointer-based drag/drop.

### Appearance defaults

scale: 2.5; color: #397ef3; filled: true; motionBlur: 0.2. Press: radius 16, duration 90 ms, opacity 0.16, cursor scale 0.94. Hold: radius 30, opacity 0.2, outline width 1.5. Release: radius 48, duration 200 ms. Option keys are pressRadius, pressDuration, pressOpacity, pressScale, holdRadius, holdOpacity, ringWidth, releaseRadius, releaseDuration.

Feedback is behind the artwork. It grows on press, holds steady, then expands and fades on release. Quick releases start from the currently displayed state. Pointer size is not subject to OS cursor-size limits.

### Custom artwork

```ts
await pointer.setTheme({
  pointer: {
    src: '/my-pointer.svg',
    width: 64, height: 64,
    hotspot: [32, 32], // source image coordinates, scaled with the image
  },
});
pointer.setCursor('auto'); // infer from CSS again
```

### Timelines

```ts
await pointer.play([
  { at: 0, type: 'move', x: 400, y: 200, duration: 700, seed: 42 },
  { at: 700, type: 'cursor', cursor: 'pointer' },
  { at: 820, type: 'down' },
  { at: 900, type: 'up' },
]);
```

Times use ms. Coordinates use CSS pixels, relative to root when provided. Moves cannot overlap; down/up must alternate and finish released. Pure humanPoint, sampleTimeline, feedbackAt, validateTimeline, and moveDuration are available from humanette/motion without embedding the asset payload.

### Script tag

Copy the installed dist/humanette.global.js file to your site's public directory, load it with a script tag, then call Humanette.createHumanette({follow:true}). The classic bundle includes all SVGs. Nothing needs a CDN.

## Boundaries

Humanette is not a recorder or encoder. 60-fps output does not prove 60 unique captured frames. Input delivery and capture depend on the browser, page workload, and recorder. CSS auto is heuristic; closed shadow roots, cross-origin frames, native widgets, and custom image cursors cannot be fully inferred. Busy/progress artwork is static. Use the native CSS comparison badges in the project site's gallery to inspect mappings.

keyboard:true opts into a modifier-chord badge only; ordinary typing and password text are not displayed. It is disabled by default.

See the project website's Pointer Lab for Dialkit tuning, timeline editing, and portable preset export. See NOTICE.md for source and asset provenance.
