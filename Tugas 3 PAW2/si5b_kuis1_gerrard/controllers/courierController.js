const Courier = require('../models/courierModel');
const Shipment = require('../models/shipmentModel');
const {
  QueryError,
  escapeRegex,
  getString,
  getBoolean,
  parsePagination,
  parseSort,
  parseProjection,
  buildMeta,
} = require('../utils/queryHelper');

const VALID_VEHICLES = ['motor', 'mobil', 'truk'];
const SORTABLE_FIELDS = ['nama', 'kendaraan', 'wilayah', 'createdAt'];
const PROJECTABLE_FIELDS = ['nama', 'nomorTelepon', 'kendaraan', 'wilayah', 'aktif', 'createdAt'];

function errorResponse(res, statusCode, message) {
  return res.status(statusCode).json({
    status: 'error',
    message,
    data: null,
  });
}

function validateCourierPayload(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, message: 'Body harus berupa objek JSON' };
  }

  for (const field of ['nama', 'nomorTelepon']) {
    if (typeof data[field] !== 'string' || data[field].trim() === '') {
      return { valid: false, message: `Field ${field} wajib diisi dan berupa string` };
    }
  }

  if (data.kendaraan !== undefined && !VALID_VEHICLES.includes(data.kendaraan)) {
    return { valid: false, message: 'kendaraan harus salah satu dari motor, mobil, atau truk' };
  }

  if (data.wilayah !== undefined && typeof data.wilayah !== 'string') {
    return { valid: false, message: 'wilayah harus berupa string' };
  }

  if (data.aktif !== undefined && typeof data.aktif !== 'boolean') {
    return { valid: false, message: 'aktif harus berupa boolean' };
  }

  const payload = {
    nama: data.nama.trim(),
    nomorTelepon: data.nomorTelepon.trim(),
  };

  if (data.kendaraan !== undefined) payload.kendaraan = data.kendaraan;
  if (data.wilayah !== undefined) payload.wilayah = data.wilayah.trim();
  if (data.aktif !== undefined) payload.aktif = data.aktif;

  return { valid: true, data: payload };
}

// GET /couriers -> filtering, pagination, sorting, projection
async function getAllCouriers(req, res, next) {
  try {
    const filter = {};

    const kendaraan = getString(req.query, 'kendaraan');
    if (kendaraan) {
      if (!VALID_VEHICLES.includes(kendaraan)) {
        throw new QueryError('kendaraan tidak valid');
      }
      filter.kendaraan = kendaraan;
    }

    const wilayah = getString(req.query, 'wilayah');
    if (wilayah) {
      filter.wilayah = { $regex: escapeRegex(wilayah), $options: 'i' };
    }

    const aktif = getBoolean(req.query, 'aktif');
    if (aktif !== undefined) {
      filter.aktif = aktif;
    }

    const nama = getString(req.query, 'nama');
    if (nama) {
      filter.nama = { $regex: escapeRegex(nama), $options: 'i' };
    }

    const { page, limit, skip } = parsePagination(req.query);
    const sort = parseSort(req.query, SORTABLE_FIELDS, 'nama');
    const projection = parseProjection(req.query, PROJECTABLE_FIELDS);

    let query = Courier.find(filter).sort(sort).skip(skip).limit(limit);

    if (projection) {
      query = query.select(projection);
    }

    const [couriers, totalData] = await Promise.all([query.lean(), Courier.countDocuments(filter)]);

    return res.status(200).json({
      status: 'success',
      message: 'Data kurir berhasil ditampilkan',
      meta: buildMeta({ page, limit, totalData }),
      data: couriers,
    });
  } catch (error) {
    return next(error);
  }
}

async function getCourierById(req, res, next) {
  try {
    const courier = await Courier.findById(req.params.id).lean();

    if (!courier) {
      return errorResponse(res, 404, 'Kurir tidak ditemukan');
    }

    return res.status(200).json({
      status: 'success',
      message: 'Kurir berdasarkan ID berhasil ditampilkan',
      data: courier,
    });
  } catch (error) {
    return next(error);
  }
}

async function createCourier(req, res, next) {
  try {
    const validation = validateCourierPayload(req.body);

    if (!validation.valid) {
      return errorResponse(res, 400, validation.message);
    }

    const courier = await Courier.create(validation.data);

    return res.status(201).json({
      status: 'success',
      message: 'Kurir baru berhasil ditambahkan',
      data: courier,
    });
  } catch (error) {
    return next(error);
  }
}

async function updateCourier(req, res, next) {
  try {
    const validation = validateCourierPayload(req.body);

    if (!validation.valid) {
      return errorResponse(res, 400, validation.message);
    }

    const courier = await Courier.findByIdAndUpdate(req.params.id, validation.data, {
      returnDocument: 'after',
      runValidators: true,
    });

    if (!courier) {
      return errorResponse(res, 404, 'Kurir tidak ditemukan');
    }

    return res.status(200).json({
      status: 'success',
      message: 'Kurir berhasil diubah',
      data: courier,
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteCourier(req, res, next) {
  try {
    const courier = await Courier.findById(req.params.id);

    if (!courier) {
      return errorResponse(res, 404, 'Kurir tidak ditemukan');
    }

    // Menjaga integritas referensi: kurir yang masih dipakai shipment tidak boleh dihapus.
    const usedBy = await Shipment.countDocuments({ kurir: courier._id });

    if (usedBy > 0) {
      return errorResponse(
        res,
        409,
        `Kurir tidak bisa dihapus karena masih dipakai oleh ${usedBy} shipment`
      );
    }

    await courier.deleteOne();

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getAllCouriers,
  getCourierById,
  createCourier,
  updateCourier,
  deleteCourier,
};
