
import 'dotenv/config';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error('Bot token not configured');
    return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
  }

  try {
    const { title, description, payload, currency, amount } = await req.json();

    if (!title || !description || !payload || !currency || !amount) {
      return NextResponse.json({ error: 'Missing required invoice parameters' }, { status: 400 });
    }

    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/createInvoiceLink`;

    const requestBody: any = {
        title,
        description,
        payload,
        currency,
        prices: [{ label: 'Star', amount }],
    };

    const response = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
