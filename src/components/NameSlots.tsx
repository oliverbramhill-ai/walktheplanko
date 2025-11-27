interface NameSlotsProps {
  names: string[];
  scores: Record<string, number>;
  lifetimeWins: Record<string, number>;
}

export const NameSlots = ({ names, scores, lifetimeWins }: NameSlotsProps) => {
  const baseWidth = 700 / 9;
  
  // Calculate dynamic widths based on lifetime wins
  const wins = names.map(name => lifetimeWins[name] || 0);
  const maxWins = Math.max(...wins, 1);
  const minWins = Math.min(...wins);
  const range = maxWins - minWins || 1;
  
  const getSlotWidth = (name: string) => {
    const nameWins = lifetimeWins[name] || 0;
    const normalized = (nameWins - minWins) / range;
    // Most wins = narrowest (0.7x), least wins = widest (1.3x)
    const multiplier = 1.3 - normalized * 0.6;
    return baseWidth * multiplier;
  };
  
  // Calculate total width to normalize
  const totalWidth = names.reduce((sum, name) => sum + getSlotWidth(name), 0);
  const scaleFactor = 700 / totalWidth;
  
  return (
    <div className="flex absolute bottom-0 left-2 right-2">
      {names.map((name, index) => {
        const width = getSlotWidth(name) * scaleFactor;
        return (
          <div 
            key={index}
            className="flex flex-col items-center justify-end pb-1 transition-all duration-500"
            style={{ width }}
          >
            <div className="text-gold font-bold text-lg drop-shadow-md">
              {scores[name] || 0}
            </div>
            <div 
              className="text-parchment text-xs font-semibold truncate w-full text-center px-1 drop-shadow-md"
              title={name}
            >
              {name}
            </div>
          </div>
        );
      })}
    </div>
  );
};
