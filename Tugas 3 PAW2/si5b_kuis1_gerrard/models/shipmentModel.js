const mongoose = require('mongoose');

const VALID_STATUSES = ['diproses', 'dikirim', 'diterima'];

// EMBEDDING #1: alamat tujuan disimpan langsung di dalam dokumen shipment.
const alamatSchema = new mongoose.Schema(
  {
    jalan: { type: String, trim: true },
    kota: { type: String, trim: true },
    provinsi: { type: String, trim: true },
    kodePos: { type: String, trim: true },
  },
  { _id: false }
);

// EMBEDDING #2: riwayat tracking berupa array subdokumen di dalam shipment.
const trackingSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: {
        values: VALID_STATUSES,
        message: 'status tracking harus salah satu dari diproses, dikirim, atau diterima',
      },
      required: [true, 'status tracking wajib diisi'],
    },
    lokasi: { type: String, trim: true },
    keterangan: { type: String, trim: true },
    waktu: { type: Date, default: Date.now },
  },
  { _id: true }
);

const shipmentSchema = new mongoose.Schema(
  {
    nomorResi: {
      type: String,
      required: [true, 'nomorResi wajib diisi'],
      unique: true,
      trim: true,
    },
    pengirim: {
      type: String,
      required: [true, 'pengirim wajib diisi'],
      trim: true,
    },
    penerima: {
      type: String,
      required: [true, 'penerima wajib diisi'],
      trim: true,
    },
    beratKg: {
      type: Number,
      required: [true, 'beratKg wajib diisi'],
      min: [0, 'beratKg tidak boleh negatif'],
    },
    statusPengiriman: {
      type: String,
      enum: {
        values: VALID_STATUSES,
        message: 'statusPengiriman harus salah satu dari diproses, dikirim, atau diterima',
      },
      required: [true, 'statusPengiriman wajib diisi'],
    },
    alamatTujuan: alamatSchema,
    riwayatTracking: [trackingSchema],
    // REFERENCING: hanya menyimpan ObjectId kurir dari koleksi couriers.
    kurir: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Courier',
      default: null,
    },
  },
  { timestamps: true, versionKey: false }
);

// Index untuk mempercepat filter dan sorting yang sering dipakai.
shipmentSchema.index({ statusPengiriman: 1, createdAt: -1 });
shipmentSchema.index({ kurir: 1 });

const Shipment = mongoose.model('Shipment', shipmentSchema);

module.exports = Shipment;
module.exports.VALID_STATUSES = VALID_STATUSES;
