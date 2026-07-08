export const BOARD_WIDTH = 700;
export const BOARD_HEIGHT = 600;
export const PEG_RADIUS = 6;
export const BALL_RADIUS = 7;

export const GRID_MARGIN = BOARD_WIDTH * 0.02;
export const GRID_WIDTH = BOARD_WIDTH - GRID_MARGIN * 2;
export const PEG_COLS = 13;
export const PEG_SPACING = GRID_WIDTH / (PEG_COLS - 1);
export const PEG_ROWS = 12;

// Percentage width per slot; lucky sailor shrinks 15%, unlucky grows 50%,
// with the difference redistributed among the remaining crew.
export const computeSlotWidths = (
  names: string[],
  luckySailor: string | null,
  unluckySailor: string | null,
): number[] => {
  const normalWidth = 100 / names.length;

  const hasLucky = luckySailor !== null && names.includes(luckySailor);
  const hasUnlucky = unluckySailor !== null && names.includes(unluckySailor);

  if (!hasLucky && !hasUnlucky) {
    return names.map(() => normalWidth);
  }

  const luckyAdjustment = hasLucky ? normalWidth * 0.15 : 0;
  const unluckyAdjustment = hasUnlucky ? normalWidth / 2 : 0;

  const netAdjustment = luckyAdjustment - unluckyAdjustment;
  const othersCount = names.length - (hasLucky ? 1 : 0) - (hasUnlucky ? 1 : 0);
  const otherAdjustment = othersCount > 0 ? netAdjustment / othersCount : 0;

  return names.map((name) => {
    if (hasLucky && name === luckySailor) return normalWidth * 0.85;
    if (hasUnlucky && name === unluckySailor) return normalWidth * 1.5;
    return normalWidth + otherAdjustment;
  });
};

export interface SlotBounds {
  start: number;
  end: number;
  center: number;
}

export const getSlotBounds = (slotWidths: number[]): SlotBounds[] => {
  let acc = 0;
  return slotWidths.map((percentageWidth) => {
    const widthPx = (percentageWidth / 100) * BOARD_WIDTH;
    const bounds = { start: acc, end: acc + widthPx, center: acc + widthPx / 2 };
    acc += widthPx;
    return bounds;
  });
};
