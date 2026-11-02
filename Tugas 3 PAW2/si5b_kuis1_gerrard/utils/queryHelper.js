// Helper untuk membaca query string: pagination, sorting, projection, dan filter dasar.

class QueryError extends Error {
  constructor(message) {
    super(message);
    this.name = 'QueryError';
    this.statusCode = 400;
  }
}

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

function isObjectId(value) {
  return typeof value === 'string' && OBJECT_ID_REGEX.test(value);
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Mengambil query param bertipe string. Mengembalikan undefined jika kosong.
function getString(query, key) {
  const value = query[key];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new QueryError(`${key} harus berupa string`);
  }

  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function getNumber(query, key) {
  const raw = getString(query, key);

  if (raw === undefined) {
    return undefined;
  }

  const number = Number(raw);

  if (Number.isNaN(number)) {
    throw new QueryError(`${key} harus berupa angka`);
  }

  return number;
}

function getBoolean(query, key) {
  const raw = getString(query, key);

  if (raw === undefined) {
    return undefined;
  }

  if (raw === 'true') return true;
  if (raw === 'false') return false;

  throw new QueryError(`${key} harus bernilai true atau false`);
}

// PAGINATION: ?page=2&limit=5
function parsePagination(query, { defaultLimit = 10, maxLimit = 100 } = {}) {
  const page = getNumber(query, 'page') ?? 1;
  const limit = getNumber(query, 'limit') ?? defaultLimit;

  if (!Number.isInteger(page) || page < 1) {
    throw new QueryError('page harus berupa bilangan bulat minimal 1');
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > maxLimit) {
    throw new QueryError(`limit harus berupa bilangan bulat antara 1 sampai ${maxLimit}`);
  }

  return { page, limit, skip: (page - 1) * limit };
}

// SORTING: ?sort=-beratKg,nomorResi  (tanda minus = descending)
function parseSort(query, allowedFields, defaultSort) {
  const raw = getString(query, 'sort');
  const parts = raw ? raw.split(',') : defaultSort.split(',');
  const sort = {};

  for (const part of parts) {
    const item = part.trim();

    if (item === '') {
      continue;
    }

    const direction = item.startsWith('-') ? -1 : 1;
    const field = item.replace(/^[-+]/, '');

    if (!allowedFields.includes(field)) {
      throw new QueryError(
        `Field sort '${field}' tidak valid. Gunakan salah satu dari: ${allowedFields.join(', ')}`
      );
    }

    sort[field] = direction;
  }

  return sort;
}

// PROJECTION: ?fields=nomorResi,pengirim,statusPengiriman
function parseProjection(query, allowedFields) {
  const raw = getString(query, 'fields');

  if (!raw) {
    return undefined;
  }

  const fields = raw
    .split(',')
    .map((field) => field.trim())
    .filter((field) => field !== '');

  for (const field of fields) {
    if (!allowedFields.includes(field)) {
      throw new QueryError(
        `Field projection '${field}' tidak valid. Gunakan salah satu dari: ${allowedFields.join(', ')}`
      );
    }
  }

  return fields.join(' ');
}

function buildMeta({ page, limit, totalData }) {
  const totalPages = Math.ceil(totalData / limit);

  return {
    page,
    limit,
    totalData,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

module.exports = {
  QueryError,
  isObjectId,
  escapeRegex,
  getString,
  getNumber,
  getBoolean,
  parsePagination,
  parseSort,
  parseProjection,
  buildMeta,
};
