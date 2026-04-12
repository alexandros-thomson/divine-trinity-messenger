// netlify/functions/setup-messenger-profile.js
// Run once after deploy to configure Messenger ice breakers, menu, and greeting.
const { GRAPH_API_VERSION } = require('../../lib/messenger');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'POST only' };
  }

  const PROFILE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}/me/messenger_profile`;
  const params = `?access_token=${process.env.PAGE_ACCESS_TOKEN}`;
  const headers = { 'Content-Type': 'application/json' };

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

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: 'Messenger Profile configured',
        features: [
          'Ice Breakers (4 conversation starters)',
          'Persistent Menu (3 items)',
          'Greeting Text',
          'Get Started Button'
        ]
      })
    };
  } catch (error) {
    console.error('[PROFILE] Setup error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to configure Messenger Profile', details: error.message })
    };
  }
};
