import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  naturalPoint,
  moveDuration,
  validateTimeline,
  sampleTimeline,
  feedbackAt,
  options,
  scenarios,
  timelineDuration,
} from '../dist/motion.js';
import { cursors, cursorGroups, createCursorRenderer } from '../dist/index.js';
test('import is SSR-safe, creation explains browser requirement', () =>
  assert.throws(() => createCursorRenderer(), /browser/));
test('curve is seeded, exact at endpoints, and slows toward the target', () => {
  const a = { x: 0, y: 0 },
    b = { x: 600, y: 300 };
  assert.deepEqual(naturalPoint(a, b, 0), a);
  assert.deepEqual(naturalPoint(a, b, 1), b);
  assert.deepEqual(naturalPoint(a, b, 0.4, 23), naturalPoint(a, b, 0.4, 23));
  assert.notDeepEqual(naturalPoint(a, b, 0.4, 23), naturalPoint(a, b, 0.4, 99));
  assert.ok(
    Math.hypot(...Object.values(naturalPoint(a, b, 0.1))) >
      Math.hypot(b.x - naturalPoint(a, b, 0.9).x, b.y - naturalPoint(a, b, 0.9).y),
  );
  assert.ok(moveDuration(a, { x: 2, y: 2 }) >= 280);
});
test('quick release starts continuously from current press', () => {
  const down = [{ at: 0, type: 'down' }],
    both = [...down, { at: 20, type: 'up' }];
  const before = feedbackAt(down, 20),
    after = feedbackAt(both, 20);
  assert.equal(before.radius, after.radius);
  assert.equal(before.opacity, after.opacity);
  assert.equal(feedbackAt(both, 500).opacity, 0);
  assert.equal(feedbackAt(down, 1000).phase, 'hold');
});
test('timeline is seekable, validates ordering, and ends released', () => {
  for (const events of Object.values(scenarios)) {
    validateTimeline(events);
    const end = timelineDuration(events);
    assert.deepEqual(sampleTimeline(events, 400), sampleTimeline(events, 400));
    assert.equal(sampleTimeline(events, end).pressed, false);
  }
  assert.throws(() => validateTimeline([{ at: 0, type: 'down' }]), /pointer-up/);
  assert.throws(
    () =>
      validateTimeline([
        { at: 0, type: 'move', x: 0, y: 0, duration: 500 },
        { at: 100, type: 'up' },
      ]),
    /overlap/,
  );
  assert.throws(() => options({ scale: 0 }));
  assert.throws(() => options({ holdOpacity: 2 }));
  assert.throws(() => options({ dimmedOpacity: 1.1 }));
  assert.equal(options().dimmedOpacity, 0.3);
  assert.throws(() => options({ scale: 'large' }));
  assert.equal('root' in options({ root: {} }), false);
});
test('all 36 CSS keywords have assets or intentional behavior; assets embed offline', () => {
  const types = cursorGroups.flatMap((g) => g.types);
  assert.equal(types.length, 36);
  for (const type of types.filter((t) => !['auto', 'none'].includes(t))) {
    assert.ok(cursors[type]);
    assert.match(cursors[type].src, /^data:image\/svg\+xml;base64,/);
    assert.equal(cursors[type].hotspot.length, 2);
  }
});

test('idle dimming follows mouse activity, stays visible while held, and is seekable', () => {
  assert.equal(options().autoHideTimeout, 0);
  assert.equal(options().hiddenOpacity, 0);
  assert.equal(options().dimmedOpacity, 0.3);
  for (const hiddenOpacity of [-0.1, 1.1, NaN, Infinity])
    assert.throws(() => options({ hiddenOpacity }));
  assert.equal(options({ autoHideTimeout: 0 }).autoHideTimeout, 0);
  for (const autoHideTimeout of [-1, NaN, Infinity, false, 2 ** 31])
    assert.throws(() => options({ autoHideTimeout }));
  const events = [
    { at: 0, type: 'move', x: 100, y: 100, duration: 100 },
    { at: 200, type: 'down' },
    { at: 250, type: 'up' },
    { at: 500, type: 'cursor', cursor: 'text' },
    { at: 2000, type: 'move', x: 200, y: 100, duration: 100 },
  ];
  const config = options({ autoHideTimeout: 900, hiddenOpacity: 0.5 });
  assert.equal(sampleTimeline(events, 1150, config).idleOpacity, 1);
  assert.equal(sampleTimeline(events, 1240, config).idleOpacity, 0.75);
  assert.equal(sampleTimeline(events, 1330, config).idleOpacity, 0.5);
  assert.equal(sampleTimeline(events, 2050).idleOpacity, 1);
  assert.equal(
    sampleTimeline(events, 1330, options({ autoHideTimeout: 900, hiddenOpacity: 0.2 })).idleOpacity,
    0.2,
  );
  assert.equal(
    sampleTimeline(events, 1330, options({ autoHideTimeout: 900, hiddenOpacity: 0 })).idleOpacity,
    0,
  );
  assert.equal(
    sampleTimeline(events, 1240, config).idleOpacity,
    0.75,
    'scrubbing backward is deterministic',
  );
  assert.equal(sampleTimeline(events, 1800, options({ autoHideTimeout: 0 })).idleOpacity, 1);
  assert.equal(
    sampleTimeline(
      [
        { at: 0, type: 'down' },
        { at: 5000, type: 'up' },
      ],
      4000,
    ).idleOpacity,
    1,
  );
});

test('typing intervals dim presentation without resetting mouse idle time', () => {
  const events = [
    { at: 0, type: 'move', x: 100, y: 100, duration: 100 },
    { at: 200, type: 'typing', duration: 300 },
    { at: 1000, type: 'move', x: 200, y: 100, duration: 100 },
  ];
  validateTimeline(events);
  assert.equal(sampleTimeline(events, 250).typing, true);
  assert.equal(sampleTimeline(events, 250).idleFor, 150);
  assert.equal(sampleTimeline(events, 600).typing, false);
  assert.equal(sampleTimeline(events, 800).idleOpacity, 1);
  assert.equal(
    sampleTimeline(events, 800, options({ autoHideTimeout: 500, hiddenOpacity: 0.5 })).idleOpacity,
    0.5,
  );
  assert.equal(sampleTimeline(events, 1050).typing, false);
  assert.equal(timelineDuration([{ at: 0, type: 'typing', duration: 1200 }]), 1800);
  const automatic = options({ autoHideTimeout: 500 });
  assert.equal(
    sampleTimeline(events, timelineDuration(events, automatic), automatic).idleOpacity,
    0,
  );
  assert.throws(() => validateTimeline([{ at: 0, type: 'typing', duration: 0 }]), /duration/);
  assert.throws(() => options({ dimmedOpacity: 1.1 }), /0–1/);
});
