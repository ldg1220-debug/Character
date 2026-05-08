"use client";

import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";
import { useCharacterStore } from "@/store/useCharacterStore";
import { PERSONAS } from "@/lib/personas";
import { ARKIT_LIP, LEGACY_VISEMES, lipState, legacyLipState } from "@/lib/visemeState";
import SunnyCharacter from "./characters/SunnyCharacter";
import { loadSavedAvatarUrl } from "./AvaturnCreator";

// ─── Human Avatar (Avaturn GLB) ──────────────────────────────────────────────

function HumanAvatar({ url }: { url: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(url);
  const { actions } = useAnimations(animations, groupRef);

  const isSpeaking     = useCharacterStore((s) => s.isSpeaking);
  const currentEmotion = useCharacterStore((s) => s.currentEmotion);

  const meshesRef  = useRef<THREE.Mesh[]>([]);
  const blinkTimer = useRef(0);
  const tRef       = useRef(0);

  // Detect which blend shape format this GLB uses
  const modeRef = useRef<"arkit" | "viseme" | "unknown">("unknown");

  useEffect(() => {
    const meshes: THREE.Mesh[] = [];
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.morphTargetDictionary) {
        meshes.push(child);
      }
    });
    meshesRef.current = meshes;

    // Auto-detect blend shape format
    const dict = meshes[0]?.morphTargetDictionary ?? {};
    if ("jawOpen" in dict) {
      modeRef.current = "arkit";
    } else if ("viseme_aa" in dict || "viseme_O" in dict) {
      modeRef.current = "viseme";
    } else {
      modeRef.current = "unknown";
      console.warn("[Avatar] No known lip sync blend shapes found in GLB.");
    }
  }, [scene]);

  // Play idle animation
  useEffect(() => {
    const idle =
      actions["Idle"] || actions["idle"] ||
      actions["Armature|mixamo.com|Layer0"] ||
      Object.values(actions)[0];
    if (idle) {
      idle.reset().fadeIn(0.5).play();
      idle.setLoop(THREE.LoopRepeat, Infinity);
    }
  }, [actions]);

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
    const lerpSpeed = Math.min(delta * 18, 1);

    // ── Lip sync — ARKit (Avaturn) ─────────────────────────────────────────
    if (modeRef.current === "arkit") {
      for (const k of ARKIT_LIP) {
        lipState.current[k] = THREE.MathUtils.lerp(
          lipState.current[k] ?? 0,
          lipState.target[k] ?? 0,
          lerpSpeed,
        );
        setMorph(k, lipState.current[k]);
      }
    }

    // ── Lip sync — legacy Oculus Visemes (fallback) ───────────────────────
    if (modeRef.current === "viseme") {
      for (const k of LEGACY_VISEMES) {
        legacyLipState.current[k] = THREE.MathUtils.lerp(
          legacyLipState.current[k] ?? 0,
          legacyLipState.target[k] ?? 0,
          lerpSpeed,
        );
        setMorph(k, legacyLipState.current[k]);
      }
    }

    // ── Eye blink ─────────────────────────────────────────────────────────
    const bp = blinkTimer.current % 4;
    const blinkVal =
      bp < 0.08 ? bp / 0.08 :
      bp < 0.16 ? (0.16 - bp) / 0.08 : 0;
    setMorph("eyeBlinkLeft",  blinkVal);
    setMorph("eyeBlinkRight", blinkVal);

    // ── Emotions ──────────────────────────────────────────────────────────
    const happy     = currentEmotion === "happy"     ? 0.7 : 0;
    const surprised = currentEmotion === "surprised" ? 0.8 : 0;
    const thinking  = currentEmotion === "thinking"  ? 0.5 : 0;

    setMorph("mouthSmileLeft",   happy);
    setMorph("mouthSmileRight",  happy);
    setMorph("browOuterUpLeft",  surprised);
    setMorph("browOuterUpRight", surprised);
    setMorph("browInnerUp",      surprised * 0.6);
    setMorph("browDownLeft",     thinking);
    setMorph("browDownRight",    thinking);
    setMorph("eyeSquintLeft",    thinking * 0.4);
    setMorph("eyeSquintRight",   thinking * 0.4);

    // ── Head movement ─────────────────────────────────────────────────────
    if (groupRef.current) {
      const nod  = isSpeaking ? Math.sin(t * 3.2) * 0.04 : 0;
      const sway = Math.sin(t * 0.7) * 0.01;
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, nod, 0.08);
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, sway, 0.04);
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

  // Prefer user-customized avatar saved in localStorage, fallback to persona default
  const savedUrl = loadSavedAvatarUrl(currentPersona as import("@/lib/personas").PersonaId);
  const avatarUrl = savedUrl ?? persona.avatarUrl;

  if (!avatarUrl) {
    return (
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#444" wireframe />
      </mesh>
    );
  }

  return <HumanAvatar url={avatarUrl} />;
}
