const Shipment = require('../models/shipmentModel');
const Courier = require('../models/courierModel');
const {
  QueryError,
  isObjectId,
  escapeRegex,
  getString,
  getNumber,
  parsePagination,
  parseSort,
  parseProjection,
  buildMeta,
} = require('../utils/queryHelper');

const VALID_STATUSES = Shipment.VALID_STATUSES;

const SORTABLE_FIELDS = [
  'nomorResi',
  'pengirim',
  'penerima',
  'beratKg',
  'statusPengiriman',
  'createdAt',
  'updatedAt',
];

const PROJECTABLE_FIELDS = [
  'nomorResi',
  'pengirim',
  'penerima',
  'beratKg',
  'statusPengiriman',
  'alamatTujuan',
  'riwayatTracking',
  'kurir',
  'createdAt',
  'updatedAt',
];

const COURIER_FIELDS = 'nama nomorTelepon kendaraan wilayah';

function errorResponse(res, statusCode, message) {
  return res.status(statusCode).json({
    status: 'error',
    message,
    data: null,
  });
}

function validateAlamat(alamat) {
  if (typeof alamat !== 'object' || alamat === null || Array.isArray(alamat)) {
    return 'alamatTujuan harus berupa objek';
  }

  for (const field of ['jalan', 'kota', 'provinsi', 'kodePos']) {
    if (alamat[field] !== undefined && typeof alamat[field] !== 'string') {
      return `alamatTujuan.${field} harus berupa string`;
    }
  }

  return null;
}

function validateShipmentPayload(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {
      valid: false,
      message: 'Body harus berupa objek JSON',
    };
  }

  const requiredFields = ['nomorResi', 'pengirim', 'penerima', 'beratKg', 'statusPengiriman'];

  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      return {
        valid: false,
        message: `Field ${field} wajib diisi`,
      };
    }
  }

  for (const field of ['nomorResi', 'pengirim', 'penerima']) {
    if (typeof data[field] !== 'string' || data[field].trim() === '') {
      return {
        valid: false,
        message: `${field} harus berupa string`,
      };
    }
  }

  if (typeof data.beratKg !== 'number' || Number.isNaN(data.beratKg)) {
    return {
      valid: false,
      message: 'beratKg harus berupa number',
    };
  }

  if (data.beratKg < 0) {
    return {
      valid: false,
      message: 'beratKg tidak boleh negatif',
    };
  }

  if (!VALID_STATUSES.includes(data.statusPengiriman)) {
    return {
      valid: false,
      message: 'statusPengiriman harus salah satu dari diproses, dikirim, atau diterima',
    };
  }

  const payload = {
    nomorResi: data.nomorResi.trim(),
    pengirim: data.pengirim.trim(),
    penerima: data.penerima.trim(),
    beratKg: data.beratKg,
    statusPengiriman: data.statusPengiriman,
  };

  // Embedding: alamat tujuan (opsional)
  if (data.alamatTujuan !== undefined) {
    const alamatError = validateAlamat(data.alamatTujuan);

    if (alamatError) {
      return { valid: false, message: alamatError };
    }

    const { jalan, kota, provinsi, kodePos } = data.alamatTujuan;
    payload.alamatTujuan = { jalan, kota, provinsi, kodePos };
  }

  // Referencing: kurir (opsional)
  if (data.kurir !== undefined && data.kurir !== null) {
    if (!isObjectId(data.kurir)) {
      return { valid: false, message: 'kurir harus berupa ID kurir yang valid' };
    }

    payload.kurir = data.kurir;
  }

  return { valid: true, data: payload };
}

// Membangun filter MongoDB dari query string.
function buildShipmentFilter(query) {
  const filter = {};

  const statusPengiriman = getString(query, 'statusPengiriman');
  if (statusPengiriman) {
    if (!VALID_STATUSES.includes(statusPengiriman)) {
      throw new QueryError('statusPengiriman tidak valid');
    }
    filter.statusPengiriman = statusPengiriman;
  }

  const pengirim = getString(query, 'pengirim');
  if (pengirim) {
    filter.pengirim = { $regex: escapeRegex(pengirim), $options: 'i' };
  }

  const penerima = getString(query, 'penerima');
  if (penerima) {
    filter.penerima = { $regex: escapeRegex(penerima), $options: 'i' };
  }

  const kota = getString(query, 'kota');
  if (kota) {
    filter['alamatTujuan.kota'] = { $regex: `^${escapeRegex(kota)}$`, $options: 'i' };
  }

  const kurir = getString(query, 'kurir');
  if (kurir) {
    if (!isObjectId(kurir)) {
      throw new QueryError('kurir harus berupa ID kurir yang valid');
    }
    filter.kurir = kurir;
  }

  const minBerat = getNumber(query, 'minBerat');
  const maxBerat = getNumber(query, 'maxBerat');
  if (minBerat !== undefined || maxBerat !== undefined) {
    if (minBerat !== undefined && maxBerat !== undefined && minBerat > maxBerat) {
      throw new QueryError('minBerat tidak boleh lebih besar dari maxBerat');
    }

    filter.beratKg = {};
    if (minBerat !== undefined) filter.beratKg.$gte = minBerat;
    if (maxBerat !== undefined) filter.beratKg.$lte = maxBerat;
  }

  // Pencarian bebas pada nomor resi, pengirim, atau penerima
  const q = getString(query, 'q');
  if (q) {
    const pattern = { $regex: escapeRegex(q), $options: 'i' };
    filter.$or = [{ nomorResi: pattern }, { pengirim: pattern }, { penerima: pattern }];
  }

  return filter;
}

