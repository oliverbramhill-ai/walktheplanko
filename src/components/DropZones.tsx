import { Minus, Plus } from 'lucide-react';

interface DropZonesProps {
  dropCounts: number[];
  setDropCounts: (counts: number[]) => void;
  disabled: boolean;
  names: string[];
  dropPositions: number[];
  boardWidth: number;
}

export const DropZones = ({ 
  dropCounts, 
  setDropCounts, 
  disabled, 
  names,
  dropPositions,
  boardWidth 
}: DropZonesProps) => {
  const updateCount = (index: number, delta: number) => {
    const newCounts = [...dropCounts];
    newCounts[index] = Math.max(0, Math.min(10, newCounts[index] + delta));
    setDropCounts(newCounts);
  };

  const randomize = () => {
    const newCounts = dropCounts.map(() => Math.floor(Math.random() * 6) + 1);
    setDropCounts(newCounts);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: boardWidth }}>
        <div className="flex justify-between px-1">
          {names.map((name, index) => {
            const position = dropPositions[index];
            const widthPercent = 100 / names.length;
            
            return (
              <div 
                key={index}
                className="flex flex-col items-center gap-1 parchment-bg rounded-lg p-1.5 rope-border"
                style={{ 
                  width: `${widthPercent - 1}%`,
                  minWidth: '60px'
                }}
              >
                <span 
                  className="text-xs font-pirate text-wood-dark truncate w-full text-center"
                  title={name}
                >
                  {name}
                </span>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => updateCount(index, -1)}
                    disabled={disabled || dropCounts[index] <= 0}
                    className="w-5 h-5 rounded bg-wood-dark text-parchment flex items-center justify-center disabled:opacity-50 hover:bg-wood-mid transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center font-bold text-wood-dark text-sm">
                    {dropCounts[index]}
                  </span>
                  <button
                    onClick={() => updateCount(index, 1)}
                    disabled={disabled || dropCounts[index] >= 10}
                    className="w-5 h-5 rounded bg-wood-dark text-parchment flex items-center justify-center disabled:opacity-50 hover:bg-wood-mid transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <button
        onClick={randomize}
        disabled={disabled}
        className="text-sm px-3 py-1 rounded bg-secondary text-secondary-foreground font-pirate hover:bg-secondary/80 transition-colors disabled:opacity-50"
      >
        🎲 Randomize Counts
      </button>
    </div>
  );
};
