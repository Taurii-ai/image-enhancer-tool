module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  console.log('🔍 TEST API: Called successfully');
  console.log('Environment check:', {
    hasReplicateToken: !!process.env.REPLICATE_API_TOKEN,
    tokenPrefix: process.env.REPLICATE_API_TOKEN?.substring(0, 8),
    nodeVersion: process.version,
    timestamp: new Date().toISOString()
  });

  res.status(200).json({
    success: true,
    message: 'API is working!',
    hasReplicateToken: !!process.env.REPLICATE_API_TOKEN,
    tokenPrefix: process.env.REPLICATE_API_TOKEN?.substring(0, 8),
    nodeVersion: process.version,
    timestamp: new Date().toISOString()
  });
};