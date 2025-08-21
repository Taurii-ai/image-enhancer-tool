// pages/api/upload-image.js
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse the multipart form data
    const form = formidable({});
    const [fields, files] = await form.parse(req);
    const file = files.file?.[0];

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Create a unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileExtension = path.extname(file.originalFilename || '.jpg');
    const filename = `${timestamp}_${randomId}${fileExtension}`;

    // Read the file and convert to base64
    const fileBuffer = fs.readFileSync(file.filepath);
    const base64Image = fileBuffer.toString('base64');
    const mimeType = file.mimetype || 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    // For now, return the data URL directly
    // In production, you might want to upload to a real storage service
    return res.status(200).json({
      success: true,
      url: dataUrl,
      filename: filename
    });

  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Upload failed', details: error.message });
  }
}