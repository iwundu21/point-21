
'use server';
/**
 * @fileOverview A flow to calculate a user's potential airdrop allocation.
 *
 * - calculateAllocation - Calculates the allocation based on current stats.
 * - CalculateAllocationInput - The input type for the function.
 * - CalculateAllocationOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getTotalActivePoints, getAirdropStats, UserData } from '@/lib/database';

const CalculateAllocationInputSchema = z.object({
  userId: z.string().describe('The user ID (e.g., user_12345 or browser_xyz)'),
});
export type CalculateAllocationInput = z.infer<typeof CalculateAllocationInputSchema>;

const CalculateAllocationOutputSchema = z.object({
  success: z.boolean(),
  allocation: z.number().optional().describe('The estimated allocation in EXN tokens.'),
  reason: z.string().optional(),
});
export type CalculateAllocationOutput = z.infer<typeof CalculateAllocationOutputSchema>;


export async function calculateAllocation(input: CalculateAllocationInput): Promise<CalculateAllocationOutput> {
  return calculateAllocationFlow(input);
}


const calculateAllocationFlow = ai.defineFlow(
  {
    name: 'calculateAllocationFlow',
    inputSchema: CalculateAllocationInputSchema,
    outputSchema: CalculateAllocationOutputSchema,
  },
  async ({ userId }) => {
    try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            return { success: false, reason: 'User not found.' };
        }

        const userData = userSnap.data() as UserData;
        const userBalance = userData.balance || 0;

        const [totalPoints, airdropStats] = await Promise.all([
            getTotalActivePoints(),
            getAirdropStats()
        ]);
        
        const totalAirdropPool = airdropStats.totalAirdrop;

        if (totalPoints === 0) {
            return { success: true, allocation: 0 };
        }

        const userShare = userBalance / totalPoints;
        const allocation = userShare * totalAirdropPool;
        
        return { success: true, allocation: allocation };

    } catch (error) {
        console.error("Error calculating allocation:", error);
        return { success: false, reason: 'An unexpected error occurred.' };
    }
  }
);
