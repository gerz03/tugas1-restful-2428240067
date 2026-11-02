const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI belum diisi di file .env');
  }

  await mongoose.connect(uri);
  console.log(`MongoDB terhubung: ${mongoose.connection.name}`);
}

module.exports = connectDB;
