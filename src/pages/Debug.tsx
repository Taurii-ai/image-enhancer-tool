import { useState } from 'react';

const Debug = () => {
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const testEnhancement = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/enhance-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          scale: 4,
          face_enhance: true
        })
      });

      const result = await response.json();
      setTestResult(JSON.stringify(result, null, 2));
      
      if (result.success && result.output) {
        console.log('🎯 DEBUG: Enhanced URL received:', result.output);
      }
    } catch (error) {
      setTestResult('ERROR: ' + error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Real-ESRGAN Debug</h1>
      
      <button 
        onClick={testEnhancement}
        disabled={isLoading}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
      >
        {isLoading ? 'Testing...' : 'Test Enhancement API'}
      </button>
      
      {testResult && (
        <div className="bg-gray-100 p-4 rounded">
          <pre>{testResult}</pre>
        </div>
      )}
      
      {testResult && testResult.includes('output') && (
        <div className="mt-4">
          <h3 className="font-bold">Enhanced Image Test:</h3>
          <img 
            src={JSON.parse(testResult).output} 
            alt="Enhanced Test" 
            className="border border-gray-300 mt-2"
            onLoad={() => console.log('✅ Debug image loaded successfully')}
            onError={(e) => console.error('❌ Debug image failed:', e)}
          />
        </div>
      )}
    </div>
  );
};

export default Debug;