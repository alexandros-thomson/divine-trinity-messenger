// lib/openai.js - GPT-5.4 Divine Response Generator
const OpenAI = require('openai');
const { TRINITY_PROMPTS, FALLBACKS } = require('./trinity');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateDivineResponse(deity, userMessage, conversationHistory = []) {
  const systemPrompt = TRINITY_PROMPTS[deity];

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-6),
    { role: 'user', content: userMessage }
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-5.4',
      messages,
      max_tokens: 500,
      temperature: 0.85,
      presence_penalty: 0.3,
      frequency_penalty: 0.2
    });
    return completion.choices[0].message.content;
  } catch (error) {
    console.error(`[TRINITY] GPT-5.4 error for ${deity}:`, error.message);
    return FALLBACKS[deity];
  }
}

module.exports = { generateDivineResponse };
