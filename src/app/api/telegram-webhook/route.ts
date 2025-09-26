
import { processContribution } from '@/ai/flows/process-contribution-flow';
import { processBoost } from '@/ai/flows/process-boost-flow';
import { NextRequest, NextResponse } from 'next/server';
import 'dotenv/config';

const botToken = process.env.TELEGRAM_BOT_TOKEN;

async function answerPreCheckoutQuery(preCheckoutQueryId: string, ok: boolean, errorMessage?: string) {
  const url = `https://api.telegram.org/bot${botToken}/answerPreCheckoutQuery`;
  const body: any = {
    pre_checkout_query_id: preCheckoutQueryId,
    ok: ok,
  };
  if (!ok && errorMessage) {
    body.error_message = errorMessage;
  }
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Handle Pre-Checkout Query
    if (body.pre_checkout_query) {
      const preCheckoutQuery = body.pre_checkout_query;
      // You can add validation logic here based on the invoice_payload
      // For now, we'll just approve all of them.
      await answerPreCheckoutQuery(preCheckoutQuery.id, true);
      return NextResponse.json({ status: 'ok' });
    }

    // Handle Successful Payment
    if (body.message && body.message.successful_payment) {
      const payment = body.message.successful_payment;
      const payload = payment.invoice_payload;
      
      if (payload.startsWith('contribution_')) {
        const [, userId, amountStr] = payload.split('_');
        const amount = parseInt(amountStr, 10);
        
        if (userId && !isNaN(amount)) {
          await processContribution({ userId, amount });
        }
      } else if (payload.startsWith('boost_1_')) {
        const [, , userId] = payload.split('_');
        if (userId) {
          await processBoost({ userId, boostId: 'boost_1' });
        }
      }
      
      return NextResponse.json({ status: 'ok' });
    }

    return NextResponse.json({ status: 'unhandled_update' });
  } catch (error) {
    console.error('Error processing Telegram update:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
