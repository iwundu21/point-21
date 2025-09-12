
import 'dotenv/config';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// This is a backend endpoint that runs on the server.
// It securely uses the bot token to create an invoice link from Telegram.

export const dynamic = 'force-dynamic' // ensure the function is not cached

export async function POST(req: NextRequest) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error('Bot token not configured');
    return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
  }

  try {
    const { title, description, payload, currency, amount } = await req.json();

    if (!title || !description || !currency || !amount) {
      return NextResponse.json({ error: 'Missing required invoice parameters' }, { status: 400 });
    }

    const uniquePayload = `${payload}-${uuidv4()}`;

    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/createInvoiceLink`;

    const response = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        description,
        payload: uniquePayload,
        provider_token: process.env.TELEGRAM_PROVIDER_TOKEN, // Directly use the env variable
        currency,
        prices: [{ label: 'Star', amount }],
      }),
    });

    const data = await response.json();

    if (data.ok) {
      return NextResponse.json({ invoiceUrl: data.result });
    } else {
      console.error('Telegram API error:', data.description);
      return NextResponse.json({ error: `Failed to create invoice: ${data.description}` }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error creating invoice:', error);
    if (error.name === 'TimeoutError' || error.cause?.code === 'UND_ERR_CONNECT_TIMEOUT') {
        return NextResponse.json({ error: 'Request to Telegram timed out.' }, { status: 504 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
