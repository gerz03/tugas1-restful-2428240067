# si5b_kuis1_gerrard

RESTful API ekspedisi paket kiriman, dihubungkan ke **MongoDB** menggunakan **Mongoose**.

## Identitas Project
- Nama: Gerrard
- NIM: 2428240067
- Kelas: SI5B
- Topik: Ekspedisi – Paket Kiriman
- Entitas: Shipment (Paket Kiriman) dan Courier (Kurir)

## Teknologi
- Node.js
- Express 5
- MongoDB + Mongoose
- CORS
- dotenv
- nodemon

## Struktur Folder
```text
si5b_kuis1_gerrard/
├── config/
│   └── db.js                    # koneksi MongoDB
├── controllers/
│   ├── courierController.js
│   └── shipmentController.js
├── models/
│   ├── courierModel.js          # schema Courier
│   └── shipmentModel.js         # schema Shipment (embedding + referencing)
├── routes/
│   ├── courierRoutes.js
│   └── shipmentRoutes.js
├── middlewares/
│   ├── cekApiKey.js
│   ├── errorHandler.js
│   ├── logger.js
│   └── validateObjectId.js
├── utils/
│   └── queryHelper.js           # parser pagination, sorting, projection
├── scripts/
│   └── seed.js                  # data awal
├── tests/
│   └── run-tests.js             # skrip pengujian endpoint
├── bukti-pengujian/             # hasil uji (.txt) dan screenshots/ (.png)
├── .env.example
├── .gitignore
├── app.js
├── package.json
└── README.md
```

## Instalasi
```bash
npm install
```

## Konfigurasi .env
Buat file `.env` lokal (jangan di-upload ke GitHub):
```env
PORT=3000
API_KEY=secret123
MONGODB_URI=mongodb://127.0.0.1:27017/si5b_kuis1_gerrard
```

Untuk MongoDB Atlas, isi `MONGODB_URI` dengan connection string dari Atlas, misalnya:
```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/si5b_kuis1_gerrard
```

Contoh `.env.example`:
```env
PORT=
API_KEY=
MONGODB_URI=
```

## Menjalankan
```bash
npm run seed     # mengisi database dengan 3 kurir dan 12 shipment
npm run dev      # atau: npm start
```

## Desain Schema: Embedding dan Referencing

### Relasi
```text
Courier (koleksi couriers)
   ▲
   │  REFERENCING: Shipment.kurir = ObjectId(Courier)
   │
Shipment (koleksi shipments)
   ├── alamatTujuan      -> EMBEDDING (objek)
   └── riwayatTracking[] -> EMBEDDING (array subdokumen)
```

| Hubungan | Teknik | Alasan |
|---|---|---|
| Shipment → alamatTujuan | Embedding (objek) | Alamat hanya relevan untuk satu paket dan selalu dibaca bersama paketnya, sehingga cukup 1 query. |
| Shipment → riwayatTracking | Embedding (array) | Riwayat tracking dimiliki satu paket, selalu dibaca bersama paket, dan jumlahnya terbatas. |
| Shipment → kurir | Referencing (ObjectId + `populate`) | Satu kurir menangani banyak paket dan datanya bisa berubah. Dengan referensi, data kurir disimpan di satu tempat dan tidak terduplikasi. |

### Schema Shipment
```js
{
  nomorResi: String (unik, wajib),
  pengirim: String,
  penerima: String,
  beratKg: Number,
  statusPengiriman: 'diproses' | 'dikirim' | 'diterima',
  alamatTujuan: { jalan, kota, provinsi, kodePos },                 // embedded
  riwayatTracking: [{ status, lokasi, keterangan, waktu }],         // embedded array
  kurir: ObjectId -> Courier,                                       // referencing
  createdAt, updatedAt
}
```

### Schema Courier
```js
{ nama, nomorTelepon, kendaraan: 'motor' | 'mobil' | 'truk', wilayah, aktif, createdAt, updatedAt }
```

## API Key
Endpoint yang mengubah data memerlukan header:
```http
x-api-key: secret123
```
Berlaku untuk: `POST`, `PUT`, `DELETE` pada `/shipments` dan `/couriers`, serta `POST /shipments/:id/tracking`. Semua `GET` tidak memerlukan API key.

## Endpoint

### Shipments
| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/shipments` | Daftar shipment dengan filtering, pagination, sorting, projection |
| GET | `/shipments/:id` | Detail shipment (kurir otomatis ter-populate) |
| POST | `/shipments` | Tambah shipment (API key) |
| PUT | `/shipments/:id` | Ubah shipment (API key) |
| DELETE | `/shipments/:id` | Hapus shipment (API key) |
| POST | `/shipments/:id/tracking` | Tambah riwayat tracking ke array embedded (API key) |

### Couriers
| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/couriers` | Daftar kurir dengan filter, pagination, sorting, projection |
| GET | `/couriers/:id` | Detail kurir |
| POST | `/couriers` | Tambah kurir (API key) |
| PUT | `/couriers/:id` | Ubah kurir (API key) |
| DELETE | `/couriers/:id` | Hapus kurir; ditolak (409) bila masih dipakai shipment (API key) |

