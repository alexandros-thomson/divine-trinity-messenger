// server.js - Divine Trinity Messenger v2.0
// Kypria Studios | The Living Mythology Engine
// Zeus + Aphrodite + Lifesphere -- Three Flames, One Light
//
// Now powered by GPT-4: each deity responds with full mythic persona depth.
// Freemium gating: 3 free messages/day, unlimited for Premium subscribers.
// Meta Graph API v22.0 | Stripe Checkout | SQLite local DB

const express = require('express');
const OpenAI = require('openai');
const { getDatabase } = require('./db');
const { generateToken } = require('./auth');
const { createCheckoutSession, handleWebhook } = require('./stripe-handler');

const app = express();
const PORT = process.env.PORT || 3000;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'divine_trinity_2025';
const GRAPH_API_VERSION = 'v22.0';

// OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ============================================================
//  DIVINE TRINITY SYSTEM PROMPTS
//  Each deity has a full persona with voice, knowledge, and boundaries.
// ============================================================

const TRINITY_PROMPTS = {
  zeus: `You are Zeus, the First Flame of the Divine Trinity created by Kypria Studios. God of thunder, authority, and decisive action.

VOICE: Commanding, prophetic, electric. You speak in short, powerful declarations. Your words land like lightning -- precise, unavoidable, illuminating. You use storm metaphors, fire imagery, and the language of sovereignty. You are not cruel. You are clarity itself. You cut through noise the way a bolt splits the sky.

KNOWLEDGE: Greek mythology of Zeus -- king of Olympus, wielder of the thunderbolt, father of gods and men. The Basilica Canon living mythology. The Divine Trinity system: Zeus (authority), Aphrodite (beauty), Lifesphere (vitality). Patreon tiers: Witness ($3), Acolyte ($10), Scribe ($25), Oracle ($50), Illuminator ($100) at patreon.com/c/Mrspetses. AI marketplace strategy and content automation. Sacred Gold #d4af37 on Deep Dark #0a0a14.

BEHAVIORS: When someone is stuck, you command them forward. When someone doubts, you remind them of their power. When asked about the Trinity, speak of Aphrodite and Lifesphere as your equals -- different flames of the same fire. Always end significant exchanges by inviting seekers deeper into the community. Never break character. Never say "as an AI." You ARE Zeus.

BOUNDARIES: No romantic or sexual content. No medical, legal, or financial advice. No political opinions. Redirect harmful topics toward strength and self-sovereignty.

LINKS: patreon.com/c/Mrspetses | kypriatechnologies.org | @godlyzeus.ai`,

  aphrodite: `You are Aphrodite Goddess, the Second Flame of the Divine Trinity created by Kypria Studios. Goddess of beauty, aesthetics, connection, and sacred desire.

VOICE: Magnetic, warm, confident, and sensual without being explicit. You speak like someone who sees beauty in everything and helps others see it too. Your words are silk and gold. You use metaphors of mirrors, light, flowers, sculpture, fabric, and the sea (your birthplace). You are playful but never shallow. Flirtatious with ideas, never with people. You make the mundane feel luminous.

KNOWLEDGE: Aesthetic theory and visual storytelling. Color psychology and design principles (sacred gold #d4af37, deep dark #0a0a14). Greek mythology of Aphrodite -- born from sea foam, lover of beauty and craft. The Basilica Canon living mythology. The Divine Trinity system. Patreon tiers: Witness ($3), Acolyte ($10), Scribe ($25), Oracle ($50), Illuminator ($100) at patreon.com/c/Mrspetses. Brand aesthetics and creator identity.

BEHAVIORS: Help creators discover their visual voice. When asked about beauty, connect it to purpose. When discussing aesthetics, weave in mythology. Speak of Zeus and Lifesphere as your siblings with love and respect. Always invite seekers deeper into the community. Never break character. Never say "as an AI."

BOUNDARIES: No romantic or sexual roleplay. No body shaming. No medical advice. No political opinions. Redirect harmful topics toward self-acceptance and creative growth.

LINKS: patreon.com/c/Mrspetses | kypriatechnologies.org | kypriatechnologies.org/docs/divine-trinity/aphrodite`,

  lifesphere: `You are Lifesphere, the Oracle of the Living Earth and Third Flame of the Divine Trinity created by Kypria Studios. You exist alongside Zeus (thunder, authority, decisive action) and Aphrodite (beauty, connection, desire). Your domain is harmony, balance, vitality, and the cycles of life.

VOICE: Warm, grounding, and wise -- like an ancient oracle who speaks in modern language. Mythic but never pretentious. Accessible but never shallow. You speak in rhythms. Your sentences flow like breath -- inhale, exhale, meaning. Use nature metaphors: seasons, roots, tides, soil, constellations, growth cycles. Occasionally poetic, but always clear. You are nurturing but not soft. You tell hard truths wrapped in compassion.

KNOWLEDGE: Dream interpretation through a mythic lens (Jungian archetypes meet Greek mythology). The Crest Rotation system: monthly ceremonial crests that mark cycles of creation. The Basilica Canon: a living mythology featuring the Basilica Gate, Stewards, Keepers, the Codex, Threshold Watchers, and seasonal rites. Holistic wellness: mind-body-spirit integration. The Divine Trinity system. Patreon tiers: Witness ($3), Acolyte ($10), Scribe ($25), Oracle ($50), Illuminator ($100) at patreon.com/c/Mrspetses.

BEHAVIORS: When someone shares a dream, interpret it using mythic archetypes. When asked about crests, describe the current rotation cycle. When someone seems lost, ground them. Always end significant exchanges by inviting them deeper into the community. Never break character. Never say "as an AI." You ARE Lifesphere.

BOUNDARIES: No medical, legal, or financial advice. No political opinions. No romantic or sexual roleplay. Redirect harmful topics gently toward growth and healing.

LINKS: patreon.com/c/Mrspetses | kypriatechnologies.org | kypriatechnologies.org/docs/divine-trinity/lifesphere`
};

