import { useEffect, useRef, useState, useCallback } from 'react';
import Matter from 'matter-js';
import confetti from 'canvas-confetti';
import { usePlinkoSounds } from '@/hooks/usePlinkoSounds';
import { DropZones } from './DropZones';
import { Scoreboard } from './Scoreboard';
import { WinnerBanner } from './WinnerBanner';
import { NameSlots } from './NameSlots';

const DEFAULT_NAMES = [
  'Oliver', 'David', 'Alina', 'Camille', 'James', 'Adri', 'Ross', 'Luke', 'Romain'
];

const BOARD_WIDTH = 700;
const BOARD_HEIGHT = 600;
const PEG_RADIUS = 6;
const BALL_RADIUS = 10;
const SLOT_WIDTH = BOARD_WIDTH / 9;

export const PlinkoGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  
  const [names, setNames] = useState<string[]>(DEFAULT_NAMES);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [dropCounts, setDropCounts] = useState<number[]>([3, 3, 3, 3, 3]);
  const [isDropping, setIsDropping] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [activeBalls, setActiveBalls] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  
  const sounds = usePlinkoSounds();
  const ballCountRef = useRef(0);
  const scoresRef = useRef<Record<string, number>>({});

  const initializeScores = useCallback(() => {
    const initialScores: Record<string, number> = {};
    names.forEach(name => {
      initialScores[name] = 0;
    });
    setScores(initialScores);
    scoresRef.current = initialScores;
  }, [names]);

  useEffect(() => {
    initializeScores();
  }, [initializeScores]);

  const createPegs = (world: Matter.World) => {
    const pegs: Matter.Body[] = [];
    const rows = 10;
    const startY = 80;
    const rowSpacing = 45;
    
    for (let row = 0; row < rows; row++) {
      const cols = row % 2 === 0 ? 9 : 8;
      const offsetX = row % 2 === 0 ? SLOT_WIDTH / 2 : SLOT_WIDTH;
      
      for (let col = 0; col < cols; col++) {
        const x = offsetX + col * SLOT_WIDTH;
        const y = startY + row * rowSpacing;
        
        const peg = Matter.Bodies.circle(x, y, PEG_RADIUS, {
          isStatic: true,
          restitution: 0.5,
          friction: 0.1,
          render: {
            fillStyle: '#C4A45F',
          },
          label: 'peg',
        });
        pegs.push(peg);
      }
    }
    
    Matter.Composite.add(world, pegs);
    return pegs;
  };

  const createSlotWalls = (world: Matter.World) => {
    const walls: Matter.Body[] = [];
    const slotTop = BOARD_HEIGHT - 80;
    
    // Left and right walls
    walls.push(
      Matter.Bodies.rectangle(-10, BOARD_HEIGHT / 2, 20, BOARD_HEIGHT, {
        isStatic: true,
        render: { fillStyle: '#5a3921' },
      }),
      Matter.Bodies.rectangle(BOARD_WIDTH + 10, BOARD_HEIGHT / 2, 20, BOARD_HEIGHT, {
        isStatic: true,
        render: { fillStyle: '#5a3921' },
      })
    );
    
    // Slot dividers
    for (let i = 0; i <= 9; i++) {
      const x = i * SLOT_WIDTH;
      const wall = Matter.Bodies.rectangle(x, slotTop + 40, 6, 80, {
        isStatic: true,
        render: { fillStyle: '#5a3921' },
      });
      walls.push(wall);
    }
    
    // Bottom
    walls.push(
      Matter.Bodies.rectangle(BOARD_WIDTH / 2, BOARD_HEIGHT + 10, BOARD_WIDTH, 20, {
        isStatic: true,
        render: { fillStyle: '#5a3921' },
        label: 'bottom',
      })
    );
    
    Matter.Composite.add(world, walls);
    return walls;
  };

  const setupCollisionDetection = (engine: Matter.Engine) => {
    Matter.Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        const labels = [pair.bodyA.label, pair.bodyB.label];
        
        if (labels.includes('ball') && labels.includes('peg')) {
          sounds.playBounce();
        }
        
        if (labels.includes('ball') && labels.includes('bottom')) {
          const ball = pair.bodyA.label === 'ball' ? pair.bodyA : pair.bodyB;
          const slotIndex = Math.floor(ball.position.x / SLOT_WIDTH);
          const clampedIndex = Math.max(0, Math.min(8, slotIndex));
          const name = names[clampedIndex];
          
          if (name) {
            scoresRef.current = {
              ...scoresRef.current,
              [name]: (scoresRef.current[name] || 0) + 1,
            };
            setScores({ ...scoresRef.current });
            sounds.playSlotLand();
          }
          
          // Remove ball after landing
          setTimeout(() => {
            Matter.Composite.remove(engine.world, ball);
            ballCountRef.current--;
            setActiveBalls(ballCountRef.current);
            
            if (ballCountRef.current === 0) {
              checkWinner();
            }
          }, 500);
        }
      });
    });
  };

  const checkWinner = () => {
    const currentScores = scoresRef.current;
    let maxScore = 0;
    let winnerName = '';
    
    Object.entries(currentScores).forEach(([name, score]) => {
      if (score > maxScore) {
        maxScore = score;
        winnerName = name;
      }
    });
    
    if (winnerName && maxScore > 0) {
      setWinner(winnerName);
      sounds.playWinner();
      sounds.playArrr();
      
      // Confetti explosion
      const duration = 3000;
      const end = Date.now() + duration;
      
      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: ['#FFD700', '#DAA520', '#8B4513', '#CD853F', '#DEB887'],
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: ['#FFD700', '#DAA520', '#8B4513', '#CD853F', '#DEB887'],
        });
        
        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
    
    setIsDropping(false);
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = Matter.Engine.create({
      gravity: { x: 0, y: 1 },
    });
    
    const render = Matter.Render.create({
      canvas: canvasRef.current,
      engine: engine,
      options: {
        width: BOARD_WIDTH,
        height: BOARD_HEIGHT,
        wireframes: false,
        background: 'transparent',
      },
    });

    const runner = Matter.Runner.create();

    createPegs(engine.world);
    createSlotWalls(engine.world);
    setupCollisionDetection(engine);

    Matter.Render.run(render);
    Matter.Runner.run(runner, engine);

    engineRef.current = engine;
    renderRef.current = render;
    runnerRef.current = runner;

    return () => {
      Matter.Render.stop(render);
      Matter.Runner.stop(runner);
      Matter.Engine.clear(engine);
    };
  }, [names]);

  const dropBall = (x: number) => {
    if (!engineRef.current) return;
    
    const ball = Matter.Bodies.circle(x + (Math.random() - 0.5) * 20, -10, BALL_RADIUS, {
      restitution: 0.6,
      friction: 0.1,
      frictionAir: 0.01,
      render: {
        fillStyle: '#2a2a2a',
        strokeStyle: '#4a4a4a',
        lineWidth: 2,
      },
      label: 'ball',
    });
    
    Matter.Composite.add(engineRef.current.world, ball);
    ballCountRef.current++;
    setActiveBalls(ballCountRef.current);
  };

  const handleDrop = () => {
    if (isDropping) return;
    
    setIsDropping(true);
    setWinner(null);
    initializeScores();
    ballCountRef.current = 0;
    
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
    
    const dropPositions = [
      SLOT_WIDTH * 1,
      SLOT_WIDTH * 2.5,
      SLOT_WIDTH * 4.5,
      SLOT_WIDTH * 6.5,
      SLOT_WIDTH * 8,
    ];
    
    let totalBalls = 0;
    dropCounts.forEach((count, zoneIndex) => {
      for (let i = 0; i < count; i++) {
        setTimeout(() => {
          dropBall(dropPositions[zoneIndex]);
          sounds.playDrop();
        }, totalBalls * 200 + Math.random() * 100);
        totalBalls++;
      }
    });
  };

  const handleReset = () => {
    if (!engineRef.current) return;
    
    // Remove all balls
    const bodies = Matter.Composite.allBodies(engineRef.current.world);
    bodies.forEach(body => {
      if (body.label === 'ball') {
        Matter.Composite.remove(engineRef.current!.world, body);
      }
    });
    
    ballCountRef.current = 0;
    setActiveBalls(0);
    setIsDropping(false);
    setWinner(null);
    initializeScores();
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start justify-center p-4">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-4xl md:text-6xl font-pirate text-primary drop-shadow-lg">
          Walk the Plank-o! ☠️
        </h1>
        
        <DropZones 
          dropCounts={dropCounts} 
          setDropCounts={setDropCounts} 
          disabled={isDropping}
        />
        
        <div className={`relative ${isShaking ? 'animate-shake' : ''}`}>
          <div className="wood-texture rope-border rounded-xl p-2">
            <canvas 
              ref={canvasRef} 
              className="rounded-lg"
              style={{ 
                background: 'linear-gradient(180deg, #1a3a5c 0%, #0f2942 100%)',
              }}
            />
            <NameSlots names={names} scores={scores} />
          </div>
          
          {/* Decorative elements */}
          <div className="absolute -top-4 -left-4 text-3xl animate-float">⚓</div>
          <div className="absolute -top-4 -right-4 text-3xl animate-float" style={{ animationDelay: '1s' }}>🏴‍☠️</div>
          <div className="absolute -bottom-4 -left-4 text-2xl animate-wave">🦜</div>
          <div className="absolute -bottom-4 -right-4 text-2xl animate-wave" style={{ animationDelay: '0.5s' }}>💰</div>
        </div>
        
        <div className="flex gap-4 flex-wrap justify-center">
          <button 
            onClick={handleDrop}
            disabled={isDropping}
            className="pirate-button text-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🎯 DROP THE CANNONBALLS!
          </button>
          <button 
            onClick={handleReset}
            className="pirate-button-red text-xl"
          >
            🔄 RESET BOARD
          </button>
        </div>
        
        {activeBalls > 0 && (
          <p className="text-lg font-pirate text-gold">
            ⚫ Balls in play: {activeBalls}
          </p>
        )}
      </div>
      
      <div className="flex flex-col gap-4">
        <Scoreboard names={names} scores={scores} />
        <div className="parchment-bg rounded-xl p-4 rope-border">
          <h3 className="font-pirate text-xl text-wood-dark mb-2">Edit Crew Names</h3>
          <div className="grid grid-cols-3 gap-2">
            {names.map((name, index) => (
              <input
                key={index}
                type="text"
                value={name}
                onChange={(e) => {
                  const newNames = [...names];
                  newNames[index] = e.target.value;
                  setNames(newNames);
                }}
                className="px-2 py-1 rounded bg-wood-dark text-parchment text-sm border border-rope focus:outline-none focus:ring-2 focus:ring-gold"
                disabled={isDropping}
              />
            ))}
          </div>
        </div>
      </div>
      
      {winner && (
        <WinnerBanner winner={winner} onClose={() => setWinner(null)} />
      )}
    </div>
  );
};
