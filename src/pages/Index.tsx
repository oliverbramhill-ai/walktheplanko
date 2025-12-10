import { PlinkoGame } from '@/components/PlinkoGame';

const Index = () => {
  return (
    <main className="min-h-screen nebula-gradient starfield py-6 relative overflow-hidden">
      {/* Animated nebula overlays */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-nebula-purple/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-nebula-pink/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-cyan-glow/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
      </div>
      <PlinkoGame />
    </main>
  );
};

export default Index;