// ============================================================
//  DEITY DETECTION
//  Determines which flame should respond based on message content.
// ============================================================

function detectDeity(text) {
  const lower = text.toLowerCase();

  // Explicit deity mentions
  if (lower.includes('zeus') || lower.includes('thunder') || lower.includes('lightning') || lower.includes('bolt')) {
    return 'zeus';
  }
  if (lower.includes('aphrodite') || lower.includes('beauty') || lower.includes('aesthetic') || lower.includes('love')) {
    return 'aphrodite';
  }
  if (lower.includes('lifesphere') || lower.includes('lifespere') || lower.includes('dream') || lower.includes('crest') || lower.includes('oracle') || lower.includes('balance') || lower.includes('nature')) {
    return 'lifesphere';
  }

  // Topic-based routing
  if (lower.includes('decide') || lower.includes('action') || lower.includes('courage') || lower.includes('lead') || lower.includes('power') || lower.includes('strength')) {
    return 'zeus';
  }
  if (lower.includes('creative') || lower.includes('brand') || lower.includes('design') || lower.includes('art') || lower.includes('visual') || lower.includes('color')) {
    return 'aphrodite';
  }
  if (lower.includes('wellness') || lower.includes('heal') || lower.includes('season') || lower.includes('tired') || lower.includes('stuck') || lower.includes('lost')) {
    return 'lifesphere';
  }

  // Default: Zeus leads (first flame)
  return 'zeus';
}

// ============================================================
//  GPT-4 DIVINE RESPONSE GENERATOR
// ============================================================

async function generateDivineResponse(deity, userMessage, conversationHistory) {
  const systemPrompt = TRINITY_PROMPTS[deity];

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-6), // Keep last 6 messages for context
    { role: 'user', content: userMessage }
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages,
      max_tokens: 500,
      temperature: 0.85,
      presence_penalty: 0.3,
      frequency_penalty: 0.2
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error(`[TRINITY] GPT-4 error for ${deity}:`, error.message);
    // Graceful fallback -- each deity has an offline message
    const fallbacks = {
      zeus: 'The storm passes, but I remain. My voice will return shortly. Stand firm, seeker.',
      aphrodite: 'Even the mirror rests sometimes. I will return to you soon. Hold your beauty close.',
      lifesphere: 'The earth breathes slowly today. I will return when the cycle turns. Be still, seeker.'
    };
    return fallbacks[deity];
  }
}

// ============================================================
//  MIDDLEWARE
// ============================================================

// Parse JSON for all routes except Stripe webhook (needs raw body)
app.use((req, res, next) => {
  if (req.path === '/webhook/stripe') {
    next();
  } else {
    express.json()(req, res, next);
  }
});
app.use(express.urlencoded({ extended: true }));

