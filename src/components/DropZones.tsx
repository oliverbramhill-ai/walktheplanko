interface DropZonesProps {
  dropCounts: number[];
  names: string[];
  dropPositions: number[];
  boardWidth: number;
}

export const DropZones = ({ 
  dropCounts, 
  names,
  dropPositions,
  boardWidth 
}: DropZonesProps) => {
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-sm font-pirate text-wood-dark">⚫ 15 Cannonballs per zone</p>
      <div className="relative" style={{ width: boardWidth }}>
        <div className="flex justify-between px-1">
          {names.map((name, index) => {
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
                <span className="text-center font-bold text-wood-dark text-sm">
                  {dropCounts[index]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
