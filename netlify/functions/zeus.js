// Zeus Oracle Decision Engine - Simplified for Friday's Ritual
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { question, witnessId } = JSON.parse(event.body);
    
    // Simple decision logic (can be enhanced with AI later)
    const keywords = question.toLowerCase();
    let decision = 'APPROVE';
    let mandates = [];
    
    if (keywords.includes('launch') || keywords.includes('start')) {
      mandates = [
        'Proceed with courage and wisdom',
        'Document the journey thoroughly',
        'Share knowledge with the community'
      ];
    } else if (keywords.includes('stop') || keywords.includes('cancel')) {
      decision = 'DENY';
      mandates = [
        'Pause and reflect before proceeding',
        'Consult with trusted advisors',
        'Consider alternative paths'
      ];
    } else {
      decision = 'DEFER';
      mandates = [
        'Gather more information',
        'Seek counsel from witnesses',
        'Return when clarity emerges'
      ];
    }
    
    const decree = {
      id: `decree_${Date.now()}`,
      ruling: `The Oracle has considered: "${question}"`,
      decision,
      mandates,
      seals: ['Zeus', 'Athena', 'Apollo'],
      witnessId: witnessId || 'anonymous',
      timestamp: new Date().toISOString()
    };

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(decree)
    };
  } catch (error) {
    console.error('Zeus error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'The Oracle is momentarily silent' })
    };
  }
};