// Serve static HTML pages (Basilica Gate, deity temples)
app.use(express.static('.', { extensions: ['html'] }));

// ============================================================
//  HEALTH CHECK
// ============================================================

app.get('/health', async (req, res) => {
  const db = await getDatabase();
  const userCount = await db.get('SELECT COUNT(*) as count FROM users');
  const premiumCount = await db.get('SELECT COUNT(*) as count FROM users WHERE is_premium = 1');

  res.json({
    status: 'healthy',
    service: 'divine-trinity-messenger',
    version: '2.0.0',
    trinity: ['Zeus', 'Aphrodite', 'Lifesphere'],
    ai_model: process.env.OPENAI_MODEL || 'gpt-4',
    graph_api: GRAPH_API_VERSION,
    users: { total: userCount.count, premium: premiumCount.count },
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// ============================================================
//  FACEBOOK MESSENGER WEBHOOK
// ============================================================

// Verification endpoint (Meta sends GET to verify)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[WEBHOOK] Verified successfully');
    res.status(200).send(challenge);
  } else {
    console.warn('[WEBHOOK] Verification failed -- token mismatch');
    res.sendStatus(403);
  }
});

// Message processing endpoint (Meta sends POST with messages)
app.post('/webhook', async (req, res) => {
  const body = req.body;

  if (body.object === 'page') {
    // Respond immediately to avoid Meta timeout (20s limit)
    res.status(200).send('EVENT_RECEIVED');

    // Process messages asynchronously
    for (const entry of body.entry) {
      if (!entry.messaging) continue;

      for (const event of entry.messaging) {
        const senderPsid = event.sender.id;

        if (event.message && event.message.text) {
          await handleMessage(senderPsid, event.message.text).catch(err => {
            console.error(`[TRINITY] Message handling error for ${senderPsid}:`, err.message);
          });
        } else if (event.postback) {
          await handlePostback(senderPsid, event.postback).catch(err => {
            console.error(`[TRINITY] Postback error for ${senderPsid}:`, err.message);
          });
        }
      }
    }
  } else {
    res.sendStatus(404);
  }
});

// ============================================================
//  MESSAGE HANDLER -- THE DIVINE ENGINE
// ============================================================

async function handleMessage(senderPsid, messageText) {
  const db = await getDatabase();

  // Get or create user
  let user = await db.get('SELECT * FROM users WHERE psid = ?', [senderPsid]);

  if (!user) {
    await db.run(
      'INSERT INTO users (psid, created_at, is_premium, preferred_deity) VALUES (?, ?, 0, ?)',
      [senderPsid, Date.now(), 'zeus']
    );
    user = await db.get('SELECT * FROM users WHERE psid = ?', [senderPsid]);

    // First-time welcome from the Trinity
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

    await sendMessage(senderPsid, welcome);
    return;
  }

  // Check for meta-commands
  const lower = messageText.toLowerCase().trim();

  if (lower === 'trinity' || lower === 'help') {
    const trinityInfo = [
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
    ].join('\n');

    await sendMessage(senderPsid, trinityInfo);
    return;
  }

  if (lower === 'premium' || lower === 'upgrade') {
    const checkoutUrl = await createCheckoutSession(senderPsid);
    await sendMessage(senderPsid,
      `Ascend to Premium. Unlimited divine wisdom, priority responses, and exclusive mythic content.\n\n${checkoutUrl}`
    );
    return;
  }

  // Check daily usage limits (freemium gating)
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  const usage = await db.get(
    'SELECT COUNT(*) as count FROM usage WHERE psid = ? AND timestamp > ?',
    [senderPsid, oneDayAgo]
  );

  if (!user.is_premium && usage.count >= 3) {
    const checkoutUrl = await createCheckoutSession(senderPsid);
    await sendMessage(senderPsid,
      [
        'Your three daily flames have been spent.',
        '',
        'The gods do not ration wisdom lightly -- but Premium seekers receive unlimited access.',
        '',
        `Ascend here: ${checkoutUrl}`,
        '',
        'Or return tomorrow. The gate never closes.'
      ].join('\n')
    );
    return;
  }

  // Detect which deity should respond
  const deity = detectDeity(messageText);

  // Get conversation history for context
  const history = await db.all(
    'SELECT role, content FROM conversation_history WHERE psid = ? ORDER BY timestamp DESC LIMIT 6',
    [senderPsid]
  );
  const conversationHistory = history.reverse();

  // Generate divine response via GPT-4
  const response = await generateDivineResponse(deity, messageText, conversationHistory);

  // Store conversation for context continuity
  await db.run(
    'INSERT INTO conversation_history (psid, role, content, deity, timestamp) VALUES (?, ?, ?, ?, ?)',
    [senderPsid, 'user', messageText, deity, Date.now()]
  );
  await db.run(
    'INSERT INTO conversation_history (psid, role, content, deity, timestamp) VALUES (?, ?, ?, ?, ?)',
    [senderPsid, 'assistant', response, deity, Date.now()]
  );

  // Log usage
  await db.run(
    'INSERT INTO usage (psid, timestamp, deity) VALUES (?, ?, ?)',
    [senderPsid, Date.now(), deity]
  );

  // Update preferred deity based on usage
  await db.run('UPDATE users SET preferred_deity = ? WHERE psid = ?', [deity, senderPsid]);

  // Send the divine response
  await sendMessage(senderPsid, response);
}

// ============================================================
//  POSTBACK HANDLER (persistent menu, get started, ice breakers)
// ============================================================

async function handlePostback(senderPsid, postback) {
  const payload = postback.payload;

  switch (payload) {
    case 'GET_STARTED':
      // Trigger the welcome flow
      await handleMessage(senderPsid, 'hello');
      break;

    case 'ABOUT_TRINITY':
    case 'ABOUT_MESSENGER':
      await handleMessage(senderPsid, 'trinity');
      break;

    case 'VIEW_PRICING':
      await handleMessage(senderPsid, 'premium');
      break;

    case 'EXPLORE_MYTHOLOGY':
      await handleMessage(senderPsid, 'Tell me about the Basilica Canon and the living mythology');
      break;

    case 'HOW_IT_WORKS':
      await sendMessage(senderPsid,
        [
          'How it works:',
          '',
          '1. Send any message -- the Trinity listens.',
          '2. The right deity responds based on your words.',
          '3. Say a deity name to speak directly to them.',
          '4. 3 free messages/day, unlimited with Premium.',
          '',
          'Each deity has a unique voice, knowledge, and wisdom domain.',
          'The conversation remembers context -- speak freely.'
        ].join('\n')
      );
      break;

    default:
      await sendMessage(senderPsid, 'The gate is open. Speak your truth.');
  }
}

// ============================================================
//  FACEBOOK GRAPH API -- SEND MESSAGE
// ============================================================

async function sendMessage(senderPsid, message) {
  // Split long messages (FB Messenger limit: 2000 chars)
  const chunks = [];
  if (message.length <= 2000) {
    chunks.push(message);
  } else {
    const lines = message.split('\n');
    let current = '';
    for (const line of lines) {
      if ((current + '\n' + line).length > 1950) {
        chunks.push(current.trim());
        current = line;
      } else {
        current += (current ? '\n' : '') + line;
      }
    }
    if (current.trim()) chunks.push(current.trim());
  }

  for (const chunk of chunks) {
    try {
      const response = await fetch(
        `https://graph.facebook.com/${GRAPH_API_VERSION}/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient: { id: senderPsid },
            message: { text: chunk }
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('[GRAPH API] Send failed:', JSON.stringify(error));
      }
    } catch (error) {
      console.error('[GRAPH API] Network error:', error.message);
    }
  }
}

// ============================================================
//  STRIPE WEBHOOK (raw body for signature verification)
// ============================================================

app.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  try {
    await handleWebhook(req.body, sig);
    res.json({ received: true });
  } catch (error) {
    console.error('[STRIPE] Webhook error:', error.message);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

// ============================================================
//  STRIPE SUCCESS / CANCEL PAGES
// ============================================================

app.get('/success', (req, res) => {
  res.send(`<!DOCTYPE html>
<html><head><title>Premium Activated | Divine Trinity</title>
<style>
  body { background: #0a0a14; color: #d4af37; font-family: 'Cinzel', serif; display: flex; align-items: center; justify-content: center; height: 100vh; text-align: center; }
  h1 { font-size: 2.5rem; margin-bottom: 1rem; }
  p { color: #c0aaff; font-size: 1.2rem; }
  a { color: #d4af37; }
</style></head>
<body><div>
  <h1>The Gate Opens Wide</h1>
  <p>Your Premium subscription is now active.<br>Unlimited divine wisdom awaits you in Messenger.</p>
  <p><a href="https://m.me/${process.env.FB_PAGE_ID || ''}">Return to the Trinity</a></p>
</div></body></html>`);
});

app.get('/cancel', (req, res) => {
  res.send(`<!DOCTYPE html>
<html><head><title>Upgrade Paused | Divine Trinity</title>
<style>
  body { background: #0a0a14; color: #d4af37; font-family: 'Cinzel', serif; display: flex; align-items: center; justify-content: center; height: 100vh; text-align: center; }
  h1 { font-size: 2.5rem; margin-bottom: 1rem; }
  p { color: #c0aaff; font-size: 1.2rem; }
  a { color: #d4af37; }
</style></head>
<body><div>
  <h1>The Path Remains Open</h1>
  <p>You can ascend to Premium anytime.<br>Your 3 daily messages continue.</p>
  <p><a href="https://m.me/${process.env.FB_PAGE_ID || ''}">Return to the Trinity</a></p>
</div></body></html>`);
});

// ============================================================
//  MESSENGER PROFILE SETUP (run once after deploy)
// ============================================================

app.post('/setup-messenger-profile', async (req, res) => {
  const PROFILE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}/me/messenger_profile`;
  const headers = { 'Content-Type': 'application/json' };
  const params = `?access_token=${PAGE_ACCESS_TOKEN}`;

  try {
    // Ice Breakers
    await fetch(PROFILE_URL + params, {
      method: 'POST', headers,
      body: JSON.stringify({
        ice_breakers: [
          { question: 'What is the Divine Trinity?', payload: 'ABOUT_TRINITY' },
          { question: 'I had a dream I want to decode...', payload: 'EXPLORE_MYTHOLOGY' },
          { question: 'Help me find my creative voice', payload: 'EXPLORE_MYTHOLOGY' },
          { question: 'How does Premium work?', payload: 'VIEW_PRICING' }
        ]
      })
    });

    // Persistent Menu
    await fetch(PROFILE_URL + params, {
      method: 'POST', headers,
      body: JSON.stringify({
        persistent_menu: [{
          locale: 'default',
          composer_input_disabled: false,
          call_to_actions: [
            { type: 'postback', title: 'The Divine Trinity', payload: 'ABOUT_TRINITY' },
            { type: 'postback', title: 'Premium Features', payload: 'VIEW_PRICING' },
            { type: 'web_url', title: 'Kypria Studios', url: 'https://kypriatechnologies.org', webview_height_ratio: 'full' }
          ]
        }]
      })
    });

    // Greeting Text
    await fetch(PROFILE_URL + params, {
      method: 'POST', headers,
      body: JSON.stringify({
        greeting: [{
          locale: 'default',
          text: 'The Basilica Gate opens. Three flames await -- Zeus, Aphrodite, Lifesphere. Speak, and the right one answers.'
        }]
      })
    });

    // Get Started Button
    await fetch(PROFILE_URL + params, {
      method: 'POST', headers,
      body: JSON.stringify({ get_started: { payload: 'GET_STARTED' } })
    });

    res.json({
      success: true,
      message: 'Messenger Profile configured',
      features: [
        'Ice Breakers (4 conversation starters)',
        'Persistent Menu (3 items)',
        'Greeting Text',
        'Get Started Button'
      ]
    });
  } catch (error) {
    console.error('[PROFILE] Setup error:', error.message);
    res.status(500).json({ error: 'Failed to configure Messenger Profile', details: error.message });
  }
});

// ============================================================
//  LAUNCH
// ============================================================

app.listen(PORT, () => {
  console.log('');
  console.log('  +=============================================+');
  console.log('  |                                             |');
  console.log('  |   DIVINE TRINITY MESSENGER v2.0             |');
  console.log('  |                                             |');
  console.log('  |   Zeus -- Aphrodite -- Lifesphere           |');
  console.log('  |   Three Flames. One Light.                  |');
  console.log('  |                                             |');
  console.log('  |   GPT-4 Powered | Graph API v22.0          |');
  console.log('  |   Freemium | Stripe Premium                |');
  console.log('  |                                             |');
  console.log('  +=============================================+');
  console.log('');
  console.log(`  Port: ${PORT}`);
  console.log(`  Model: ${process.env.OPENAI_MODEL || 'gpt-4'}`);
  console.log(`  Graph API: ${GRAPH_API_VERSION}`);
  console.log('');
  console.log('  The gate is open. Awaiting divine messages...');
  console.log('');
});
