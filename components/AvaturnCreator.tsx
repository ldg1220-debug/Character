"use client";

import { useState, useRef } from "react";
import { useCharacterStore } from "@/store/useCharacterStore";
import { PERSONAS, PersonaId } from "@/lib/personas";

// localStorage key
const storageKey = (id: PersonaId) => `avatar_url_${id}`;

export function loadSavedAvatarUrl(id: PersonaId): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(storageKey(id));
}

function getSavedUrl(id: PersonaId): string {
  return (typeof window !== "undefined" && localStorage.getItem(storageKey(id))) || "";
}

interface Props {
  onClose: () => void;
}

const humanPersonas: PersonaId[] = ["aria", "kai", "sterling"];

const SKETCHFAB_ARKIT_URL = "https://sketchfab.com/search?q=arkit&features=downloadable&sort_by=-likeCount&type=models";

export default function AvatarConfigurator({ onClose }: Props) {
  const currentPersona = useCharacterStore((s) => s.currentPersona);
  const [targetPersona, setTargetPersona] = useState<PersonaId>(
    currentPersona === "sunny" ? "aria" : (currentPersona as PersonaId)
  );
  const [inputUrl, setInputUrl] = useState(() => getSavedUrl(targetPersona === "sunny" ? "aria" : currentPersona as PersonaId));
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const persona = PERSONAS[targetPersona];
  const hasSaved = (id: PersonaId) =>
    typeof window !== "undefined" && !!localStorage.getItem(storageKey(id));

  const switchPersona = (id: PersonaId) => {
    setTargetPersona(id);
    setInputUrl(getSavedUrl(id));
    setStatus("idle");
    setErrorMsg("");
  };

  const validate = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return "URL을 입력해주세요.";
    if (!trimmed.includes(".glb")) return "GLB 파일 URL이어야 합니다. (.glb 포함)";
    return null;
  };

  const save = () => {
    const trimmed = inputUrl.trim();
    const err = validate(trimmed);
    if (err) { setErrorMsg(err); setStatus("error"); return; }

    localStorage.setItem(storageKey(targetPersona), trimmed);
    setStatus("saved");
    setErrorMsg("");
    setTimeout(() => window.location.reload(), 900);
  };

  const reset = () => {
    localStorage.removeItem(storageKey(targetPersona));
    setInputUrl("");
    setStatus("idle");
    setErrorMsg("");
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".glb")) {
      setErrorMsg("GLB 파일만 업로드할 수 있습니다.");
      setStatus("error");
      return;
    }
    // Serve from /public/avatars/ — user must place file there manually.
    // Here we just set the expected public path as a hint.
    const publicPath = `/avatars/${file.name}`;
    setInputUrl(publicPath);
    setStatus("idle");
    setErrorMsg(`파일을 public/avatars/${file.name} 에 복사한 후 저장하세요.`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative flex flex-col w-full max-w-xl rounded-2xl overflow-hidden bg-[#0D0D1A] border border-white/10 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
          <span className="text-white font-semibold text-sm">아바타 설정</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Persona tabs */}
        <div className="flex gap-1 px-4 pt-4">
          {humanPersonas.map((id) => {
            const p = PERSONAS[id];
            return (
              <button
                key={id}
                onClick={() => switchPersona(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border
                  ${targetPersona === id
                    ? "bg-white/15 text-white border-white/20"
                    : "text-white/40 border-transparent hover:text-white/70"
                  }`}
              >
                {p.emoji} {p.name}
                {hasSaved(id) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        <div className="px-4 pt-4 pb-5 flex flex-col gap-4">
          {/* Current persona info */}
          <p className="text-white/40 text-xs">
            <span className="text-white/70">{persona.name}</span> 의 GLB 아바타 URL 또는 로컬 파일 경로를 입력하세요.
          </p>

          {/* URL input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-white/50 text-xs font-medium">GLB URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => { setInputUrl(e.target.value); setStatus("idle"); setErrorMsg(""); }}
                onKeyDown={(e) => e.key === "Enter" && save()}
                placeholder="https://… 또는 /avatars/model.glb"
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs
                  placeholder:text-white/20 focus:outline-none focus:border-white/30 transition"
              />
              <button
                onClick={save}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition"
              >
                저장
              </button>
            </div>
            {status === "saved" && (
              <p className="text-green-400 text-xs">저장됨! 잠시 후 새로고침…</p>
            )}
            {errorMsg && (
              <p className={`text-xs ${status === "error" ? "text-red-400" : "text-amber-400"}`}>
                {errorMsg}
              </p>
            )}
            {hasSaved(targetPersona) && status === "idle" && (
              <button onClick={reset} className="self-start text-white/30 hover:text-white/60 text-xs transition">
                현재 저장된 URL 초기화
              </button>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-white/25 text-xs">또는</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          {/* File hint */}
          <div className="flex flex-col gap-1.5">
            <label className="text-white/50 text-xs font-medium">로컬 GLB 파일</label>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-white/15
                hover:border-white/30 text-white/40 hover:text-white/70 text-xs transition text-left"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 2v8M5 5l3-3 3 3M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              GLB 파일 선택 (→ public/avatars/ 에 복사 필요)
            </button>
            <input ref={fileInputRef} type="file" accept=".glb" className="hidden" onChange={handleFile} />
          </div>

          {/* Sketchfab link */}
          <div className="rounded-xl bg-white/5 border border-white/8 p-3.5 flex flex-col gap-2">
            <p className="text-white/60 text-xs font-medium">Sketchfab에서 무료 ARKit 모델 찾기</p>
            <ol className="text-white/35 text-xs space-y-1 list-decimal list-inside">
              <li>아래 링크 → Downloadable 필터 적용된 ARKit 모델 검색</li>
              <li>모델 페이지 → <span className="text-white/55">Download</span> → <span className="text-white/55">Original / glTF</span></li>
              <li>.glb 파일을 <code className="text-white/50 bg-white/8 px-1 rounded">public/avatars/</code> 폴더에 복사</li>
              <li>위 입력란에 <code className="text-white/50 bg-white/8 px-1 rounded">/avatars/파일명.glb</code> 입력 후 저장</li>
            </ol>
            <a
              href={SKETCHFAB_ARKIT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 transition"
            >
              Sketchfab ARKit 모델 검색 열기
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path d="M2 10L10 2M10 2H5M10 2v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </a>
          </div>

          {/* morph target 확인 팁 */}
          <p className="text-white/25 text-xs leading-relaxed">
            팁: Sketchfab 모델 페이지 &gt; <span className="text-white/40">3D Settings</span> &gt;
            {" "}<span className="text-white/40">Animations</span> 탭에서 Morph Targets 항목이 있으면 립싱크 지원 모델입니다.
          </p>
        </div>
      </div>
    </div>
  );
}
