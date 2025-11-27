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
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1000, audioContext.currentTime);
  
  source.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  
  source.start(audioContext.currentTime);
};

export const usePlinkoSounds = () => {
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playBounce = useCallback(() => {
    const ctx = getAudioContext();
    const freq = 200 + Math.random() * 300;
    createOscillator(ctx, freq, 0.05, 'triangle', 0.08);
    createNoise(ctx, 0.02, 0.03);
  }, [getAudioContext]);

  const playDrop = useCallback(() => {
    const ctx = getAudioContext();
    createOscillator(ctx, 150, 0.15, 'sine', 0.15);
    createNoise(ctx, 0.1, 0.08);
  }, [getAudioContext]);

  const playSlotLand = useCallback(() => {
    const ctx = getAudioContext();
    createOscillator(ctx, 400, 0.1, 'sine', 0.12);
    setTimeout(() => createOscillator(ctx, 500, 0.1, 'sine', 0.1), 50);
    setTimeout(() => createOscillator(ctx, 600, 0.15, 'sine', 0.08), 100);
  }, [getAudioContext]);

  const playWinner = useCallback(() => {
    const ctx = getAudioContext();
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => {
        createOscillator(ctx, freq, 0.3, 'sine', 0.15);
        createOscillator(ctx, freq * 1.5, 0.2, 'triangle', 0.08);
      }, i * 150);
    });
  }, [getAudioContext]);

  const playArrr = useCallback(() => {
    const ctx = getAudioContext();
    // Low growly "arrr" sound
    createOscillator(ctx, 100, 0.4, 'sawtooth', 0.1);
    createOscillator(ctx, 150, 0.3, 'triangle', 0.08);
    createNoise(ctx, 0.3, 0.05);
  }, [getAudioContext]);

  return {
    playBounce,
    playDrop,
    playSlotLand,
    playWinner,
    playArrr,
  };
};
