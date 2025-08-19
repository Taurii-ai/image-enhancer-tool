export default async function handler(req, res) {
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
    
    // Multiple retry attempts with different approaches
    let response;
    let attempt = 0;
    const maxAttempts = 3;
    
    while (attempt < maxAttempts) {
      try {
        console.log(`🔄 PROXY: Attempt ${attempt + 1}/${maxAttempts}`);
        
        response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ImageProxy/1.0)',
            'Accept': 'image/*,*/*',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
          },
          timeout: 30000,
        });
        
        if (response.ok) break;
        
        console.warn(`🚨 PROXY: Attempt ${attempt + 1} failed:`, response.status, response.statusText);
        attempt++;
        
        if (attempt < maxAttempts) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
        
      } catch (fetchError) {
        console.error(`🚨 PROXY: Fetch error on attempt ${attempt + 1}:`, fetchError.message);
        attempt++;
        
        if (attempt >= maxAttempts) throw fetchError;
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    if (!response || !response.ok) {
      throw new Error(`HTTP ${response?.status || 'unknown'}: ${response?.statusText || 'Network error'}`);
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const imageBuffer = await response.arrayBuffer();

    console.log('✅ PROXY: Successfully fetched image, size:', imageBuffer.byteLength, 'type:', contentType);

    // Set appropriate headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', imageBuffer.byteLength);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Send the image data
    res.status(200).send(Buffer.from(imageBuffer));

  } catch (error) {
    console.error('🚨 PROXY ERROR:', error);
    
    // Return a placeholder image on error instead of JSON
    const placeholderSvg = `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="400" fill="#f0f0f0"/>
      <text x="200" y="200" text-anchor="middle" fill="#666">Image Load Failed</text>
    </svg>`;
    
    res.setHeader('Content-Type', 'image/svg+xml');
    res.status(200).send(placeholderSvg);
  }
};