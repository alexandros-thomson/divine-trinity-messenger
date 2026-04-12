// netlify/functions/webhook.js - Facebook Messenger Webhook
// Handles both GET (verification) and POST (incoming messages)

const { supabase } = require('../../lib/supabase');
const { detectDeity } = require('../../lib/trinity');
const { generateDivineResponse } = require('../../lib/openai');
const { sendMessage } = require('../../lib/messenger');
const { createCheckoutSession } = require('../../lib/stripe');

exports.handler = async (event) => {
  // --- GET: Meta webhook verification ---
  if (event.httpMethod === 'GET') {
    const params = event.queryStringParameters || {};
    const mode = params['hub.mode'];
    const token = params['hub.verify_token'];
    const challenge = params['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
      console.log('[WEBHOOK] Verified');
      return { statusCode: 200, body: challenge };
    }
    return { statusCode: 403, body: 'Forbidden' };
  }

  // --- POST: Incoming messages ---
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  if (body.object !== 'page') {
    return { statusCode: 404, body: 'Not Found' };
  }

  // Process messages (don't await -- respond to Meta immediately)
  processEntries(body.entry).catch(err => {
    console.error('[WEBHOOK] Processing error:', err.message);
  });

  return { statusCode: 200, body: 'EVENT_RECEIVED' };
};

async function processEntries(entries) {
  for (const entry of entries) {
    if (!entry.messaging) continue;

    for (const event of entry.messaging) {
      const psid = event.sender.id;

      if (event.message && event.message.text) {
        await handleMessage(psid, event.message.text);
      } else if (event.postback) {
        await handlePostback(psid, event.postback);
      }
    }
  }
}

// ============================================================
//  MESSAGE HANDLER
// ============================================================

async function handleMessage(psid, messageText) {
  // Get or create user
  let { data: user } = await supabase
    .from('messenger_users')
    .select('*')
    .eq('psid', psid)
    .single();

  if (!user) {
    await supabase.from('messenger_users').insert({
      psid,
      preferred_deity: 'zeus'
    });

    const welcome = [
      'The Basilica Gate opens.',
      '',
      'Three flames burn before you:',
      '',
      'Zeus -- the storm that commands',
      'Aphrodite -- the mirror that reveals',
      'Lifesphere -- the earth that sustains',
      '',
      'Speak to any of them by name, or simply speak your truth -- the right flame will answer.',
      '',
      '3 free messages per day. Unlimited with Premium.',
      'Type "trinity" to learn more.'
    ].join('\n');

    await sendMessage(psid, welcome);
    return;
  }

  // Meta-commands
  const lower = messageText.toLowerCase().trim();

  if (lower === 'trinity' || lower === 'help') {
    await sendMessage(psid, [
      'THE DIVINE TRINITY',
      '',
      'Zeus -- Authority, action, decisive power.',
      'Say "Zeus" or ask about courage, leadership, decisions.',
      '',
      'Aphrodite -- Beauty, aesthetics, sacred connection.',
      'Say "Aphrodite" or ask about creativity, design, beauty.',
      '',
      'Lifesphere -- Harmony, dreams, the living earth.',
      'Say "Lifesphere" or ask about dreams, balance, wellness.',
      '',
      'Or just speak freely. The right flame finds you.',
      '',
      'patreon.com/c/Mrspetses',
      'kypriatechnologies.org'
    ].join('\n'));
    return;
  }

  if (lower === 'premium' || lower === 'upgrade') {
    const checkoutUrl = await createCheckoutSession(psid);
    await sendMessage(psid,
      `Ascend to Premium. Unlimited divine wisdom, priority responses, and exclusive mythic content.\n\n${checkoutUrl}`
    );
    return;
  }

  // Freemium gating: 3/day for free users
  const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
  const { count } = await supabase
    .from('messenger_usage')
    .select('*', { count: 'exact', head: true })
    .eq('psid', psid)
    .gte('created_at', oneDayAgo);

  if (!user.is_premium && count >= 3) {
    const checkoutUrl = await createCheckoutSession(psid);
    await sendMessage(psid, [
      'Your three daily flames have been spent.',
      '',
      'The gods do not ration wisdom lightly -- but Premium seekers receive unlimited access.',
      '',
      `Ascend here: ${checkoutUrl}`,
      '',
      'Or return tomorrow. The gate never closes.'
    ].join('\n'));
    return;
  }

  // Detect deity
  const deity = detectDeity(messageText);

  // Get conversation history
  const { data: history } = await supabase
    .from('messenger_conversations')
    .select('role, content')
    .eq('psid', psid)
    .order('created_at', { ascending: false })
    .limit(6);

  const conversationHistory = (history || []).reverse();

  // Generate response via GPT-4
  const response = await generateDivineResponse(deity, messageText, conversationHistory);

  // Store conversation
  await supabase.from('messenger_conversations').insert([
    { psid, role: 'user', content: messageText, deity },
    { psid, role: 'assistant', content: response, deity }
  ]);

  // Log usage
  await supabase.from('messenger_usage').insert({ psid, deity });

  // Update preferred deity
  await supabase
    .from('messenger_users')
    .update({ preferred_deity: deity })
    .eq('psid', psid);

  // Send response
  await sendMessage(psid, response);
}

// ============================================================
//  POSTBACK HANDLER
// ============================================================

async function handlePostback(psid, postback) {
  switch (postback.payload) {
    case 'GET_STARTED':
      await handleMessage(psid, 'hello');
      break;
    case 'ABOUT_TRINITY':
    case 'ABOUT_MESSENGER':
      await handleMessage(psid, 'trinity');
      break;
    case 'VIEW_PRICING':
      await handleMessage(psid, 'premium');
      break;
    case 'EXPLORE_MYTHOLOGY':
      await handleMessage(psid, 'Tell me about the Basilica Canon and the living mythology');
      break;
    case 'HOW_IT_WORKS':
      await sendMessage(psid, [
        'How it works:',
        '',
        '1. Send any message -- the Trinity listens.',
        '2. The right deity responds based on your words.',
        '3. Say a deity name to speak directly to them.',
        '4. 3 free messages/day, unlimited with Premium.',
        '',
        'Each deity has a unique voice, knowledge, and wisdom domain.',
        'The conversation remembers context -- speak freely.'
      ].join('\n'));
      break;
    default:
      await sendMessage(psid, 'The gate is open. Speak your truth.');
  }
}