## Query Parameter pada `GET /shipments` (endpoint utama)

### Filtering
| Parameter | Contoh | Keterangan |
|---|---|---|
| `statusPengiriman` | `?statusPengiriman=dikirim` | Sama persis: diproses, dikirim, diterima |
| `pengirim` | `?pengirim=ger` | Mengandung teks (tidak peka huruf besar/kecil) |
| `penerima` | `?penerima=andi` | Mengandung teks (tidak peka huruf besar/kecil) |
| `kota` | `?kota=Palembang` | Kota pada `alamatTujuan` (embedded) |
| `kurir` | `?kurir=<id kurir>` | Berdasarkan referensi kurir |
| `minBerat`, `maxBerat` | `?minBerat=2&maxBerat=5` | Rentang berat (kg) |
| `q` | `?q=gerrard` | Pencarian bebas pada nomorResi, pengirim, penerima |

### Pagination
| Parameter | Default | Keterangan |
|---|---|---|
| `page` | 1 | Nomor halaman (minimal 1) |
| `limit` | 10 | Jumlah data per halaman (1 sampai 100) |

Response berisi `meta`:
```json
"meta": { "page": 1, "limit": 5, "totalData": 12, "totalPages": 3, "hasNextPage": true, "hasPrevPage": false }
```

### Sorting
`?sort=-beratKg,nomorResi` (tanda `-` berarti descending). Field yang diizinkan: `nomorResi`, `pengirim`, `penerima`, `beratKg`, `statusPengiriman`, `createdAt`, `updatedAt`. Default: `-createdAt`.

### Projection
`?fields=nomorResi,pengirim,statusPengiriman` — hanya field tersebut (dan `_id`) yang dikembalikan.

### Populate (referencing)
`?populate=kurir` — mengganti ObjectId kurir dengan data kurir (nama, nomorTelepon, kendaraan, wilayah).

### Contoh kombinasi
```http
GET /shipments?statusPengiriman=diterima&sort=-beratKg&page=1&limit=2&fields=nomorResi,beratKg,statusPengiriman,kurir&populate=kurir
```

### Contoh body POST /shipments
```json
{
  "nomorResi": "EXP-GERRARD-2428240067",
  "pengirim": "Gerrard",
  "penerima": "Andi",
  "beratKg": 2.5,
  "statusPengiriman": "diproses",
  "alamatTujuan": {
    "jalan": "Jl. Jenderal Sudirman No. 10",
    "kota": "Palembang",
    "provinsi": "Sumatera Selatan",
    "kodePos": "30126"
  },
  "kurir": "<ObjectId kurir>"
}
```

### Contoh body POST /shipments/:id/tracking
```json
{ "status": "dikirim", "lokasi": "Hub Palembang", "keterangan": "Paket dalam perjalanan" }
```

## Pengujian
Jalankan server (`npm start`), lalu di terminal lain:
```bash
npm run seed
npm run test:api
```
Skrip `tests/run-tests.js` menjalankan seluruh skenario dan menyimpan request serta response setiap skenario di `bukti-pengujian/` (file `.txt`). Gambar bukti ada di `bukti-pengujian/screenshots/`.

### Bukti Pengujian
| Gambar | Keterangan |
|---|---|
| `00_koneksi_mongodb.png` | Koneksi MongoDB, seed data, dan server berjalan |
| `REKAP.png` | Rekap seluruh hasil uji |

Skenario CRUD dan relasi:

| ID | Skenario | Bukti |
|---|---|---|
| T01 | GET semua shipment (pagination default) | ![T01](bukti-pengujian/screenshots/T01.png) |
| T02 | GET by ID, kurir ter-populate | ![T02](bukti-pengujian/screenshots/T02.png) |
| T03 | POST shipment (embedding alamat + referencing kurir) | ![T03](bukti-pengujian/screenshots/T03.png) |
| T04 | PUT shipment | ![T04](bukti-pengujian/screenshots/T04.png) |
| T05 | POST tracking (subdokumen embedded) | ![T05](bukti-pengujian/screenshots/T05.png) |
| T06 | DELETE shipment | ![T06](bukti-pengujian/screenshots/T06.png) |

Skenario filtering, pagination, sorting, projection:

