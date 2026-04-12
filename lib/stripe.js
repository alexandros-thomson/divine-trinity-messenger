// lib/stripe.js - Stripe Checkout + Webhook for Divine Trinity Premium
const Stripe = require('stripe');
const { supabase } = require('./supabase');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const BASE_URL = process.env.BASE_URL || 'https://divine-trinity-messenger.netlify.app';

async function createCheckoutSession(psid) {
  // Get or create Stripe customer
  let { data: user } = await supabase
    .from('messenger_users')
    .select('stripe_customer_id')
    .eq('psid', psid)
    .single();

  let customerId = user?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: { psid, source: 'divine-trinity-messenger' }
    });
    customerId = customer.id;

    await supabase
      .from('messenger_users')
      .update({ stripe_customer_id: customerId })
      .eq('psid', psid);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [{
      price: process.env.STRIPE_PRICE_ID,
      quantity: 1
    }],
    mode: 'subscription',
    success_url: `${BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${BASE_URL}/cancel`,
    metadata: { psid }
  });

  return session.url;
}

async function handleWebhook(rawBody, signature) {
  const event = stripe.webhooks.constructEvent(
    rawBody,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const customer = await stripe.customers.retrieve(session.customer);
      const psid = customer.metadata?.psid || session.metadata?.psid;

      if (psid && session.subscription) {
        await supabase
          .from('messenger_users')
          .update({
            is_premium: true,
            premium_since: new Date().toISOString(),
            stripe_subscription_id: session.subscription
          })
          .eq('psid', psid);
        console.log(`[STRIPE] Premium activated for ${psid}`);
      }
      break;
    }

    case 'customer.subscription.deleted':
    case 'customer.subscription.updated': {
      const sub = event.data.object;
      if (['canceled', 'incomplete_expired', 'unpaid'].includes(sub.status)) {
        const cust = await stripe.customers.retrieve(sub.customer);
        const psid = cust.metadata?.psid;
        if (psid) {
          await supabase
            .from('messenger_users')
            .update({
              is_premium: false,
              stripe_subscription_id: null
            })
            .eq('psid', psid);
          console.log(`[STRIPE] Premium deactivated for ${psid}`);
        }
      }
      break;
    }
  }

  return { received: true };
}

module.exports = { createCheckoutSession, handleWebhook };
