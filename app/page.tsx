"use client";

import dynamic from "next/dynamic";
import ChatUI from "@/components/ChatUI";

const Experience = dynamic(() => import("@/components/Experience"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-white/40 text-sm animate-pulse">Loading 3D Avatar...</div>
    </div>
  ),
});

export default function Home() {
  return (
    <main className="relative w-screen h-screen overflow-hidden bg-gradient-to-b from-[#0a0a1a] via-[#0d0d20] to-[#0a0a15]">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-accent/5 blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />

      {/* 3D Canvas - full screen */}
      <div className="absolute inset-0">
        <Experience />
      </div>

      {/* App title */}
      <div className="absolute top-6 left-0 right-0 flex justify-center pointer-events-none">
        <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-5 py-2">
          <span className="text-accent text-lg">●</span>
          <span className="text-white font-medium text-sm tracking-wide">
            AI English Tutor
          </span>
        </div>
      </div>

      {/* Chat UI overlay */}
      <ChatUI />
    </main>
  );
}
