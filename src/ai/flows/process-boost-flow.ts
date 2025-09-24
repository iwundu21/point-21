
'use server';
/**
 * @fileOverview A flow to process a successful boost purchase.
 *
 * - processBoost - Handles the boost processing logic.
 * - ProcessBoostInput - The input type for the processBoost function.
 * - ProcessBoostOutput - The return type for the processBoost function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { doc, runTransaction, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserData, incrementTotalPoints } from '@/lib/database';

const ProcessBoostInputSchema = z.object({
  userId: z.string().describe('The unique identifier for the user (e.g., user_12345 or browser_xyz).'),
  boostId: z.string().describe('The identifier of the boost being purchased (e.g., boost_1).'),
});
export type ProcessBoostInput = z.infer<typeof ProcessBoostInputSchema>;

const ProcessBoostOutputSchema = z.object({
  success: z.boolean().describe('Whether the boost was processed successfully.'),
  newBalance: z.number().optional().describe('The new balance after the reward.'),
  reason: z.string().optional().describe('The reason for failure, if any.'),
});
export type ProcessBoostOutput = z.infer<typeof ProcessBoostOutputSchema>;


export async function processBoost(input: ProcessBoostInput): Promise<ProcessBoostOutput> {
    return processBoostFlow(input);
}


const processBoostFlow = ai.defineFlow(
  {
    name: 'processBoostFlow',
    inputSchema: ProcessBoostInputSchema,
    outputSchema: ProcessBoostOutputSchema,
  },
  async ({ userId, boostId }) => {
    if (!userId || boostId !== 'boost_1') {
        return { success: false, reason: 'Invalid boost activation request.' };
    }

    const userRef = doc(db, 'users', userId);

    try {
        let finalBalance: number | undefined;
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) {
                throw new Error(`User ${userId} not found`);
            }

            const userData = userDoc.data() as UserData;
            
            if (userData.purchasedBoosts?.includes('boost_1')) {
                finalBalance = userData.balance; // No change
                return;
            }
            
            const REWARD = 5000;
            const newBalance = userData.balance + REWARD;
            
            transaction.update(userRef, {
                balance: newBalance,
                purchasedBoosts: arrayUnion('boost_1')
            });
            finalBalance = newBalance;
        });

        // If a new balance was set (meaning the boost was just added)
        if (finalBalance !== undefined) {
            await incrementTotalPoints(5000);
            return { success: true, newBalance: finalBalance };
        } else {
            // This happens if the user already had the boost
            return { success: false, reason: "Booster already active." };
        }

    } catch (error: any) {
        console.error("Transaction failed for processBoost:", error);
        return { success: false, reason: error.message || 'An unexpected error occurred during the transaction.' };
    }
  }
);
