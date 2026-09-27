'use client';
import { useEffect, useRef, useState } from 'react';
import { createHumanette, cursors, cursorGroups } from 'humanette';
export function CursorTour() {
  const root = useRef<HTMLDivElement>(null),
    [hotspots, setHotspots] = useState(true),
    [scale, setScale] = useState(2.5),
    [live, setLive] = useState(false),
    [saved, setSaved] = useState(false),
    [offset, setOffset] = useState(0),
    [held, setHeld] = useState(false),
    [delivered, setDelivered] = useState(false);
  const drag = useRef<{ start: number; offset: number; max: number } | null>(null);
  useEffect(() => {
    if (!live) return;
    const h = createHumanette({ follow: true, scale });
    return () => h.dispose();
  }, [live, scale]);
  return (
    <div ref={root}>
      <div className="mb-8 flex flex-wrap items-center gap-4">
        <button className={live ? 'primary' : 'secondary'} onClick={() => setLive(!live)}>
          {live ? 'Custom cursor on' : 'Try the custom cursor'}
        </button>
        <label className="flex items-center gap-2 text-xs">
          Scale{' '}
          <input
            aria-label="Cursor scale"
            type="range"
            min="1"
            max="4"
            step=".1"
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
          />
          {scale.toFixed(1)}×
        </label>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={hotspots}
            onChange={(e) => setHotspots(e.target.checked)}
          />
          Show hotspots
        </label>
      </div>
      <div className="mb-12 grid gap-4 md:grid-cols-3">
        <section className="rounded-xl border border-line bg-white/50 p-6">
          <p className="eyebrow mb-4">01 / REAL CLICK</p>
          <button id="save" className="primary" onClick={() => setSaved(true)}>
            {saved ? 'Changes saved' : 'Save changes'}
          </button>
        </section>
        <section className="rounded-xl border border-line bg-white/50 p-6">
          <p className="eyebrow mb-4">02 / REAL SELECTION</p>
          <p id="select-text" className="select-text font-display text-2xl">
            Make every move matter.
          </p>
          <label className="mt-3 block text-xs text-muted">
            An editable field
            <input
              id="name"
              aria-label="Demo name"
              placeholder="Name your next demo"
              className="field mt-1"
            />
          </label>
        </section>
        <section className="rounded-xl border border-line bg-white/50 p-6">
          <p className="eyebrow mb-4">03 / REAL DRAG</p>
          <div id="drag-track" className="relative h-20 rounded-lg bg-sage">
            <div
              id="drop"
              className="absolute right-1 top-3 h-14 w-22 rounded border border-dashed border-muted text-center text-xs leading-14"
            >
              Drop here
            </div>
            <div
              id="card"
              role="button"
              tabIndex={0}
              aria-label="Draggable card"
              style={{ transform: `translateX(${offset}px)`, cursor: held ? 'grabbing' : 'grab' }}
              className="absolute left-1 top-3 flex h-14 w-22 touch-none items-center justify-center rounded border border-[#b8c9ad] bg-[#dce8d0] text-xs shadow-sm"
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') {
                  setOffset(e.currentTarget.parentElement!.clientWidth - 96);
                  setDelivered(true);
                }
                if (e.key === 'ArrowLeft') {
                  setOffset(0);
                  setDelivered(false);
                }
              }}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                drag.current = {
                  start: e.clientX,
                  offset,
                  max: e.currentTarget.parentElement!.clientWidth - 96,
                };
                setHeld(true);
              }}
              onPointerMove={(e) => {
                if (drag.current)
                  setOffset(
                    Math.max(
                      0,
                      Math.min(
                        drag.current.max,
                        drag.current.offset + e.clientX - drag.current.start,
                      ),
                    ),
                  );
              }}
              onPointerUp={() => {
                setDelivered(Boolean(drag.current && offset >= drag.current.max - 8));
                drag.current = null;
                setHeld(false);
              }}
              onPointerCancel={() => {
                drag.current = null;
                setHeld(false);
              }}
            >
              {delivered ? 'Delivered' : 'Drag me'}
            </div>
          </div>
          <span className="mt-2 block text-[10px] text-muted">
            Keyboard: focus the card, then ← / →.
          </span>
        </section>
      </div>
      <div id="cursor-gallery" className="mb-5">
        <p className="eyebrow">THE COMPLETE CSS TOUR</p>
        <h2 className="mt-3 font-display text-4xl">Every cursor, accounted for.</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
          35 bundled SVGs. All 36 CSS keywords, including contextual auto and hidden none. Hover a
          row for the custom version; hover its CSS badge to expose the native browser cursor.
          Crosshairs mark our calibrated hotspots, not official OS metadata.
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-180 border-collapse text-left text-sm">
          <thead className="bg-sage text-xs">
            <tr>
              {['Category', 'Keyword', 'Artwork / hotspot', 'Behavior', 'Native'].map((h) => (
                <th key={h} className="p-4 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          {cursorGroups.map((group) => (
            <tbody key={group.name}>
              {group.types.map((type, i) => {
                const asset = cursors[type];
                return (
                  <tr
                    key={type}
                    data-testid={'cursor-' + type}
                    style={{ cursor: type }}
                    className="border-t border-line hover:bg-sage/60"
                  >
                    {i === 0 && (
                      <th
                        rowSpan={group.types.length}
                        scope="rowgroup"
                        className="w-36 border-r border-line bg-sage/50 p-4 align-top font-normal"
                      >
                        {group.name}
                      </th>
                    )}
                    <td className="px-4 font-mono text-xs">{type}</td>
                    <td className="p-2">
                      <div className="relative h-24 w-24">
                        {asset ? (
                          <>
                            <img src={asset.src} alt={type + ' cursor'} className="h-full w-full" />
                            {hotspots && (
                              <span
                                aria-hidden
                                style={{
                                  left: (asset.hotspot[0] / asset.width) * 100 + '%',
                                  top: (asset.hotspot[1] / asset.height) * 100 + '%',
                                }}
                                className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent before:absolute before:top-1/2 before:-left-1 before:w-6 before:border-t before:border-accent after:absolute after:left-1/2 after:-top-1 after:h-6 after:border-l after:border-accent"
                              />
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-muted">Hidden</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 text-xs text-muted">
                      {type === 'auto'
                        ? 'Contextual inference'
                        : type === 'none'
                          ? 'No pointer rendered'
                          : type === 'wait' || type === 'progress'
                            ? 'Static artwork'
                            : 'Bundled SVG'}
                      {asset && (
                        <span className="mt-1 block font-mono text-[10px]">
                          {asset.width} × {asset.height} · hotspot {asset.hotspot.join(', ')}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        data-humanette-native
                        style={{ cursor: type }}
                        className="inline-block rounded border border-line bg-white/50 px-3 py-2 font-mono text-[10px]"
                      >
                        CSS
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </div>
    </div>
  );
}
