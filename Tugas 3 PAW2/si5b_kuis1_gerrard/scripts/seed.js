require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Courier = require('../models/courierModel');
const Shipment = require('../models/shipmentModel');

const couriers = [
  { nama: 'Rudi Hartono', nomorTelepon: '081234567001', kendaraan: 'motor', wilayah: 'Palembang', aktif: true },
  { nama: 'Siti Aminah', nomorTelepon: '081234567002', kendaraan: 'mobil', wilayah: 'Jakarta', aktif: true },
  { nama: 'Bagas Pratama', nomorTelepon: '081234567003', kendaraan: 'truk', wilayah: 'Medan', aktif: false },
];

const shipmentSeeds = [
  ['EXP-GERRARD-001', 'Gerrard', 'Andi', 2.5, 'diproses', 'Palembang', 'Sumatera Selatan', 0],
  ['EXP-GERRARD-002', 'Dina', 'Budi', 4, 'dikirim', 'Jakarta', 'DKI Jakarta', 1],
  ['EXP-GERRARD-003', 'Sari', 'Gerrard', 1.2, 'diterima', 'Palembang', 'Sumatera Selatan', 0],
  ['EXP-GERRARD-004', 'Gerrard', 'Citra', 7.8, 'dikirim', 'Medan', 'Sumatera Utara', 2],
  ['EXP-GERRARD-005', 'Rina', 'Dewi', 0.8, 'diproses', 'Bandung', 'Jawa Barat', 1],
  ['EXP-GERRARD-006', 'Toni', 'Eko', 12.5, 'dikirim', 'Surabaya', 'Jawa Timur', 1],
  ['EXP-GERRARD-007', 'Gerrard', 'Fajar', 3.3, 'diterima', 'Palembang', 'Sumatera Selatan', 0],
  ['EXP-GERRARD-008', 'Mira', 'Gita', 5.1, 'diproses', 'Jakarta', 'DKI Jakarta', 1],
  ['EXP-GERRARD-009', 'Hadi', 'Indra', 9.9, 'diterima', 'Medan', 'Sumatera Utara', 2],
  ['EXP-GERRARD-010', 'Joko', 'Gerrard', 2.2, 'dikirim', 'Palembang', 'Sumatera Selatan', 0],
  ['EXP-GERRARD-011', 'Lina', 'Kiki', 6.4, 'diproses', 'Bandung', 'Jawa Barat', 1],
  ['EXP-GERRARD-012', 'Maya', 'Lukman', 1.9, 'diterima', 'Surabaya', 'Jawa Timur', 1],
];

async function seed() {
  await connectDB();

  await Shipment.deleteMany({});
  await Courier.deleteMany({});

  const createdCouriers = await Courier.insertMany(couriers);

  const shipments = shipmentSeeds.map(
    ([nomorResi, pengirim, penerima, beratKg, statusPengiriman, kota, provinsi, kurirIndex], index) => {
      const history = [{ status: 'diproses', lokasi: 'Gudang asal', keterangan: 'Paket didaftarkan' }];

      if (statusPengiriman !== 'diproses') {
        history.push({ status: 'dikirim', lokasi: 'Hub transit', keterangan: 'Paket dalam perjalanan' });
      }

      if (statusPengiriman === 'diterima') {
        history.push({ status: 'diterima', lokasi: kota, keterangan: 'Paket diterima penerima' });
      }

      return {
        nomorResi,
        pengirim,
        penerima,
        beratKg,
        statusPengiriman,
        alamatTujuan: {
          jalan: `Jl. Contoh No. ${index + 1}`,
          kota,
          provinsi,
          kodePos: String(30100 + index),
        },
        riwayatTracking: history,
        kurir: createdCouriers[kurirIndex]._id,
      };
    }
  );

  await Shipment.insertMany(shipments);

  console.log(`Seed selesai: ${createdCouriers.length} kurir, ${shipments.length} shipment`);
}

seed()
  .catch((error) => {
    console.error('Seed gagal:', error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
