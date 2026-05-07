"use client";

import { useCharacterStore } from "@/store/useCharacterStore";
import SunnyCharacter from "./characters/SunnyCharacter";
import AriaCharacter from "./characters/AriaCharacter";
import KaiCharacter from "./characters/KaiCharacter";
import SterlingCharacter from "./characters/SterlingCharacter";

export default function Avatar() {
  const audioVolume = useCharacterStore((s) => s.audioVolume);
  const isSpeaking = useCharacterStore((s) => s.isSpeaking);
  const currentEmotion = useCharacterStore((s) => s.currentEmotion);
  const currentPersona = useCharacterStore((s) => s.currentPersona);

  const props = { audioVolume, isSpeaking, emotion: currentEmotion };

  switch (currentPersona) {
    case "sunny":
      return <SunnyCharacter {...props} />;
    case "aria":
      return <AriaCharacter {...props} />;
    case "sterling":
      return <SterlingCharacter {...props} />;
    case "kai":
    default:
      return <KaiCharacter {...props} />;
  }
}
