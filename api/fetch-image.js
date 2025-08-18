const https = require('https');
const http = require('http');

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.query;

  if (!url || !url.startsWith('https://replicate.delivery/')) {
    return res.status(400).json({ error: 'Invalid Replicate URL' });
  }

  console.log('🔄 FETCH: Attempting to fetch:', url);

  // Use Node.js native modules instead of fetch
  const client = url.startsWith('https:') ? https : http;
  
  try {
    const response = await new Promise((resolve, reject) => {
      const request = client.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ImageFetcher/1.0)',
          'Accept': 'image/*,*/*',
        },
        timeout: 30000,
      }, resolve);
      
      request.on('error', reject);
      request.on('timeout', () => reject(new Error('Request timeout')));
    });

    if (response.statusCode !== 200) {
      throw new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`);
    }

    const chunks = [];
    response.on('data', chunk => chunks.push(chunk));
    
    await new Promise((resolve, reject) => {
      response.on('end', resolve);
      response.on('error', reject);
    });

    const imageBuffer = Buffer.concat(chunks);
    const contentType = response.headers['content-type'] || 'image/jpeg';

    console.log('✅ FETCH: Success, size:', imageBuffer.length, 'type:', contentType);

    // Set headers and send image
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', imageBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    res.status(200).send(imageBuffer);

  } catch (error) {
    console.error('🚨 FETCH ERROR:', error.message);
    
    // Return error response
    res.status(500).json({ 
      error: 'Failed to fetch image',
      details: error.message,
      url: url
    });
  }
};