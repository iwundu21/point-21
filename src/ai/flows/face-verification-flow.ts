'use server';
/**
 * @fileOverview A face verification AI agent that checks for uniqueness.
 *
 * - verifyHumanFace - A function that handles the face verification process.
 * - VerifyHumanFaceInput - The input type for the verifyHumanFace function.
 * - VerifyHumanFaceOutput - The return type for the verifyHumanFace function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// This is a simplified in-memory "database" for demonstration purposes.
// In a real application, you would use a persistent database like Firestore.
const verifiedFaces = new Set<string>();

const VerifyHumanFaceInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a person's face, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
   userId: z.string().describe("A unique identifier for the user."),
});
export type VerifyHumanFaceInput = z.infer<typeof VerifyHumanFaceInputSchema>;

const VerifyHumanFaceOutputSchema = z.object({
  isHuman: z.boolean().describe('Whether the image contains a real human face and not an avatar, cartoon, or object.'),
  isUnique: z.boolean().describe('Whether the face is unique and not already registered.'),
  reason: z.string().describe('The reason for the determination.'),
});
export type VerifyHumanFaceOutput = z.infer<typeof VerifyHumanFaceOutputSchema>;

export async function verifyHumanFace(input: VerifyHumanFaceInput): Promise<VerifyHumanFaceOutput> {
  return faceVerificationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'faceVerificationPrompt',
  input: {schema: VerifyHumanFaceInputSchema},
  output: {schema: VerifyHumanFaceOutputSchema},
  prompt: `You are a system that determines if an image contains a real, unique human face. Your response must be in JSON format.

  Analyze the provided image and determine if it's a real human face. It should not be a cartoon, avatar, drawing, or an object.
  
  Set the 'isHuman' field to true if a real human face is detected, and false otherwise.
  
  You must also determine if the face is unique. You will be given a simulated response about whether the user's face is already registered.
  - If the face is already registered with a different user ID, set 'isUnique' to false and provide a reason.
  - Otherwise, set 'isUnique' to true.

  Simulated Uniqueness Check: For this user (userId: {{{userId}}}), the face is NOT unique and is already registered.
  
  Image: {{media url=photoDataUri}}`,
});


const faceVerificationFlow = ai.defineFlow(
  {
    name: 'faceVerificationFlow',
    inputSchema: VerifyHumanFaceInputSchema,
    outputSchema: VerifyHumanFaceOutputSchema,
  },
  async (input) => {
    // In a real app, you'd generate a facial embedding and check it against a database.
    // Here, we simulate this check.
    if (verifiedFaces.has(input.userId)) {
        // This user has already verified.
        return { isHuman: true, isUnique: true, reason: 'User already verified.' };
    }

    // Simulate checking if the face exists for another user.
    // For this example, we'll deny a specific user ID to demonstrate the multi-account prevention.
    if (input.userId.includes("prevent")) {
         return {
            isHuman: true,
            isUnique: false,
            reason: 'This face is already associated with another account.',
        };
    }
    
    const {output} = await prompt(input);
    
    if (output!.isHuman && output!.isUnique) {
        verifiedFaces.add(input.userId);
    }
    
    // To make the simulation more robust, we will override the AI's uniqueness check for this example.
    // In a real scenario, the AI's response would be more sophisticated.
    const isSimulatedDuplicate = input.userId.includes("duplicate_face");

    if (isSimulatedDuplicate) {
         return {
            isHuman: true,
            isUnique: false,
            reason: 'This face is already associated with another account.',
        };
    }
    
    if (output!.isHuman && !isSimulatedDuplicate) {
       return {
            isHuman: true,
            isUnique: true,
            reason: 'Verification successful.',
        };
    }
    
    return output!;
  }
);
