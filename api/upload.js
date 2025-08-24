// api/upload.js - Vercel Blob upload handler
import { put } from "@vercel/blob";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📤 Upload request received');
    
    // Handle multipart form data
    const formidable = require('formidable');
    const form = formidable({ multiples: false });
    
    const [fields, files] = await form.parse(req);
    const file = files.file?.[0]; // formidable returns arrays
    
    if (!file) {
      console.error('❌ No file found in request');
      return res.status(400).json({ error: 'No file provided' });
    }
    
    console.log('📁 File details:', {
      name: file.originalFilename,
      size: file.size,
      type: file.mimetype
    });

    // Read file data
    const fs = require('fs');
    const fileBuffer = fs.readFileSync(file.filepath);
    
    // Upload to Vercel Blob
    console.log('☁️ Uploading to Vercel Blob...');
    const blob = await put(file.originalFilename || 'image.jpg', fileBuffer, {
      access: 'public', // Important! Replicate needs public URL
      contentType: file.mimetype || 'image/jpeg'
    });
    
    console.log('✅ Upload successful:', blob.url);
    
    return res.status(200).json({ url: blob.url });
  } catch (error) {
    console.error('❌ Upload error:', error);
    return res.status(500).json({ 
      error: 'Upload failed', 
      details: error.message 
    });
  }
}

export const config = {
  api: {
    bodyParser: false, // Required for formidable
  },
};