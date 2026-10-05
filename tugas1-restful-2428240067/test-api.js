process.env.NODE_ENV = 'production';

const assert = require('assert');
const http = require('http');
const app = require('./app');

function request(port, method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        port,
        method,
        path,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            body: data ? JSON.parse(data) : null,
          });
        });
      }
    );

    req.on('error', reject);

    if (payload) {
      req.write(payload);
    }

    req.end();
  });
}

function rawRequest(port, method, path, payload) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        port,
        method,
        path,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            body: data ? JSON.parse(data) : null,
          });
        });
      }
    );

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function runTests() {
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const allShipments = await request(port, 'GET', '/shipments');
    assert.strictEqual(allShipments.statusCode, 200);
    assert.ok(Array.isArray(allShipments.body));
    assert.strictEqual(allShipments.body.length, 5);

    const oneShipment = await request(port, 'GET', '/shipments/1');
    assert.strictEqual(oneShipment.statusCode, 200);
    assert.deepStrictEqual(oneShipment.body, {
      id: 1,
      nomorResi: 'EXP2609001',
      pengirim: 'Toko Sinar',
      penerima: 'Budi Hartono',
      beratKg: 2.5,
      statusPengiriman: 'dikirim',
    });

    const filteredShipments = await request(
      port,
      'GET',
      '/shipments?statusPengiriman=dikirim'
    );
    assert.strictEqual(filteredShipments.statusCode, 200);
    assert.ok(Array.isArray(filteredShipments.body));
    assert.ok(
      filteredShipments.body.every(
        (shipment) => shipment.statusPengiriman === 'dikirim'
      )
    );

    const createdShipment = await request(port, 'POST', '/shipments', {
      nomorResi: 'EXP2609006',
      pengirim: 'Toko Baru',
      penerima: 'Maya Putri',
      beratKg: 2.2,
      statusPengiriman: 'diproses',
    });
    assert.strictEqual(createdShipment.statusCode, 201);
    assert.deepStrictEqual(createdShipment.body, {
      status: 'success',
      message: 'Data paket kiriman berhasil ditambahkan',
      data: {
        id: 6,
        nomorResi: 'EXP2609006',
        pengirim: 'Toko Baru',
        penerima: 'Maya Putri',
        beratKg: 2.2,
        statusPengiriman: 'diproses',
      },
    });

    const updatedShipment = await request(port, 'PUT', '/shipments/6', {
      nomorResi: 'EXP2609006',
      pengirim: 'Toko Baru',
      penerima: 'Maya Putri',
      beratKg: 3,
      statusPengiriman: 'dikirim',
    });
    assert.strictEqual(updatedShipment.statusCode, 200);
    assert.strictEqual(updatedShipment.body.status, 'success');
    assert.strictEqual(updatedShipment.body.data.beratKg, 3);
    assert.strictEqual(updatedShipment.body.data.statusPengiriman, 'dikirim');

    const deletedShipment = await request(port, 'DELETE', '/shipments/6');
    assert.strictEqual(deletedShipment.statusCode, 200);
    assert.deepStrictEqual(deletedShipment.body, {
      status: 'success',
      message: 'Data paket kiriman dengan id 6 berhasil dihapus',
      data: null,
    });

    const notFoundShipment = await request(port, 'GET', '/shipments/999');
    assert.strictEqual(notFoundShipment.statusCode, 404);
    assert.deepStrictEqual(notFoundShipment.body, {
      status: 'error',
      message: 'Data dengan id 999 tidak ditemukan',
      data: null,
    });

    const invalidShipment = await request(port, 'POST', '/shipments', {
      nomorResi: 'EXP2609007',
      pengirim: 'Toko Error',
      beratKg: 1,
      statusPengiriman: 'large',
    });
    assert.strictEqual(invalidShipment.statusCode, 400);
    assert.deepStrictEqual(invalidShipment.body, {
      status: 'error',
      message: 'Field penerima wajib diisi',
      data: null,
    });

    const invalidJson = await rawRequest(
      port,
      'POST',
      '/shipments',
      "{ nomorResi: 'EXP2609008' }"
    );
    assert.strictEqual(invalidJson.statusCode, 400);
    assert.deepStrictEqual(invalidJson.body, {
      status: 'error',
      message: 'Format JSON tidak valid. Gunakan body raw JSON dan header Content-Type: application/json',
      data: null,
    });

    const unknownEndpoint = await request(port, 'GET', '/unknown');
    assert.strictEqual(unknownEndpoint.statusCode, 404);
    assert.deepStrictEqual(unknownEndpoint.body, {
      status: 'error',
      message: 'Endpoint tidak ditemukan',
      data: null,
    });

    console.log('Semua syarat method HTTP dan response JSON berhasil diuji.');
  } finally {
    server.close();
  }
}

runTests().catch((error) => {
  console.error(error);
  process.exit(1);
});
