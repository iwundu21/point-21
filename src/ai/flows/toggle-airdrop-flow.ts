'use server';
/**
 * @fileOverview A flow to toggle the airdrop reward-earning period.
 *
 * - toggleAirdrop - A function that sets a global flag to stop or start all reward mechanisms.
 * - ToggleAirdropInput - The input type for the toggleAirdrop function.
 * - ToggleAirdropOutput - The return type for the toggleAirdrop function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { updateAirdropStatus } from '@/lib/database';

const ToggleAirdropInputSchema = z.object({
  ended: z.boolean().describe('The desired state of the airdrop. True to end, false to start.'),
});
export type ToggleAirdropInput = z.infer<typeof ToggleAirdropInputSchema>;

const ToggleAirdropOutputSchema = z.object({
  success: z.boolean().describe('Whether the operation was successful.'),
});
export type ToggleAirdropOutput = z.infer<typeof ToggleAirdropOutputSchema>;

export async function toggleAirdrop(input: ToggleAirdropInput): Promise<ToggleAirdropOutput> {
  return toggleAirdropFlow(input);
}

const toggleAirdropFlow = ai.defineFlow(
  {
    name: 'toggleAirdropFlow',
    inputSchema: ToggleAirdropInputSchema,
    outputSchema: ToggleAirdropOutputSchema,
  },
  async ({ ended }) => {
    try {
      const result = await updateAirdropStatus(ended);
      return result;
    } catch (error) {
      console.error("Failed to toggle airdrop status:", error);
      return { success: false };
    }
  }
);
