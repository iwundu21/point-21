
'use server';
/**
 * @fileOverview A flow to update the Telegram bot's profile description with the user count.
 *
 * - updateBotProfile - A function that handles the profile update process.
 * - UpdateBotProfileOutput - The return type for the updateBotProfile function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, getCountFromServer } from 'firebase/firestore';

const UpdateBotProfileOutputSchema = z.object({
  success: z.boolean().describe('Whether the profile was updated successfully.'),
  userCount: z.number().describe('The total number of users found.'),
  error: z.string().optional().describe('An error message if the update failed.'),
});
export type UpdateBotProfileOutput = z.infer<typeof UpdateBotProfileOutputSchema>;

export async function updateBotProfile(): Promise<UpdateBotProfileOutput> {
  return updateBotProfileFlow();
}

const updateBotProfileFlow = ai.defineFlow(
  {
    name: 'updateBotProfileFlow',
    inputSchema: z.void(),
    outputSchema: UpdateBotProfileOutputSchema,
  },
  async () => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken || botToken === 'YOUR_TELEGRAM_BOT_TOKEN_HERE') {
      console.error("TELEGRAM_BOT_TOKEN is not set in environment variables.");
      return { success: false, userCount: 0, error: "Server configuration error: Bot token not found." };
    }

    try {
      // 1. Get the total number of users from Firestore.
      const usersCollection = collection(db, "users");
      const snapshot = await getCountFromServer(usersCollection);
      const userCount = snapshot.data().count;

      console.log(`Found ${userCount} total users.`);

      // 2. Format the description string.
      const description = `${userCount.toLocaleString()} users are forging Aether! Join them now. 🚀`;

      // 3. Call the Telegram Bot API's 'setMyDescription' method.
      const telegramApiUrl = `https://api.telegram.org/bot${botToken}/setMyDescription`;
      
      const response = await fetch(telegramApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ description: description }),
      });

      const result = await response.json() as { ok: boolean, description?: string, error_code?: number };

      if (result.ok) {
        console.log("Successfully updated bot description:", description);
        return { success: true, userCount };
      } else {
        const errorMessage = `Telegram API error (code ${result.error_code}): ${result.description}`;
        console.error("Failed to update bot description:", errorMessage);
        return { success: false, userCount, error: errorMessage };
      }

    } catch (error: any) {
      console.error("An error occurred in updateBotProfileFlow:", error.message || error);
      return { success: false, userCount: 0, error: "An unexpected error occurred while updating the bot profile." };
    }
  }
);
