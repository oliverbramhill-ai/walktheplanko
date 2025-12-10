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
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-background/90 backdrop-blur-md">
      <div 
        className={`relative space-panel rounded-2xl p-8 neon-border max-w-lg mx-4 transform transition-all duration-500 ${
          isVisible ? 'scale-100 opacity-100 animate-warp' : 'scale-50 opacity-0'
        }`}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-cyan-glow hover:text-nebula-pink transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
        
        <div className="text-center space-y-4">
          <div className="text-6xl animate-bounce-in">🛸</div>
          
          <h2 className="font-space text-3xl md:text-4xl text-nebula-pink animate-pulse-glow">
            TRANSMISSION RECEIVED!
          </h2>
          
          <p className="font-space text-xl text-cyan-light">
            The cosmos has chosen...
          </p>
          
          <div className="py-4">
            <div className="inline-block px-8 py-4 bg-space-deep rounded-xl cyan-glow border-2 border-cyan-glow">
              <span className="font-space text-4xl md:text-5xl text-cyan-glow">
                {winner}
              </span>
            </div>
          </div>
          
          <p className="font-space text-2xl text-star-white">
            HAS BEEN LAUNCHED INTO THE VOID! 🚀
          </p>
          
          <div className="flex justify-center gap-4 text-4xl pt-4">
            <span className="animate-orbit">🌟</span>
            <span className="animate-float">👽</span>
            <span className="animate-twinkle" style={{ animationDelay: '0.5s' }}>✨</span>
            <span className="animate-float" style={{ animationDelay: '0.3s' }}>🪐</span>
            <span className="animate-orbit" style={{ animationDelay: '1s' }}>☄️</span>
          </div>
        </div>
      </div>
    </div>
  );
};