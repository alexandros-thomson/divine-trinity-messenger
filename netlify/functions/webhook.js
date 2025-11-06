// Messenger Webhook Handler for Divine Trinity Oracle
// Handles verification and routes messages to Zeus

exports.handler = async (event) => {
  const { httpMethod, queryStringParameters, body } = event;

  // GET request: Webhook verification from Meta
  if (httpMethod === 'GET') {
    const mode = queryStringParameters['hub.mode'];
    const token = queryStringParameters['hub.verify_token'];
    const challenge = queryStringParameters['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
      console.log('Webhook verified successfully');
      return {
        statusCode: 200,
        body: challenge
      };
    } else {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Forbidden' })
      };
    }
  }

  // POST request: Incoming message from Messenger
  if (httpMethod === 'POST') {
    try {
      const data = JSON.parse(body);
      
      // Process each messaging event
      if (data.entry && data.entry[0].messaging) {
        for (const messagingEvent of data.entry[0].messaging) {
          const senderId = messagingEvent.sender.id;
          
          if (messagingEvent.message && messagingEvent.message.text) {
            const question = messagingEvent.message.text;
            
            // Call Zeus Oracle for decision
            const zeusResponse = await fetch(`${process.env.URL}/.netlify/functions/zeus`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ question, witnessId: senderId })
            });
            
            const decree = await zeusResponse.json();
            
            // Send decree back to user via Messenger API
            const formattedDecree = formatDecree(decree);
            await sendMessage(senderId, formattedDecree);
          }
        }
      }
      
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'ok' })
      };
    } catch (error) {
      console.error('Webhook error:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Internal server error' })
      };
    }
  }

  return {
    statusCode: 405,
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};

function formatDecree(decree) {
  return `🔮 THE ORACLE HAS SPOKEN\n\n` +
    `Ruling: ${decree.ruling}\n\n` +
    `Decision: ${decree.decision}\n\n` +
    `Divine Mandates:\n` +
    decree.mandates.map((m, i) => `${i + 1}. ${m}`).join('\n') +
    `\n\nSealed by: ${decree.seals.join(', ')}`;
}

async function sendMessage(recipientId, message) {
  const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
  
  const response = await fetch(
    `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: message }
      })
    }
  );
  
  return response.json();
}
