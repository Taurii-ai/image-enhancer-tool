// Simple test to see if the API works at all
export default async function handler(req, res) {
  console.log('🔍 TEST API called with method:', req.method);
  console.log('🔍 TEST API body:', req.body);
  console.log('🔍 Has REPLICATE_API_TOKEN:', !!process.env.REPLICATE_API_TOKEN);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Just return success without calling Replicate
  res.status(200).json({ 
    success: true,
    message: 'Test API is working',
    hasToken: !!process.env.REPLICATE_API_TOKEN,
    timestamp: new Date().toISOString()
  });
}