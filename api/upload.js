// api/upload.js - Vercel Blob upload handler
import { put } from "@vercel/blob";
import formidable from 'formidable';
import fs from 'fs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📤 Upload request received');
    console.log('🔑 BLOB_READ_WRITE_TOKEN exists:', !!process.env.BLOB_READ_WRITE_TOKEN);
    
    // Handle multipart form data
    const form = formidable({ 
      multiples: false,
      maxFileSize: 50 * 1024 * 1024, // 50MB max
    });
    
    const [fields, files] = await form.parse(req);
    const file = files.file?.[0] || files.file; // Handle both array and single file
    
    if (!file) {
      console.error('❌ No file found in request');
      console.error('Available fields:', Object.keys(fields || {}));
      console.error('Available files:', Object.keys(files || {}));
      return res.status(400).json({ error: 'No file provided' });
    }
    
    console.log('📁 File details:', {
      name: file.originalFilename,
      size: file.size,
      type: file.mimetype,
      path: file.filepath
    });

    // Read file data
    const fileBuffer = fs.readFileSync(file.filepath);
    console.log('📖 File buffer size:', fileBuffer.length);
    
    // Upload to Vercel Blob
    console.log('☁️ Uploading to Vercel Blob...');
    const filename = file.originalFilename || `image-${Date.now()}.jpg`;
    
    const blob = await put(filename, fileBuffer, {
      access: 'public', // Important! Replicate needs public URL
      contentType: file.mimetype || 'image/jpeg'
    });
    
    console.log('✅ Upload successful:', blob.url);
    
    // Clean up temp file
    try {
      fs.unlinkSync(file.filepath);
    } catch (cleanupError) {
      console.warn('⚠️ Could not clean up temp file:', cleanupError.message);
    }
    
    return res.status(200).json({ url: blob.url });
  } catch (error) {
    console.error('❌ Upload error:', error);
    console.error('❌ Error stack:', error.stack);
    
    return res.status(500).json({ 
      error: 'Upload failed', 
      details: error.message,
      code: error.code || 'UNKNOWN_ERROR'
    });
  }
}

export const config = {
  api: {
    bodyParser: false, // Required for formidable
  },
};