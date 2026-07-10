interface NameSlotsProps {
  names: string[];
  slotWidths: number[];
  luckySailor?: string | null;
  unluckySailor?: string | null;
}

export const NameSlots = ({ names, slotWidths, luckySailor, unluckySailor }: NameSlotsProps) => {
  return (
    <div className="flex absolute bottom-0 left-2 right-2">
      {names.map((name, index) => {
        const isLucky = name === luckySailor;
        const isUnlucky = name === unluckySailor;
        
        return (
          <div 
            key={index}
            className={`flex flex-col items-center justify-end pb-1 transition-all duration-300 ${
              isLucky ? 'bg-gold/20 rounded-t-lg ring-2 ring-gold/50' : ''
            } ${
              isUnlucky ? 'bg-red-500/20 rounded-t-lg ring-2 ring-red-500/50' : ''
            }`}
            style={{ width: `${slotWidths[index]}%` }}
          >
            {isLucky && (
              <div className="text-xs text-gold animate-pulse mb-0.5">🍀</div>
            )}
            {isUnlucky && (
              <div className="text-xs text-red-400 animate-pulse mb-0.5">💀</div>
            )}
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