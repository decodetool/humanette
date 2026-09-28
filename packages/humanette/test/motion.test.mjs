import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  humanPoint,
  moveDuration,
  validateTimeline,
  sampleTimeline,
  feedbackAt,
  options,
  scenarios,
  timelineDuration,
} from '../dist/motion.js';
import { cursors, cursorGroups, createHumanette } from '../dist/index.js';
test('import is SSR-safe, creation explains browser requirement', () =>
  assert.throws(() => createHumanette(), /browser/));
test('curve is seeded, exact at endpoints, and slows toward the target', () => {
  const a = { x: 0, y: 0 },
    b = { x: 600, y: 300 };
  assert.deepEqual(humanPoint(a, b, 0), a);
  assert.deepEqual(humanPoint(a, b, 1), b);
  assert.deepEqual(humanPoint(a, b, 0.4, 23), humanPoint(a, b, 0.4, 23));
  assert.notDeepEqual(humanPoint(a, b, 0.4, 23), humanPoint(a, b, 0.4, 99));
  assert.ok(
    Math.hypot(...Object.values(humanPoint(a, b, 0.1))) >
      Math.hypot(b.x - humanPoint(a, b, 0.9).x, b.y - humanPoint(a, b, 0.9).y),
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
  assert.throws(() => options({ textSelectionOpacity: 1.1 }));
  assert.equal(options().textSelectionOpacity, 0.7);
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
