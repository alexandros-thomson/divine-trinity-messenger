// netlify/functions/stripe-webhook.js - Stripe Webhook Handler
const { handleWebhook } = require('../../lib/stripe');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const sig = event.headers['stripe-signature'];
  if (!sig) {
    return { statusCode: 400, body: 'Missing stripe-signature header' };
  }

  try {
    // Netlify provides raw body for functions
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64')
      : event.body;

    await handleWebhook(rawBody, sig);
    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (error) {
    console.error('[STRIPE WEBHOOK] Error:', error.message);
    return { statusCode: 400, body: `Webhook Error: ${error.message}` };
  }
};
