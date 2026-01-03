// netlify/functions/setup-messenger-profile.js
const axios = require('axios');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
  const MESSENGER_PROFILE_URL = 'https://graph.facebook.com/v21.0/me/messenger_profile';

  try {
    // 1. Set up Ice Breakers (conversation starters)
    const iceBreakers = {
      ice_breakers: [
        {
          question: "🌟 What is Divine Trinity Messenger?",
          payload: "ABOUT_MESSENGER"
        },
        {
          question: "💰 View Premium Features",
          payload: "VIEW_PRICING"
        },
        {
          question: "📚 Explore Mythology",
          payload: "EXPLORE_MYTHOLOGY"
        },
        {
          question: "🎯 How does it work?",
          payload: "HOW_IT_WORKS"
        }
      ]
    };

    await axios.post(MESSENGER_PROFILE_URL, iceBreakers, {
      params: { access_token: PAGE_ACCESS_TOKEN }
    });

    // 2. Set up Persistent Menu
    const persistentMenu = {
      persistent_menu: [
        {
          locale: "default",
          composer_input_disabled: false,
          call_to_actions: [
            {
              type: "postback",
              title: "🏛️ About Divine Trinity",
              payload: "ABOUT_TRINITY"
            },
            {
              type: "postback",
              title: "💳 Pricing & Features",
              payload: "VIEW_PRICING"
            },
            {
              type: "web_url",
              title: "🌐 Visit Website",
              url: "https://divine-trinity-messenger.onrender.com",
              webview_height_ratio: "full"
            }
          ]
        }
      ]
    };

    await axios.post(MESSENGER_PROFILE_URL, persistentMenu, {
      params: { access_token: PAGE_ACCESS_TOKEN }
    });

    // 3. Set up Greeting Text
    const greeting = {
      greeting: [
        {
          locale: "default",
          text: "Welcome to Divine Trinity Messenger! ⚡ Your gateway to mythological conversations. How can I assist you today?"
        }
      ]
    };

    await axios.post(MESSENGER_PROFILE_URL, greeting, {
      params: { access_token: PAGE_ACCESS_TOKEN }
    });

    // 4. Set up Get Started Button
    const getStarted = {
      get_started: {
        payload: "GET_STARTED"
      }
    };

    await axios.post(MESSENGER_PROFILE_URL, getStarted, {
      params: { access_token: PAGE_ACCESS_TOKEN }
    });

    // 5. Whitelist domains for webview
    const whitelist = {
      whitelisted_domains: [
        "https://divine-trinity-messenger.onrender.com"
      ]
    };

    await axios.post(MESSENGER_PROFILE_URL, whitelist, {
      params: { access_token: PAGE_ACCESS_TOKEN }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Messenger Profile configured successfully!',
        features: [
          '✅ Ice Breakers (4 conversation starters)',
          '✅ Persistent Menu (3 menu items)',
          '✅ Greeting Text',
          '✅ Get Started Button',
          '✅ Domain Whitelist'
        ]
      })
    };

  } catch (error) {
    console.error('Messenger Profile setup error:', error.response?.data || error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to configure Messenger Profile',
        details: error.response?.data || error.message
      })
    };
  }
};
