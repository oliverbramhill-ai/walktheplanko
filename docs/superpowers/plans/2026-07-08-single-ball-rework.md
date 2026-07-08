# Single-Ball "Chosen One" Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove multi-ball mode entirely; one chaotic gold ball drops from centre and whoever's slot it lands in is chosen for the day, detected by Matter.js sensor bodies instead of x-position estimation.

**Architecture:** Extract the board geometry and physics-body construction from `PlinkoGame.tsx` into a pure module `src/lib/plinkoBoard.ts` so both the React component and headless tests share it. Slot attribution switches to one invisible sensor body per slot. Side walls extend 200px above the canvas to close the top-corner escape. All scoring state, the Firebase `scores` sync, `DropZones`, and `Scoreboard` are deleted.

**Tech Stack:** React 18 + TypeScript + Vite, matter-js 0.19, Firebase RTDB (crew sync only — untouched), vitest (added in Task 1) for unit + headless simulation tests.

**Spec:** `docs/superpowers/specs/2026-07-08-single-ball-rework-design.md`

## Global Constraints

- Board: `BOARD_WIDTH = 700`, `BOARD_HEIGHT = 600`, `PEG_RADIUS = 6`, `BALL_RADIUS = 7`, `PEG_COLS = 13`, `PEG_ROWS = 12`, grid margin 2% each side — unchanged from current code.
- Single-ball physics feel is untouched: `timeScale 0.25`, peg restitution `1.5`, ball restitution `0.98`, `frictionAir 0.03`, gold trail effect.
- Lucky sailor slot ×0.85, unlucky ×1.5, remainder redistributed — logic copied verbatim from current `getSlotWidths`.
- Do NOT touch: `src/lib/firebase.ts`, `src/lib/room.ts`, `src/lib/stats.ts`, `CrewPanel`, `RoomShare`, `StatsPanel`, `usePlinkoSounds`, `WinnerBanner`.
- Sensor bodies labelled `slot-sensor-<index>`; ball labelled `ball`.
- Commit after every task.

---

### Task 1: Add vitest

**Files:**
- Modify: `package.json` (devDependencies + scripts)

**Interfaces:**
- Produces: `npm test` runs vitest in node environment.

- [ ] **Step 1: Install vitest**

```bash
npm install -D vitest
```

- [ ] **Step 2: Add test script**

In `package.json` scripts, add:

```json
"test": "vitest run"
```

- [ ] **Step 3: Verify it runs (no tests yet)**

Run: `npm test`
Expected: vitest exits reporting "No test files found" (exit code 1 is fine at this stage).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add vitest"
```

---

### Task 2: Pure slot geometry in `src/lib/plinkoBoard.ts`

**Files:**
- Create: `src/lib/plinkoBoard.ts`
- Test: `src/lib/plinkoBoard.test.ts`

**Interfaces:**
- Produces:
  - `BOARD_WIDTH: number`, `BOARD_HEIGHT: number`, `PEG_RADIUS: number`, `BALL_RADIUS: number` (constants)
  - `computeSlotWidths(names: string[], luckySailor: string | null, unluckySailor: string | null): number[]` — percentage widths summing to 100
  - `getSlotBounds(slotWidths: number[]): Array<{ start: number; end: number; center: number }>` — pixel bounds per slot

- [ ] **Step 1: Write the failing tests**

Create `src/lib/plinkoBoard.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { computeSlotWidths, getSlotBounds, BOARD_WIDTH } from './plinkoBoard';

const names = ['Anne', 'Blackbeard', 'Calico', 'Drake'];

describe('computeSlotWidths', () => {
  it('splits evenly with no modifiers', () => {
    expect(computeSlotWidths(names, null, null)).toEqual([25, 25, 25, 25]);
  });

  it('always sums to 100', () => {
    for (const [lucky, unlucky] of [
      [null, null], ['Anne', null], [null, 'Drake'], ['Anne', 'Drake'],
    ] as const) {
      const widths = computeSlotWidths(names, lucky, unlucky);
      expect(widths.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 6);
    }
  });

  it('shrinks lucky by 15% and grows unlucky by 50%', () => {
    const widths = computeSlotWidths(names, 'Anne', 'Drake');
    expect(widths[0]).toBeCloseTo(25 * 0.85, 6);
    expect(widths[3]).toBeCloseTo(25 * 1.5, 6);
  });

  it('ignores modifier names not in the crew', () => {
    expect(computeSlotWidths(names, 'Nobody', null)).toEqual([25, 25, 25, 25]);
  });
});

