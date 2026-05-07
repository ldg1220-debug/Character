"use client";

import { useCharacterStore } from "@/store/useCharacterStore";
import { PERSONAS, PERSONA_ORDER } from "@/lib/personas";

export default function PersonaPicker() {
  const currentPersona = useCharacterStore((s) => s.currentPersona);
  const setPersona = useCharacterStore((s) => s.setPersona);

  return (
    <div className="flex gap-2 bg-black/30 backdrop-blur-md border border-white/10 rounded-2xl px-3 py-2 pointer-events-auto">
      {PERSONA_ORDER.map((id) => {
        const p = PERSONAS[id];
        const isActive = currentPersona === id;
        return (
          <button
            key={id}
            onClick={() => setPersona(id)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[60px]
              ${isActive
                ? "bg-white/15 shadow-inner"
                : "hover:bg-white/8 opacity-60 hover:opacity-90"
              }`}
          >
            <span className="text-xl leading-none">{p.emoji}</span>
            <span className="text-white text-[10px] font-medium tracking-wide leading-tight">
              {p.name}
            </span>
            <span
              className={`text-[9px] leading-tight ${
                isActive ? "text-white/70" : "text-white/40"
              }`}
            >
              {p.roleKo}
            </span>
          </button>
        );
      })}
    </div>
  );
}
