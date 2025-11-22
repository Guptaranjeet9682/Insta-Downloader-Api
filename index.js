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
    endpoints: {
      download: '/api/download?url=INSTAGRAM_URL'
    }
  });
});

// Download endpoint
app.get('/api/download', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({
      success: false,
      error: 'Please provide Instagram URL'
    });
  }

  try {
    // Extract post ID
    const postId = url.match(//p/([^/?]+)/)?.[1] || 
                   url.match(//reel/([^/?]+)/)?.[1];

    if (!postId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Instagram URL'
      });
    }

    // Fetch Instagram embed data
    const embedUrl = `https://www.instagram.com/p/${postId}/embed/captioned/`;
    const response = await axios.get(embedUrl);
    const html = response.data;

    // Extract video URL
    let videoUrl = html.match(/"video_url":"([^"]+)"/)?.[1];
    if (videoUrl) {
      videoUrl = videoUrl.replace(/\\u0026/g, '&');
    }

    // Extract image URL if no video
    let imageUrl = html.match(/"display_url":"([^"]+)"/)?.[1];
    if (imageUrl) {
      imageUrl = imageUrl.replace(/\\u0026/g, '&');
    }

    if (videoUrl || imageUrl) {
      return res.json({
        success: true,
        postId: postId,
        downloadUrl: videoUrl || imageUrl,
        type: videoUrl ? 'video' : 'image',
        message: 'Download URL generated successfully'
      });
    }

    return res.status(404).json({
      success: false,
      error: 'Could not extract media. Post might be private.'
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to download',
      details: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;
