const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Instagram Downloader API is running!',
    version: '2.0',
    endpoints: {
      download: '/api/download?url=INSTAGRAM_URL',
      health: '/health'
    },
    example: '/api/download?url=https://www.instagram.com/p/ABC123/'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Download endpoint - Updated with better error handling
app.get('/api/download', async (req, res) => {
  try {
    const { url } = req.query;

    // Validate URL parameter
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'Missing URL parameter',
        usage: '/api/download?url=INSTAGRAM_URL'
      });
    }

    // Validate Instagram URL
    if (!url.includes('instagram.com')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Instagram URL'
      });
    }

    // Extract shortcode from URL
    let shortcode = null;
    
    const patterns = [
      /instagram.com/p/([A-Za-z0-9_-]+)/,
      /instagram.com/reel/([A-Za-z0-9_-]+)/,
      /instagram.com/tv/([A-Za-z0-9_-]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        shortcode = match[1];
        break;
      }
    }

    if (!shortcode) {
      return res.status(400).json({
        success: false,
        error: 'Could not extract post ID from URL',
        hint: 'Make sure URL is in format: https://www.instagram.com/p/POST_ID/'
      });
    }

    // Method 1: Try Instagram's oEmbed API (Public, No Auth)
    const oembedUrl = `https://graph.instagram.com/oembed?url=https://www.instagram.com/p/${shortcode}/`;
    
    try {
      const oembedResponse = await axios.get(oembedUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (oembedResponse.data && oembedResponse.data.thumbnail_url) {
        return res.json({
          success: true,
          shortcode: shortcode,
          thumbnailUrl: oembedResponse.data.thumbnail_url,
          title: oembedResponse.data.title || 'Instagram Post',
          author: oembedResponse.data.author_name || 'Unknown',
          method: 'oembed',
          message: 'Thumbnail extracted successfully. For video download, the post must be public.'
        });
      }
    } catch (oembedError) {
      console.log('oEmbed failed, trying alternative method');
    }

    // Method 2: Try embed endpoint
    const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
    
    const embedResponse = await axios.get(embedUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br'
      }
    });

    const html = embedResponse.data;

    // Extract video URL
    let videoUrl = null;
    const videoMatch = html.match(/"video_url":"([^"]+)"/);
    if (videoMatch && videoMatch[1]) {
      videoUrl = videoMatch[1].replace(/\\u0026/g, '&').replace(/\\/g, '');
    }

    // Extract image URL
    let imageUrl = null;
    const imageMatch = html.match(/"display_url":"([^"]+)"/);
    if (imageMatch && imageMatch[1]) {
      imageUrl = imageMatch[1].replace(/\\u0026/g, '&').replace(/\\/g, '');
    }

    if (videoUrl || imageUrl) {
      return res.json({
        success: true,
        shortcode: shortcode,
        downloadUrl: videoUrl || imageUrl,
        type: videoUrl ? 'video' : 'image',
        method: 'embed',
        message: 'Media extracted successfully'
      });
    }

    // If all methods fail
    return res.status(404).json({
      success: false,
      error: 'Could not extract media URL',
      reasons: [
        'Post might be private',
        'Post might have been deleted',
        'Instagram might be blocking automated requests',
        'Try a different post'
      ],
      shortcode: shortcode
    });

  } catch (error) {
    console.error('Error:', error.message);
    
    // Handle specific errors
    if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      return res.status(503).json({
        success: false,
        error: 'Could not connect to Instagram',
        details: 'Network error or Instagram is unreachable'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message,
      hint: 'Please try again or contact support'
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: {
      root: '/',
      download: '/api/download?url=INSTAGRAM_URL',
      health: '/health'
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// Start server (for local development)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Local: http://localhost:${PORT}`);
  });
}

// Export for Vercel
module.exports = app;
