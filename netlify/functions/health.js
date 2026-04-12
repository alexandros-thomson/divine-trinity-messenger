// netlify/functions/health.js - Health Check Endpoint
const { supabase } = require('../../lib/supabase');

exports.handler = async () => {
  const { count: totalUsers } = await supabase
    .from('messenger_users')
    .select('*', { count: 'exact', head: true });

  const { count: premiumUsers } = await supabase
    .from('messenger_users')
    .select('*', { count: 'exact', head: true })
    .eq('is_premium', true);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'healthy',
      service: 'divine-trinity-messenger',
      version: '2.0.0',
      platform: 'netlify',
      trinity: ['Zeus', 'Aphrodite', 'Lifesphere'],
      ai_model: process.env.OPENAI_MODEL || 'gpt-4',
      users: { total: totalUsers || 0, premium: premiumUsers || 0 },
      timestamp: new Date().toISOString()
    })
  };
};
