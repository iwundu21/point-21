
'use server';

import { z } from 'zod';
import 'dotenv/config';

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const API_URL = `https://api.telegram.org/bot${botToken}`;

const GetChatMemberResponseSchema = z.object({
  ok: z.boolean(),
  result: z.object({
    status: z.enum(['creator', 'administrator', 'member', 'restricted', 'left', 'kicked']),
  }).optional(),
  description: z.string().optional(),
});


export async function getChatMember(userId: number, chatId: string): Promise<{ isMember: boolean; error?: string }> {
  if (!botToken) {
    console.error("TELEGRAM_BOT_TOKEN is not set.");
    return { isMember: false, error: "Server configuration error." };
  }
  
  // Ensure chatId starts with @
  const formattedChatId = chatId.startsWith('@') ? chatId : `@${chatId}`;

  const url = `${API_URL}/getChatMember?chat_id=${formattedChatId}&user_id=${userId}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    
    const parsedData = GetChatMemberResponseSchema.safeParse(data);

    if (!parsedData.success) {
      console.error("Invalid response from Telegram API:", parsedData.error);
      return { isMember: false, error: "Could not verify membership due to an API error." };
    }

    if (!parsedData.data.ok) {
        if (parsedData.data.description?.includes('chat not found')) {
            return { isMember: false, error: "The specified Telegram channel was not found." };
        }
        if (parsedData.data.description?.includes('user not found')) {
            // This can happen if the user hasn't started the bot. For our purpose, it means they aren't in the channel.
             return { isMember: false, error: "Please start a chat with the bot first." };
        }
       console.warn("Telegram API error:", parsedData.data.description);
       return { isMember: false, error: `Telegram API Error: ${parsedData.data.description}` };
    }
    
    const status = parsedData.data.result?.status;
    const isMember = status === 'member' || status === 'administrator' || status === 'creator';
    
    if (!isMember) {
        return { isMember: false, error: "You must be a member of the channel to complete this task." };
    }

    return { isMember: true };

  } catch (error) {
    console.error("Failed to call Telegram API:", error);
    return { isMember: false, error: "An unexpected error occurred while verifying." };
  }
}
