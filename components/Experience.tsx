"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import Avatar from "./Avatar";
import { useCharacterStore } from "@/store/useCharacterStore";
import { PERSONAS } from "@/lib/personas";

export default function Experience() {
  const persona = useCharacterStore((s) => s.currentPersona);
  const colors = PERSONAS[persona].colors;

  // Parse hex to THREE-compatible color values for lights
  const accentHex = colors.accessory;

  return (
    <Canvas
      key={persona}
      camera={{ position: [0, 0.1, 2.4], fov: 38 }}
      style={{ background: "transparent" }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[2, 5, 3]} intensity={1.1} castShadow />
      <directionalLight position={[-2, 2, -1]} intensity={0.35} color={colors.head} />
      <pointLight position={[0, 1.5, 2]} intensity={0.6} color={accentHex} />
      <pointLight position={[0, -0.5, 1.5]} intensity={0.25} color={colors.head} />

      <Suspense fallback={null}>
        <Environment preset="city" />
        <Avatar />
      </Suspense>

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 3.5}
        maxPolarAngle={Math.PI / 2}
        minAzimuthAngle={-Math.PI / 5}
        maxAzimuthAngle={Math.PI / 5}
      />
    </Canvas>
  );
}
