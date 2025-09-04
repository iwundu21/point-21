
'use server';
/**
 * @fileOverview A flow to merge a browser user's data into a Telegram account.
 *
 * - mergeAccounts - Handles the account merging process.
 * - MergeAccountsInput - The input type for the mergeAccounts function.
 * - MergeAccountsOutput - The return type for the mergeAccounts function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { findUserByWalletAddress, mergeBrowserDataToTelegram, getUserData } from '@/lib/database';

const MergeAccountsInputSchema = z.object({
  telegramUser: z.any().describe('The user object from Telegram.'),
  browserWalletAddress: z.string().describe('The Solana wallet address used by the user in the browser.'),
});
export type MergeAccountsInput = z.infer<typeof MergeAccountsInputSchema>;

const MergeAccountsOutputSchema = z.object({
  success: z.boolean().describe('Whether the merge was successful.'),
  reason: z.string().optional().describe('The reason for failure, if any.'),
  mergedBalance: z.number().optional().describe('The total balance after merging.'),
});
export type MergeAccountsOutput = z.infer<typeof MergeAccountsOutputSchema>;

export async function mergeAccounts(input: MergeAccountsInput): Promise<MergeAccountsOutput> {
  return mergeAccountsFlow(input);
}

const mergeAccountsFlow = ai.defineFlow(
  {
    name: 'mergeAccountsFlow',
    inputSchema: MergeAccountsInputSchema,
    outputSchema: MergeAccountsOutputSchema,
  },
  async ({ telegramUser, browserWalletAddress }) => {
    // 1. Find the browser user by wallet address
    const browserUser = await findUserByWalletAddress(browserWalletAddress);

    if (!browserUser || browserUser.telegramUser) {
        // No browser-only user found with this wallet
        return {
            success: false,
            reason: 'No browser-based account was found with this wallet address.'
        };
    }
    
    // Prevent merging a telegram account with itself if wallet was added there first.
    const telegramUserData = await getUserData(telegramUser);
    if(telegramUserData.walletAddress === browserWalletAddress){
         return {
            success: false,
            reason: 'This wallet is already associated with your Telegram account.'
        };
    }

    try {
        // 2. Perform the merge operation
        const updatedTelegramUser = await mergeBrowserDataToTelegram(telegramUser, browserUser);
        
        return {
            success: true,
            mergedBalance: updatedTelegramUser.balance
        };

    } catch (error) {
        console.error("Error during account merge:", error);
        return {
            success: false,
            reason: 'An unexpected error occurred during the merge process.'
        }
    }
  }
);
