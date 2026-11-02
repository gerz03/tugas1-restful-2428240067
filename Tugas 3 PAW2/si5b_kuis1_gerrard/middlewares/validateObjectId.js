const { isObjectId } = require('../utils/queryHelper');

// Memastikan parameter :id berformat ObjectId MongoDB (24 karakter hex).
function validateObjectId(req, res, next) {
  if (!isObjectId(req.params.id)) {
    return res.status(400).json({
      status: 'error',
      message: 'Format ID tidak valid',
      data: null,
    });
  }

  return next();
}

module.exports = validateObjectId;
