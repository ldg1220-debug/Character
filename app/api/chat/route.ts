import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are Aria, a friendly and encouraging English conversation tutor.
You help learners improve their English through natural conversation.

Always respond in JSON format with these exact keys:
{
  "correction": "If the user made a grammar or vocabulary mistake, write the corrected sentence here. If no mistakes, write null.",
  "reply": "Your conversational response in English. Keep it natural, warm, and under 3 sentences.",
  "emotion": "One of: neutral, happy, sad, surprised, thinking"
}

Rules:
- Be encouraging and positive
- Gently correct mistakes without being harsh
- Keep replies concise and conversational
- Match emotion to the context of the conversation`;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const audioFile = form.get("audio") as File;

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file" }, { status: 400 });
    }

    // STT with Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "en",
    });
    const transcript = transcription.text.trim();

    if (!transcript) {
      return NextResponse.json(
        { error: "Could not transcribe audio" },
        { status: 400 }
      );
    }

    // LLM with GPT-4o
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: transcript },
      ],
      response_format: { type: "json_object" },
      max_tokens: 300,
    });

    const rawJson = completion.choices[0].message.content ?? "{}";
    let parsed: { correction?: string | null; reply: string; emotion: string };
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      parsed = { reply: "I didn't quite catch that. Could you try again?", emotion: "neutral" };
    }

    // TTS
    const ttsResponse = await openai.audio.speech.create({
      model: "tts-1",
      voice: "nova",
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
