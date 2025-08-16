// Simple test with CommonJS
module.exports = async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  console.log('🔥 SIMPLE TEST API called');
  console.log('Method:', req.method);
  console.log('Environment check - has REPLICATE_API_TOKEN:', !!process.env.REPLICATE_API_TOKEN);
  
  res.status(200).json({
    message: 'Simple test API is working!',
    method: req.method,
    hasToken: !!process.env.REPLICATE_API_TOKEN,
    tokenLength: process.env.REPLICATE_API_TOKEN?.length || 0,
    timestamp: new Date().toISOString()
  });
};