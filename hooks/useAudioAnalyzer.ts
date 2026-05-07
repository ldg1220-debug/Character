import { useRef, useCallback } from "react";
import { useCharacterStore } from "@/store/useCharacterStore";

export function useAudioAnalyzer() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const setAudioVolume = useCharacterStore((s) => s.setAudioVolume);
  const setIsSpeaking = useCharacterStore((s) => s.setIsSpeaking);

  const stopCurrent = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    sourceRef.current?.stop();
    sourceRef.current?.disconnect();
    analyserRef.current?.disconnect();
  }, []);

  const playAudio = useCallback(
    async (audioBuffer: ArrayBuffer) => {
      stopCurrent();

      if (!audioContextRef.current || audioContextRef.current.state === "closed") {
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") await ctx.resume();

      const decoded = await ctx.decodeAudioData(audioBuffer);
      const source = ctx.createBufferSource();
      source.buffer = decoded;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;

      source.connect(analyser);
      analyser.connect(ctx.destination);

      sourceRef.current = source;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const normalized = Math.min(avg / 80, 1);
        setAudioVolume(normalized);
        animFrameRef.current = requestAnimationFrame(tick);
      };

      setIsSpeaking(true);
      source.start();
      tick();

      source.onended = () => {
        cancelAnimationFrame(animFrameRef.current);
        setAudioVolume(0);
        setIsSpeaking(false);
      };
    },
    [stopCurrent, setAudioVolume, setIsSpeaking]
  );

  return { playAudio, stopCurrent };
}
