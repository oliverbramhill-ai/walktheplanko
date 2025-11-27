import { Minus, Plus } from 'lucide-react';

interface DropZonesProps {
  dropCounts: number[];
  setDropCounts: (counts: number[]) => void;
  disabled: boolean;
}

export const DropZones = ({ dropCounts, setDropCounts, disabled }: DropZonesProps) => {
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
      <div className="flex gap-2 items-center">
        {dropCounts.map((count, index) => (
          <div 
            key={index}
            className="flex flex-col items-center gap-1 parchment-bg rounded-lg p-2 rope-border"
          >
            <span className="text-xs font-pirate text-wood-dark">Zone {index + 1}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => updateCount(index, -1)}
                disabled={disabled || count <= 0}
                className="w-6 h-6 rounded bg-wood-dark text-parchment flex items-center justify-center disabled:opacity-50 hover:bg-wood-mid transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center font-bold text-wood-dark text-lg">
                {count}
              </span>
              <button
                onClick={() => updateCount(index, 1)}
                disabled={disabled || count >= 10}
                className="w-6 h-6 rounded bg-wood-dark text-parchment flex items-center justify-center disabled:opacity-50 hover:bg-wood-mid transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
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
