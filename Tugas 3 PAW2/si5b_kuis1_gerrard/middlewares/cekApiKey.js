function cekApiKey(req, res, next) {
  const headerApiKey = req.headers['x-api-key'];
  const apiKey = process.env.API_KEY;

  if (!apiKey || !headerApiKey || headerApiKey !== apiKey) {
    return res.status(401).json({
      status: 'error',
      message: 'API key tidak valid atau tidak ada',
      data: null,
    });
  }

  return next();
}

module.exports = cekApiKey;
