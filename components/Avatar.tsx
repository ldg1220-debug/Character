"use client";

import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";
import { useCharacterStore } from "@/store/useCharacterStore";
import { PERSONAS } from "@/lib/personas";
import { VISEMES, visemeState, type VisemeName } from "@/lib/visemeState";
import SunnyCharacter from "./characters/SunnyCharacter";

// ─── Human RPM Avatar ────────────────────────────────────────────────────────

function HumanAvatar({ url, personaId }: { url: string; personaId: string }) {
  const groupRef  = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(url);
  const { actions } = useAnimations(animations, groupRef);

  const isSpeaking    = useCharacterStore((s) => s.isSpeaking);
  const currentEmotion = useCharacterStore((s) => s.currentEmotion);

  const meshesRef  = useRef<THREE.Mesh[]>([]);
  const blinkTimer = useRef(0);
  const tRef       = useRef(0);

  // Collect morph-target meshes once model is loaded
  useEffect(() => {
    const meshes: THREE.Mesh[] = [];
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.morphTargetDictionary) {
        meshes.push(child);
      }
    });
    meshesRef.current = meshes;
  }, [scene]);

  // Play idle animation if present
  useEffect(() => {
    const idle =
      actions["Idle"] || actions["idle"] ||
      actions["Armature|mixamo.com|Layer0"] ||
      Object.values(actions)[0];
    if (idle) { idle.reset().fadeIn(0.5).play(); idle.setLoop(THREE.LoopRepeat, Infinity); }
  }, [actions]);

  // Helper: set a single morph target on all meshes
  const setMorph = (name: string, value: number) => {
    for (const mesh of meshesRef.current) {
      const idx = mesh.morphTargetDictionary?.[name];
      if (idx !== undefined && mesh.morphTargetInfluences) {
        mesh.morphTargetInfluences[idx] = value;
      }
    }
  };

  useFrame((_, delta) => {
    tRef.current      += delta;
    blinkTimer.current += delta;
    const t = tRef.current;

    // ── Viseme lip sync (smooth lerp toward target) ──────────────────────
    for (const v of VISEMES) {
      visemeState.current[v as VisemeName] = THREE.MathUtils.lerp(
        visemeState.current[v as VisemeName],
        visemeState.target[v as VisemeName],
        Math.min(delta * 18, 1),
      );
      setMorph(v, visemeState.current[v as VisemeName]);
    }

    // ── Eye blink ─────────────────────────────────────────────────────────
    const bp = blinkTimer.current % 4;
    const blinkVal = bp < 0.08 ? bp / 0.08 : bp < 0.16 ? (0.16 - bp) / 0.08 : 0;
    setMorph("eyeBlinkLeft",  blinkVal);
    setMorph("eyeBlinkRight", blinkVal);

    // ── Emotion expressions ───────────────────────────────────────────────
    setMorph("mouthSmileLeft",   currentEmotion === "happy"     ? 0.7 : 0);
    setMorph("mouthSmileRight",  currentEmotion === "happy"     ? 0.7 : 0);
    setMorph("browOuterUpLeft",  currentEmotion === "surprised" ? 0.8 : 0);
    setMorph("browOuterUpRight", currentEmotion === "surprised" ? 0.8 : 0);
    setMorph("browDownLeft",     currentEmotion === "thinking"  ? 0.5 : 0);
    setMorph("browDownRight",    currentEmotion === "thinking"  ? 0.5 : 0);

    // ── Head movement ─────────────────────────────────────────────────────
    if (groupRef.current) {
      const nodTarget  = isSpeaking ? Math.sin(t * 3.2) * 0.04 : 0;
      const swayTarget = Math.sin(t * 0.8) * 0.012;
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, nodTarget, 0.08);
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, swayTarget, 0.04);
    }
  });

  return (
    <group ref={groupRef} position={[0, -1.55, 0]}>
      <primitive object={scene} />
    </group>
  );
}

// ─── Router ──────────────────────────────────────────────────────────────────

export default function Avatar() {
  const currentPersona = useCharacterStore((s) => s.currentPersona);
  const audioVolume    = useCharacterStore((s) => s.audioVolume);
  const isSpeaking     = useCharacterStore((s) => s.isSpeaking);
  const currentEmotion = useCharacterStore((s) => s.currentEmotion);
  const persona        = PERSONAS[currentPersona];

  if (currentPersona === "sunny") {
    return (
      <SunnyCharacter
        audioVolume={audioVolume}
        isSpeaking={isSpeaking}
        emotion={currentEmotion}
      />
    );
  }

  if (!persona.avatarUrl) return null;

  return <HumanAvatar url={persona.avatarUrl} personaId={currentPersona} />;
}
