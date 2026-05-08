"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import ChatUI from "@/components/ChatUI";
import PersonaPicker from "@/components/PersonaPicker";
import { useCharacterStore } from "@/store/useCharacterStore";

const Experience = dynamic(() => import("@/components/Experience"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-white/30 text-sm animate-pulse">Loading...</div>
    </div>
  ),
});

const AvaturnCreator = dynamic(() => import("@/components/AvaturnCreator"), {
  ssr: false,
});

export default function Home() {
  const [showCreator, setShowCreator] = useState(false);
  const currentPersona = useCharacterStore((s) => s.currentPersona);
  const isSunny = currentPersona === "sunny";

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#080810]">
      {/* 3D Canvas */}
      <div className="absolute inset-0">
        <Experience />
      </div>

      {/* Persona selector — top */}
      <div className="absolute top-0 left-0 right-0 flex justify-center pt-5 pointer-events-none">
        <PersonaPicker />
      </div>

      {/* Avatar customise button — top right, hidden for Sunny */}
      {!isSunny && (
        <button
          onClick={() => setShowCreator(true)}
          className="absolute top-5 right-5 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full
            bg-white/8 hover:bg-white/15 border border-white/10 hover:border-white/25
            text-white/50 hover:text-white text-xs font-medium transition-all"
          title="Customise 3D avatar"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M2 14c0-3.31 2.69-6 6-6s6 2.69 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Avatar
        </button>
      )}

      {/* Chat UI overlay */}
      <ChatUI />

      {/* Avaturn creator modal */}
      {showCreator && <AvaturnCreator onClose={() => setShowCreator(false)} />}
    </main>
  );
}
