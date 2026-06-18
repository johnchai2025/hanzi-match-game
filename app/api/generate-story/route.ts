import { NextRequest, NextResponse } from 'next/server';
import { generateStory } from '@/lib/gemini';

function generateFallbackStory(words: string[], characterName: string, animal: string, scene: string) {
  const [w1, w2, w3, w4 = w1] = words;
  return `${characterName}是一只好奇心旺盛的${animal}，今天独自来到${scene}探险。

刚进入${scene}，${characterName}就发现了${w1}，它蹲下来仔细观察，忽然"嗖"的一声，旁边冒出了${w2}！"哇，这是什么？"它吃了一惊，却又觉得有趣极了。接着，${characterName}小心翼翼地摸了摸${w3}，没想到手感软软的，像棉花糖一样。

就在准备回家时，${characterName}遇见了${w4}。它灵机一动，把今天遇到的东西都画进了日记本。从此，${scene}里有一本画满奇妙事物的小册子，那是${characterName}最珍贵的宝贝。`;
}

export async function POST(request: NextRequest) {
  let words: string[] = [];
  let animal = '';
  let characterName = '';
  let scene = '';

  try {
    const body = await request.json();
    words = body.words;
    animal = body.animal;
    characterName = body.characterName;
    scene = body.scene;

    if (!words || !Array.isArray(words) || words.length < 3) {
      return NextResponse.json(
        { error: 'Need at least 3 words to generate a story' },
        { status: 400 }
      );
    }

    if (!animal || !characterName || !scene) {
      return NextResponse.json(
        { error: 'Missing required parameters: animal, characterName, scene' },
        { status: 400 }
      );
    }

    const story = await generateStory(words, animal, characterName, scene);

    return NextResponse.json({ story });
  } catch (error) {
    console.error('Story generation error:', error);
    if (Array.isArray(words) && words.length >= 3 && animal && characterName && scene) {
      return NextResponse.json({
        story: generateFallbackStory(words, characterName, animal, scene),
        fallback: true,
      });
    }

    return NextResponse.json(
      { error: 'Failed to generate story' },
      { status: 500 }
    );
  }
}
