const Replicate = require("replicate");

module.exports = async function handler(req, res) {
  // Add CORS headers for Vercel
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  console.log('🧪 BASIC REPLICATE TEST started');
  console.log('Method:', req.method);
  
  // Support both GET and POST for easy testing
  if (req.method === 'GET') {
    return res.status(200).json({
      message: 'Test endpoint is working!',
      method: 'GET',
      hasToken: !!process.env.REPLICATE_API_TOKEN,
      tokenLength: process.env.REPLICATE_API_TOKEN?.length || 0,
      timestamp: new Date().toISOString()
    });
  }
  
  // Log everything about the environment
  console.log('Environment check:');
  console.log('- Node version:', process.version);
  console.log('- Has REPLICATE_API_TOKEN:', !!process.env.REPLICATE_API_TOKEN);
  console.log('- Token length:', process.env.REPLICATE_API_TOKEN?.length || 0);
  console.log('- Token prefix:', process.env.REPLICATE_API_TOKEN?.substring(0, 10) || 'none');
  
  if (!process.env.REPLICATE_API_TOKEN) {
    return res.status(500).json({ 
      error: 'No REPLICATE_API_TOKEN found in environment',
      env: Object.keys(process.env).filter(key => key.includes('REPLICATE'))
    });
  }

  try {
    console.log('🔍 Testing basic Replicate client creation...');
    
    // Test 1: Can we create a client?
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });
    console.log('✅ Replicate client created successfully');

    // Test 2: Can we make a simple API call?
    console.log('🔍 Testing account endpoint...');
    
    const response = await fetch('https://api.replicate.com/v1/account', {
      headers: {
        'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Account API failed:', response.status, errorText);
      return res.status(500).json({
        error: 'Account API failed',
        status: response.status,
        details: errorText
      });
    }
    
    const account = await response.json();
    console.log('✅ Account API successful:', account);

    // Test 3: Can we run the simplest possible model?
    console.log('🔍 Testing hello-world model...');
    
    const output = await replicate.run(
      "replicate/hello-world:5c7d5dc6dd8bf75c1acaa8565735e7986bc5b66206b55cca93cb72c9bf15ccaa",
      {
        input: {
          text: "test"
        }
      }
    );
    
    console.log('✅ Hello world model successful:', output);

    res.status(200).json({
      success: true,
      message: 'All Replicate tests passed!',
      account: account,
      helloWorld: output,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Replicate test failed:', error);
    
    res.status(500).json({
      error: 'Replicate test failed',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
}