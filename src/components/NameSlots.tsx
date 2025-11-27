interface NameSlotsProps {
  names: string[];
  scores: Record<string, number>;
}

export const NameSlots = ({ names, scores }: NameSlotsProps) => {
  const slotWidth = 700 / 9;
  
  return (
    <div className="flex absolute bottom-0 left-2 right-2">
      {names.map((name, index) => (
        <div 
          key={index}
          className="flex flex-col items-center justify-end pb-1"
          style={{ width: slotWidth }}
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
      ))}
    </div>
  );
};
