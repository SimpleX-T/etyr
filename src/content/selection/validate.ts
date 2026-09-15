import {
  LOOKUP_DELAY_MS,
  MAX_SELECTION_LENGTH,
  MIN_SELECTION_LENGTH,
} from '@shared/constants';

export { isLookupCandidate } from '@shared/utils';

export function getSelectionRect(selection: Selection): DOMRect | null {
  if (selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  if (rect.width === 0 && rect.height === 0) {
    const tempSpan = document.createElement('span');
    tempSpan.textContent = '\u200b';
    tempSpan.style.position = 'absolute';
    tempSpan.style.visibility = 'hidden';
    range.insertNode(tempSpan);
    const spanRect = tempSpan.getBoundingClientRect();
    tempSpan.parentNode?.removeChild(tempSpan);

    // Re-select after DOM mutation
    const newRange = document.createRange();
    newRange.setStart(range.startContainer, range.startOffset);
    newRange.setEnd(range.endContainer, range.endOffset);
    selection.removeAllRanges();
    selection.addRange(newRange);

    if (spanRect.width === 0 && spanRect.height === 0) return null;
    return spanRect;
  }

  return rect;
}

export function normalizeSelectionText(text: string): string {
  return text
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^\s+|\s+$/g, '')
    .replace(/[\u200B-\u200F\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ')
    .trim();
}

export function isWithinEditableElement(node: Node): boolean {
  let current: Node | null = node;
  while (current && current !== document.body) {
    if (current.nodeType === Node.ELEMENT_NODE) {
      const el = current as HTMLElement;
      if (
        el.isContentEditable ||
        el.tagName === 'INPUT' ||
        el.tagName === 'TEXTAREA' ||
        el.tagName === 'SELECT'
      ) {
        return true;
      }
    }
    current = current.parentNode;
  }
  return false;
}

export const SELECTION_CONSTRAINTS = {
  MIN_LENGTH: MIN_SELECTION_LENGTH,
  MAX_LENGTH: MAX_SELECTION_LENGTH,
  LOOKUP_DELAY: LOOKUP_DELAY_MS,
} as const;
