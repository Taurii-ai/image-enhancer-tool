import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 Debug API: Running Replicate API diagnostics...');
    
    const tests = [];
    let passedTests = 0;
    
    // Test 1: Environment variable check
    const hasApiToken = !!process.env.REPLICATE_API_TOKEN;
    tests.push({
      name: 'Environment Variable',
      status: hasApiToken ? 'PASS' : 'FAIL',
      details: hasApiToken ? 'REPLICATE_API_TOKEN is set' : 'REPLICATE_API_TOKEN not found'
    });
    if (hasApiToken) passedTests++;
    
    // Test 2: Token format validation
    const tokenFormat = process.env.REPLICATE_API_TOKEN?.startsWith('r8_');
    tests.push({
      name: 'Token Format',
      status: tokenFormat ? 'PASS' : 'FAIL',
      details: tokenFormat ? 'Token has correct r8_ prefix' : 'Token should start with r8_'
    });
    if (tokenFormat) passedTests++;
    
    // Test 3: Replicate client initialization
    let clientInit = false;
    try {
      const clientTest = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
      clientInit = true;
      tests.push({
        name: 'Client Initialization',
        status: 'PASS',
        details: 'Replicate client created successfully'
      });
      passedTests++;
    } catch (error) {
      tests.push({
        name: 'Client Initialization',
        status: 'FAIL',
        details: `Failed to create client: ${error.message}`
      });
    }
    
    // Test 4: Basic API connectivity (only if previous tests pass)
    if (hasApiToken && tokenFormat && clientInit) {
      try {
        // Test with a simple model list call (low cost/free)
        await replicate.models.list({ owner: 'replicate' });
        tests.push({
          name: 'API Connectivity',
          status: 'PASS',
          details: 'Successfully connected to Replicate API'
        });
        passedTests++;
      } catch (error) {
        tests.push({
          name: 'API Connectivity',
          status: 'FAIL',
          details: `API call failed: ${error.message}`
        });
      }
    } else {
      tests.push({
        name: 'API Connectivity',
        status: 'SKIP',
        details: 'Skipped due to previous test failures'
      });
    }
    
    const totalTests = tests.length;
    const overallStatus = passedTests === totalTests ? 'READY' : 'ISSUES_FOUND';
    
    const result = {
      timestamp: new Date().toISOString(),
      summary: {
        overallStatus,
        passedTests: `${passedTests}/${totalTests}`,
        message: overallStatus === 'READY' ? 'All systems ready for image enhancement' : 'Issues found that may prevent enhancement'
      },
      tests,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasToken: hasApiToken,
        tokenLength: process.env.REPLICATE_API_TOKEN?.length || 0
      }
    };
    
    console.log('🔍 Debug result:', result);
    
    res.status(200).json(result);
    
  } catch (error) {
    console.error('🚨 Debug API error:', error);
    res.status(500).json({
      error: 'Debug failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}