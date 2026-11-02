// Skrip pengujian endpoint. Jalankan setelah server hidup dan database di-seed:
//   npm run seed
//   npm start            (terminal 1)
//   npm run test:api     (terminal 2)
// Hasil setiap skenario disimpan di folder bukti-pengujian/ sebagai file .txt.

const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY || 'secret123';
const OUTPUT_DIR = path.join(__dirname, '..', 'bukti-pengujian');

const results = [];
const ctx = {};

async function call(method, urlPath, { headers = {}, body, rawBody } = {}) {
  const options = { method, headers: { ...headers } };

  if (rawBody !== undefined) {
    options.body = rawBody;
    options.headers['Content-Type'] = 'application/json';
  } else if (body !== undefined) {
    options.body = JSON.stringify(body);
    options.headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${BASE_URL}${urlPath}`, options);
  const text = await response.text();
  let json = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch (error) {
    json = null;
  }

  return { status: response.status, text, json };
}

function describeRequest(method, urlPath, { headers = {}, body, rawBody } = {}) {
  const lines = [`$ curl -X ${method} "${BASE_URL}${urlPath}"`];

  for (const [key, value] of Object.entries(headers)) {
    lines.push(`    -H "${key}: ${value}"`);
  }

  if (rawBody !== undefined || body !== undefined) {
    lines.push('    -H "Content-Type: application/json"');
    const payload = rawBody !== undefined ? rawBody : JSON.stringify(body, null, 2);
    lines.push(`    -d '${payload}'`);
  }

  return lines.join('\n');
}

async function scenario(id, title, expected, method, urlPath, options = {}, check) {
  const response = await call(method, urlPath, options);
  let passed = response.status === expected;

  if (passed && check) {
    passed = Boolean(check(response.json));
  }

  const output = [
    `[${id}] ${title}`,
    '',
    describeRequest(method, urlPath, options),
    '',
    `HTTP ${response.status}  (harapan ${expected})  =>  ${passed ? 'LULUS' : 'GAGAL'}`,
    '',
    response.json ? JSON.stringify(response.json, null, 2) : '(tanpa body)',
    '',
  ].join('\n');

  fs.writeFileSync(path.join(OUTPUT_DIR, `${id}.txt`), output);
  results.push({ id, title, expected, actual: response.status, passed });
  console.log(`${passed ? 'LULUS' : 'GAGAL'}  ${id}  ${response.status}  ${title}`);

  return response;
}

async function main() {
  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const auth = { 'x-api-key': API_KEY };

  // Data bantu: ambil ID kurir yang ada
  const courierList = await call('GET', '/couriers?sort=nama');
  ctx.courierA = courierList.json.data[0]._id;
  ctx.courierB = courierList.json.data[1]._id;

  // ---------- Skenario positif: CRUD dasar ----------
  await scenario('T01', 'Menampilkan semua shipment (default pagination)', 200, 'GET', '/shipments', {}, (j) =>
    j.meta.totalData === 12 && j.data.length === 10
  );

  const first = await call('GET', '/shipments?sort=nomorResi&limit=1');
  ctx.firstShipmentId = first.json.data[0]._id;

  await scenario('T02', 'Menampilkan satu shipment berdasarkan ID (kurir ter-populate)', 200, 'GET', `/shipments/${ctx.firstShipmentId}`, {}, (j) =>
    j.data.kurir && j.data.kurir.nama
  );

  const created = await scenario(
    'T03',
    'Menambah shipment baru (embedding alamat + referencing kurir)',
    201,
    'POST',
    '/shipments',
    {
      headers: auth,
      body: {
        nomorResi: 'EXP-GERRARD-2428240067',
        pengirim: 'Gerrard',
        penerima: 'Andi',
        beratKg: 2.5,
        statusPengiriman: 'diproses',
        alamatTujuan: {
          jalan: 'Jl. Jenderal Sudirman No. 10',
          kota: 'Palembang',
          provinsi: 'Sumatera Selatan',
          kodePos: '30126',
        },
        kurir: ctx.courierA,
      },
    },
    (j) => j.data.alamatTujuan.kota === 'Palembang' && j.data.riwayatTracking.length === 1
  );
  ctx.newId = created.json && created.json.data ? created.json.data._id : null;

  await scenario(
    'T04',
    'Mengubah shipment',
    200,
    'PUT',
    `/shipments/${ctx.newId}`,
    {
      headers: auth,
      body: {
        nomorResi: 'EXP-GERRARD-2428240067',
        pengirim: 'Gerrard',
        penerima: 'Budi',
        beratKg: 3,
        statusPengiriman: 'dikirim',
        kurir: ctx.courierB,
      },
    },
    (j) => j.data.penerima === 'Budi' && j.data.statusPengiriman === 'dikirim'
  );

  await scenario(
    'T05',
    'Menambah riwayat tracking (subdokumen embedded)',
    201,
    'POST',
    `/shipments/${ctx.newId}/tracking`,
    { headers: auth, body: { status: 'diterima', lokasi: 'Palembang', keterangan: 'Paket diterima penerima' } },
    (j) => j.data.riwayatTracking.length === 2 && j.data.statusPengiriman === 'diterima'
  );

  // ---------- Skenario positif: filtering, pagination, sorting, projection ----------
  await scenario('F01', 'Filter: statusPengiriman=dikirim', 200, 'GET', '/shipments?statusPengiriman=dikirim&fields=nomorResi,pengirim,statusPengiriman', {}, (j) =>
    j.data.length > 0 && j.data.every((s) => s.statusPengiriman === 'dikirim')
  );

  await scenario('F02', 'Filter gabungan: kota + rentang berat', 200, 'GET', '/shipments?kota=palembang&minBerat=2&maxBerat=4&fields=nomorResi,beratKg,alamatTujuan', {}, (j) =>
    // 3 data seed (001, 007, 010) + 1 data dari T03 (Palembang, 3 kg)
    j.data.length === 4 &&
    j.data.every((s) => s.beratKg >= 2 && s.beratKg <= 4 && s.alamatTujuan.kota === 'Palembang')
  );

  await scenario('F03', 'Filter: pencarian bebas q=gerrard', 200, 'GET', '/shipments?q=gerrard&fields=nomorResi,pengirim,penerima&limit=5', {}, (j) =>
    j.data.length > 0
  );

  await scenario('F04', 'Filter: berdasarkan kurir (referencing)', 200, 'GET', `/shipments?kurir=${ctx.courierA}&fields=nomorResi,pengirim,kurir`, {}, (j) =>
    j.data.length > 0 && j.data.every((s) => s.kurir === ctx.courierA)
  );

  await scenario('P01', 'Pagination: halaman 1 (limit=5)', 200, 'GET', '/shipments?page=1&limit=5&sort=nomorResi&fields=nomorResi,pengirim', {}, (j) =>
    j.data.length === 5 && j.meta.page === 1 && j.meta.hasNextPage === true && j.meta.hasPrevPage === false
  );

  await scenario('P02', 'Pagination: halaman 2 (limit=5)', 200, 'GET', '/shipments?page=2&limit=5&sort=nomorResi&fields=nomorResi,pengirim', {}, (j) =>
    j.data.length === 5 && j.meta.page === 2 && j.meta.hasPrevPage === true
  );

  await scenario('P03', 'Pagination: halaman terakhir (page=3, limit=5)', 200, 'GET', '/shipments?page=3&limit=5&sort=nomorResi&fields=nomorResi,pengirim', {}, (j) =>
    j.data.length === 3 && j.meta.hasNextPage === false
  );

  await scenario('S01', 'Sorting: beratKg terbesar ke terkecil', 200, 'GET', '/shipments?sort=-beratKg&limit=5&fields=nomorResi,beratKg', {}, (j) =>
    j.data.every((s, i, arr) => i === 0 || arr[i - 1].beratKg >= s.beratKg)
  );

  await scenario('S02', 'Sorting: banyak field (statusPengiriman naik, beratKg turun)', 200, 'GET', '/shipments?sort=statusPengiriman,-beratKg&limit=6&fields=nomorResi,statusPengiriman,beratKg', {}, (j) =>
    j.data.length === 6
  );

  await scenario('J01', 'Projection: hanya nomorResi dan pengirim', 200, 'GET', '/shipments?fields=nomorResi,pengirim&limit=3', {}, (j) =>
    j.data.every((s) => Object.keys(s).sort().join(',') === '_id,nomorResi,pengirim')
  );

  await scenario('J02', 'Populate referencing: kurir ikut ditampilkan di list', 200, 'GET', '/shipments?populate=kurir&fields=nomorResi,kurir&limit=3', {}, (j) =>
    j.data.every((s) => s.kurir && s.kurir.nama)
  );

  await scenario('J03', 'Kombinasi: filter + sort + pagination + projection + populate', 200, 'GET', '/shipments?statusPengiriman=diterima&sort=-beratKg&page=1&limit=2&fields=nomorResi,beratKg,statusPengiriman,kurir&populate=kurir', {}, (j) =>
    j.data.length === 2 && j.meta.totalData >= 2
  );

  // ---------- Skenario positif: endpoint kurir ----------
  await scenario('C01', 'Kurir: filter aktif=true + sorting nama + pagination', 200, 'GET', '/couriers?aktif=true&sort=-nama&page=1&limit=5', {}, (j) =>
    j.data.every((c) => c.aktif === true)
  );

  await scenario('C02', 'Kurir: projection nama dan kendaraan', 200, 'GET', '/couriers?fields=nama,kendaraan', {}, (j) =>
    j.data.every((c) => Object.keys(c).sort().join(',') === '_id,kendaraan,nama')
  );

  const newCourier = await scenario(
    'C03',
    'Kurir: menambah kurir baru',
    201,
    'POST',
    '/couriers',
    { headers: auth, body: { nama: 'Kurir Uji', nomorTelepon: '081200000000', kendaraan: 'motor', wilayah: 'Palembang' } },
    (j) => j.data._id
  );
  ctx.tempCourierId = newCourier.json && newCourier.json.data ? newCourier.json.data._id : null;

  await scenario('C04', 'Kurir: menghapus kurir yang tidak dipakai', 204, 'DELETE', `/couriers/${ctx.tempCourierId}`, { headers: auth });

  await scenario('T06', 'Menghapus shipment', 204, 'DELETE', `/shipments/${ctx.newId}`, { headers: auth });

  // ---------- Skenario negatif ----------
  await scenario(
    'N01',
    'POST tanpa API key',
    401,
    'POST',
    '/shipments',
    { body: { nomorResi: 'EXP-ERROR-01', pengirim: 'Gerrard', penerima: 'Andi', beratKg: 2.5, statusPengiriman: 'diproses' } }
  );

  await scenario('N02', 'POST body tidak lengkap', 400, 'POST', '/shipments', {
    headers: auth,
    body: { nomorResi: 'EXP-ERROR-02', pengirim: 'Gerrard' },
  });

  await scenario('N03', 'POST JSON rusak', 400, 'POST', '/shipments', {
    headers: auth,
    rawBody: '{ "nomorResi": "EXP-ERROR-03", "pengirim": "Gerrard", }',
  });

  await scenario('N04', 'GET ID valid tetapi tidak ada di database', 404, 'GET', '/shipments/64b7f0c2a1b2c3d4e5f60718');

  await scenario('N05', 'GET dengan format ID tidak valid', 400, 'GET', '/shipments/99');

  await scenario('N06', 'Filter statusPengiriman tidak valid', 400, 'GET', '/shipments?statusPengiriman=hilang');

  await scenario('N07', 'Sorting dengan field tidak valid', 400, 'GET', '/shipments?sort=passwordHash');

  await scenario('N08', 'Pagination dengan limit di luar batas', 400, 'GET', '/shipments?page=1&limit=1000');

  await scenario('N09', 'Projection dengan field tidak valid', 400, 'GET', '/shipments?fields=nomorResi,rahasia');

  await scenario('N10', 'POST nomorResi duplikat', 409, 'POST', '/shipments', {
    headers: auth,
    body: { nomorResi: 'EXP-GERRARD-001', pengirim: 'Gerrard', penerima: 'Andi', beratKg: 1, statusPengiriman: 'diproses' },
  });

  await scenario('N11', 'POST dengan kurir yang tidak ada', 400, 'POST', '/shipments', {
    headers: auth,
    body: {
      nomorResi: 'EXP-ERROR-11',
      pengirim: 'Gerrard',
      penerima: 'Andi',
      beratKg: 1,
      statusPengiriman: 'diproses',
      kurir: '64b7f0c2a1b2c3d4e5f60718',
    },
  });

  await scenario('N12', 'Hapus kurir yang masih dipakai shipment', 409, 'DELETE', `/couriers/${ctx.courierA}`, { headers: auth });

  await scenario('N13', 'Tracking dengan status tidak valid', 400, 'POST', `/shipments/${ctx.firstShipmentId}/tracking`, {
    headers: auth,
    body: { status: 'hilang' },
  });

  // ---------- Rekap ----------
  const lines = ['REKAPITULASI HASIL UJI', '', 'ID   | Harapan | Hasil | Lulus | Skenario', '-----+---------+-------+-------+---------'];

  for (const item of results) {
    lines.push(
      `${item.id.padEnd(4)} | ${String(item.expected).padEnd(7)} | ${String(item.actual).padEnd(5)} | ${(item.passed ? 'Ya' : 'TIDAK').padEnd(5)} | ${item.title}`
    );
  }

  const passedCount = results.filter((item) => item.passed).length;
  lines.push('', `Total: ${passedCount}/${results.length} skenario lulus`);

  fs.writeFileSync(path.join(OUTPUT_DIR, 'REKAP.txt'), lines.join('\n') + '\n');
  console.log(`\nTotal: ${passedCount}/${results.length} skenario lulus`);

  if (passedCount !== results.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('Pengujian berhenti:', error.message);
  process.exit(1);
});
