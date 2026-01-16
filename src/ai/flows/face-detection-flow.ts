'use server';
/**
 * @fileOverview A face detection AI agent.
 *
 * - detectHumanFace - A function that handles the face detection process.
 * - DetectHumanFaceInput - The input type for the detectHumanFace function.
 * - DetectHumanFaceOutput - The return type for the detectHumanFace function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DetectHumanFaceInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a person's face, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type DetectHumanFaceInput = z.infer<typeof DetectHumanFaceInputSchema>;

const DetectHumanFaceOutputSchema = z.object({
  isHuman: z.boolean().describe('Whether the image contains a real, live human face and not an avatar, cartoon, or object.'),
  reason: z.string().describe('The reason for the determination.'),
  faceFingerprint: z.string().optional().describe('A unique, consistent, and concise textual identifier representing the key facial features. This should be consistent for the same person across different images.'),
});
export type DetectHumanFaceOutput = z.infer<typeof DetectHumanFaceOutputSchema>;

export async function detectHumanFace(input: DetectHumanFaceInput): Promise<DetectHumanFaceOutput> {
  return faceDetectionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'faceDetectionPrompt',
  input: {schema: DetectHumanFaceInputSchema},
  output: {schema: DetectHumanFaceOutputSchema},
  prompt: `You are a system that determines if an image contains a real, live human face and creates a unique fingerprint for it. Your response must be in JSON format.

  Analyze the provided image with high scrutiny. Your task is to determine if it's a real human face.
  - The face must be of a real, living person. It cannot be a photo of another photo, a screen, a doll, a statue, a drawing, an avatar, an animal, a wall, or any other non-human representation or inanimate object.
  - The person's eyes must be clearly visible and open. If the eyes are closed, obscured by hair, glasses, or shadows, or not clearly visible for any reason, you must fail the verification.
  
  Set the 'isHuman' field to true ONLY if you detect a real human face with two clearly visible, open eyes. Otherwise, set it to false.
  Provide a clear and concise reason for your decision in the 'reason' field. For example, "Eyes are not clearly visible," or "Image appears to be a cartoon character," or "Image does not contain a face."

  If 'isHuman' is true, generate a unique and consistent textual identifier for the face based on its key features in the 'faceFingerprint' field. This fingerprint should be a concise string that you can reliably reproduce for the same person even in slightly different images.
  
  Image: {{media url=photoDataUri}}`,
});

const faceDetectionFlow = ai.defineFlow(
  {
    name: 'faceDetectionFlow',
    inputSchema: DetectHumanFaceInputSchema,
    outputSchema: DetectHumanFaceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      return {
        isHuman: false,
        reason: 'The AI model failed to analyze the image. This may be a temporary issue. Please try again.',
        faceFingerprint: undefined,
      };
    }
    return output;
  }
);
