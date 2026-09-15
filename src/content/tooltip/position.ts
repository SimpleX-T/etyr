const TOOLTIP_OFFSET = 8;

export interface TooltipPosition {
  top: number;
  left: number;
  placement: 'above' | 'below';
}

export function calculatePosition(
  selectionRect: DOMRect,
  tooltipRect: DOMRect,
  viewportWidth: number,
  viewportHeight: number,
): TooltipPosition {
  const tooltipWidth = tooltipRect.width;
  const tooltipHeight = tooltipRect.height;

  const spaceAbove = selectionRect.top;
  const spaceBelow = viewportHeight - selectionRect.bottom;

  let placement: 'above' | 'below';
  if (spaceAbove >= tooltipHeight + TOOLTIP_OFFSET) {
    placement = 'above';
  } else if (spaceBelow >= tooltipHeight + TOOLTIP_OFFSET) {
    placement = 'below';
  } else {
    placement = spaceAbove >= spaceBelow ? 'above' : 'below';
  }

  let top: number;
  if (placement === 'above') {
    top = selectionRect.top - tooltipHeight - TOOLTIP_OFFSET;
  } else {
    top = selectionRect.bottom + TOOLTIP_OFFSET;
  }

  // Center horizontally on selection
  let left = selectionRect.left + selectionRect.width / 2 - tooltipWidth / 2;

  // Clamp to viewport
  const padding = 8;
  if (left < padding) {
    left = padding;
  } else if (left + tooltipWidth > viewportWidth - padding) {
    left = viewportWidth - tooltipWidth - padding;
  }

  if (top < padding) {
    top = padding;
  } else if (top + tooltipHeight > viewportHeight - padding) {
    top = viewportHeight - tooltipHeight - padding;
  }

  return { top, left, placement };
}
