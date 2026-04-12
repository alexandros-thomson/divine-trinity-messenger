// stripe-handler.js - Stripe Checkout + Webhook for Divine Trinity Premium
// Handles subscription creation, cancellation, and premium status updates.

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { getDatabase } = require('./db');

const PRICE_ID = process.env.STRIPE_PRICE_ID;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const BASE_URL = process.env.BASE_URL || 'https://divine-trinity-messenger.netlify.app';

async function createCheckoutSession(psid) {
  const db = await getDatabase();
  let user = await db.get('SELECT * FROM users WHERE psid = ?', [psid]);

  // Create Stripe customer if needed
  if (!user.stripe_customer_id) {
    const customer = await stripe.customers.create({
      metadata: { psid, source: 'divine-trinity-messenger' }
    });
    await db.run(
      'UPDATE users SET stripe_customer_id = ? WHERE psid = ?',
      [customer.id, psid]
    );
    user.stripe_customer_id = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    customer: user.stripe_customer_id,
    line_items: [{
      price: PRICE_ID,
      quantity: 1
    }],
    mode: 'subscription',
    success_url: `${BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${BASE_URL}/cancel`,
    metadata: { psid }
  });

  return session.url;
}

async function handleWebhook(body, signature) {
  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
  } catch (err) {
    throw new Error(`Webhook signature verification failed: ${err.message}`);
  }

  const db = await getDatabase();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const customer = await stripe.customers.retrieve(session.customer);
      const psid = customer.metadata.psid || session.metadata.psid;

      if (psid && session.subscription) {
        await db.run(
          'UPDATE users SET is_premium = 1, premium_since = ?, stripe_subscription_id = ? WHERE psid = ?',
          [Date.now(), session.subscription, psid]
        );
        console.log(`[STRIPE] Premium activated for user ${psid}`);
      }
      break;
    }

    case 'customer.subscription.deleted':
    case 'customer.subscription.updated': {
      const sub = event.data.object;

      if (sub.status === 'canceled' || sub.status === 'incomplete_expired' || sub.status === 'unpaid') {
        const cust = await stripe.customers.retrieve(sub.customer);
        const psid = cust.metadata.psid;

        if (psid) {
          await db.run(
            'UPDATE users SET is_premium = 0, stripe_subscription_id = NULL WHERE psid = ?',
            [psid]
          );
          console.log(`[STRIPE] Premium deactivated for user ${psid}`);
        }
      }
      break;
    }

    default:
      console.log(`[STRIPE] Unhandled event type: ${event.type}`);
  }

  return { received: true };
}

module.exports = {
  createCheckoutSession,
  handleWebhook
};