async function ensureCourierExists(kurirId) {
  const exists = await Courier.exists({ _id: kurirId });
  return Boolean(exists);
}

// GET /shipments  -> filtering, pagination, sorting, projection
async function getAllShipments(req, res, next) {
  try {
    const filter = buildShipmentFilter(req.query);
    const { page, limit, skip } = parsePagination(req.query);
    const sort = parseSort(req.query, SORTABLE_FIELDS, '-createdAt');
    const projection = parseProjection(req.query, PROJECTABLE_FIELDS);
    const populate = getString(req.query, 'populate');

    if (populate !== undefined && populate !== 'kurir') {
      throw new QueryError("populate hanya mendukung nilai 'kurir'");
    }

    let query = Shipment.find(filter).sort(sort).skip(skip).limit(limit);

    if (projection) {
      query = query.select(projection);
    }

    if (populate === 'kurir') {
      query = query.populate('kurir', COURIER_FIELDS);
    }

    const [shipments, totalData] = await Promise.all([
      query.lean(),
      Shipment.countDocuments(filter),
    ]);

    return res.status(200).json({
      status: 'success',
      message: 'Data shipment berhasil ditampilkan',
      meta: buildMeta({ page, limit, totalData }),
      data: shipments,
    });
  } catch (error) {
    return next(error);
  }
}

// GET /shipments/:id  -> kurir (referencing) otomatis di-populate
async function getShipmentById(req, res, next) {
  try {
    const projection = parseProjection(req.query, PROJECTABLE_FIELDS);

    let query = Shipment.findById(req.params.id);

    if (projection) {
      query = query.select(projection);
    }

    const shipment = await query.populate('kurir', COURIER_FIELDS).lean();

    if (!shipment) {
      return errorResponse(res, 404, 'Shipment tidak ditemukan');
    }

    return res.status(200).json({
      status: 'success',
      message: 'Shipment berdasarkan ID berhasil ditampilkan',
      data: shipment,
    });
  } catch (error) {
    return next(error);
  }
}

async function createShipment(req, res, next) {
  try {
    const validation = validateShipmentPayload(req.body);

    if (!validation.valid) {
      return errorResponse(res, 400, validation.message);
    }

    if (validation.data.kurir && !(await ensureCourierExists(validation.data.kurir))) {
      return errorResponse(res, 400, 'Kurir tidak ditemukan');
    }

    // Tracking awal otomatis dibuat sebagai subdokumen (embedding)
    const newShipment = await Shipment.create({
      ...validation.data,
      riwayatTracking: [
        {
          status: validation.data.statusPengiriman,
          keterangan: 'Paket didaftarkan',
        },
      ],
    });

    return res.status(201).json({
      status: 'success',
      message: 'Shipment baru berhasil ditambahkan',
      data: newShipment,
    });
  } catch (error) {
    return next(error);
  }
}

async function updateShipment(req, res, next) {
  try {
    const validation = validateShipmentPayload(req.body);

    if (!validation.valid) {
      return errorResponse(res, 400, validation.message);
    }

    if (validation.data.kurir && !(await ensureCourierExists(validation.data.kurir))) {
      return errorResponse(res, 400, 'Kurir tidak ditemukan');
    }

    const updatedShipment = await Shipment.findByIdAndUpdate(req.params.id, validation.data, {
      returnDocument: 'after',
      runValidators: true,
    });

    if (!updatedShipment) {
      return errorResponse(res, 404, 'Shipment tidak ditemukan');
    }

    return res.status(200).json({
      status: 'success',
      message: 'Shipment berhasil diubah',
      data: updatedShipment,
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteShipment(req, res, next) {
  try {
    const deleted = await Shipment.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return errorResponse(res, 404, 'Shipment tidak ditemukan');
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

// POST /shipments/:id/tracking -> menambah subdokumen ke array riwayatTracking
async function addTracking(req, res, next) {
  try {
    const { status, lokasi, keterangan } = req.body || {};

    if (!VALID_STATUSES.includes(status)) {
      return errorResponse(
        res,
        400,
        'status harus salah satu dari diproses, dikirim, atau diterima'
      );
    }

    for (const [name, value] of Object.entries({ lokasi, keterangan })) {
      if (value !== undefined && typeof value !== 'string') {
        return errorResponse(res, 400, `${name} harus berupa string`);
      }
    }

    const shipment = await Shipment.findById(req.params.id);

    if (!shipment) {
      return errorResponse(res, 404, 'Shipment tidak ditemukan');
    }

    shipment.riwayatTracking.push({ status, lokasi, keterangan });
    shipment.statusPengiriman = status;
    await shipment.save();

    return res.status(201).json({
      status: 'success',
      message: 'Riwayat tracking berhasil ditambahkan',
      data: shipment,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getAllShipments,
  getShipmentById,
  createShipment,
  updateShipment,
  deleteShipment,
  addTracking,
};
