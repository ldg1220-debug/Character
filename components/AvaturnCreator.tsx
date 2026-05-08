"use client";

import { useEffect, useRef, useState } from "react";
import { useCharacterStore } from "@/store/useCharacterStore";
import { PERSONAS, PersonaId } from "@/lib/personas";

const AVATURN_EMBED = "https://avaturn.me/embed";

// localStorage keys
const storageKey = (id: PersonaId) => `avaturn_url_${id}`;

export function loadSavedAvatarUrl(id: PersonaId): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(storageKey(id));
}

interface Props {
  onClose: () => void;
}

export default function AvaturnCreator({ onClose }: Props) {
  const currentPersona = useCharacterStore((s) => s.currentPersona);
  const [targetPersona, setTargetPersona] = useState<PersonaId>(
    currentPersona === "sunny" ? "aria" : currentPersona
  );
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const humanPersonas: PersonaId[] = ["aria", "kai", "sterling"];

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (!e.data) return;

      // Avaturn sends { source: "avaturn", eventName: "v2.avatar.exported", data: { url } }
      if (
        (e.data.source === "avaturn" || e.data.type === "v2.avatar.exported") &&
        (e.data.data?.url || e.data.url)
      ) {
        const url: string = e.data.data?.url ?? e.data.url;
        if (!url.endsWith(".glb") && !url.includes(".glb")) return;

        // Append ARKit + Oculus morph target params if missing
        const finalUrl = url.includes("morphTargets")
          ? url
          : `${url}${url.includes("?") ? "&" : "?"}morphTargets=ARKit,Oculus+Visemes&textureAtlas=1024`;

        localStorage.setItem(storageKey(targetPersona), finalUrl);
        setStatus("saved");

        // Prompt page reload so Avatar picks up the new URL
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [targetPersona]);

  const persona = PERSONAS[targetPersona];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative flex flex-col w-full max-w-4xl h-[90vh] rounded-2xl overflow-hidden bg-[#0D0D1A] border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-[#0D0D1A]">
          <div className="flex items-center gap-3">
            <span className="text-white font-semibold text-sm">
              Avaturn Creator
            </span>
            <span className="text-white/40 text-xs">—</span>
            <span className="text-white/60 text-xs">
              Create a 3D avatar and it will be saved for{" "}
              <span className="text-white">{persona.name}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Persona selector */}
            {humanPersonas.map((id) => {
              const p = PERSONAS[id];
              const saved = typeof window !== "undefined" && !!localStorage.getItem(storageKey(id));
              return (
                <button
                  key={id}
                  onClick={() => { setTargetPersona(id); setStatus("idle"); }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all
                    ${targetPersona === id
                      ? "bg-white/15 text-white"
                      : "text-white/40 hover:text-white/70"
                    }`}
                >
                  {p.emoji} {p.name}
                  {saved && <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />}
                </button>
              );
            })}

            <button
              onClick={onClose}
              className="ml-2 p-1.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Status banner */}
        {status === "saved" && (
          <div className="px-5 py-2 bg-green-500/20 border-b border-green-500/30 text-green-300 text-xs text-center">
            Avatar saved for {persona.name}! Reloading…
          </div>
        )}

        {/* Instruction bar */}
        <div className="px-5 py-2 bg-white/5 border-b border-white/5 text-white/40 text-xs">
          1. Customize your avatar &nbsp;→&nbsp; 2. Click <strong className="text-white/60">Export / Use this avatar</strong> &nbsp;→&nbsp; URL is saved automatically
        </div>

        {/* Avaturn iframe */}
        <iframe
          ref={iframeRef}
          src={AVATURN_EMBED}
          allow="camera *; microphone *; xr-spatial-tracking *"
          className="flex-1 w-full border-0"
          title="Avaturn Avatar Creator"
        />
      </div>
    </div>
  );
}
