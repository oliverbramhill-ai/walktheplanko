interface NameSlotsProps {
  names: string[];
  scores: Record<string, number>;
  slotWidths: number[];
  acePilot?: string | null;
  scrollOffset?: number;
  boardWidth?: number;
}

export const NameSlots = ({ 
  names, 
  scores, 
  slotWidths, 
  acePilot, 
  scrollOffset = 0,
  boardWidth = 700 
}: NameSlotsProps) => {
  // Calculate total width in pixels for wrapping
  const totalWidth = boardWidth;
  
  // Create slot data with positions
  const slots = names.map((name, index) => {
    let leftPos = 0;
    for (let i = 0; i < index; i++) {
      leftPos += (slotWidths[i] / 100) * totalWidth;
    }
    const width = (slotWidths[index] / 100) * totalWidth;
    return { name, index, leftPos, width };
  });

  // Calculate wrapped positions
  const getWrappedPosition = (originalLeft: number, width: number) => {
    let newLeft = originalLeft - scrollOffset;
    
    // Wrap around when going off left side
    while (newLeft + width < 0) {
      newLeft += totalWidth;
    }
    // Wrap around when going too far right
    while (newLeft > totalWidth) {
      newLeft -= totalWidth;
    }
    
    return newLeft;
  };

  return (
    <div className="absolute bottom-0 left-2 right-2 overflow-hidden" style={{ height: '80px' }}>
      {slots.map(({ name, index, leftPos, width }) => {
        const wrappedLeft = getWrappedPosition(leftPos, width);
        
        // Render the slot (and a clone if it's wrapping around)
        const renderSlot = (left: number, key: string) => (
          <div 
            key={key}
            className={`absolute flex flex-col items-center justify-end pb-1 transition-none ${
              name === acePilot ? 'bg-cyan-glow/20 rounded-t-lg ring-2 ring-cyan-glow/50 animate-pulse-glow' : ''
            }`}
            style={{ 
              left: `${left}px`, 
              width: `${width}px`,
              height: '100%'
            }}
          >
            {name === acePilot && (
              <div className="text-xs text-cyan-glow animate-twinkle mb-0.5">🎯</div>
            )}
            <div className="text-cyan-glow font-bold text-lg drop-shadow-[0_0_10px_hsl(180,100%,50%)]">
              {scores[name] || 0}
            </div>
            <div 
              className="text-star-white text-xs font-semibold truncate w-full text-center px-1 drop-shadow-md"
              title={name}
            >
              {name}
            </div>
          </div>
        );

        const elements = [renderSlot(wrappedLeft, `slot-${index}`)];
        
        // Add clone on the right side if wrapping from left
        if (wrappedLeft + width < width * 0.5) {
          elements.push(renderSlot(wrappedLeft + totalWidth, `slot-${index}-clone`));
        }
        // Add clone on the left side if wrapping from right
        if (wrappedLeft > totalWidth - width) {
          elements.push(renderSlot(wrappedLeft - totalWidth, `slot-${index}-clone-left`));
        }
        
        return elements;
      })}
    </div>
  );
};
