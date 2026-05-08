import { useRef, useCallback } from "react";
import { useCharacterStore } from "@/store/useCharacterStore";
import { VISEMES, visemeState, type VisemeName } from "@/lib/visemeState";

// Returns energy (0-1) in a frequency range
function bandEnergy(data: Uint8Array, minHz: number, maxHz: number, binHz: number): number {
  const lo = Math.floor(minHz / binHz);
  const hi = Math.min(Math.ceil(maxHz / binHz), data.length - 1);
  if (hi <= lo) return 0;
  let sum = 0;
  for (let i = lo; i <= hi; i++) sum += data[i];
  return sum / ((hi - lo + 1) * 255);
}

export function useAudioAnalyzer() {
  const audioCtxRef  = useRef<AudioContext | null>(null);
  const analyserRef  = useRef<AnalyserNode | null>(null);
  const sourceRef    = useRef<AudioBufferSourceNode | null>(null);
  const animRef      = useRef<number>(0);
  const tRef         = useRef(0);

  const setAudioVolume = useCharacterStore((s) => s.setAudioVolume);
  const setIsSpeaking  = useCharacterStore((s) => s.setIsSpeaking);

  const stopCurrent = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    sourceRef.current?.stop();
    sourceRef.current?.disconnect();
    analyserRef.current?.disconnect();
    // Reset viseme state to silence
    VISEMES.forEach(v => { visemeState.target[v as VisemeName] = 0; });
    visemeState.target['viseme_sil'] = 1;
    visemeState.speaking = false;
  }, []);

  const playAudio = useCallback(async (audioBuffer: ArrayBuffer) => {
    stopCurrent();

    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") await ctx.resume();

    const decoded = await ctx.decodeAudioData(audioBuffer.slice(0));
    const source  = ctx.createBufferSource();
    source.buffer = decoded;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;                  // 256 bins — good frequency resolution
    analyser.smoothingTimeConstant = 0.55;   // responsive but not jittery

    source.connect(analyser);
    analyser.connect(ctx.destination);

    sourceRef.current  = source;
    analyserRef.current = analyser;

    const data   = new Uint8Array(analyser.frequencyBinCount);
    const binHz  = (ctx.sampleRate / analyser.fftSize);

    const tick = () => {
      analyser.getByteFrequencyData(data);
      tRef.current += 0.016; // approximate frame delta
      const t = tRef.current;

      // ── Frequency band energies ──────────────────────────────────────────
      const fund   = bandEnergy(data,   80,  300, binHz); // fundamental voice
      const f1     = bandEnergy(data,  300,  900, binHz); // vowel formant 1
      const f2     = bandEnergy(data,  900, 2500, binHz); // vowel formant 2
      const fric   = bandEnergy(data, 2500, 6000, binHz); // fricatives / sibilants
      const total  = bandEnergy(data,   80, 6000, binHz); // overall amplitude

      const speaking = total > 0.04;
      visemeState.speaking = speaking;

      // Volume for store (existing UI feedback)
      const volume = Math.min(total * 2.5, 1);
      setAudioVolume(volume);

      // ── Viseme weights ────────────────────────────────────────────────────
      const w = visemeState.target;
      VISEMES.forEach(v => { w[v as VisemeName] = 0; });

      if (!speaking) {
        w['viseme_sil'] = 1;
      } else {
        // Syllable oscillators — mimic natural ~4-5 Hz speech rhythm
        const syl  = Math.sin(t * 4.5) * 0.5 + 0.5;   // slow syllable
        const fast = Math.sin(t * 9.0) * 0.5 + 0.5;   // fast micro-movement
        const amp  = Math.min(total * 2, 1);

        // Open vowels — driven by F1 (jaw height)
        w['viseme_aa'] = f1 * syl * amp;
        w['viseme_O']  = f1 * (1 - syl) * amp * 0.75;
        w['viseme_U']  = fund * (1 - syl) * 0.55;

        // Front/high vowels — driven by F2
        w['viseme_E']  = f2 * fast * 0.65;
        w['viseme_I']  = f2 * (1 - fast) * 0.60;

        // Bilabial — brief burst (p, b, m)
        w['viseme_PP'] = fund * (fast > 0.75 ? 1 : 0) * 0.75;

        // Labiodental (f, v)
        w['viseme_FF'] = f2 * fric * 0.55;

        // Alveolar (t, d)
        w['viseme_DD'] = f1 * (fast > 0.65 ? 1 : 0) * 0.45;

        // Velar (k, g)
        w['viseme_kk'] = f2 * (fast > 0.80 ? 1 : 0) * 0.45;

        // Palatal (ch, sh, j)
        w['viseme_CH'] = fric * fast * 0.65;

        // Sibilant (s, z)
        w['viseme_SS'] = fric * (1 - fast) * 0.75;

        // Dental (th)
        w['viseme_TH'] = fric * 0.28;

        // Nasal / lateral (n, l)
        w['viseme_nn'] = f1 * 0.28;

        // Rhotic (r)
        w['viseme_RR'] = f2 * (syl > 0.5 ? 0.35 : 0);

        w['viseme_sil'] = 0;
      }

      animRef.current = requestAnimationFrame(tick);
    };

    setIsSpeaking(true);
    source.start();
    tick();

    source.onended = () => {
      cancelAnimationFrame(animRef.current);
      setAudioVolume(0);
      setIsSpeaking(false);
      VISEMES.forEach(v => { visemeState.target[v as VisemeName] = 0; });
      visemeState.target['viseme_sil'] = 1;
      visemeState.speaking = false;
    };
  }, [stopCurrent, setAudioVolume, setIsSpeaking]);

  return { playAudio, stopCurrent };
}
