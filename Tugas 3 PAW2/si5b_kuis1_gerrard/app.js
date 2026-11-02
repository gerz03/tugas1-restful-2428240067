require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const logger = require('./middlewares/logger');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');
const shipmentRoutes = require('./routes/shipmentRoutes');
const courierRoutes = require('./routes/courierRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(logger);

app.use('/shipments', shipmentRoutes);
app.use('/couriers', courierRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server berjalan pada port ${PORT}`);
    });
  } catch (error) {
    console.error('Gagal terhubung ke MongoDB:', error.message);
    process.exit(1);
  }
}

// Server hanya dijalankan jika file ini dieksekusi langsung (bukan di-require).
if (require.main === module) {
  start();
}

module.exports = app;
