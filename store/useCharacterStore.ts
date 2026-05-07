import { create } from "zustand";

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
  addMessage: (msg: Omit<Message, "id" | "timestamp">) => void;
  setIsRecording: (val: boolean) => void;
  setIsProcessing: (val: boolean) => void;
  setIsSpeaking: (val: boolean) => void;
  setCurrentEmotion: (emotion: Emotion) => void;
  setAudioVolume: (volume: number) => void;
}

export const useCharacterStore = create<CharacterStore>((set) => ({
  messages: [
    {
      id: "welcome",
      role: "assistant",
      text: "Hello! I'm your AI English tutor. Hold the mic button and start speaking. I'll help you improve your English!",
      emotion: "happy",
      timestamp: new Date(),
    },
  ],
  isRecording: false,
  isProcessing: false,
  isSpeaking: false,
  currentEmotion: "neutral",
  audioVolume: 0,
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
}));
