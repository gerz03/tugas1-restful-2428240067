# RESTful API Paket Kiriman Ekspedisi

Project ini adalah RESTful API sederhana menggunakan Node.js dan Express untuk mengelola data paket kiriman ekspedisi. Data disimpan sementara di dalam memory array, sehingga cocok untuk tugas latihan CRUD API.

## Identitas

- Nama: Gerrard
- NIM: 2428240067
- Topik: Ekspedisi
- Resource: Paket Kiriman

## Fitur

- Menampilkan semua data paket kiriman
- Menampilkan detail paket berdasarkan ID
- Menambahkan data paket baru
- Mengubah data paket berdasarkan ID
- Menghapus data paket berdasarkan ID
- Filter paket berdasarkan status pengiriman
- Response error dalam format JSON

## Teknologi

- Node.js
- Express.js

## Instalasi

```bash
npm install
```

## Menjalankan Server

```bash
npm start
```

Server lokal berjalan di:

```text
http://localhost:3000
```

## Menjalankan Test

```bash
npm test
```

## Endpoint API

### GET /

Menampilkan informasi API.

### GET /shipments

Menampilkan semua data paket kiriman.

Contoh filter berdasarkan status:

```text
GET /shipments?statusPengiriman=dikirim
```

### GET /shipments/:id

Menampilkan detail paket kiriman berdasarkan ID.

### POST /shipments

Menambahkan data paket kiriman baru.

Pastikan request memakai header:

```text
Content-Type: application/json
```

Contoh body JSON:

```json
{
  "nomorResi": "EXP2609006",
  "pengirim": "Toko Baru",
  "penerima": "Maya Putri",
  "beratKg": 2.2,
  "statusPengiriman": "diproses"
}
```

Contoh curl:

```bash
curl -X POST http://localhost:3000/shipments ^
  -H "Content-Type: application/json" ^
  -d "{\"nomorResi\":\"EXP2609006\",\"pengirim\":\"Toko Baru\",\"penerima\":\"Maya Putri\",\"beratKg\":2.2,\"statusPengiriman\":\"diproses\"}"
```

### PUT /shipments/:id

Mengubah data paket kiriman berdasarkan ID.

Contoh body JSON:

```json
{
  "nomorResi": "EXP2609006",
  "pengirim": "Toko Baru",
  "penerima": "Maya Putri",
  "beratKg": 3,
  "statusPengiriman": "dikirim"
}
```

### DELETE /shipments/:id

Menghapus data paket kiriman berdasarkan ID.

## Status Pengiriman

Nilai `statusPengiriman` yang valid:

- `diproses`
- `dikirim`
- `diterima`

## Format Response

Response sukses:

```json
{
  "status": "success",
  "message": "Data paket kiriman berhasil ditambahkan",
  "data": {}
}
```

Response error:

```json
{
  "status": "error",
  "message": "Endpoint tidak ditemukan",
  "data": null
}
```

## Deploy ke Vercel

Project sudah dilengkapi file `vercel.json`, sehingga route Vercel akan diarahkan ke `app.js`.

Langkah umum deploy:

1. Upload project ke GitHub.
2. Import repository ke Vercel.
3. Jalankan deploy.

Setelah deploy, endpoint dapat diakses melalui domain yang diberikan oleh Vercel.
