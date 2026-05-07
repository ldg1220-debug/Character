"use client";

import dynamic from "next/dynamic";
import ChatUI from "@/components/ChatUI";
import PersonaPicker from "@/components/PersonaPicker";

const Experience = dynamic(() => import("@/components/Experience"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-white/30 text-sm animate-pulse">Loading...</div>
    </div>
  ),
});

export default function Home() {
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

      {/* Chat UI overlay */}
      <ChatUI />
    </main>
  );
}
