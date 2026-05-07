"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useCharacterStore } from "@/store/useCharacterStore";
import { useAudioAnalyzer } from "@/hooks/useAudioAnalyzer";
import { PERSONAS } from "@/lib/personas";
import type { Emotion } from "@/store/useCharacterStore";

export default function ChatUI() {
  const {
    messages,
    isRecording,
    isProcessing,
    isSpeaking,
    currentPersona,
    addMessage,
    setIsRecording,
    setIsProcessing,
    setCurrentEmotion,
  } = useCharacterStore();

  const { playAudio } = useAudioAnalyzer();
  const persona = PERSONAS[currentPersona];
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startRecording = useCallback(async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await processAudio(blob);
      };

      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
    } catch {
      setError("Microphone access denied.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setIsRecording, currentPersona]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }, [setIsRecording]);

  const processAudio = async (blob: Blob) => {
    setIsProcessing(true);
    try {
      const form = new FormData();
      form.append("audio", blob, "recording.webm");
      form.append("personaId", currentPersona);

      const res = await fetch("/api/chat", { method: "POST", body: form });
      if (!res.ok) throw new Error("API error");

      const data = await res.json();

      addMessage({ role: "user", text: data.transcript });
      addMessage({
        role: "assistant",
        text: data.reply,
        correction: data.correction,
        emotion: data.emotion as Emotion,
      });

      setCurrentEmotion((data.emotion as Emotion) || "neutral");

      if (data.audioBase64) {
        const binary = atob(data.audioBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        await playAudio(bytes.buffer);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const statusText = isRecording
    ? "Listening..."
    : isProcessing
    ? "Processing..."
    : isSpeaking
    ? `${persona.name} is speaking...`
    : "Hold to speak";

  const micBgIdle = {
    sunny: "bg-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.5)]",
    aria: "bg-purple-400 shadow-[0_0_20px_rgba(192,132,252,0.5)]",
    kai: "bg-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.5)]",
    sterling: "bg-slate-400 shadow-[0_0_20px_rgba(148,163,184,0.4)]",
  }[currentPersona];

  return (
    <div className="absolute inset-0 flex flex-col pointer-events-none">
      {/* Messages */}
      <div className="flex-1 flex flex-col justify-end px-4 pb-2 overflow-hidden">
        <div className="max-h-56 overflow-y-auto scrollbar-hide flex flex-col gap-2 pointer-events-auto">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed
                  ${msg.role === "user"
                    ? "bg-white/15 text-white rounded-tr-sm"
                    : "bg-black/40 backdrop-blur-sm text-white/90 rounded-tl-sm border border-white/10"
                  }`}
              >
                {msg.correction && (
                  <p className="text-xs text-orange-300 mb-1.5 italic leading-tight">
                    ✏️ {msg.correction}
                  </p>
                )}
                <p>{msg.text}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-red-400 text-xs text-center px-4 mb-2 pointer-events-auto">
          {error}
        </p>
      )}

      {/* Bottom controls */}
      <div className="flex flex-col items-center gap-3 pb-8 pointer-events-auto">
        <p className="text-white/50 text-xs tracking-wide">{statusText}</p>

        <button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
          onTouchEnd={stopRecording}
          disabled={isProcessing || isSpeaking}
          className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl
            transition-all duration-150 select-none touch-none
            ${isRecording
              ? "bg-red-500 scale-110 shadow-[0_0_32px_rgba(239,68,68,0.8)]"
              : isProcessing || isSpeaking
              ? "bg-white/15 cursor-not-allowed scale-95"
              : `${micBgIdle} hover:scale-105 active:scale-95`
            }`}
        >
          {isProcessing ? "⏳" : isRecording ? "🔴" : isSpeaking ? "🔊" : "🎤"}
        </button>
      </div>
    </div>
  );
}
