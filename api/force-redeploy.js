// Force redeploy - Real-ESRGAN ready
export default async function handler(req, res) {
  res.status(200).json({ 
    message: 'Real-ESRGAN v4.0.0 ready for deployment',
    timestamp: new Date().toISOString()
  });
}