
'use server';
/**
 * @fileOverview A flow to process a successful user contribution.
 *
 * - processContribution - Handles the contribution processing logic.
 * - ProcessContributionInput - The input type for the processContribution function.
 * - ProcessContributionOutput - The return type for the processContribution function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { doc, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserData } from '@/lib/database';

const ProcessContributionInputSchema = z.object({
  userId: z.string().describe('The unique identifier for the user (e.g., user_12345 or browser_xyz).'),
  amount: z.number().describe('The amount of Stars contributed.'),
});
export type ProcessContributionInput = z.infer<typeof ProcessContributionInputSchema>;

const ProcessContributionOutputSchema = z.object({
  success: z.boolean().describe('Whether the contribution was processed successfully.'),
  newBalance: z.number().optional().describe('The new balance after the reward.'),
  newTotalContributed: z.number().optional().describe('The new total stars contributed by the user.'),
  reason: z.string().optional().describe('The reason for failure, if any.'),
});
export type ProcessContributionOutput = z.infer<typeof ProcessContributionOutputSchema>;

const MAX_CONTRIBUTION_PER_USER = 10000;

export async function processContribution(input: ProcessContributionInput): Promise<ProcessContributionOutput> {
    return processContributionFlow(input);
}

const processContributionFlow = ai.defineFlow(
  {
    name: 'processContributionFlow',
    inputSchema: ProcessContributionInputSchema,
    outputSchema: ProcessContributionOutputSchema,
  },
  async ({ userId, amount }) => {
    if (!userId || !amount || amount <= 0) {
        return { success: false, reason: 'Invalid contribution request.' };
    }

    const userRef = doc(db, 'users', userId);

    try {
        let finalBalance: number | undefined;
        let finalTotalContributed: number | undefined;
        
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) {
                throw new Error(`User ${userId} not found`);
            }

            const userData = userDoc.data() as UserData;
            const currentContribution = userData.totalContributedStars || 0;

            if (currentContribution >= MAX_CONTRIBUTION_PER_USER) {
                throw new Error(`You have already reached your contribution limit of ${MAX_CONTRIBUTION_PER_USER} Stars.`);
            }
            
            const allowedAmount = Math.min(amount, MAX_CONTRIBUTION_PER_USER - currentContribution);
            if (allowedAmount <= 0) {
                 throw new Error(`Your contribution exceeds the maximum limit. You can contribute up to ${MAX_CONTRIBUTION_PER_USER - currentContribution} more Stars.`);
            }

            // 1 Star = 1 EXN
            const reward = allowedAmount;
            const newBalance = userData.balance + reward;
            const newTotalContributed = currentContribution + allowedAmount;
            
            transaction.update(userRef, {
                balance: newBalance,
                totalContributedStars: newTotalContributed
            });
            
            finalBalance = newBalance;
            finalTotalContributed = newTotalContributed;
        });

        if (finalBalance !== undefined && finalTotalContributed !== undefined) {
            return { 
                success: true, 
                newBalance: finalBalance,
                newTotalContributed: finalTotalContributed 
            };
        } else {
            // This path should ideally not be reached if transaction succeeds
            throw new Error("Transaction completed but failed to return new values.");
        }

    } catch (error: any) {
        console.error("Transaction failed for processContribution:", error);
        return { success: false, reason: error.message || 'An unexpected error occurred during the transaction.' };
    }
  }
);

