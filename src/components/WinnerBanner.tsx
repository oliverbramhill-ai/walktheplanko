import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface WinnerBannerProps {
  winner: string;
  onClose: () => void;
}

export const WinnerBanner = ({ winner, onClose }: WinnerBannerProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-background/80 backdrop-blur-sm">
      <div 
        className={`relative parchment-bg rounded-2xl p-8 rope-border max-w-lg mx-4 transform transition-all duration-500 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
        }`}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-wood-dark hover:text-pirate-red transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
        
        <div className="text-center space-y-4">
          <div className="text-6xl animate-bounce-in">🏴‍☠️</div>
          
          <h2 className="font-pirate text-3xl md:text-4xl text-pirate-red">
            YARRR!
          </h2>
          
          <p className="font-pirate text-xl text-wood-dark">
            The chosen one walks the board!
          </p>
          
          <div className="py-4">
            <div className="inline-block px-8 py-4 bg-wood-dark rounded-xl gold-glow">
              <span className="font-pirate text-4xl md:text-5xl text-gold">
                {winner}
              </span>
            </div>
          </div>
          
          <p className="font-pirate text-2xl text-wood-dark">
            WALKS THE PLANK! 🦈
          </p>
          
          <div className="flex justify-center gap-4 text-4xl pt-4">
            <span className="animate-wave">🦜</span>
            <span className="animate-float">💀</span>
            <span className="animate-wave" style={{ animationDelay: '0.5s' }}>⚓</span>
            <span className="animate-float" style={{ animationDelay: '0.3s' }}>💎</span>
            <span className="animate-wave" style={{ animationDelay: '1s' }}>🗡️</span>
          </div>
        </div>
      </div>
    </div>
  );
};
