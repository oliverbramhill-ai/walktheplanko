import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Matter from 'matter-js';
import confetti from 'canvas-confetti';
import { usePlinkoSounds } from '@/hooks/usePlinkoSounds';
import { DropZones } from './DropZones';
import { Scoreboard } from './Scoreboard';
import { WinnerBanner } from './WinnerBanner';
import { NameSlots } from './NameSlots';

const DEFAULT_NAMES = [
  'Nova', 'Orion', 'Luna', 'Vega', 'Cosmo', 'Stella', 'Nebula', 'Quasar', 'Astro'
];

const BOARD_WIDTH = 700;
const BOARD_HEIGHT = 600;
const PEG_RADIUS = 6;
const BALL_RADIUS = 7;

// Grid configuration
const GRID_MARGIN = BOARD_WIDTH * 0.02;
const GRID_WIDTH = BOARD_WIDTH - (GRID_MARGIN * 2);
const PEG_COLS = 13;
const PEG_SPACING = GRID_WIDTH / (PEG_COLS - 1);
const PEG_ROWS = 12;

// Helper to get slot center positions from slot widths
const getSlotCenters = (slotWidths: number[], boardWidth: number): number[] => {
  let acc = 0;
  return slotWidths.map((percentageWidth) => {
    const widthPx = (percentageWidth / 100) * boardWidth;
    const center = acc + widthPx / 2;
    acc += widthPx;
    return center;
  });
};

