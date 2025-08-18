import { createServer } from 'http';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Import our API handlers
async function loadHandler(filename) {
  try {
    const module = await import(`./api/${filename}`);
    return module.default || module;
  } catch (err) {
    console.error(`Failed to load handler ${filename}:`, err);
    return null;
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  // Add Express-like methods to response object
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  
  res.json = (data) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
    return res;
  };
  
  res.send = (data) => {
    if (Buffer.isBuffer(data)) {
      res.end(data);
    } else if (typeof data === 'string') {
      res.end(data);
    } else {
      res.json(data);
    }
    return res;
  };
  
  // Handle API routes
  if (url.pathname.startsWith('/api/')) {
    const apiPath = url.pathname.replace('/api/', '');
    const handler = await loadHandler(`${apiPath}.js`);
    
    if (handler) {
      try {
        // Collect body data for POST requests
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => body += chunk);
          req.on('end', () => {
            try {
              req.body = JSON.parse(body);
            } catch (e) {
              req.body = {};
            }
            handler(req, res);
          });
        } else {
          // Add query parameters to req
          req.query = Object.fromEntries(url.searchParams);
          handler(req, res);
        }
        return;
      } catch (error) {
        console.error('API handler error:', error);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }
    }
  }
  
  // Fallback for non-API routes
  res.status(404).json({ error: 'API endpoint not found' });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`🚀 Development API server running on http://localhost:${PORT}`);
  console.log('📡 Available endpoints:');
  console.log('  POST /api/enhance-image');
  console.log('  GET  /api/proxy-image');
  console.log('  GET  /api/fetch-image');
});