"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useCharacterStore } from "@/store/useCharacterStore";
import { useAudioAnalyzer } from "@/hooks/useAudioAnalyzer";
import type { Emotion } from "@/store/useCharacterStore";

export default function ChatUI() {
  const {
    messages,
    isRecording,
    isProcessing,
    isSpeaking,
    addMessage,
    setIsRecording,
    setIsProcessing,
    setCurrentEmotion,
  } = useCharacterStore();

  const { playAudio } = useAudioAnalyzer();
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
      setError("Microphone access denied. Please allow microphone access.");
    }
  }, [setIsRecording]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }, [setIsRecording]);

  const processAudio = async (blob: Blob) => {
    setIsProcessing(true);
    try {
      const form = new FormData();
      form.append("audio", blob, "recording.webm");

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
    ? "Speaking..."
    : "Hold to speak";

  return (
    <div className="absolute inset-0 flex flex-col pointer-events-none">
      {/* Chat messages */}
      <div className="flex-1 flex flex-col justify-end px-4 pb-2 overflow-hidden">
        <div className="max-h-64 overflow-y-auto scrollbar-hide flex flex-col gap-2 pointer-events-auto">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl text-sm ${
                  msg.role === "user"
                    ? "bg-accent text-black rounded-tr-sm"
                    : "bg-white/10 backdrop-blur-sm text-white rounded-tl-sm border border-white/20"
                }`}
              >
                {msg.correction && (
                  <p className="text-xs text-orange-300 mb-1 italic">
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
        <p className="text-white/60 text-sm">{statusText}</p>

        {/* Mic button */}
        <button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          disabled={isProcessing || isSpeaking}
          className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl transition-all duration-200 select-none
            ${
              isRecording
                ? "bg-red-500 scale-110 shadow-[0_0_30px_rgba(239,68,68,0.7)]"
                : isProcessing || isSpeaking
                ? "bg-white/20 cursor-not-allowed"
                : "bg-accent hover:scale-105 shadow-[0_0_20px_rgba(222,255,154,0.4)] active:scale-95"
            }`}
        >
          {isProcessing ? "⏳" : isRecording ? "🔴" : isSpeaking ? "🔊" : "🎤"}
        </button>
      </div>
    </div>
  );
}
