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

  try {
    console.log('🔄 PROXY: Fetching Replicate image:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const imageBuffer = await response.arrayBuffer();

    console.log('✅ PROXY: Successfully fetched image, size:', imageBuffer.byteLength);

    // Set appropriate headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', imageBuffer.byteLength);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

    // Send the image data
    res.status(200).send(Buffer.from(imageBuffer));

  } catch (error) {
    console.error('🚨 PROXY ERROR:', error);
    res.status(500).json({ 
      error: 'Failed to fetch image',
      details: error.message 
    });
  }
};