
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
import { UserData } from '@/lib/database';

// Define a map for boost details (points, cost, etc.)
const boostDetails: { [key: string]: { amount: number; cost: number } } = {
    boost_1: { amount: 2000, cost: 50 },
    boost_2: { amount: 4000, cost: 100 },
    boost_3: { amount: 8000, cost: 200 },
    boost_4: { amount: 20000, cost: 500 },
    boost_5: { amount: 40000, cost: 1000 },
};

const ProcessBoostInputSchema = z.object({
  userId: z.string().describe('The unique identifier for the user (e.g., user_12345 or browser_xyz).'),
  boostId: z.string().describe('The identifier of the boost being purchased (e.g., boost_1).'),
});
export type ProcessBoostInput = z.infer<typeof ProcessBoostInputSchema>;

const ProcessBoostOutputSchema = z.object({
  success: z.boolean().describe('Whether the boost was processed successfully.'),
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
    if (!userId || !boostId) {
        return { success: false, reason: 'User ID and Boost ID are required.' };
    }

    const boost = boostDetails[boostId];
    if (!boost) {
        return { success: false, reason: 'Invalid Boost ID.' };
    }

    const userRef = doc(db, 'users', userId);

    try {
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) {
                throw new Error(`User ${userId} not found`);
            }

            const userData = userDoc.data() as UserData;
            
            // Prevent duplicate boost applications
            if (userData.purchasedBoosts?.includes(boostId)) {
                // This isn't an error, just means we don't need to do anything.
                // The client might be calling this again on a refresh.
                return;
            }

            const isTelegramUser = userId.startsWith('user_');
            const currentRate = userData.miningRate || (isTelegramUser ? 1000 : 700);
            const newRate = currentRate + boost.amount;
            
            transaction.update(userRef, {
                miningRate: newRate,
                purchasedBoosts: arrayUnion(boostId)
            });
        });

        return { success: true };

    } catch (error: any) {
        console.error("Transaction failed for processBoost:", error);
        return { success: false, reason: error.message || 'An unexpected error occurred during the transaction.' };
    }
  }
);
