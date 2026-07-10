import Matter from 'matter-js';

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

// All static bodies for the board: pegs, walls, floor, dividers, slot sensors.
// Pegs are permanently at single-ball restitution (1.5) — it is the only mode.
export const createBoardBodies = (slotWidths: number[]): Matter.Body[] => {
  const bodies: Matter.Body[] = [];

  // Pegs — staggered grid
  const startY = 90;
  const rowSpacing = (BOARD_HEIGHT - 150) / PEG_ROWS;
  for (let row = 0; row < PEG_ROWS; row++) {
    const isOffsetRow = row % 2 === 1;
    const cols = isOffsetRow ? PEG_COLS - 1 : PEG_COLS;
    const rowOffset = isOffsetRow ? PEG_SPACING / 2 : 0;
    for (let col = 0; col < cols; col++) {
      const peg = Matter.Bodies.circle(
        GRID_MARGIN + rowOffset + col * PEG_SPACING,
        startY + row * rowSpacing,
        PEG_RADIUS,
        {
          isStatic: true,
          friction: 0.05,
          render: { fillStyle: '#C4A45F' },
          label: 'peg',
        },
      );
      peg.restitution = 1.5;
      bodies.push(peg);
    }
  }

  // Side walls — extend 200px above the canvas so a high ricochet near a
  // corner cannot exit before the top boundary activates.
  const sideWallHeight = BOARD_HEIGHT + 400;
  const sideWallY = BOARD_HEIGHT / 2 - 200;
  bodies.push(
    Matter.Bodies.rectangle(-10, sideWallY, 20, sideWallHeight, {
      isStatic: true,
      render: { fillStyle: '#5a3921' },
      label: 'side-wall',
    }),
    Matter.Bodies.rectangle(BOARD_WIDTH + 10, sideWallY, 20, sideWallHeight, {
      isStatic: true,
      render: { fillStyle: '#5a3921' },
      label: 'side-wall',
    }),
  );

  // Top boundary — starts non-colliding so the dropped ball can enter;
  // activated after the first peg hit.
  bodies.push(
    Matter.Bodies.rectangle(BOARD_WIDTH / 2, -240, BOARD_WIDTH + 40, 30, {
      isStatic: true,
      restitution: 0.3,
      render: { visible: false },
      label: 'top-boundary',
      collisionFilter: { category: 0x0002, mask: 0x0000 },
    }),
  );

  // Slot divider walls
  const slotTop = BOARD_HEIGHT - 80;
  const bounds = getSlotBounds(slotWidths);
  const dividerXs = [0, ...bounds.map((b) => b.end)];
  for (const x of dividerXs) {
    bodies.push(
      Matter.Bodies.rectangle(x, slotTop + 40, 6, 80, {
        isStatic: true,
        render: { fillStyle: '#5a3921' },
        label: 'divider',
      }),
    );
  }

  // Floor
  bodies.push(
    Matter.Bodies.rectangle(BOARD_WIDTH / 2, BOARD_HEIGHT + 10, BOARD_WIDTH, 20, {
      isStatic: true,
      render: { fillStyle: '#5a3921' },
      label: 'bottom',
    }),
  );

  // Slot sensors — one per slot, sitting inside the slot below divider tops.
  // A ball physically inside the slot must overlap its sensor.
  bounds.forEach((b, i) => {
    bodies.push(
      Matter.Bodies.rectangle(b.center, BOARD_HEIGHT - 25, Math.max(b.end - b.start - 10, 4), 60, {
        isStatic: true,
        isSensor: true,
        render: { visible: false },
        label: `slot-sensor-${i}`,
      }),
    );
  });

  return bodies;
};
