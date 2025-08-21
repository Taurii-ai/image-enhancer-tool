// pages/api/enhance-image.js
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.REPLICATE_API_TOKEN) {
    console.error("Missing REPLICATE_API_TOKEN");
    return res.status(500).json({ error: "Server misconfiguration: missing token" });
  }

  try {
    // Check if request is multipart/form-data (file upload) or JSON (base64)
    const contentType = req.headers['content-type'] || '';
    
    let imageData;
    
    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const form = formidable({});
      const [fields, files] = await form.parse(req);
      const file = files.file?.[0];
      
      if (!file) {
        return res.status(400).json({ error: "No image file uploaded" });
      }
      
      // Convert file to base64
      const fileBuffer = fs.readFileSync(file.filepath);
      const base64 = fileBuffer.toString('base64');
      const mimeType = file.mimetype || 'image/jpeg';
      imageData = `data:${mimeType};base64,${base64}`;
      
    } else {
      // Handle JSON request with base64 or URL
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      
      await new Promise(resolve => {
        req.on('end', resolve);
      });
      
      const parsedBody = JSON.parse(body || '{}');
      if (!parsedBody || !parsedBody.image) {
        return res.status(400).json({ error: "No image data provided" });
      }
      imageData = parsedBody.image;
    }

    const versionId = "lucataco/real-esrgan:3febd19381dd7e1f52a3ed3260b5b0a5636353de45e37e7c1c3cd814b24077a3";

    const createRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: versionId,
        input: { 
          image: imageData,
          scale: 4,
          face_enhance: true
        },
      }),
    });

    if (createRes.status === 422) {
      const errorText = await createRes.text();
      console.error("Invalid version error:", errorText);
      return res.status(422).json({ error: "Invalid model version – please use a valid version ID", details: errorText });
    }

    if (!createRes.ok) {
      const errorText = await createRes.text();
      console.error("Replicate error:", errorText);
      return res.status(createRes.status).json({ error: errorText });
    }

    let prediction = await createRes.json();

    // Poll for completion
    while (!["succeeded", "failed"].includes(prediction.status)) {
      await new Promise(r => setTimeout(r, 2000));
      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: {
          "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      });
      prediction = await pollRes.json();
    }

    if (prediction.status === "succeeded") {
      return res.status(200).json({ output: prediction.output });
    } else {
      return res.status(500).json({ error: "Enhancement failed", details: prediction });
    }

  } catch (error) {
    console.error("Handler error:", error);
    res.status(500).json({ error: error.message });
  }
}