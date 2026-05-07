import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { PERSONAS, type PersonaId, type TtsVoice } from "@/lib/personas";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const audioFile = form.get("audio") as File;
    const personaId = (form.get("personaId") as PersonaId) ?? "kai";

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file" }, { status: 400 });
    }

    const persona = PERSONAS[personaId] ?? PERSONAS.kai;

    // STT — allow both English and Korean input
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
    });
    const transcript = transcription.text.trim();

    if (!transcript) {
      return NextResponse.json(
        { error: "Could not transcribe audio" },
        { status: 400 }
      );
    }

    // LLM with persona's system prompt
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: persona.systemPrompt },
        { role: "user", content: transcript },
      ],
      response_format: { type: "json_object" },
      max_tokens: 350,
    });

    const rawJson = completion.choices[0].message.content ?? "{}";
    let parsed: { correction?: string | null; reply: string; emotion: string };
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      parsed = {
        reply: "I didn't quite catch that. Could you try again?",
        emotion: "neutral",
      };
    }

    // TTS with persona's voice
    const ttsResponse = await openai.audio.speech.create({
      model: "tts-1",
      voice: persona.voice as TtsVoice,
      input: parsed.reply,
      response_format: "mp3",
    });

    const audioBuffer = await ttsResponse.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString("base64");

    return NextResponse.json({
      transcript,
      correction: parsed.correction || null,
      reply: parsed.reply,
      emotion: parsed.emotion || "neutral",
      audioBase64,
    });
  } catch (err) {
    console.error("Chat API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
