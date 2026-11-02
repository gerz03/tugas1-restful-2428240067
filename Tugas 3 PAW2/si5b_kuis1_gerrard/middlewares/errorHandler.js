function notFoundHandler(req, res) {
  return res.status(404).json({
    status: 'error',
    message: 'Endpoint tidak ditemukan',
    data: null,
  });
}

function errorHandler(err, req, res, next) {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      status: 'error',
      message: 'JSON tidak valid',
      data: null,
    });
  }

  // Error validasi schema Mongoose
  if (err.name === 'ValidationError' && err.errors) {
    const message = Object.values(err.errors)
      .map((item) => item.message)
      .join('; ');

    return res.status(400).json({
      status: 'error',
      message,
      data: null,
    });
  }

  // Tipe data / ObjectId tidak bisa dikonversi
  if (err.name === 'CastError') {
    return res.status(400).json({
      status: 'error',
      message: `Nilai ${err.path} tidak valid`,
      data: null,
    });
  }

  // Duplicate key (misal nomorResi sudah dipakai)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'data';

    return res.status(409).json({
      status: 'error',
      message: `${field} sudah digunakan`,
      data: null,
    });
  }

  const statusCode = err.statusCode || 500;

  if (statusCode >= 500) {
    console.error(err);
  }

  const message = statusCode >= 500 ? 'Terjadi kesalahan pada server' : err.message;

  return res.status(statusCode).json({
    status: 'error',
    message,
    data: null,
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