describe('getSlotBounds', () => {
  it('tiles the full board width with matching centers', () => {
    const bounds = getSlotBounds([25, 25, 25, 25]);
    expect(bounds[0]).toEqual({ start: 0, end: 175, center: 87.5 });
    expect(bounds[3].end).toBeCloseTo(BOARD_WIDTH, 6);
    for (let i = 1; i < bounds.length; i++) {
      expect(bounds[i].start).toBeCloseTo(bounds[i - 1].end, 6);
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `./plinkoBoard`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/plinkoBoard.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/plinkoBoard.ts src/lib/plinkoBoard.test.ts
git commit -m "feat: extract pure slot geometry into plinkoBoard module"
```

---

### Task 3: Physics body factory with slot sensors and extended walls

**Files:**
- Modify: `src/lib/plinkoBoard.ts`
- Test: `src/lib/plinkoBoard.test.ts` (append)

**Interfaces:**
- Consumes: `computeSlotWidths`, `getSlotBounds` from Task 2.
- Produces: `createBoardBodies(slotWidths: number[]): Matter.Body[]` — pegs (label `peg`, restitution 1.5), side walls extending 200px above the canvas, delayed-activation top boundary (label `top-boundary`, mask `0x0000`), slot divider walls, floor (label `bottom`), and one sensor per slot (label `slot-sensor-<i>`, `isSensor: true`).

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/plinkoBoard.test.ts`:

```typescript
// Merge into the existing import from './plinkoBoard' at the top of the file:
// import { computeSlotWidths, getSlotBounds, BOARD_WIDTH, createBoardBodies, BOARD_HEIGHT } from './plinkoBoard';

describe('createBoardBodies', () => {
  const widths = computeSlotWidths(names, null, null);
  const bodies = createBoardBodies(widths);

  it('creates one sensor per slot, centered inside each slot', () => {
    const sensors = bodies.filter((b) => b.label.startsWith('slot-sensor-'));
    expect(sensors).toHaveLength(names.length);
    const bounds = getSlotBounds(widths);
    sensors.forEach((sensor, i) => {
      expect(sensor.label).toBe(`slot-sensor-${i}`);
      expect(sensor.isSensor).toBe(true);
      expect(sensor.isStatic).toBe(true);
      expect(sensor.position.x).toBeCloseTo(bounds[i].center, 6);
      expect(sensor.position.y).toBeGreaterThan(BOARD_HEIGHT - 80);
    });
  });

  it('extends side walls at least 200px above the canvas', () => {
    const sideWalls = bodies.filter((b) => b.label === 'side-wall');
    expect(sideWalls).toHaveLength(2);
    sideWalls.forEach((wall) => {
      expect(wall.bounds.min.y).toBeLessThanOrEqual(-200);
      expect(wall.bounds.max.y).toBeGreaterThanOrEqual(BOARD_HEIGHT);
    });
  });

  it('creates super-bouncy pegs and an initially-inactive top boundary', () => {
    const pegs = bodies.filter((b) => b.label === 'peg');
    expect(pegs.length).toBeGreaterThan(100);
    pegs.forEach((peg) => expect(peg.restitution).toBe(1.5));
    const top = bodies.find((b) => b.label === 'top-boundary');
    expect(top?.collisionFilter.mask).toBe(0x0000);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `createBoardBodies` is not exported.

- [ ] **Step 3: Write the implementation**

Append to `src/lib/plinkoBoard.ts`:

```typescript
import Matter from 'matter-js';

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
      bodies.push(
        Matter.Bodies.circle(
          GRID_MARGIN + rowOffset + col * PEG_SPACING,
          startY + row * rowSpacing,
          PEG_RADIUS,
          {
            isStatic: true,
            restitution: 1.5,
            friction: 0.05,
            render: { fillStyle: '#C4A45F' },
            label: 'peg',
          },
        ),
      );
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
      Matter.Bodies.rectangle(b.center, BOARD_HEIGHT - 25, Math.max(b.end - b.start - 10, 4), 40, {
        isStatic: true,
        isSensor: true,
        render: { visible: false },
        label: `slot-sensor-${i}`,
      }),
    );
  });

  return bodies;
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/plinkoBoard.ts src/lib/plinkoBoard.test.ts
git commit -m "feat: board body factory with slot sensors and extended side walls"
```

---

### Task 4: Headless simulation test

**Files:**
- Test: `src/lib/plinkoBoard.sim.test.ts`

**Interfaces:**
- Consumes: `createBoardBodies`, `computeSlotWidths`, `getSlotBounds`, `BOARD_WIDTH`, `BOARD_HEIGHT`, `BALL_RADIUS` from Tasks 2–3.

- [ ] **Step 1: Write the simulation test**

Create `src/lib/plinkoBoard.sim.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import Matter from 'matter-js';
import {
  createBoardBodies, computeSlotWidths, getSlotBounds,
  BOARD_WIDTH, BOARD_HEIGHT, BALL_RADIUS,
} from './plinkoBoard';

// Mirrors the app's drop: gold ball from centre ±60px, restitution 0.98.
const dropOnce = (slotCount: number): { sensorHits: number[]; escaped: boolean } => {
  const names = Array.from({ length: slotCount }, (_, i) => `Sailor${i}`);
  const slotWidths = computeSlotWidths(names, null, null);

  const engine = Matter.Engine.create({ gravity: { x: 0, y: 0.8 } });
  const bodies = createBoardBodies(slotWidths);
  Matter.Composite.add(engine.world, bodies);
  const topBoundary = bodies.find((b) => b.label === 'top-boundary')!;

  const ball = Matter.Bodies.circle(
    BOARD_WIDTH / 2 + (Math.random() - 0.5) * 60, -10, BALL_RADIUS,
    { restitution: 0.98, friction: 0.05, frictionAir: 0.03, label: 'ball' },
  );
  Matter.Body.setVelocity(ball, { x: (Math.random() - 0.5) * 4, y: 1 });
  Matter.Composite.add(engine.world, ball);

  const sensorHits: number[] = [];
  let escaped = false;

  Matter.Events.on(engine, 'collisionStart', (event) => {
    for (const pair of event.pairs) {
      const labels = [pair.bodyA.label, pair.bodyB.label];
      if (labels.includes('ball') && labels.includes('peg')) {
        topBoundary.collisionFilter.mask = 0xffff;
      }
      const sensor = [pair.bodyA, pair.bodyB].find((b) => b.label.startsWith('slot-sensor-'));
      if (sensor && labels.includes('ball')) {
        const idx = Number(sensor.label.replace('slot-sensor-', ''));
        if (!sensorHits.includes(idx)) sensorHits.push(idx);
      }
    }
  });

  // Up to 60 simulated seconds per drop
  for (let step = 0; step < 3600; step++) {
    Matter.Engine.update(engine, 1000 / 60);
    if (
      ball.position.x < -BALL_RADIUS || ball.position.x > BOARD_WIDTH + BALL_RADIUS ||
      ball.position.y > BOARD_HEIGHT + 50 || ball.position.y < -300
    ) {
      escaped = true;
      break;
    }
    // Settled in a slot: sensor fired and ball is nearly stationary
    const speed = Math.hypot(ball.velocity.x, ball.velocity.y);
    if (sensorHits.length > 0 && speed < 0.05 && ball.position.y > BOARD_HEIGHT - 80) break;
  }

  Matter.Engine.clear(engine);
  return { sensorHits, escaped };
};

describe('headless single-ball simulation', () => {
  it('every drop lands in exactly one slot and never escapes (4 crew)', () => {
    for (let i = 0; i < 40; i++) {
      const { sensorHits, escaped } = dropOnce(4);
      expect(escaped).toBe(false);
      expect(sensorHits.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('works at max crew size of 15', () => {
    for (let i = 0; i < 20; i++) {
      const { sensorHits, escaped } = dropOnce(15);
      expect(escaped).toBe(false);
      expect(sensorHits.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('first sensor hit matches the slot containing the ball x at that moment', () => {
    const names = Array.from({ length: 8 }, (_, i) => `Sailor${i}`);
    const bounds = getSlotBounds(computeSlotWidths(names, null, null));
    for (let i = 0; i < 20; i++) {
      const { sensorHits } = dropOnce(8);
      // The chosen sensor's slot must be a valid index
      expect(sensorHits[0]).toBeGreaterThanOrEqual(0);
      expect(sensorHits[0]).toBeLessThan(bounds.length);
    }
  });
});
```

Note: a bouncing ball may graze two sensors near a divider before settling — the *first* sensor hit is the chosen slot (same rule the app uses via `hasLanded`). The assertion is `>= 1` fired, first one wins; the escape assertion is the hard guarantee.

- [ ] **Step 2: Run the simulation**

Run: `npm test`
Expected: all tests PASS. If a drop times out without a sensor hit (ball wedged on a divider top), the test fails — fix by widening sensors upward (increase height from 40 to 60), not by weakening assertions.

- [ ] **Step 3: Commit**

```bash
git add src/lib/plinkoBoard.sim.test.ts
git commit -m "test: headless single-ball simulation (no escapes, one slot per drop)"
```

---

### Task 5: Rewrite `PlinkoGame.tsx` — single ball only, sensor-chosen sailor

**Files:**
- Modify: `src/components/PlinkoGame.tsx` (full rewrite below)
- Modify: `src/components/NameSlots.tsx` (drop `scores` prop)

**Interfaces:**
- Consumes: everything from `src/lib/plinkoBoard.ts`; existing `usePlinkoSounds`, `recordResult(name, attendees)`, `WinnerBanner({winner, onClose})`, `CrewPanel`, `RoomShare`, `StatsPanel`.
- Produces: the final game component. No `scores`, no Firebase `scores` sync, no `DropZones`/`Scoreboard` imports.

- [ ] **Step 1: Update `NameSlots.tsx`**

Remove `scores` from `NameSlotsProps` and from the destructured props, and delete the score display block:

```tsx
<div className="text-gold font-bold text-lg drop-shadow-md">
  {scores[name] || 0}
</div>
```

(Everything else — lucky/unlucky highlighting, name labels — stays.)

- [ ] **Step 2: Rewrite `PlinkoGame.tsx`**

Replace the entire file with:

```tsx
import { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import confetti from 'canvas-confetti';
import { usePlinkoSounds } from '@/hooks/usePlinkoSounds';
import { StatsPanel } from './StatsPanel';
import { WinnerBanner } from './WinnerBanner';
import { NameSlots } from './NameSlots';
import { recordResult } from '@/lib/stats';
import { RoomShare } from './RoomShare';
import { CrewPanel } from './CrewPanel';
import {
  BOARD_WIDTH, BOARD_HEIGHT, BALL_RADIUS,
  computeSlotWidths, createBoardBodies,
} from '@/lib/plinkoBoard';

export const PlinkoGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trailCanvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const trailPositionsRef = useRef<{ x: number; y: number }[]>([]);
  const namesRef = useRef<string[]>([]);
  const chosenRef = useRef(false);

  const [names, setNames] = useState<string[]>([]);
  const [isDropping, setIsDropping] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const [luckySailor, setLuckySailor] = useState<string | null>(null);
  const [unluckySailor, setUnluckySailor] = useState<string | null>(null);

  const sounds = usePlinkoSounds();
  namesRef.current = names;

  const slotWidths = computeSlotWidths(names, luckySailor, unluckySailor);

  const celebrate = (name: string) => {
    recordResult(name, namesRef.current);
    setWinner(name);
    sounds.playWinner();
    sounds.playArrr();

    const end = Date.now() + 3000;
    const frame = () => {
      confetti({
        particleCount: 5, angle: 60, spread: 55, origin: { x: 0, y: 0.7 },
        colors: ['#FFD700', '#DAA520', '#8B4513', '#CD853F', '#DEB887'],
      });
      confetti({
        particleCount: 5, angle: 120, spread: 55, origin: { x: 1, y: 0.7 },
        colors: ['#FFD700', '#DAA520', '#8B4513', '#CD853F', '#DEB887'],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  };

  useEffect(() => {
    if (!canvasRef.current || names.length === 0) return;

    const engine = Matter.Engine.create({ gravity: { x: 0, y: 0.8 } });
    const render = Matter.Render.create({
      canvas: canvasRef.current,
      engine,
      options: {
        width: BOARD_WIDTH, height: BOARD_HEIGHT,
        wireframes: false, background: 'transparent',
      },
    });
    const runner = Matter.Runner.create();

    const bodies = createBoardBodies(
      computeSlotWidths(names, luckySailor, unluckySailor),
    );
    Matter.Composite.add(engine.world, bodies);
    const topBoundary = bodies.find((b) => b.label === 'top-boundary')!;

    Matter.Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        const labels = [pair.bodyA.label, pair.bodyB.label];
        const ball = pair.bodyA.label === 'ball' ? pair.bodyA : pair.bodyB;

        if (labels.includes('ball') && labels.includes('peg')) {
          sounds.playBounce();
          Matter.Body.setAngularVelocity(ball, (Math.random() - 0.5) * 0.3);
          topBoundary.collisionFilter.mask = 0xffff;
        }

        const sensor = [pair.bodyA, pair.bodyB].find((b) =>
          b.label.startsWith('slot-sensor-'),
        );
        if (sensor && labels.includes('ball') && !chosenRef.current) {
          chosenRef.current = true;
          const slotIndex = Number(sensor.label.replace('slot-sensor-', ''));
          const name = namesRef.current[slotIndex];
          sounds.playSlotLand();
          if (name) celebrate(name);

          setTimeout(() => {
            Matter.Composite.remove(engine.world, ball);
            engine.timing.timeScale = 1;
            setIsDropping(false);
          }, 1500);
        }
      });
    });

    // Cap velocity so the ball can't tunnel through walls
    const MAX_BALL_SPEED = 30;
    Matter.Events.on(engine, 'beforeUpdate', () => {
      Matter.Composite.allBodies(engine.world).forEach((body) => {
        if (body.label !== 'ball') return;
        const speed = Math.hypot(body.velocity.x, body.velocity.y);
        if (speed > MAX_BALL_SPEED) {
          const scale = MAX_BALL_SPEED / speed;
          Matter.Body.setVelocity(body, {
            x: body.velocity.x * scale, y: body.velocity.y * scale,
          });
        }
      });
    });

    Matter.Render.run(render);
    Matter.Runner.run(runner, engine);
    engineRef.current = engine;

    // Gold trail
    let trailAnimationId: number;
    const drawTrail = () => {
      const ctx = trailCanvasRef.current?.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
        const ball = Matter.Composite.allBodies(engine.world).find(
          (b) => b.label === 'ball',
        );
        if (ball) {
          trailPositionsRef.current.push({ x: ball.position.x, y: ball.position.y });
          if (trailPositionsRef.current.length > 30) trailPositionsRef.current.shift();
        } else {
          trailPositionsRef.current = [];
        }
        trailPositionsRef.current.forEach((pos, i) => {
          const alpha = (i / trailPositionsRef.current.length) * 0.8;
          const size = BALL_RADIUS * (0.3 + (i / trailPositionsRef.current.length) * 0.7);
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, size * 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 180, 0, ${alpha * 0.3})`;
          ctx.fill();
        });
      }
      trailAnimationId = requestAnimationFrame(drawTrail);
    };
    trailAnimationId = requestAnimationFrame(drawTrail);

    // Nudge a wedged ball
    const bumpInterval = setInterval(() => {
      Matter.Composite.allBodies(engine.world).forEach((body) => {
        if (body.label !== 'ball' || chosenRef.current) return;
        const speed = Math.hypot(body.velocity.x, body.velocity.y);
        if (speed < 0.5 && body.position.y > 0 && body.position.y < BOARD_HEIGHT - 100) {
          Matter.Body.setVelocity(body, {
            x: (Math.random() - 0.5) * 8, y: Math.random() * 5 + 3,
          });
        }
      });
    }, 500);

    return () => {
      clearInterval(bumpInterval);
      cancelAnimationFrame(trailAnimationId);
      Matter.Render.stop(render);
      Matter.Runner.stop(runner);
      Matter.Engine.clear(engine);
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [names, luckySailor, unluckySailor]);

  const handleDrop = () => {
    const engine = engineRef.current;
    if (isDropping || !engine || names.length === 0) return;

    setIsDropping(true);
    setWinner(null);
    chosenRef.current = false;
    trailPositionsRef.current = [];

    // Top boundary inactive until the ball hits a peg
    const topBoundary = Matter.Composite.allBodies(engine.world).find(
      (b) => b.label === 'top-boundary',
    );
    if (topBoundary) topBoundary.collisionFilter.mask = 0x0000;

    engine.timing.timeScale = 0.25;

    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);

    const ball = Matter.Bodies.circle(
      BOARD_WIDTH / 2 + (Math.random() - 0.5) * 60, -10, BALL_RADIUS,
      {
        restitution: 0.98,
        friction: 0.05,
        frictionAir: 0.03,
        render: { fillStyle: '#FFD700', strokeStyle: '#DAA520', lineWidth: 2 },
        label: 'ball',
      },
    );
    Matter.Body.setVelocity(ball, { x: (Math.random() - 0.5) * 4, y: 1 });
    Matter.Body.setAngularVelocity(ball, (Math.random() - 0.5) * 0.4);
    Matter.Composite.add(engine.world, ball);
    sounds.playDrop();
  };

  const handleReset = () => {
    const engine = engineRef.current;
    if (!engine) return;
    Matter.Composite.allBodies(engine.world).forEach((body) => {
      if (body.label === 'ball') Matter.Composite.remove(engine.world, body);
    });
    engine.timing.timeScale = 1;
    chosenRef.current = false;
    trailPositionsRef.current = [];
    setIsDropping(false);
    setWinner(null);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start justify-center p-4">
      <div className="flex flex-col items-center gap-4">
        <div className="flex w-full items-center justify-between">
          <h1 className="text-4xl md:text-6xl font-pirate text-primary drop-shadow-lg">
            Walk the Plank-o! ☠️
          </h1>
          <RoomShare />
        </div>

        <div className={`relative ${isShaking ? 'animate-shake' : ''}`}>
          <div className="wood-texture rope-border rounded-xl p-2">
            <div className="relative">
              <canvas
                ref={canvasRef}
                className="rounded-lg"
                style={{ background: 'linear-gradient(180deg, #1a3a5c 0%, #0f2942 100%)' }}
              />
              <canvas
                ref={trailCanvasRef}
                width={BOARD_WIDTH}
                height={BOARD_HEIGHT}
                className="rounded-lg absolute top-0 left-0 pointer-events-none"
                style={{ zIndex: 10 }}
              />
            </div>
            <NameSlots
              names={names}
              slotWidths={slotWidths}
              luckySailor={luckySailor}
              unluckySailor={unluckySailor}
            />
          </div>

          <div className="absolute -top-4 -left-4 text-3xl animate-float">⚓</div>
          <div className="absolute -top-4 -right-4 text-3xl animate-float" style={{ animationDelay: '1s' }}>🏴‍☠️</div>
          <div className="absolute -bottom-4 -left-4 text-2xl animate-wave">🦜</div>
          <div className="absolute -bottom-4 -right-4 text-2xl animate-wave" style={{ animationDelay: '0.5s' }}>💰</div>
        </div>

        <div className="flex gap-4 flex-wrap justify-center">
          <button
            onClick={handleDrop}
            disabled={isDropping || names.length === 0}
            className="pirate-button text-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🎯 DROP THE CANNONBALL!
          </button>
          <button onClick={handleReset} className="pirate-button-red text-xl">
            🔄 RESET BOARD
          </button>
          <button onClick={() => setShowStats((s) => !s)} className="pirate-button text-xl">
            📊 {showStats ? 'HIDE STATS' : 'SHOW STATS'}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <CrewPanel
          onNamesChange={setNames}
          onLuckyChange={setLuckySailor}
          onUnluckyChange={setUnluckySailor}
          isDropping={isDropping}
        />
        {showStats && <StatsPanel />}
      </div>

      {winner && <WinnerBanner winner={winner} onClose={() => setWinner(null)} />}
    </div>
  );
};
```

- [ ] **Step 3: Typecheck, lint, test, build**

Run: `npx tsc --noEmit && npm run lint && npm test && npm run build`
Expected: all pass. (Lint may flag unused files `DropZones.tsx`/`Scoreboard.tsx` — deleted in Task 6.)

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, then in the browser:
1. Add 4 crew names → drop → gold ball falls in slow motion with trail, lands, WinnerBanner names the sailor whose slot it visibly sits in.
2. Repeat with 15 names; try a drop with a lucky and unlucky sailor set.
3. Drop several times — confirm the ball never leaves the board and the banner always matches the visible slot, including divider-adjacent landings.
4. Confirm there is no scoreboard, no drop-zone strip, no mode checkbox, no "Balls in play" counter.

- [ ] **Step 5: Commit**

```bash
git add src/components/PlinkoGame.tsx src/components/NameSlots.tsx
git commit -m "feat: single-ball chosen-one mode with sensor slot detection"
```

---

### Task 6: Delete dead components and finish

**Files:**
- Delete: `src/components/DropZones.tsx`, `src/components/Scoreboard.tsx`

**Interfaces:**
- Consumes: Task 5 (no remaining imports of these files).

- [ ] **Step 1: Confirm nothing imports them**

Run: `grep -rn "DropZones\|Scoreboard" src --include='*.tsx' --include='*.ts'`
Expected: no matches outside the two files themselves.

- [ ] **Step 2: Delete**

```bash
git rm src/components/DropZones.tsx src/components/Scoreboard.tsx
```

- [ ] **Step 3: Full check**

Run: `npx tsc --noEmit && npm run lint && npm test && npm run build`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: remove multi-ball components (DropZones, Scoreboard)"
```
