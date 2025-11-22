module.exports = (req, res) => {
  res.json({
    success: true,
    message: 'Instagram Downloader API',
    endpoints: {
      download: '/api/download?url=INSTAGRAM_URL'
    }
  });
};
