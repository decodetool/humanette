/*!
 * Timing profile, inverse-CDF sampling and seeded RNG adapted from human-input:
 * https://github.com/heydryft/human-input/tree/39975cd057329dabfe5dc0f0ca09d6659773ed886
 * src/profile.ts and src/random.ts. No recorded corpus or mouse engine included.
 * Humanette additions: word/clause/sentence pauses, word-level pace, literal
 * Unicode insertion, cancellation, fixed-delay opt-out, and serialized actions.
 *
 * MIT License
 * Copyright (c) 2026 heydryft
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

const DWELL = [
  [0.02, 48],
  [0.1, 63],
  [0.25, 75],
  [0.5, 91],
  [0.75, 112],
  [0.9, 137],
  [0.98, 178],
  [0.997, 240],
];
const FLIGHT = [
  [0.02, 45],
  [0.1, 75],
  [0.25, 105],
  [0.5, 150],
  [0.75, 225],
  [0.9, 360],
  [0.98, 620],
  [0.997, 880],
];

// Multipliers relative to the original measured timing profile, not video speed.
export const typingSpeeds = Object.freeze({ slow: 3, default: 6, fast: 8 });
export type TypingSpeed = keyof typeof typingSpeeds;
export interface TypingOptions {
  speed?: TypingSpeed;
  /** Multiplier relative to the original timing profile. Overrides speed; range 0.25–8. */
  pace?: number;
}
export interface TypingPlanOptions extends TypingOptions {
  seed?: number;
}
export interface TypingStep {
  text: string;
  waitBefore: number;
  hold: number;
  boundary: 'start' | 'word' | 'clause' | 'sentence' | 'line' | null;
}

export function typingPlan(
  text: string,
  { seed = 42, speed = 'default', pace }: TypingPlanOptions = {},
): TypingStep[] {
  if (typeof text !== 'string') throw new TypeError('Typing text must be a string.');
  if (!Object.hasOwn(typingSpeeds, speed))
    throw new RangeError('Typing speed must be slow, default, or fast.');
  pace ??= typingSpeeds[speed];
  if (!Number.isSafeInteger(seed) || seed < 0 || !Number.isFinite(pace) || pace < 0.25 || pace > 8)
    throw new RangeError('Use a nonnegative integer seed and pace 0.25–8.');
  let state = seed >>> 0;
  const random = () => {
    state += 0x6d2b79f5;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
  const sample = (table: number[][]) => {
    const u = random();
    if (u <= table[0][0]) return table[0][1];
    for (let i = 1; i < table.length; i++) {
      const [p1, v1] = table[i],
        [p0, v0] = table[i - 1];
      if (u <= p1) return v0 + ((u - p0) / (p1 - p0)) * (v1 - v0);
    }
    return table.at(-1)![1];
  };
  const chars = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].map(
    (part) => part.segment,
  );
  let wordPace = 1,
    previousHold = 0;
  return chars.map((char, i) => {
    const before = chars.slice(Math.max(0, i - 24), i).join('');
    const wordStart = i === 0 || /\s$/u.test(before);
    if (wordStart) wordPace = 0.9 + random() * 0.2;
    const hold = Math.max(Math.min(20, 80 / pace), Math.round(sample(DWELL) / pace));
    let wait =
      i === 0
        ? (140 + random() * 100) / pace
        : Math.max(8, (sample(FLIGHT) * wordPace) / pace - previousHold);
    let boundary: TypingStep['boundary'] = i === 0 ? 'start' : null;
    // Plan at the next visible character, so punctuation/quotes/spaces remain
    // together and URLs/decimal points do not acquire sentence-length stalls.
    if (i && !/\s/u.test(char)) {
      if (/\n\s*$/u.test(before)) {
        boundary = 'line';
        wait = Math.max(wait, (480 + random() * 260) / pace);
      } else if (/[.!?]["'”’)}\]]*\s+$/u.test(before) || /[。！？]["'”’)}\]]*$/u.test(before)) {
        boundary = 'sentence';
        wait = Math.max(wait, (450 + random() * 300) / pace);
      } else if (/[,;:]["'”’)}\]]*\s+$/u.test(before) || /[，；：、]$/u.test(before)) {
        boundary = 'clause';
        wait = Math.max(wait, (220 + random() * 160) / pace);
      } else if (wordStart) {
        boundary = 'word';
        wait = Math.max(wait, (120 + random() * 110) / pace);
      }
    }
    previousHold = hold;
    return { text: char, waitBefore: Math.round(wait), hold, boundary };
  });
}
