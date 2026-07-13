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

    // A rebuild mid-drop (e.g. a teammate edits the shared roster while a
    // ball is in flight) discards the old engine and its ball — reset the
    // drop state so the DROP button isn't left stuck disabled.
    chosenRef.current = false;
    trailPositionsRef.current = [];
    setIsDropping(false);

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
        // Covers balls perched on divider tops (y≈520); chosenRef above already
        // prevents nudging a ball that has landed in a slot.
        if (speed < 0.5 && body.position.y > 0 && body.position.y < BOARD_HEIGHT - 80) {
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
