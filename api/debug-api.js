// Debug endpoint to check if Replicate API is working
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: {
        hasReplicateToken: !!process.env.REPLICATE_API_TOKEN,
        tokenPrefix: process.env.REPLICATE_API_TOKEN?.substring(0, 3) || 'none',
        tokenLength: process.env.REPLICATE_API_TOKEN?.length || 0,
        nodeVersion: process.version,
        vercelRegion: process.env.VERCEL_REGION || 'unknown'
      },
      tests: {}
    };

    // Test 1: Environment variable format
    if (process.env.REPLICATE_API_TOKEN) {
      debugInfo.tests.tokenFormat = {
        startsWithR8: process.env.REPLICATE_API_TOKEN.startsWith('r8_'),
        isValidLength: process.env.REPLICATE_API_TOKEN.length > 20,
        status: process.env.REPLICATE_API_TOKEN.startsWith('r8_') && process.env.REPLICATE_API_TOKEN.length > 20 ? 'PASS' : 'FAIL'
      };
    } else {
      debugInfo.tests.tokenFormat = {
        status: 'FAIL',
        error: 'REPLICATE_API_TOKEN environment variable not found'
      };
    }

    // Test 2: Try importing Replicate
    try {
      const Replicate = await import('replicate');
      debugInfo.tests.replicateImport = {
        status: 'PASS',
        version: 'imported successfully'
      };

      // Test 3: Try creating Replicate client
      if (process.env.REPLICATE_API_TOKEN) {
        try {
          const replicate = new Replicate.default({
            auth: process.env.REPLICATE_API_TOKEN,
          });
          debugInfo.tests.replicateClient = {
            status: 'PASS',
            message: 'Client created successfully'
          };

          // Test 4: Try a simple API call (list models)
          if (req.method === 'POST' && req.body?.testApiCall) {
            try {
              // This is a simple API call that shouldn't cost anything
              const models = await replicate.models.list();
              debugInfo.tests.apiConnection = {
                status: 'PASS',
                message: 'Successfully connected to Replicate API',
                modelCount: models?.results?.length || 0
              };
            } catch (apiError) {
              debugInfo.tests.apiConnection = {
                status: 'FAIL',
                error: apiError.message,
                details: 'API call failed - check token validity and billing'
              };
            }
          }

        } catch (clientError) {
          debugInfo.tests.replicateClient = {
            status: 'FAIL',
            error: clientError.message
          };
        }
      }

    } catch (importError) {
      debugInfo.tests.replicateImport = {
        status: 'FAIL',
        error: importError.message
      };
    }

    // Overall status
    const allTests = Object.values(debugInfo.tests);
    const passedTests = allTests.filter(test => test.status === 'PASS').length;
    const totalTests = allTests.length;
    
    debugInfo.summary = {
      overallStatus: passedTests === totalTests ? 'READY' : 'ISSUES_FOUND',
      passedTests: `${passedTests}/${totalTests}`,
      readyForRealESRGAN: debugInfo.tests.tokenFormat?.status === 'PASS'
    };

    res.status(200).json(debugInfo);

  } catch (error) {
    res.status(500).json({
      error: 'Debug endpoint failed',
      message: error.message,
      stack: error.stack
    });
  }
}