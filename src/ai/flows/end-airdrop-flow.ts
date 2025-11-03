
'use server';
/**
 * @fileOverview A flow to end the airdrop reward-earning period.
 *
 * - endAirdrop - A function that sets a global flag to stop all reward mechanisms.
 * - EndAirdropOutput - The return type for the endAirdrop function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { setAirdropEnded } from '@/lib/database';

const EndAirdropOutputSchema = z.object({
  success: z.boolean().describe('Whether the operation was successful.'),
});
export type EndAirdropOutput = z.infer<typeof EndAirdropOutputSchema>;

export async function endAirdrop(): Promise<EndAirdropOutput> {
  return endAirdropFlow();
}

const endAirdropFlow = ai.defineFlow(
  {
    name: 'endAirdropFlow',
    outputSchema: EndAirdropOutputSchema,
  },
  async () => {
    try {
      const result = await setAirdropEnded();
      return result;
    } catch (error) {
      console.error("Failed to end airdrop:", error);
      return { success: false };
    }
  }
);