| ID | Skenario | Bukti |
|---|---|---|
| F01 | Filter statusPengiriman | ![F01](bukti-pengujian/screenshots/F01.png) |
| F02 | Filter kota + rentang berat | ![F02](bukti-pengujian/screenshots/F02.png) |
| F03 | Pencarian bebas `q` | ![F03](bukti-pengujian/screenshots/F03.png) |
| F04 | Filter berdasarkan kurir | ![F04](bukti-pengujian/screenshots/F04.png) |
| P01 | Pagination halaman 1 | ![P01](bukti-pengujian/screenshots/P01.png) |
| P02 | Pagination halaman 2 | ![P02](bukti-pengujian/screenshots/P02.png) |
| P03 | Pagination halaman terakhir | ![P03](bukti-pengujian/screenshots/P03.png) |
| S01 | Sorting beratKg descending | ![S01](bukti-pengujian/screenshots/S01.png) |
| S02 | Sorting banyak field | ![S02](bukti-pengujian/screenshots/S02.png) |
| J01 | Projection | ![J01](bukti-pengujian/screenshots/J01.png) |
| J02 | Populate kurir pada list | ![J02](bukti-pengujian/screenshots/J02.png) |
| J03 | Kombinasi semua fitur | ![J03](bukti-pengujian/screenshots/J03.png) |

Skenario kurir:

| ID | Skenario | Bukti |
|---|---|---|
| C01 | Filter + sorting + pagination kurir | ![C01](bukti-pengujian/screenshots/C01.png) |
| C02 | Projection kurir | ![C02](bukti-pengujian/screenshots/C02.png) |
| C03 | POST kurir | ![C03](bukti-pengujian/screenshots/C03.png) |
| C04 | DELETE kurir yang tidak dipakai | ![C04](bukti-pengujian/screenshots/C04.png) |

Skenario negatif:

| ID | Skenario | Bukti |
|---|---|---|
| N01 | POST tanpa API key (401) | ![N01](bukti-pengujian/screenshots/N01.png) |
| N02 | POST body tidak lengkap (400) | ![N02](bukti-pengujian/screenshots/N02.png) |
| N03 | JSON rusak (400) | ![N03](bukti-pengujian/screenshots/N03.png) |
| N04 | ID valid tetapi tidak ada (404) | ![N04](bukti-pengujian/screenshots/N04.png) |
| N05 | Format ID tidak valid (400) | ![N05](bukti-pengujian/screenshots/N05.png) |
| N06 | Filter status tidak valid (400) | ![N06](bukti-pengujian/screenshots/N06.png) |
| N07 | Field sorting tidak valid (400) | ![N07](bukti-pengujian/screenshots/N07.png) |
| N08 | Limit di luar batas (400) | ![N08](bukti-pengujian/screenshots/N08.png) |
| N09 | Field projection tidak valid (400) | ![N09](bukti-pengujian/screenshots/N09.png) |
| N10 | nomorResi duplikat (409) | ![N10](bukti-pengujian/screenshots/N10.png) |
| N11 | Kurir tidak ada (400) | ![N11](bukti-pengujian/screenshots/N11.png) |
| N12 | Hapus kurir yang masih dipakai (409) | ![N12](bukti-pengujian/screenshots/N12.png) |
| N13 | Status tracking tidak valid (400) | ![N13](bukti-pengujian/screenshots/N13.png) |

Hasil lengkap: 35 dari 35 skenario lulus (lihat `bukti-pengujian/REKAP.txt`).

## Arsitektur
```text
Route -> Middleware -> Controller -> Model (Mongoose) -> MongoDB
```

- Route: memetakan URL ke handler.
- Middleware: logging, validasi API key, validasi format ObjectId, dan error handler terpusat.
- Controller: membaca `req.params`, `req.query`, `req.body`, memvalidasi input, membangun query, dan mengirim response.
- Model: schema Mongoose dan akses ke koleksi MongoDB.
- Utils: parser query string yang dipakai bersama (pagination, sorting, projection).

## Refleksi

### Kapan memakai embedding dan kapan referencing?
- Embedding dipakai untuk data yang dimiliki satu dokumen induk, selalu dibaca bersamanya, dan ukurannya terbatas (`alamatTujuan`, `riwayatTracking`). Keuntungannya satu query sudah cukup dan operasi tulis atomik pada satu dokumen.
- Referencing dipakai untuk data yang dipakai banyak dokumen dan bisa berubah sendiri (`kurir`). Data kurir hanya disimpan satu kali; konsekuensinya perlu `populate` (query tambahan) dan pengecekan integritas, misalnya kurir tidak boleh dihapus selama masih dipakai shipment.

### Mengapa error ditangani terpusat?
Validasi schema Mongoose, ObjectId salah format, dan duplicate key (kode 11000) semuanya diterjemahkan ke status HTTP yang tepat (400 atau 409) di satu `errorHandler`, sehingga controller tidak perlu mengulang logika yang sama.

### Mengapa pagination dibatasi?
`limit` dibatasi maksimal 100 agar satu request tidak membebani server dan database. Pengurutan dan projection juga dibatasi pada daftar field yang diizinkan agar client tidak bisa meminta field sembarang.

## Catatan
- `.env` tidak boleh di-upload ke GitHub.
- ID data sekarang berupa `ObjectId` MongoDB (24 karakter hex), bukan angka 1, 2, 3 seperti versi in-memory.
