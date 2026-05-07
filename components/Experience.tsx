"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import Avatar from "./Avatar";

export default function Experience() {
  return (
    <Canvas
      camera={{ position: [0, 0, 2.2], fov: 40 }}
      style={{ background: "transparent" }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[2, 4, 3]} intensity={1.2} castShadow />
      <directionalLight position={[-2, 2, -1]} intensity={0.4} color="#8888ff" />
      <pointLight position={[0, 2, 2]} intensity={0.5} color="#deff9a" />

      <Suspense fallback={null}>
        <Environment preset="city" />
        <Avatar />
      </Suspense>

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 1.8}
        minAzimuthAngle={-Math.PI / 4}
        maxAzimuthAngle={Math.PI / 4}
      />
    </Canvas>
  );
}
