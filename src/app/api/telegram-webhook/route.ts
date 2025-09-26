
import { processContribution } from '@/ai/flows/process-contribution-flow';
import { processBoost } from '@/ai/flows/process-boost-flow';
import { NextRequest, NextResponse } from 'next/server';
import 'dotenv/config';

const botToken = process.env.TELEGRAM_BOT_TOKEN;

async function answerPreCheckoutQuery(preCheckoutQueryId: string, ok: boolean, errorMessage?: string) {
  if (!botToken) {
    console.error("Bot token not configured");
    // We must return OK here, or the payment will fail.
    // The server-side check is a secondary validation. Client-side will handle crediting.
    return;
  }
  const url = `https://api.telegram.org/bot${botToken}/answerPreCheckoutQuery`;
  const body: any = {
    pre_checkout_query_id: preCheckoutQueryId,
    ok: ok,
  };
  if (!ok && errorMessage) {
    body.error_message = errorMessage;
  }
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error("Failed to answer pre-checkout query:", e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Handle Pre-Checkout Query for both contributions and boosts
    if (body.pre_checkout_query) {
      const preCheckoutQuery = body.pre_checkout_query;
      // We'll approve all pre-checkout queries here. The final processing
      // will be handled on the client-side after payment confirmation.
      await answerPreCheckoutQuery(preCheckoutQuery.id, true);
      return NextResponse.json({ status: 'ok' });
    }

    // The 'successful_payment' is now handled on the client-side.
    // This webhook's primary job is just to ACK the pre-checkout.
    if (body.message && body.message.successful_payment) {
        // We log it, but the client is responsible for crediting.
        console.log("Successful payment received, client will handle processing:", body.message.successful_payment.invoice_payload);
        return NextResponse.json({ status: 'ok' });
    }

    return NextResponse.json({ status: 'unhandled_update' });
  } catch (error) {
    console.error('Error processing Telegram update:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
