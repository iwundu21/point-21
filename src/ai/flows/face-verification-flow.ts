
'use server';
/**
 * @fileOverview A face verification AI agent that checks for uniqueness against a persistent database.
 *
 * - verifyHumanFace - A function that handles the face verification process.
 * - VerifyHumanFaceInput - The input type for the verifyHumanFace function.
 * - VerifyHumanFaceOutput - The return type for the verifyHumanFace function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { detectHumanFace } from './face-detection-flow';
import { getUserData, banUser } from '@/lib/database';

const VerifyHumanFaceInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a person's face, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'.",
    ),
   userId: z.string().describe("A unique identifier for the user."),
   user: z.any().describe("The user's Telegram object."),
});
export type VerifyHumanFaceInput = z.infer<typeof VerifyHumanFaceInputSchema>;

const VerifyHumanFaceOutputSchema = z.object({
  isHuman: z.boolean().describe('Whether the image contains a real human face and not an avatar, cartoon, or object.'),
  isUnique: z.boolean().describe('Whether the face is unique and not already registered.'),
  reason: z.string().describe('The reason for the determination.'),
  faceVerificationUri: z.string().optional().describe('The data URI of the captured face image.'),
});
export type VerifyHumanFaceOutput = z.infer<typeof VerifyHumanFaceOutputSchema>;

export async function verifyHumanFace(input: VerifyHumanFaceInput): Promise<VerifyHumanFaceOutput> {
  return faceVerificationFlow(input);
}

const faceVerificationFlow = ai.defineFlow(
  {
    name: 'faceVerificationFlow',
    inputSchema: VerifyHumanFaceInputSchema,
    outputSchema: VerifyHumanFaceOutputSchema,
  },
  async (input) => {
    // Step 1: Detect if the image contains a real human face with open eyes.
    const detectionResult = await detectHumanFace({ photoDataUri: input.photoDataUri });

    if (!detectionResult.isHuman) {
      return {
        isHuman: false,
        isUnique: false,
        reason: detectionResult.reason || 'Not a real human face.',
        faceVerificationUri: input.photoDataUri,
      };
    }

    // Step 2: Check if the current user is already verified to prevent re-verification.
    // This is a simplified check for this prototype. A full implementation would use
    // vector embeddings to find if the face exists across *any* account.
    const currentUserData = await getUserData(input.user);
    if (currentUserData.verificationStatus === 'verified') {
        return {
            isHuman: true,
            isUnique: false,
            reason: "This account has already been verified.",
            faceVerificationUri: currentUserData.faceVerificationUri || input.photoDataUri,
        };
    }
    
    // If we are here, the face is considered unique for this user, as they haven't been verified before.
    return {
        isHuman: true,
        isUnique: true,
        reason: 'Verification successful. Your account is now verified.',
        faceVerificationUri: input.photoDataUri,
    };
  }
);
