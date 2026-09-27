// Adapted from agent-browser's Apache-2.0 cursor resolver; modified as a typed,
// independent helper. See NOTICE.md and LICENSE-APACHE-2.0.
/** CSS auto is a conservative approximation, not privileged OS cursor access. */
export function cursorAt(x: number, y: number): { type: string; element: Element | null } {
  let element = document.elementFromPoint(x, y);
  if (!element) return { type: 'default', element };
  while (element.shadowRoot) {
    const inner = element.shadowRoot.elementFromPoint(x, y);
    if (!inner || inner === element) break;
    element = inner;
  }
  const style = getComputedStyle(element),
    keyword = style.cursor.split(',').pop()!.trim();
  if (keyword !== 'auto') return { type: keyword, element };
  if (
    element.matches('input:not(:disabled)') &&
    /^(text|search|email|url|tel|password|number)$/.test((element as HTMLInputElement).type)
  )
    return { type: 'text', element };
  if (element.matches('textarea:not(:disabled)') || (element as HTMLElement).isContentEditable)
    return { type: 'text', element };
  if (element.closest('button,select,input') || style.userSelect === 'none')
    return { type: 'default', element };
  const doc = document as Document & { caretRangeFromPoint?(x: number, y: number): Range | null };
  const range = doc.caretRangeFromPoint?.(x, y);
  const node = range?.startContainer,
    offset = range?.startOffset ?? 0;
  if (
    node?.nodeType === Node.TEXT_NODE &&
    element.contains(node) &&
    getComputedStyle(node.parentElement!).userSelect !== 'none'
  ) {
    for (const i of [offset - 1, offset]) {
      if (i < 0 || i >= node.textContent!.length) continue;
      const r = document.createRange();
      r.setStart(node, i);
      r.setEnd(node, i + 1);
      for (const b of r.getClientRects())
        if (x >= b.left && x <= b.right && y >= b.top && y <= b.bottom)
          return { type: 'text', element };
    }
  }
  return { type: 'default', element };
}
