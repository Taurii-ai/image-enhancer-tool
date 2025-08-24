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
    console.log('🔑 BLOB_READ_WRITE_TOKEN length:', process.env.BLOB_READ_WRITE_TOKEN?.length || 0);
    console.log('🌍 Environment keys:', Object.keys(process.env).filter(key => key.includes('BLOB')));
    
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
    
    // Check if BLOB_READ_WRITE_TOKEN is available
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('❌ BLOB_READ_WRITE_TOKEN not found, falling back to Replicate upload');
      
      // Fallback: Upload directly to Replicate files
      const formData = new FormData();
      formData.append('content', new Blob([fileBuffer], { type: file.mimetype || 'image/jpeg' }), file.originalFilename || 'image.jpg');
      
      const uploadResp = await fetch("https://api.replicate.com/v1/files", {
        method: "POST",
        headers: {
          "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`
        },
        body: formData
      });

      if (!uploadResp.ok) {
        const errorText = await uploadResp.text();
        throw new Error(`Replicate upload failed: ${uploadResp.status} - ${errorText}`);
      }

      const uploadData = await uploadResp.json();
      const replicateUrl = uploadData.urls?.get || uploadData.url || uploadData.urls?.download;
      
      if (!replicateUrl) {
        throw new Error('Failed to get file URL from Replicate upload response');
      }
      
      console.log('✅ Fallback upload successful (Replicate):', replicateUrl);
      return res.status(200).json({ url: replicateUrl });
    }

    // Upload to Vercel Blob
    console.log('☁️ Uploading to Vercel Blob...');
    const filename = file.originalFilename || `image-${Date.now()}.jpg`;
    
    try {
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
    } catch (blobError) {
      console.error('❌ Vercel Blob error:', blobError);
      console.log('🔄 Falling back to Replicate upload...');
      
      // Fallback to Replicate if Vercel Blob fails
      const formData = new FormData();
      formData.append('content', new Blob([fileBuffer], { type: file.mimetype || 'image/jpeg' }), file.originalFilename || 'image.jpg');
      
      const uploadResp = await fetch("https://api.replicate.com/v1/files", {
        method: "POST",
        headers: {
          "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`
        },
        body: formData
      });

      if (!uploadResp.ok) {
        const errorText = await uploadResp.text();
        throw new Error(`Both Vercel Blob and Replicate upload failed. Last error: ${uploadResp.status} - ${errorText}`);
      }

      const uploadData = await uploadResp.json();
      const replicateUrl = uploadData.urls?.get || uploadData.url || uploadData.urls?.download;
      
      if (!replicateUrl) {
        throw new Error('Failed to get file URL from fallback Replicate upload');
      }
      
      console.log('✅ Fallback upload successful (Replicate):', replicateUrl);
      return res.status(200).json({ url: replicateUrl });
    }
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