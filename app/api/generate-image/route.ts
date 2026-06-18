import { NextRequest, NextResponse } from 'next/server';
import { generateWordCardImage } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const { word, animal, scene } = await request.json();

    if (!word || !animal || !scene) {
      return NextResponse.json(
        { error: 'Missing required parameters: word, animal, scene' },
        { status: 400 }
      );
    }

    const imageBase64 = await generateWordCardImage(word, animal, scene);

    return NextResponse.json({ imageBase64 });
  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    );
  }
}
