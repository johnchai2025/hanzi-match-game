import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

export async function synthesizeSpeech(text: string): Promise<Buffer> {
  const tts = new MsEdgeTTS();
  await tts.setMetadata('zh-CN-XiaoxiaoNeural', OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);

  const { audioStream } = tts.toStream(text);

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    audioStream.on('data', (chunk: Buffer) => chunks.push(chunk));
    audioStream.on('end', () => {
      const audio = Buffer.concat(chunks);
      if (audio.length === 0) reject(new Error('Edge TTS returned empty audio'));
      else resolve(audio);
    });
    audioStream.on('error', reject);
  });
}
