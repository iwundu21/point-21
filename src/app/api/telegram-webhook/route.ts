
import { processContribution } from '@/ai/flows/process-contribution-flow';
import { processBoost } from '@/ai/flows/process-boost-flow';
import { NextRequest, NextResponse } from 'next/server';
import 'dotenv/config';

const botToken = process.env.TELEGRAM_BOT_TOKEN;

async function answerPreCheckoutQuery(preCheckoutQueryId: string, ok: boolean, errorMessage?: string) {
  if (!botToken) {
    console.error("Bot token not configured");
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

    // Handle Pre-Checkout Query for all payments
    if (body.pre_checkout_query) {
      const preCheckoutQuery = body.pre_checkout_query;
      // We approve all pre-checkout queries here. The final processing
      // is handled on the client-side after payment confirmation.
      await answerPreCheckoutQuery(preCheckoutQuery.id, true);
      return NextResponse.json({ status: 'ok' });
    }

    // The 'successful_payment' message is not used for confirmation logic.
    // The client-side flow handles crediting the user upon receiving the 'invoiceClosed' event.
    if (body.message && body.message.successful_payment) {
        console.log("Webhook received a successful_payment update, but client is responsible for processing.");
        return NextResponse.json({ status: 'ok_unhandled' });
    }

    return NextResponse.json({ status: 'unhandled_update' });
  } catch (error) {
    console.error('Error processing Telegram update:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
