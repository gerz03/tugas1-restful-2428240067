const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return express.json()(req, res, next);
  }

  next();
});

let shipments = [
  {
    id: 1,
    nomorResi: 'EXP2609001',
    pengirim: 'Toko Sinar',
    penerima: 'Budi Hartono',
    beratKg: 2.5,
    statusPengiriman: 'dikirim',
  },
  {
    id: 2,
    nomorResi: 'EXP2609002',
    pengirim: 'Gudang Maju',
    penerima: 'Siti Aminah',
    beratKg: 1.2,
    statusPengiriman: 'diproses',
  },
  {
    id: 3,
    nomorResi: 'EXP2609003',
    pengirim: 'CV Berkah Jaya',
    penerima: 'Andi Saputra',
    beratKg: 4,
    statusPengiriman: 'diterima',
  },
  {
    id: 4,
    nomorResi: 'EXP2609004',
    pengirim: 'Toko Elektronik Prima',
    penerima: 'Dewi Lestari',
    beratKg: 3.1,
    statusPengiriman: 'diproses',
  },
  {
    id: 5,
    nomorResi: 'EXP2609005',
    pengirim: 'Toko Sinar',
    penerima: 'Rina Marlina',
    beratKg: 0.8,
    statusPengiriman: 'dikirim',
  },
];

const requiredFields = [
  'nomorResi',
  'pengirim',
  'penerima',
  'beratKg',
  'statusPengiriman',
];

function responseError(res, message, statusCode) {
  return res.status(statusCode).json({
    status: 'error',
    message,
    data: null,
  });
}

function responseSuccess(res, message, data, statusCode = 200) {
  return res.status(statusCode).json({
    status: 'success',
    message,
    data,
  });
}

function invalidJsonMessage() {
  return 'Format JSON tidak valid. Gunakan body raw JSON dan header Content-Type: application/json';
}

function validateShipment(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'Body request harus berupa object JSON';
  }

  for (const field of requiredFields) {
    if (
      body[field] === undefined ||
      body[field] === null ||
      (typeof body[field] === 'string' && body[field].trim() === '')
    ) {
      return `Field ${field} wajib diisi`;
    }
  }

  if (typeof body.nomorResi !== 'string') {
    return 'nomorResi harus berupa string';
  }

  if (typeof body.pengirim !== 'string') {
    return 'pengirim harus berupa string';
  }

  if (typeof body.penerima !== 'string') {
    return 'penerima harus berupa string';
  }

  if (
    typeof body.beratKg !== 'number' ||
    !Number.isFinite(body.beratKg) ||
    body.beratKg <= 0
  ) {
    return 'beratKg harus berupa number lebih dari 0';
  }

  if (!['diproses', 'dikirim', 'diterima'].includes(body.statusPengiriman)) {
    return 'statusPengiriman harus diproses, dikirim, atau diterima';
  }

  return null;
}

function getId(req) {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function getNextShipmentId() {
  if (shipments.length === 0) {
    return 1;
  }

  return shipments[shipments.length - 1].id + 1;
}

app.get('/', (req, res) => {
  res.json({
    nama: 'Gerrard',
    nim: '2428240067',
    topik: 'Ekspedisi',
    resource: 'Paket Kiriman',
    endpoints: [
      'GET /shipments',
      'GET /shipments/:id',
      'POST /shipments',
      'PUT /shipments/:id',
      'DELETE /shipments/:id',
      'GET /shipments?statusPengiriman=dikirim',
    ],
  });
});


app.get('/shipments', (req, res) => {
  const { statusPengiriman } = req.query;
  const result = statusPengiriman
    ? shipments.filter((shipment) => shipment.statusPengiriman === statusPengiriman)
    : shipments;

  res.json(result);
});


app.get('/shipments/:id', (req, res) => {
  const id = getId(req);
  const shipment = id === null ? null : shipments.find((item) => item.id === id);

  if (!shipment) {
    return responseError(res, `Data dengan id ${req.params.id} tidak ditemukan`, 404);
  }

  res.json(shipment);
});

app.post('/shipments', (req, res) => {
  const validationMessage = validateShipment(req.body);
  if (validationMessage) {
    return responseError(res, validationMessage, 400);
  }

  const newShipment = {
    id: getNextShipmentId(),
    nomorResi: req.body.nomorResi,
    pengirim: req.body.pengirim,
    penerima: req.body.penerima,
    beratKg: req.body.beratKg,
    statusPengiriman: req.body.statusPengiriman,
  };
  shipments.push(newShipment);

  responseSuccess(res, 'Data paket kiriman berhasil ditambahkan', newShipment, 201);
});

app.put('/shipments/:id', (req, res) => {
  const id = getId(req);
  const index = id === null
    ? -1
    : shipments.findIndex((item) => item.id === id);

  if (index === -1) {
    return responseError(res, `Data dengan id ${req.params.id} tidak ditemukan`, 404);
  }

  const validationMessage = validateShipment(req.body);
  if (validationMessage) {
    return responseError(res, validationMessage, 400);
  }

  const updatedShipment = {
    id,
    nomorResi: req.body.nomorResi,
    pengirim: req.body.pengirim,
    penerima: req.body.penerima,
    beratKg: req.body.beratKg,
    statusPengiriman: req.body.statusPengiriman,
  };
  shipments[index] = updatedShipment;

  responseSuccess(res, 'Data paket kiriman berhasil diubah', updatedShipment);
});

app.delete('/shipments/:id', (req, res) => {
  const id = getId(req);
  const index = id === null
    ? -1
    : shipments.findIndex((item) => item.id === id);

  if (index === -1) {
    return responseError(res, `Data dengan id ${req.params.id} tidak ditemukan`, 404);
  }

  shipments.splice(index, 1);
  responseSuccess(res, `Data paket kiriman dengan id ${id} berhasil dihapus`, null);
});

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return responseError(res, invalidJsonMessage(), 400);
  }

  next(err);
});

app.use((req, res) => {
  responseError(res, 'Endpoint tidak ditemukan', 404);
});

app.use((err, req, res, next) => {
  console.error(err);
  responseError(res, 'Terjadi kesalahan pada server', 500);
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
  });
}

module.exports = app;
