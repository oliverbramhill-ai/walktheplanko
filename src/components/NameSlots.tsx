interface NameSlotsProps {
  names: string[];
  scores: Record<string, number>;
  slotWidths: number[];
  luckySailor?: string | null;
}

export const NameSlots = ({ names, scores, slotWidths, luckySailor }: NameSlotsProps) => {
  return (
    <div className="flex absolute bottom-0 left-2 right-2">
      {names.map((name, index) => (
        <div 
          key={index}
          className={`flex flex-col items-center justify-end pb-1 transition-all duration-300 ${
            name === luckySailor ? 'bg-gold/20 rounded-t-lg ring-2 ring-gold/50' : ''
          }`}
          style={{ width: `${slotWidths[index]}%` }}
        >
          {name === luckySailor && (
            <div className="text-xs text-gold animate-pulse mb-0.5">🍀</div>
          )}
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
      ))}
    </div>
  );
};