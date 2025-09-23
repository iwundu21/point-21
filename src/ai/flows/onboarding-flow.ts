
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
  reason: z.string().optional().describe('The reason for failure, if any.'),
});
export type OnboardingOutput = z.infer<typeof OnboardingOutputSchema>;

export async function completeOnboarding(input: OnboardingInput): Promise<OnboardingOutput> {
  return completeOnboardingFlow(input);
}

const completeOnboardingFlow = ai.defineFlow(
  {
    name: 'completeOnboardingFlow',
    inputSchema: OnboardingInputSchema,
    outputSchema: OnboardingOutputSchema,
  },
  async ({ user }) => {
    const telegramUser = user as TelegramUser;
    if (!telegramUser || typeof telegramUser.id !== 'number') {
        return { success: false, initialBalance: 0, reason: 'Invalid user object. Onboarding is for Telegram users only.' };
    }

    try {
        const { userData } = await getUserData(telegramUser);
        
        // Prevent re-running onboarding
        if (userData.hasOnboarded) {
            return { success: true, initialBalance: userData.balance, reason: 'User has already completed onboarding.' };
        }
        
        // Grant a standard starting bonus to all new users.
        const initialBalance = 500; 
        
        const dataToSave: Partial<UserData> = {
            balance: initialBalance,
            hasOnboarded: true,
        };

        await saveUserData(telegramUser, dataToSave);
        
        return {
            success: true,
            initialBalance: initialBalance,
        };

    } catch (error) {
        console.error("Error during onboarding flow:", error);
        return {
            success: false,
            initialBalance: 0,
            reason: 'An unexpected error occurred during the onboarding process.'
        }
    }
  }
);
