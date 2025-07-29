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
  isHuman: z.boolean().describe('Whether the image contains a real human face and not an avatar, cartoon, or object.'),
  reason: z.string().describe('The reason for the determination.'),
});
export type DetectHumanFaceOutput = z.infer<typeof DetectHumanFaceOutputSchema>;

export async function detectHumanFace(input: DetectHumanFaceInput): Promise<DetectHumanFaceOutput> {
  return faceDetectionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'faceDetectionPrompt',
  input: {schema: DetectHumanFaceInputSchema},
  output: {schema: DetectHumanFaceOutputSchema},
  prompt: `You are a system that determines if an image contains a real, live human face. Your response must be in JSON format.

  Analyze the provided image with high scrutiny. Your task is to determine if it's a real human face.
  - The face must be of a real person, not a photo of a photo, a doll, a statue, a drawing, an avatar, or any other non-human representation.
  - Crucially, the person's eyes must be clearly visible and open. If the eyes are closed, obscured, or not visible, you must fail the verification.
  
  Set the 'isHuman' field to true only if a real human face with visible, open eyes is detected. Otherwise, set it to false.
  Provide a clear and concise reason for your decision in the 'reason' field, for example, "No human face detected" or "Eyes are not visible in the image."
  
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
    return output!;
  }
);
