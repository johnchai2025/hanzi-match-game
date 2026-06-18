import https from 'https';
import { GoogleGenAI, Modality } from '@google/genai';

const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
let proxyReady = false;

async function ensureProxySupport() {
  if (proxyReady) return;
  proxyReady = true;

  const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy ||
    process.env.HTTP_PROXY || process.env.http_proxy;
  if (!proxyUrl) return;

  try {
    const { setGlobalDispatcher, ProxyAgent } = await import('undici');
    setGlobalDispatcher(new ProxyAgent(proxyUrl));
  } catch (error) {
    console.warn('Failed to configure proxy for Gemini requests:', error);
  }
}

export async function generateWordCardImage(
  word: string,
  animal: string,
  scene: string
): Promise<string> {
  if (!API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  await ensureProxySupport();
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const prompt = `绘本插画风格，一只可爱的${animal}在${scene}里，画面温馨地表现”${word}”这个中文词语的意思。
色彩鲜艳明亮，卡通可爱，适合6岁小朋友欣赏，构图简洁，画面中不要出现任何文字、汉字、拼音、字幕或标牌。`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: prompt,
    config: {
      responseModalities: [Modality.IMAGE, Modality.TEXT],
      imageConfig: { aspectRatio: '1:1', imageSize: '1K' },
    },
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const imageData = parts.find(part => part.inlineData?.data)?.inlineData?.data;

  if (!imageData) {
    const textParts = parts.filter(p => p.text).map(p => p.text).join(' ');
    throw new Error(`No image data in response. Text: ${textParts || '(none)'}`);
  }

  return `data:image/png;base64,${imageData}`;
}

const STORY_TYPES = [
  '探险冒险，主角在途中有意外发现',
  '帮助一个遇到麻烦的小伙伴，结局出人意料',
  '一个有趣的误会，最后被笑着解开',
  '发现了一个小秘密，结尾谜底令人惊喜',
  '遇到了一次小失败，却收获了更好的东西',
  '独自完成了一件有点难的事，心里满满自豪',
];

export async function generateStory(
  words: string[],
  animal: string,
  characterName: string,
  scene: string
): Promise<string> {
  const nvKey = process.env.NVIDIA_API_KEY;
  if (!nvKey) throw new Error('NVIDIA_API_KEY is not configured');

  const storyType = STORY_TYPES[Math.floor(Math.random() * STORY_TYPES.length)];

  const prompt = `你是专门为6-9岁中国小朋友创作故事的儿童文学作家，文笔活泼，善用拟声词和比喻。

【任务】用这${words.length}个词语：${words.join('、')}
为主角${characterName}（一只${animal}）写一个发生在${scene}的短故事。

【故事类型】${storyType}

【格式要求】
- 150-200字，分2-3自然段，段与段之间空一行
- 不要写标题

【创作要求】
- 每个词语在故事里出现至少1次，且真正推动情节（不是简单列举）
- 每个词语按照它在汉语里真实的语法用法出现：季节/时间词（春天、冬日等）做时间背景，抽象词做感受描写，不要把它们当成可以拿起或触碰的具体物品
- 故事有清晰的起因、转折、结局
- 加入${characterName}说的话或内心想法，用引号""标出
- 用生动的动作、颜色、声音描写，让画面栩栩如生
- 结局要出乎意料或温馨有趣，让小朋友想再读一遍

【禁止】不要用"走着走着""拍起手来""都是今天的新朋友"等套话；不要结尾列举词语总结；不要任何Markdown格式。

只输出故事正文。`;

  const body = JSON.stringify({
    model: 'deepseek-ai/deepseek-v4-flash',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 600,
    temperature: 0.9,
  });

  return new Promise<string>((resolve, reject) => {
    const req = https.request({
      hostname: 'integrate.api.nvidia.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${nvKey}`,
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 30000,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`NVIDIA API error ${res.statusCode}: ${data}`));
          return;
        }
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.message?.content?.trim() ?? '';
          if (!content) reject(new Error('Empty response from NVIDIA API'));
          else resolve(content);
        } catch (e) {
          reject(new Error(`JSON parse error: ${data.slice(0, 200)}`));
        }
      });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('NVIDIA API request timed out')); });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}
