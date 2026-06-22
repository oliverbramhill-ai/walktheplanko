import { useState } from 'react';
import { PlinkoGame } from '@/components/PlinkoGame';
import { OnboardingModal } from '@/components/OnboardingModal';
import { hasRoom, setRoom } from '@/lib/room';

const Index = () => {
  const [roomReady, setRoomReady] = useState(hasRoom());

  const handleOnboardingComplete = (code: string) => {
    setRoom(code);
    setRoomReady(true);
  };

  return (
    <main className="min-h-screen ocean-gradient py-6">
      {!roomReady && <OnboardingModal onComplete={handleOnboardingComplete} />}
      {roomReady && <PlinkoGame />}
    </main>
  );
};

export default Index;
