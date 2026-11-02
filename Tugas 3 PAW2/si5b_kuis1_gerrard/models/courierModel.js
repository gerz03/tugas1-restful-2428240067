const mongoose = require('mongoose');

// Schema Kurir. Dihubungkan ke Shipment dengan REFERENCING (ObjectId).
const courierSchema = new mongoose.Schema(
  {
    nama: {
      type: String,
      required: [true, 'nama wajib diisi'],
      trim: true,
    },
    nomorTelepon: {
      type: String,
      required: [true, 'nomorTelepon wajib diisi'],
      trim: true,
    },
    kendaraan: {
      type: String,
      enum: {
        values: ['motor', 'mobil', 'truk'],
        message: 'kendaraan harus salah satu dari motor, mobil, atau truk',
      },
      default: 'motor',
    },
    wilayah: {
      type: String,
      trim: true,
    },
    aktif: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('Courier', courierSchema);
