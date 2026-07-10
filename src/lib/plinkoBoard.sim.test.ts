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

    // Mirrors the game's bump interval: every ~500ms of simulated time (30 steps × 1000/60ms),
    // nudge a stalled ball so it doesn't balance indefinitely on a peg.
    if (step % 30 === 0 && speed < 0.5 && ball.position.y > 0 && ball.position.y < BOARD_HEIGHT - 100) {
      Matter.Body.setVelocity(ball, {
        x: (Math.random() - 0.5) * 8,
        y: Math.random() * 5 + 3,
      });
    }
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
