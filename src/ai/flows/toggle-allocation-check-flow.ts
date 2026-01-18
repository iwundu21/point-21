
'use server';
/**
 * @fileOverview A flow to toggle the airdrop allocation check feature.
 *
 * - toggleAllocationCheck - A function that sets a global flag to enable/disable the feature.
 * - ToggleAllocationCheckInput - The input type for the function.
 * - ToggleAllocationCheckOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { updateAllocationCheckStatus } from '@/lib/database';

const ToggleAllocationCheckInputSchema = z.object({
  enabled: z.boolean().describe('The desired state of the allocation check feature. True to enable, false to disable.'),
});
export type ToggleAllocationCheckInput = z.infer<typeof ToggleAllocationCheckInputSchema>;

const ToggleAllocationCheckOutputSchema = z.object({
  success: z.boolean().describe('Whether the operation was successful.'),
});
export type ToggleAllocationCheckOutput = z.infer<typeof ToggleAllocationCheckOutputSchema>;

export async function toggleAllocationCheck(input: ToggleAllocationCheckInput): Promise<ToggleAllocationCheckOutput> {
  return toggleAllocationCheckFlow(input);
}

const toggleAllocationCheckFlow = ai.defineFlow(
  {
    name: 'toggleAllocationCheckFlow',
    inputSchema: ToggleAllocationCheckInputSchema,
    outputSchema: ToggleAllocationCheckOutputSchema,
  },
  async ({ enabled }) => {
    try {
      const result = await updateAllocationCheckStatus(enabled);
      return result;
    } catch (error) {
      console.error("Failed to toggle allocation check status:", error);
      return { success: false };
    }
  }
);
