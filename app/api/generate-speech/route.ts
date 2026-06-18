import { NextRequest, NextResponse } from 'next/server';
import { synthesizeSpeech } from '@/lib/edge-tts';

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: 'Missing text' }, { status: 400 });
  }

  try {
    const audioBuffer = await synthesizeSpeech(text);
    const audioBase64 = audioBuffer.toString('base64');
    return NextResponse.json({ audioBase64 });
  } catch (err) {
    console.error('[generate-speech] Edge TTS error:', err);
    return NextResponse.json({ unsupported: true });
  }
}
