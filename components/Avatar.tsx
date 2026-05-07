"use client";

import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";
import { useCharacterStore } from "@/store/useCharacterStore";

const AVATAR_URL =
  "https://models.readyplayer.me/64ad6724330633d0c9e6005c.glb?morphTargets=ARKit,Oculus+Visemes&textureAtlas=1024";

const MORPH_TARGETS = ["jawOpen", "mouthOpen", "viseme_O", "mouthDrop"];

export default function Avatar() {
  const groupRef = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(AVATAR_URL);
  const { actions, mixer } = useAnimations(animations, groupRef);

  const audioVolume = useCharacterStore((s) => s.audioVolume);
  const isSpeaking = useCharacterStore((s) => s.isSpeaking);
  const currentEmotion = useCharacterStore((s) => s.currentEmotion);

  const blinkTimerRef = useRef(0);
  const breathTimerRef = useRef(0);
  const headBobRef = useRef(0);
  const jawCurrentRef = useRef(0);

  // Collect all meshes with morph targets
  const morphMeshesRef = useRef<THREE.Mesh[]>([]);

  useEffect(() => {
    const meshes: THREE.Mesh[] = [];
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.morphTargetDictionary) {
        meshes.push(child);
      }
    });
    morphMeshesRef.current = meshes;
  }, [scene]);

  // Play idle animation if available
  useEffect(() => {
    const idleAction =
      actions["Idle"] ||
      actions["idle"] ||
      actions["Armature|mixamo.com|Layer0"] ||
      Object.values(actions)[0];

    if (idleAction) {
      idleAction.reset().fadeIn(0.5).play();
      idleAction.setLoop(THREE.LoopRepeat, Infinity);
    }
  }, [actions]);

  // Helper to set morph target value
  const setMorphTarget = (name: string, value: number) => {
    for (const mesh of morphMeshesRef.current) {
      const dict = mesh.morphTargetDictionary;
      const influences = mesh.morphTargetInfluences;
      if (!dict || !influences) continue;
      const idx = dict[name];
      if (idx !== undefined) {
        influences[idx] = value;
      }
    }
  };

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    blinkTimerRef.current += delta;
    breathTimerRef.current += delta;
    headBobRef.current += delta;

    // Smooth jaw open based on audio volume
    const targetJaw = isSpeaking ? audioVolume * 0.8 : 0;
    jawCurrentRef.current = THREE.MathUtils.lerp(
      jawCurrentRef.current,
      targetJaw,
      0.25
    );

    for (const name of MORPH_TARGETS) {
      setMorphTarget(name, jawCurrentRef.current);
    }

    // Eye blink every 3-5 seconds
    const blinkCycle = 4;
    const blinkPhase = blinkTimerRef.current % blinkCycle;
    const blinkVal = blinkPhase < 0.12 ? 1 : 0;
    setMorphTarget("eyeBlinkLeft", blinkVal);
    setMorphTarget("eyeBlinkRight", blinkVal);

    // Head bob when speaking
    if (isSpeaking) {
      groupRef.current.rotation.x =
        Math.sin(headBobRef.current * 1.5) * 0.015;
      groupRef.current.rotation.z =
        Math.sin(headBobRef.current * 0.8) * 0.008;
    } else {
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        0,
        0.05
      );
      groupRef.current.rotation.z = THREE.MathUtils.lerp(
        groupRef.current.rotation.z,
        0,
        0.05
      );
    }

    // Emotion morphs
    const happy = currentEmotion === "happy" ? 0.6 : 0;
    const surprised = currentEmotion === "surprised" ? 0.7 : 0;
    setMorphTarget("mouthSmileLeft", happy);
    setMorphTarget("mouthSmileRight", happy);
    setMorphTarget("browOuterUpLeft", surprised);
    setMorphTarget("browOuterUpRight", surprised);

    mixer?.update(delta);
  });

  return (
    <group ref={groupRef} position={[0, -1.6, 0]}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload(AVATAR_URL);
