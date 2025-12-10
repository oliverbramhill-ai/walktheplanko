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
      <p className="text-sm font-space text-cyan-light">☄️ 15 Meteors per launch bay</p>
      <div className="relative" style={{ width: boardWidth }}>
        <div className="flex justify-between px-1">
          {names.map((name, index) => {
            const widthPercent = 100 / names.length;
            
            return (
              <div 
                key={index}
                className="flex flex-col items-center gap-1 hologram-bg rounded-lg p-1.5 neon-border"
                style={{ 
                  width: `${widthPercent - 1}%`,
                  minWidth: '60px'
                }}
              >
                <span 
                  className="text-xs font-space text-cyan-glow truncate w-full text-center"
                  title={name}
                >
                  {name}
                </span>
                <span className="text-center font-bold text-star-white text-sm">
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