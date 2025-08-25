export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
    
    if (!REPLICATE_API_TOKEN) {
      return res.status(500).json({ 
        error: "No REPLICATE_API_TOKEN found",
        hasToken: !!REPLICATE_API_TOKEN,
        tokenLength: REPLICATE_API_TOKEN ? REPLICATE_API_TOKEN.length : 0
      });
    }

    // Test without any imports - just fetch the Replicate API directly
    const testResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        version: "660d922d33153019e8c263a3bba265de882e7f4f70396546b6c9c8f9d47a021a",
        input: {
          image: "https://replicate.delivery/pbxt/JqW45gqzRnpmHd3wMh6vK9VVNp6VnKWrx6xMUhFqGWOGdxp6/original.jpg",
          task_type: "Real-World Image Super-Resolution-Large"
        }
      })
    });

    const result = await testResponse.json();
    
    return res.status(200).json({
      success: true,
      tokenExists: !!REPLICATE_API_TOKEN,
      tokenLength: REPLICATE_API_TOKEN ? REPLICATE_API_TOKEN.length : 0,
      replicateResponse: result,
      responseStatus: testResponse.status,
      responseOk: testResponse.ok
    });

  } catch (error) {
    return res.status(500).json({
      error: "Test failed",
      message: error.message,
      stack: error.stack
    });
  }
}