import assets from 'virtual:cursors';
export interface CursorAsset {
  src: string;
  width: number;
  height: number;
  hotspot: readonly [number, number];
}
export type CursorTheme = Record<string, CursorAsset>;
// SVG source coordinates, not CSS pixels. These are visually calibrated;
// the user-supplied SVGs do not contain official OS hotspot metadata.
const hotspots: Record<string, readonly [number, number]> = {
  default: [32, 32],
  pointer: [32, 32],
  text: [32, 32],
  'vertical-text': [32, 32],
  grab: [32, 32],
  grabbing: [32, 32],
};
export const cursors: Readonly<CursorTheme> = Object.freeze(
  Object.fromEntries(
    Object.entries(assets).map(([name, asset]) => [
      name,
      { ...asset, hotspot: hotspots[name] ?? [32, 32] },
    ]),
  ),
);
export const cursorGroups = [
  { name: 'General', types: ['auto', 'default', 'none'] },
  { name: 'Links & status', types: ['context-menu', 'help', 'pointer', 'progress', 'wait'] },
  { name: 'Selection', types: ['cell', 'crosshair', 'text', 'vertical-text'] },
  {
    name: 'Drag & drop',
    types: ['alias', 'copy', 'move', 'no-drop', 'not-allowed', 'grab', 'grabbing'],
  },
  {
    name: 'Resizing & scrolling',
    types: [
      'all-scroll',
      'col-resize',
      'row-resize',
      'n-resize',
      'e-resize',
      's-resize',
      'w-resize',
      'ne-resize',
      'nw-resize',
      'se-resize',
      'sw-resize',
      'ew-resize',
      'ns-resize',
      'nesw-resize',
      'nwse-resize',
    ],
  },
  { name: 'Zooming', types: ['zoom-in', 'zoom-out'] },
] as const;
