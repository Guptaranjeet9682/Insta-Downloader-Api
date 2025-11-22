const axios = require('axios');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL parameter required'
      });
    }

    // Extract shortcode
    const match = url.match(/(?:/p/|/reel/|/tv/)([A-Za-z0-9_-]+)/);
    if (!match) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Instagram URL'
      });
    }

    const shortcode = match[1];

    // Use Instagram's public oEmbed API
    const apiUrl = `https://www.instagram.com/p/${shortcode}/?__a=1&__d=dis`;
    
    const response = await axios.get(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const data = response.data;
    
    // Try to find media URL
    let mediaUrl = null;
    
    if (data.items && data.items[0]) {
      const item = data.items[0];
      if (item.video_versions && item.video_versions[0]) {
        mediaUrl = item.video_versions[0].url;
      } else if (item.image_versions2 && item.image_versions2.candidates[0]) {
        mediaUrl = item.image_versions2.candidates[0].url;
      }
    }

    if (mediaUrl) {
      return res.json({
        success: true,
        downloadUrl: mediaUrl,
        shortcode: shortcode
      });
    }

    return res.status(404).json({
      success: false,
      error: 'Could not extract media'
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
