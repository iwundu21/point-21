
'use server';
/**
 * @fileOverview A flow to commit a user's airdrop allocation.
 *
 * - commitAirdrop - Handles the airdrop commitment and wallet verification.
 * - CommitAirdropInput - The input type for the commitAirdrop function.
 * - CommitAirdropOutput - The return type for the commitAirdrop function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { serverTimestamp } from 'firebase/firestore';
import { getUserId, getUserData, getAirdropCommitDeadline, saveUserData } from '@/lib/database';

const CommitAirdropInputSchema = z.object({
  userId: z.string().describe('The user ID (e.g., user_12345 or browser_xyz)'),
  walletAddressToVerify: z.string().describe('The wallet address entered by the user for verification.'),
});
export type CommitAirdropInput = z.infer<typeof CommitAirdropInputSchema>;

const CommitAirdropOutputSchema = z.object({
  success: z.boolean(),
  reason: z.string().optional(),
});
export type CommitAirdropOutput = z.infer<typeof CommitAirdropOutputSchema>;

export async function commitAirdrop(input: CommitAirdropInput): Promise<CommitAirdropOutput> {
  return commitAirdropFlow(input);
}

const commitAirdropFlow = ai.defineFlow(
  {
    name: 'commitAirdropFlow',
    inputSchema: CommitAirdropInputSchema,
    outputSchema: CommitAirdropOutputSchema,
  },
  async ({ userId, walletAddressToVerify }) => {
    try {
      // 1. Check deadline
      const deadlineData = await getAirdropCommitDeadline();
      if (deadlineData.deadline && new Date() > new Date(deadlineData.deadline)) {
        return { success: false, reason: 'The commitment deadline has passed.' };
      }

      // 2. Get user data
      const userRef = { id: userId.startsWith('user_') ? parseInt(userId.split('_')[1], 10) : userId.substring(userId.indexOf('_') + 1) };
      const { userData } = await getUserData(userRef);
      
      // 3. Check if already committed
      if (userData.airdropCommitted) {
        return { success: false, reason: 'You have already committed your airdrop.' };
      }
      
      // 4. Verify wallet address
      if (!userData.walletAddress) {
          return { success: false, reason: 'You must have a saved wallet address to commit.' };
      }
      
      if (userData.walletAddress.trim().toLowerCase() !== walletAddressToVerify.trim().toLowerCase()) {
        return { success: false, reason: 'The wallet address entered does not match your saved address.' };
      }

      // 5. All checks passed, commit the airdrop
      await saveUserData(userRef, {
          airdropCommitted: true,
          airdropCommitTimestamp: new Date().toISOString(),
      });

      return { success: true };

    } catch (error) {
      console.error("Error during airdrop commit:", error);
      return { success: false, reason: 'An unexpected error occurred during the commit process.' };
    }
  }
);
