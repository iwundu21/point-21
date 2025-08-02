
'use server';
/**
 * @fileOverview A flow to verify Telegram channel membership.
 *
 * - verifyTelegramTask - Checks if a user has joined a specific Telegram channel.
 * - VerifyTelegramTaskInput - The input type for the verifyTelegramTask function.
 * - VerifyTelegramTaskOutput - The return type for the verifyTelegramTask function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getChatMember } from '@/lib/telegram';
import { getUserData, saveUserData } from '@/lib/database';

const VerifyTelegramTaskInputSchema = z.object({
  userId: z.number().describe('The Telegram user ID.'),
  chatId: z.string().describe('The Telegram channel username (e.g., @channelname).'),
});
export type VerifyTelegramTaskInput = z.infer<typeof VerifyTelegramTaskInputSchema>;

const VerifyTelegramTaskOutputSchema = z.object({
  isMember: z.boolean().describe('Whether the user is a member of the channel.'),
  error: z.string().optional().describe('An error message if verification failed.'),
});
export type VerifyTelegramTaskOutput = z.infer<typeof VerifyTelegramTaskOutputSchema>;


export async function verifyTelegramTask(input: VerifyTelegramTaskInput): Promise<VerifyTelegramTaskOutput> {
  return verifyTelegramTaskFlow(input);
}


const verifyTelegramTaskFlow = ai.defineFlow(
  {
    name: 'verifyTelegramTaskFlow',
    inputSchema: VerifyTelegramTaskInputSchema,
    outputSchema: VerifyTelegramTaskOutputSchema,
  },
  async ({ userId, chatId }) => {
    
    const result = await getChatMember(userId, chatId);

    return {
      isMember: result.isMember,
      error: result.error,
    };
  }
);
