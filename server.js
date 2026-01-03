// server.js - Divine Trinity Messenger with full freemium system
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { getDatabase } = require('./db');
const { generateToken } = require('./auth');
const { createCheckoutSession, handleWebhook } = require('./stripe-handler');

const app = express();
const PORT = process.env.PORT || 3000;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'divine_trinity_2025';

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'divine-trinity-messenger',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Webhook verification endpoint
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('Webhook verified');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

// Stripe webhook endpoint (raw body for signature verification)
app.post('/webhook/stripe', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  try {
    await handleWebhook(req.body, sig);
    res.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

// Main webhook endpoint for Messenger
app.post('/webhook', async (req, res) => {
  const body = req.body;

  if (body.object === 'page') {
    for (const entry of body.entry) {
      const webhookEvent = entry.messaging[0];
      const senderPsid = webhookEvent.sender.id;

      if (webhookEvent.message) {
        await handleMessage(senderPsid, webhookEvent.message);
      }
    }
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

// Message handler with freemium logic
async function handleMessage(senderPsid, receivedMessage) {
  const db = await getDatabase();
  
  // Get or create user
  let user = await db.get('SELECT * FROM users WHERE psid = ?', [senderPsid]);
  
  if (!user) {
    await db.run(
      'INSERT INTO users (psid, created_at, is_premium) VALUES (?, ?, ?)',
      [senderPsid, Date.now(), 0]
    );
    user = await db.get('SELECT * FROM users WHERE psid = ?', [senderPsid]);
    
    // Send welcome message
    await sendMessage(senderPsid, "Welcome to the Divine Trinity Messenger! Choose your deity for daily wisdom.");
    return;
  }

  // Check usage limits
  const today = Date.now() - (24 * 60 * 60 * 1000);
  const usageCount = await db.get(
    'SELECT COUNT(*) as count FROM usage WHERE psid = ? AND timestamp > ?',
    [senderPsid, today]
  );

  if (!user.is_premium && usageCount.count >= 3) {
    // Free tier limit reached
    const checkoutUrl = await createCheckoutSession(senderPsid);
    await sendMessage(senderPsid, 
      `You've reached your daily limit of 3 free messages. Upgrade to Premium for unlimited divine wisdom! ${checkoutUrl}`
    );
    return;
  }

  // Log usage
  await db.run(
    'INSERT INTO usage (psid, timestamp, deity) VALUES (?, ?, ?)',
    [senderPsid, Date.now(), 'general']
  );

  // Process message
  let responseText = "Divine wisdom awaits... Choose Zeus, Aphrodite, Lifeshere, or Lifeshpere for guidance.";
  
  if (receivedMessage.text) {
    const text = receivedMessage.text.toLowerCase();
    
    if (text.includes('zeus')) {
      responseText = "⚡ Zeus speaks: I thunder forth from Olympus!";
    } else if (text.includes('aphrodite')) {
      responseText = "💕 Aphrodite whispers: Love and beauty guide your path.";
    } else if (text.includes('lifeshere')) {
      responseText = "🌍 Lifeshere proclaims: The essence of existence flows through you.";
    } else if (text.includes('lifeshpere')) {
      responseText = "🌐 Lifeshpere reveals: Reality bends to divine will.";
    }
  }

  await sendMessage(senderPsid, responseText);
}

// Send message to Facebook Messenger
async function sendMessage(senderPsid, message) {
  const requestBody = {
    recipient: { id: senderPsid },
    message: { text: message }
  };

  try {
    await axios.post(
      `https://graph.facebook.com/v12.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
      requestBody
    );
    console.log('Message sent successfully');
  } catch (error) {
    console.error('Error sending message:', error.response?.data || error.message);
  }
}

// Stripe success page
app.get('/success', (req, res) => {
  res.send('<h1>Welcome to Premium!</h1><p>Your subscription is now active. Return to Messenger to enjoy unlimited divine wisdom.</p>');
});

// Stripe cancel page

// Messenger Profile Setup endpoint
app.post('/setup-messenger-profile', async (req, res) => {
  const MESSENGER_PROFILE_URL = 'https://graph.facebook.com/v21.0/me/messenger_profile';
  
  try {
    // 1. Set up Ice Breakers
    await axios.post(MESSENGER_PROFILE_URL, {
      ice_breakers: [
        { question: "🌟 What is Divine Trinity Messenger?", payload: "ABOUT_MESSENGER" },
        { question: "💰 View Premium Features", payload: "VIEW_PRICING" },
        { question: "📚 Explore Mythology", payload: "EXPLORE_MYTHOLOGY" },
        { question: "🎯 How does it work?", payload: "HOW_IT_WORKS" }
      ]
    }, { params: { access_token: PAGE_ACCESS_TOKEN } });

    // 2. Set up Persistent Menu
    await axios.post(MESSENGER_PROFILE_URL, {
      persistent_menu: [{
        locale: "default",
        composer_input_disabled: false,
        call_to_actions: [
          { type: "postback", title: "🏛️ About Divine Trinity", payload: "ABOUT_TRINITY" },
          { type: "postback", title: "💳 Pricing & Features", payload: "VIEW_PRICING" },
          { type: "web_url", title: "🌐 Visit Website", url: "https://divine-trinity-messenger.onrender.com", webview_height_ratio: "full" }
        ]
      }]
    }, { params: { access_token: PAGE_ACCESS_TOKEN } });

    // 3. Set up Greeting Text
    await axios.post(MESSENGER_PROFILE_URL, {
      greeting: [{
        locale: "default",
        text: "Welcome to Divine Trinity Messenger! ⚡ Your gateway to mythological conversations. How can I assist you today?"
      }]
    }, { params: { access_token: PAGE_ACCESS_TOKEN } });

    // 4. Set up Get Started Button
    await axios.post(MESSENGER_PROFILE_URL, {
      get_started: { payload: "GET_STARTED" }
    }, { params: { access_token: PAGE_ACCESS_TOKEN } });

    res.json({
      success: true,
      message: 'Messenger Profile configured successfully!',
      features: [
        '✅ Ice Breakers (4 conversation starters)',
        '✅ Persistent Menu (3 menu items)',
        '✅ Greeting Text',
        '✅ Get Started Button'
      ]
    });
  } catch (error) {
    console.error('Messenger Profile setup error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to configure Messenger Profile',
      details: error.response?.data || error.message
    });
  }
});


app.get('/cancel', (req, res) => {
  res.send('<h1>Upgrade Cancelled</h1><p>You can upgrade anytime. Return to Messenger to continue with free messages.</p>');
});

// Start server
app.listen(PORT, () => {
  console.log(`Divine Trinity Messenger server running on port ${PORT}`);
  console.log('Ready to receive divine messages!');
});
