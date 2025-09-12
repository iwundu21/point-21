
import 'dotenv/config';
import { NextRequest, NextResponse } from 'next/server';
import { processSuccessfulPayment } from '@/lib/database';

const TELEGRAM_API_URL = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

async function answerPreCheckoutQuery(preCheckoutQueryId: string, ok: boolean, errorMessage?: string) {
    const url = `${TELEGRAM_API_URL}/answerPreCheckoutQuery`;
    const payload: { pre_checkout_query_id: string; ok: boolean; error_message?: string } = {
        pre_checkout_query_id: preCheckoutQueryId,
        ok: ok,
    };
    if (errorMessage) {
        payload.error_message = errorMessage;
    }
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Handle Pre-Checkout Query: Validate the purchase before charging.
        if (body.pre_checkout_query) {
            const preCheckoutQuery = body.pre_checkout_query;
            // For now, we approve all transactions. In a real-world scenario, you might check stock or other conditions.
            await answerPreCheckoutQuery(preCheckoutQuery.id, true);
            return NextResponse.json({ status: 'ok' });
        }

        // Handle Successful Payment: Credit the user after payment.
        if (body.message && body.message.successful_payment) {
            const successfulPayment = body.message.successful_payment;
            const invoicePayload = successfulPayment.invoice_payload;
            
            // The payload is expected to be in the format: boostId-userId-timestamp
            const [boostId, userId, timestamp] = invoicePayload.split('-');
            
            if (!boostId || !userId) {
                console.error('Webhook Error: Invalid invoice payload received.', invoicePayload);
                return NextResponse.json({ status: 'error', message: 'Invalid payload' }, { status: 400 });
            }

            const boostDetails = {
                'boost_1': { cost: 50, amount: 2000 },
                'boost_2': { cost: 100, amount: 4000 },
                'boost_3': { cost: 200, amount: 8000 },
                'boost_4': { cost: 500, amount: 20000 },
                'boost_5': { cost: 1000, amount: 40000 },
            };

            const boost = boostDetails[boostId as keyof typeof boostDetails];

            if (!boost) {
                console.error(`Webhook Error: Unknown boostId in payload: ${boostId}`);
                return NextResponse.json({ status: 'error', message: 'Unknown boost ID' }, { status: 400 });
            }
            
            await processSuccessfulPayment(userId, boostId, boost.amount);

            return NextResponse.json({ status: 'ok' });
        }

        return NextResponse.json({ status: 'ok' });
    } catch (error) {
        console.error('Webhook processing error:', error);
        return NextResponse.json({ status: 'error', message: 'Internal server error' }, { status: 500 });
    }
}
