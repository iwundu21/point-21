
'use server';
/**
 * @fileOverview A flow to handle the new user onboarding process.
 *
 * - completeOnboarding - Handles calculating initial balance and marking user as onboarded.
 * - OnboardingInput - The input type for the completeOnboarding function.
 * - OnboardingOutput - The return type for the completeOnboarding function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { saveUserData, getUserData, UserData } from '@/lib/database';
import { TelegramUser } from '@/lib/user-utils';

const OnboardingInputSchema = z.object({
  user: z.any().describe('The user object from Telegram.'),
});
export type OnboardingInput = z.infer<typeof OnboardingInputSchema>;

const OnboardingOutputSchema = z.object({
  success: z.boolean().describe('Whether the onboarding process was successful.'),
  initialBalance: z.number().describe('The initial balance awarded to the user.'),
  accountCreationDate: z.string().describe('The date the user\'s Telegram account was created.'),
  reason: z.string().optional().describe('The reason for failure, if any.'),
});
export type OnboardingOutput = z.infer<typeof OnboardingOutputSchema>;

export async function completeOnboarding(input: OnboardingInput): Promise<OnboardingOutput> {
  return completeOnboardingFlow(input);
}

// Function to decode Telegram User ID into an approximate creation date
const getTelegramCreationDate = (userId: number): Date => {
    // This formula provides an approximation of the account creation date.
    // The constant 1420070400 is the Unix timestamp for 2015-01-01 00:00:00 UTC.
    // User IDs are roughly sequential, so this gives us a usable estimate.
    const timestamp = (userId / 4194304) + 1420070400;
    return new Date(timestamp * 1000);
};


const completeOnboardingFlow = ai.defineFlow(
  {
    name: 'completeOnboardingFlow',
    inputSchema: OnboardingInputSchema,
    outputSchema: OnboardingOutputSchema,
  },
  async ({ user }) => {
    const telegramUser = user as TelegramUser;
    if (!telegramUser || typeof telegramUser.id !== 'number') {
        return { success: false, initialBalance: 0, accountCreationDate: '', reason: 'Invalid user object. Onboarding is for Telegram users only.' };
    }

    try {
        const { userData } = await getUserData(telegramUser);
        
        // Prevent re-running onboarding bonus calculation if it's already done
        if (userData.hasOnboarded) {
             const creationDate = getTelegramCreationDate(telegramUser.id);
             return { 
                success: true, 
                initialBalance: userData.balance, 
                accountCreationDate: creationDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                reason: 'User has already completed onboarding.' 
            };
        }
        
        // Calculate bonus based on account age
        const creationDate = getTelegramCreationDate(telegramUser.id);
        const now = new Date();
        const ageInMs = now.getTime() - creationDate.getTime();
        const ageInMonths = Math.floor(ageInMs / (1000 * 60 * 60 * 24 * 30.44)); // Average days in a month

        let initialBalance = userData.balance; // Start with the converted balance
        if (ageInMonths >= 1) {
            const ageBonus = ageInMonths * 10;
            initialBalance += ageBonus;
        }

        // Add base bonus for all users completing onboarding for the first time
        initialBalance += 500;

        const dataToSave: Partial<UserData> = {
            balance: initialBalance,
            hasOnboarded: true,
        };

        await saveUserData(telegramUser, dataToSave);
        
        return {
            success: true,
            initialBalance: initialBalance,
            accountCreationDate: creationDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        };

    } catch (error) {
        console.error("Error during onboarding flow:", error);
        return {
            success: false,
            initialBalance: 0,
            accountCreationDate: '',
            reason: 'An unexpected error occurred during the onboarding process.'
        }
    }
  }
);