export const PlinkoGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  
  
  const [names, setNames] = useState<string[]>(DEFAULT_NAMES);
  const [scores, setScores] = useState<Record<string, number>>({});
  const dropCounts = useMemo(() => names.map(() => 15), [names]);
  const [isDropping, setIsDropping] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [activeBalls, setActiveBalls] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  
  const [acePilot, setAcePilot] = useState<string | null>(null);
  const [acePilotEnabled, setAcePilotEnabled] = useState(false);
  
  const sounds = usePlinkoSounds();
  const ballCountRef = useRef(0);
  const landedBallsRef = useRef(0);
  const totalBallsToDropRef = useRef(0);
  const scoresRef = useRef<Record<string, number>>({});
  const hasAnnouncedWinnerRef = useRef(false);

  // Calculate slot widths with Ace Pilot adjustment
  const getSlotWidths = useCallback(() => {
    if (!acePilotEnabled || !acePilot) {
      return names.map(() => 100 / names.length);
    }
    
    const pilotIndex = names.indexOf(acePilot);
    if (pilotIndex === -1) {
      return names.map(() => 100 / names.length);
    }
    
    const normalWidth = 100 / names.length;
    const pilotWidth = normalWidth / 2;
    const extraWidth = (normalWidth - pilotWidth) / (names.length - 1);
    
    return names.map((name) => 
      name === acePilot ? pilotWidth : normalWidth + extraWidth
    );
  }, [names, acePilot, acePilotEnabled]);

  const initializeScores = useCallback(() => {
    const initialScores: Record<string, number> = {};
    names.forEach(name => {
      initialScores[name] = 0;
    });
    setScores(initialScores);
    scoresRef.current = initialScores;
    landedBallsRef.current = 0;
  }, [names]);

  useEffect(() => {
    initializeScores();
  }, [initializeScores]);

  const createPegs = (world: Matter.World) => {
    const pegs: Matter.Body[] = [];
    const startY = 90;
    const rowSpacing = (BOARD_HEIGHT - 150) / PEG_ROWS;
    
    for (let row = 0; row < PEG_ROWS; row++) {
      const isOffsetRow = row % 2 === 1;
      const cols = isOffsetRow ? PEG_COLS - 1 : PEG_COLS;
      const rowOffset = isOffsetRow ? PEG_SPACING / 2 : 0;
      
      for (let col = 0; col < cols; col++) {
        const x = GRID_MARGIN + rowOffset + col * PEG_SPACING;
        const y = startY + row * rowSpacing;
        
        const peg = Matter.Bodies.circle(x, y, PEG_RADIUS, {
          isStatic: true,
          restitution: 0.8,
          friction: 0.05,
          render: {
            fillStyle: '#00ffff',
          },
          label: 'peg',
        });
        pegs.push(peg);
      }
    }
    
    Matter.Composite.add(world, pegs);
    return pegs;
  };


  // Calculate drop zone positions aligned to slot centers
  const getDropPositions = useCallback(() => {
    const slotWidths = getSlotWidths();
    return getSlotCenters(slotWidths, BOARD_WIDTH);
  }, [getSlotWidths]);
  const createSlotWalls = (world: Matter.World) => {
    const walls: Matter.Body[] = [];
    const slotTop = BOARD_HEIGHT - 80;
    const slotWidths = getSlotWidths();
    
    // LEFT & RIGHT STRAIGHT WALLS ONLY
    walls.push(
      Matter.Bodies.rectangle(-10, BOARD_HEIGHT / 2, 20, BOARD_HEIGHT, {
        isStatic: true,
        render: { fillStyle: '#1a1a3e' },
      }),
      Matter.Bodies.rectangle(BOARD_WIDTH + 10, BOARD_HEIGHT / 2, 20, BOARD_HEIGHT, {
        isStatic: true,
        render: { fillStyle: '#1a1a3e' },
      })
    );
    
    let currentX = 0;
    for (let i = 0; i <= names.length; i++) {
      const x = i === 0 ? 0 : currentX;
      const wall = Matter.Bodies.rectangle(x, slotTop + 40, 6, 80, {
        isStatic: true,
        render: { fillStyle: '#6366f1' },
      });
      walls.push(wall);
      
      if (i < names.length) {
        currentX += (slotWidths[i] / 100) * BOARD_WIDTH;
      }
    }
    
    walls.push(
      Matter.Bodies.rectangle(BOARD_WIDTH / 2, BOARD_HEIGHT + 10, BOARD_WIDTH, 20, {
        isStatic: true,
        render: { fillStyle: '#1a1a3e' },
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
          const ball = pair.bodyA.label === 'ball' ? pair.bodyA : pair.bodyB;
          Matter.Body.setAngularVelocity(ball, (Math.random() - 0.5) * 0.3);
        }
        
        if (labels.includes('ball') && labels.includes('bottom')) {
          const ball = pair.bodyA.label === 'ball' ? pair.bodyA : pair.bodyB;
          const landedBall = ball as any;
          
          if (landedBall.hasLanded) {
            return;
          }
          landedBall.hasLanded = true;
          
          const slotWidths = getSlotWidths();
          let accumulatedWidth = 0;
          let slotIndex = 0;
          
          for (let i = 0; i < names.length; i++) {
            const slotPixelWidth = (slotWidths[i] / 100) * BOARD_WIDTH;
            if (ball.position.x < accumulatedWidth + slotPixelWidth) {
              slotIndex = i;
              break;
            }
            accumulatedWidth += slotPixelWidth;
            if (i === names.length - 1) slotIndex = i;
          }
          
          const name = names[slotIndex];
          
          if (name) {
            scoresRef.current = {
              ...scoresRef.current,
              [name]: (scoresRef.current[name] || 0) + 1,
            };
            setScores({ ...scoresRef.current });
            sounds.playSlotLand();
          }
          
          setTimeout(() => {
            Matter.Composite.remove(engine.world, ball);
            ballCountRef.current--;
            landedBallsRef.current++;
            setActiveBalls(ballCountRef.current);
            
            if (ballCountRef.current <= 4 && ballCountRef.current > 0) {
              const slowFactor = Math.max(0.4, ballCountRef.current / 6);
              engine.timing.timeScale = slowFactor;
            }
            
            if (landedBallsRef.current >= totalBallsToDropRef.current) {
              engine.timing.timeScale = 1;
              checkWinner();
            }
          }, 500);
        }
      });
    });
  };

  const checkWinner = () => {
    if (hasAnnouncedWinnerRef.current) return;
    
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
      hasAnnouncedWinnerRef.current = true;
      setWinner(winnerName);
      sounds.playWinner();
      sounds.playArrr();
      
      const duration = 3000;
      const end = Date.now() + duration;
      
      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: ['#00ffff', '#ff00ff', '#6366f1', '#8b5cf6', '#ec4899'],
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: ['#00ffff', '#ff00ff', '#6366f1', '#8b5cf6', '#ec4899'],
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
      gravity: { x: 0, y: 0.4 },
    });
    
    engine.world.bodies.forEach(body => {
      if (body.label === 'ball') {
        body.restitution = 0.85;
      }
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

    // Bump detection: nudge stationary balls (including top row area)
    const bumpInterval = setInterval(() => {
      const bodies = Matter.Composite.allBodies(engine.world);
      bodies.forEach(body => {
        if (body.label === 'ball' && !(body as any).hasLanded) {
          const speed = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2);
          // If ball is nearly stationary (speed < 0.5) and within the play area (including top)
          if (speed < 0.5 && body.position.y > 0 && body.position.y < BOARD_HEIGHT - 100) {
            // Apply a random nudge - stronger horizontal force for top-row edge cases
            const nudgeX = (Math.random() - 0.5) * 8;
            const nudgeY = Math.random() * 5 + 3;
            Matter.Body.setVelocity(body, { x: nudgeX, y: nudgeY });
            Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.4);
          }
        }
      });
    }, 500);

    return () => {
      clearInterval(bumpInterval);
      Matter.Render.stop(render);
      Matter.Runner.stop(runner);
      Matter.Engine.clear(engine);
    };
  }, [names, acePilot, acePilotEnabled]);

  const dropBall = (x: number) => {
    if (!engineRef.current) return;
    
    const randomOffsetX = (Math.random() - 0.5) * 30;
    const randomVelocityX = (Math.random() - 0.5) * 2;
    
    const ball = Matter.Bodies.circle(x + randomOffsetX, -10, BALL_RADIUS, {
      restitution: 0.85,
      friction: 0.05,
      frictionAir: 0.015,
      render: {
        fillStyle: '#ff6b35',
        strokeStyle: '#ffaa00',
        lineWidth: 2,
      },
      label: 'ball',
    });
    
    Matter.Body.setVelocity(ball, { x: randomVelocityX, y: 2 });
    Matter.Body.setAngularVelocity(ball, (Math.random() - 0.5) * 0.2);
    
    Matter.Composite.add(engineRef.current.world, ball);
    ballCountRef.current++;
    setActiveBalls(ballCountRef.current);
  };

  const handleDrop = () => {
    if (isDropping) return;
    
    setIsDropping(true);
    setWinner(null);
    hasAnnouncedWinnerRef.current = false;
    initializeScores();
    ballCountRef.current = 0;
    landedBallsRef.current = 0;
    
    const totalBalls = dropCounts.reduce((sum, count) => sum + count, 0);
    totalBallsToDropRef.current = totalBalls;
    
    if (engineRef.current) {
      engineRef.current.timing.timeScale = 1;
    }
    
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
    
    const dropPositions = getDropPositions();
    const remainingDrops = [...dropCounts];
    
    // Build a sequence of drops: sweep left-to-right, then right-to-left
    const dropSequence: number[] = [];
    let goingRight = true;
    
    while (remainingDrops.some(count => count > 0)) {
      const indices = goingRight 
        ? [...Array(dropPositions.length).keys()]
        : [...Array(dropPositions.length).keys()].reverse();
      
      for (const zoneIndex of indices) {
        if (remainingDrops[zoneIndex] > 0) {
          dropSequence.push(zoneIndex);
          remainingDrops[zoneIndex]--;
        }
      }
      goingRight = !goingRight;
    }
    
    // Drop balls one at a time with steady delay
    let dropIndex = 0;
    const dropInterval = 100; // ms between each ball
    
    const dropNext = () => {
      if (dropIndex >= dropSequence.length) return;
      
      const zoneIndex = dropSequence[dropIndex];
      dropBall(dropPositions[zoneIndex]);
      sounds.playDrop();
      
      dropIndex++;
      if (dropIndex < dropSequence.length) {
        setTimeout(dropNext, dropInterval);
      }
    };
    
    dropNext();
  };

  const handleReset = () => {
    if (!engineRef.current) return;
    
    const bodies = Matter.Composite.allBodies(engineRef.current.world);
    bodies.forEach(body => {
      if (body.label === 'ball') {
        Matter.Composite.remove(engineRef.current!.world, body);
      }
    });
    
    engineRef.current.timing.timeScale = 1;
    
    ballCountRef.current = 0;
    landedBallsRef.current = 0;
    totalBallsToDropRef.current = 0;
    hasAnnouncedWinnerRef.current = false;
    setActiveBalls(0);
    setIsDropping(false);
    setWinner(null);
    initializeScores();
  };

  const addName = () => {
    if (names.length >= 10) return;
    const newNames = [...names, `Pilot ${names.length + 1}`];
    setNames(newNames);
  };

  const removeName = (index: number) => {
    if (names.length <= 4) return;
    const newNames = names.filter((_, i) => i !== index);
    setNames(newNames);
    if (acePilot === names[index]) {
      setAcePilot(null);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start justify-center p-4 relative z-10">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-4xl md:text-6xl font-space text-cyan-glow drop-shadow-[0_0_30px_hsl(180,100%,50%)] tracking-wider">
          A-PLONK US! 👽
        </h1>
        
        <DropZones 
          dropCounts={dropCounts}
          names={names}
          dropPositions={getDropPositions()}
          boardWidth={BOARD_WIDTH}
        />
        
        <div className={`relative ${isShaking ? 'animate-shake' : ''}`}>
          <div className="space-panel neon-border rounded-xl p-2">
            <canvas 
              ref={canvasRef} 
              className="rounded-lg"
              style={{ 
                background: 'radial-gradient(ellipse at center, #1a1a3e 0%, #0a0a1f 100%)',
              }}
            />
            <NameSlots 
              names={names} 
              scores={scores} 
              slotWidths={getSlotWidths()}
              acePilot={acePilotEnabled ? acePilot : null}
            />
          </div>
          
          <div className="absolute -top-4 -left-4 text-3xl animate-float">🛸</div>
          <div className="absolute -top-4 -right-4 text-3xl animate-orbit" style={{ animationDelay: '1s' }}>🌟</div>
          <div className="absolute -bottom-4 -left-4 text-2xl animate-twinkle">👾</div>
          <div className="absolute -bottom-4 -right-4 text-2xl animate-float" style={{ animationDelay: '0.5s' }}>🪐</div>
        </div>
        
        <div className="flex gap-4 flex-wrap justify-center">
          <button 
            onClick={handleDrop}
            disabled={isDropping}
            className="space-button text-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🚀 LAUNCH METEORS!
          </button>
          <button 
            onClick={handleReset}
            className="space-button-pink text-xl"
          >
            🔄 RESET GALAXY
          </button>
        </div>
        
        {activeBalls > 0 && (
          <p className="text-lg font-space text-cyan-glow drop-shadow-[0_0_10px_hsl(180,100%,50%)]">
            ☄️ Meteors in orbit: {activeBalls}
          </p>
        )}
      </div>
      
      <div className="flex flex-col gap-4">
        <Scoreboard names={names} scores={scores} />
        
        <div className="hologram-bg rounded-xl p-4 neon-border">
          <h3 className="font-space text-xl text-cyan-glow mb-3">⚙️ Mission Settings</h3>
          
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={acePilotEnabled}
                onChange={(e) => setAcePilotEnabled(e.target.checked)}
                disabled={isDropping}
                className="w-4 h-4 accent-cyan-400"
              />
              <span className="text-star-white font-semibold">🎯 Ace Pilot Mode</span>
            </label>
            
            {acePilotEnabled && (
              <select
                value={acePilot || ''}
                onChange={(e) => setAcePilot(e.target.value || null)}
                disabled={isDropping}
                className="px-2 py-1 rounded bg-space-deep text-star-white text-sm border border-cyan-glow/50 focus:border-cyan-glow focus:outline-none"
              >
                <option value="">Select Ace Pilot...</option>
                {names.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            )}
          </div>
        </div>
        
        <div className="hologram-bg rounded-xl p-4 neon-border">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-space text-xl text-cyan-glow">Edit Crew Names</h3>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const shuffled = [...names].sort(() => Math.random() - 0.5);
                  setNames(shuffled);
                }}
                disabled={isDropping}
                className="text-sm px-3 py-1 rounded bg-space-deep text-star-white font-space hover:bg-nebula-purple/30 transition-colors disabled:opacity-50 border border-cyan-glow/30"
              >
                🔀 Shuffle
              </button>
              <button
                onClick={addName}
                disabled={isDropping || names.length >= 10}
                className="text-sm px-3 py-1 rounded bg-alien-green/20 text-alien-green font-space hover:bg-alien-green/30 transition-colors disabled:opacity-50 border border-alien-green/50"
              >
                + Add
              </button>
            </div>
          </div>
          <p className="text-xs text-cyan-light mb-2">({names.length}/10 crew members)</p>
          <div className="grid grid-cols-3 gap-2">
            {names.map((name, index) => (
              <div key={index} className="flex gap-1">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    const newNames = [...names];
                    newNames[index] = e.target.value;
                    setNames(newNames);
                  }}
                  className="flex-1 px-2 py-1 rounded bg-space-deep text-star-white text-sm border border-cyan-glow/30 focus:outline-none focus:ring-2 focus:ring-cyan-glow"
                  disabled={isDropping}
                />
                {names.length > 4 && (
                  <button
                    onClick={() => removeName(index)}
                    disabled={isDropping}
                    className="px-2 py-1 rounded bg-nebula-pink/20 text-nebula-pink text-xs hover:bg-nebula-pink/30 disabled:opacity-50 border border-nebula-pink/50"
                  >
                    ✕
                  </button>
                )}
              </div>
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