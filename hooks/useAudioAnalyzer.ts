import { useRef, useCallback } from "react";
import { useCharacterStore } from "@/store/useCharacterStore";
import { ARKIT_LIP, LEGACY_VISEMES, lipState, legacyLipState } from "@/lib/visemeState";

function bandEnergy(data: Uint8Array, minHz: number, maxHz: number, binHz: number): number {
  const lo = Math.max(0, Math.floor(minHz / binHz));
  const hi = Math.min(data.length - 1, Math.ceil(maxHz / binHz));
  if (hi <= lo) return 0;
  let sum = 0;
  for (let i = lo; i <= hi; i++) sum += data[i];
  return sum / ((hi - lo + 1) * 255);
}

export function useAudioAnalyzer() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef   = useRef<AudioBufferSourceNode | null>(null);
  const animRef     = useRef<number>(0);
  const tRef        = useRef(0);

  const setAudioVolume = useCharacterStore((s) => s.setAudioVolume);
  const setIsSpeaking  = useCharacterStore((s) => s.setIsSpeaking);

  const resetLip = () => {
    ARKIT_LIP.forEach(k => { lipState.target[k] = 0; });
    LEGACY_VISEMES.forEach(k => { legacyLipState.target[k] = 0; });
    legacyLipState.target['viseme_sil'] = 1;
    lipState.speaking = false;
  };

  const stopCurrent = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    try { sourceRef.current?.stop(); } catch {}
    sourceRef.current?.disconnect();
    analyserRef.current?.disconnect();
    resetLip();
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
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.55;

    source.connect(analyser);
    analyser.connect(ctx.destination);
    sourceRef.current  = source;
    analyserRef.current = analyser;

    const data  = new Uint8Array(analyser.frequencyBinCount);
    const binHz = ctx.sampleRate / analyser.fftSize;

    const tick = () => {
      analyser.getByteFrequencyData(data);
      tRef.current += 0.016;
      const t = tRef.current;

      // ── Frequency bands ──────────────────────────────────────────────────
      const fund  = bandEnergy(data,   80,  300, binHz); // 기음
      const f1    = bandEnergy(data,  300,  900, binHz); // 모음 F1 (입 높이)
      const f2    = bandEnergy(data,  900, 2500, binHz); // 모음 F2 (입 앞뒤)
      const fric  = bandEnergy(data, 2500, 6000, binHz); // 마찰음
      const total = bandEnergy(data,   80, 6000, binHz);

      const speaking = total > 0.04;
      lipState.speaking = speaking;
      setAudioVolume(Math.min(total * 2.5, 1));

      // 음절 리듬 오실레이터 (~4-5 Hz 자연 발화 속도)
      const syl  = Math.sin(t * 4.5) * 0.5 + 0.5;
      const fast = Math.sin(t * 9.0) * 0.5 + 0.5;
      const amp  = Math.min(total * 2, 1);

      // ── ARKit 립 블렌드셰이프 매핑 ────────────────────────────────────────
      const L = lipState.target;
      ARKIT_LIP.forEach(k => { L[k] = 0; });

      if (speaking) {
        // jawOpen — 전체 볼륨이 주 드라이버
        L['jawOpen']           = f1 * amp * Math.max(syl, 0.3);

        // 입술 모양 — 모음 구분
        L['mouthFunnel']       = f1 * (1 - syl) * 0.8;   // O 모양
        L['mouthPucker']       = fund * (1 - syl) * 0.6;  // U 모양

        // 입꼬리 — E/I 소리
        L['mouthSmileLeft']    = f2 * fast * 0.55;
        L['mouthSmileRight']   = f2 * fast * 0.55;
        L['mouthStretchLeft']  = f2 * (1 - fast) * 0.4;
        L['mouthStretchRight'] = f2 * (1 - fast) * 0.4;

        // 아래턱 보조 움직임
        L['mouthLowerDownLeft']  = f1 * syl * amp * 0.5;
        L['mouthLowerDownRight'] = f1 * syl * amp * 0.5;
        L['mouthUpperUpLeft']    = f1 * (1 - syl) * 0.3;
        L['mouthUpperUpRight']   = f1 * (1 - syl) * 0.3;

        // 자음 — 마찰음 에너지
        L['mouthPressLeft']  = fric * (fast > 0.75 ? 0.6 : 0);
        L['mouthPressRight'] = fric * (fast > 0.75 ? 0.6 : 0);
        L['mouthDimpleLeft'] = fric * fast * 0.35;
        L['mouthDimpleRight']= fric * fast * 0.35;

        // 입술 말기 (bilabial: p/b/m)
        L['mouthRollLower']  = fund * (fast > 0.8 ? 0.5 : 0);
        L['mouthRollUpper']  = fund * (fast > 0.8 ? 0.4 : 0);
        L['mouthShrugLower'] = f1 * 0.25;
        L['mouthShrugUpper'] = f1 * 0.2;
      }

      // ── Legacy Oculus Viseme 동시 업데이트 (fallback GLB용) ───────────────
      const V = legacyLipState.target;
      LEGACY_VISEMES.forEach(k => { V[k] = 0; });
      if (speaking) {
        V['viseme_aa'] = f1 * syl * amp;
        V['viseme_O']  = f1 * (1 - syl) * amp * 0.75;
        V['viseme_U']  = fund * (1 - syl) * 0.55;
        V['viseme_E']  = f2 * fast * 0.65;
        V['viseme_I']  = f2 * (1 - fast) * 0.60;
        V['viseme_PP'] = fund * (fast > 0.75 ? 0.75 : 0);
        V['viseme_FF'] = f2 * fric * 0.55;
        V['viseme_DD'] = f1 * (fast > 0.65 ? 0.45 : 0);
        V['viseme_kk'] = f2 * (fast > 0.80 ? 0.45 : 0);
        V['viseme_CH'] = fric * fast * 0.65;
        V['viseme_SS'] = fric * (1 - fast) * 0.75;
        V['viseme_TH'] = fric * 0.28;
        V['viseme_nn'] = f1 * 0.28;
        V['viseme_RR'] = f2 * (syl > 0.5 ? 0.35 : 0);
        V['viseme_sil'] = 0;
      } else {
        V['viseme_sil'] = 1;
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
      resetLip();
    };
  }, [stopCurrent, setAudioVolume, setIsSpeaking]);

  return { playAudio, stopCurrent };
}
