import { describe, it, expect } from 'vitest';
import { computeSlotWidths, getSlotBounds, BOARD_WIDTH, BOARD_HEIGHT, createBoardBodies } from './plinkoBoard';

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
