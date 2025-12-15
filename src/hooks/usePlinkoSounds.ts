import { useCallback, useRef } from 'react';

const createOscillator = (
  audioContext: AudioContext,
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.1
) => {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  
  gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
};

const createNoise = (audioContext: AudioContext, duration: number, volume: number = 0.05) => {
  const bufferSize = audioContext.sampleRate * duration;
  const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const output = buffer.getChannelData(0);
  
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }
  
  const source = audioContext.createBufferSource();
  const gainNode = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();
  
  source.buffer = buffer;
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(2000, audioContext.currentTime);
  
  source.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  
  source.start(audioContext.currentTime);
};

const createLaserSound = (audioContext: AudioContext, startFreq: number, endFreq: number, duration: number, volume: number = 0.1) => {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.type = 'sawtooth';
  oscillator.frequency.setValueAtTime(startFreq, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(endFreq, audioContext.currentTime + duration);
  
  gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
};

export const usePlinkoSounds = () => {
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Soft chime bounce sound
  const playBounce = useCallback(() => {
    const ctx = getAudioContext();
    const freq = 600 + Math.random() * 300;
    createOscillator(ctx, freq, 0.08, 'sine', 0.03);
  }, [getAudioContext]);

  // Gentle whoosh drop sound
  const playDrop = useCallback(() => {
    const ctx = getAudioContext();
    createOscillator(ctx, 300, 0.15, 'sine', 0.04);
    createOscillator(ctx, 450, 0.1, 'triangle', 0.02);
  }, [getAudioContext]);

  // Energy field landing
  const playSlotLand = useCallback(() => {
    const ctx = getAudioContext();
    createOscillator(ctx, 600, 0.08, 'sine', 0.1);
    setTimeout(() => createOscillator(ctx, 800, 0.08, 'sine', 0.08), 40);
    setTimeout(() => createOscillator(ctx, 1000, 0.1, 'sine', 0.06), 80);
    setTimeout(() => createOscillator(ctx, 1200, 0.15, 'triangle', 0.05), 120);
  }, [getAudioContext]);

  // Victory fanfare - space epic style
  const playWinner = useCallback(() => {
    const ctx = getAudioContext();
    const notes = [523, 659, 784, 1047, 1319]; // C5, E5, G5, C6, E6
    notes.forEach((freq, i) => {
      setTimeout(() => {
        createOscillator(ctx, freq, 0.4, 'sine', 0.12);
        createOscillator(ctx, freq * 1.5, 0.3, 'triangle', 0.06);
        createOscillator(ctx, freq * 2, 0.2, 'sine', 0.04);
      }, i * 120);
    });
  }, [getAudioContext]);

  // Alien transmission sound (replaces Arrr)
  const playAlienTransmission = useCallback(() => {
    const ctx = getAudioContext();
    // Warbling alien sound
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc1.type = 'sine';
    osc2.type = 'sine';
    
    osc1.frequency.setValueAtTime(400, ctx.currentTime);
    osc1.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.2);
    osc1.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.4);
    
    osc2.frequency.setValueAtTime(800, ctx.currentTime);
    osc2.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.2);
    osc2.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.4);
    
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    
    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.5);
    osc2.stop(ctx.currentTime + 0.5);
  }, [getAudioContext]);

  return {
    playBounce,
    playDrop,
    playSlotLand,
    playWinner,
    playArrr: playAlienTransmission, // Keep same API name for compatibility
  };
};