// lib/messenger.js - Facebook Graph API message sender
const GRAPH_API_VERSION = 'v22.0';

async function sendMessage(senderPsid, message) {
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
        `https://graph.facebook.com/${GRAPH_API_VERSION}/me/messages?access_token=${process.env.PAGE_ACCESS_TOKEN}`,
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

module.exports = { sendMessage, GRAPH_API_VERSION };
