import { create } from "zustand";
import { type PersonaId, DEFAULT_PERSONA, PERSONAS } from "@/lib/personas";

export type Emotion = "neutral" | "happy" | "sad" | "surprised" | "thinking";

export interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  correction?: string;
  emotion?: Emotion;
  timestamp: Date;
}

interface CharacterStore {
  messages: Message[];
  isRecording: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  currentEmotion: Emotion;
  audioVolume: number;
  currentPersona: PersonaId;
  addMessage: (msg: Omit<Message, "id" | "timestamp">) => void;
  setIsRecording: (val: boolean) => void;
  setIsProcessing: (val: boolean) => void;
  setIsSpeaking: (val: boolean) => void;
  setCurrentEmotion: (emotion: Emotion) => void;
  setAudioVolume: (volume: number) => void;
  setPersona: (id: PersonaId) => void;
}

function makeWelcomeMessage(personaId: PersonaId): Message {
  const persona = PERSONAS[personaId];
  return {
    id: "welcome",
    role: "assistant",
    text: persona.greeting,
    emotion: "happy",
    timestamp: new Date(),
  };
}

export const useCharacterStore = create<CharacterStore>((set) => ({
  messages: [makeWelcomeMessage(DEFAULT_PERSONA)],
  isRecording: false,
  isProcessing: false,
  isSpeaking: false,
  currentEmotion: "neutral",
  audioVolume: 0,
  currentPersona: DEFAULT_PERSONA,

  addMessage: (msg) =>
    set((state) => ({
      messages: [
        ...state.messages,
        { ...msg, id: crypto.randomUUID(), timestamp: new Date() },
      ],
    })),
  setIsRecording: (val) => set({ isRecording: val }),
  setIsProcessing: (val) => set({ isProcessing: val }),
  setIsSpeaking: (val) => set({ isSpeaking: val }),
  setCurrentEmotion: (emotion) => set({ currentEmotion: emotion }),
  setAudioVolume: (volume) => set({ audioVolume: volume }),

  setPersona: (id) =>
    set({
      currentPersona: id,
      messages: [makeWelcomeMessage(id)],
      currentEmotion: "neutral",
      isRecording: false,
      isProcessing: false,
      isSpeaking: false,
    }),
}));
