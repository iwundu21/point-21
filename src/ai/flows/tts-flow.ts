
'use server';
/**
 * @fileOverview A Text-to-Speech (TTS) flow using Genkit.
 *
 * - generateAirdropSong - Generates an audio clip from text.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import wav from 'wav';
import { googleAI } from '@genkit-ai/googleai';

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    const bufs: any[] = [];
    writer.on('error', reject);
    writer.on('data', function (d) {
      bufs.push(d);
    });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}

const AirdropSongOutputSchema = z.object({
  media: z.string().describe("The base64 encoded WAV audio data URI."),
});
export type AirdropSongOutput = z.infer<typeof AirdropSongOutputSchema>;

export async function generateAirdropSong(promptText: string): Promise<AirdropSongOutput> {
  return ttsFlow(promptText);
}


const ttsFlow = ai.defineFlow(
  {
    name: 'ttsFlow',
    inputSchema: z.string(),
    outputSchema: AirdropSongOutputSchema,
  },
  async (query) => {
    const { media } = await ai.generate({
      model: googleAI.model('gemini-2.5-flash-preview-tts'),
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Algenib' }, // A friendly, sweet voice
          },
        },
      },
      prompt: query,
    });

    if (!media) {
      throw new Error('No media returned from TTS model');
    }

    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );
    
    const wavBase64 = await toWav(audioBuffer);

    return {
      media: 'data:audio/wav;base64,' + wavBase64,
    };
  }
);
