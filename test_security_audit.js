const http = require("http");

async function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data,
          json,
        });
      });
    });
    req.on("error", reject);
    if (postData) {
      req.write(typeof postData === "string" ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log("=== MEMULAI TEST AUDIT KEAMANAN & FITUR SMK E-UJIAN ===");
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Unauthenticated test on /api/ujian/jawaban
  const r1 = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/ujian/jawaban",
    method: "POST",
    headers: { "Content-Type": "application/json" },
  }, { pesertaId: "dummy", soalId: "dummy" });
  assert(r1.statusCode === 401, "POST /api/ujian/jawaban tanpa token harus 401 Unauthorized");

  // 2. Unauthenticated test on /api/ujian/selesai
  const r2 = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/ujian/selesai",
    method: "POST",
    headers: { "Content-Type": "application/json" },
  }, { pesertaId: "dummy" });
  assert(r2.statusCode === 401, "POST /api/ujian/selesai tanpa token harus 401 Unauthorized");

  // 3. Unauthenticated test on /api/ujian/heartbeat
  const r3 = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/ujian/heartbeat",
    method: "POST",
    headers: { "Content-Type": "application/json" },
  }, { pesertaId: "dummy" });
  assert(r3.statusCode === 401, "POST /api/ujian/heartbeat tanpa token harus 401 Unauthorized");

  // 4. Unauthenticated test on /api/ujian/pelanggaran
  const r4 = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/ujian/pelanggaran",
    method: "POST",
    headers: { "Content-Type": "application/json" },
  }, { pesertaId: "dummy", jenis: "TAB_SWITCH", deskripsi: "Pindah tab" });
  assert(r4.statusCode === 401, "POST /api/ujian/pelanggaran tanpa token harus 401 Unauthorized");

  // 5. Unauthenticated test on /api/cetak/kartu-ujian
  const r5 = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/cetak/kartu-ujian",
    method: "GET",
  });
  assert(r5.statusCode === 401, "GET /api/cetak/kartu-ujian tanpa token harus 401 Unauthorized");

  // 6. Security Headers Check
  const rHeaders = await request({
    hostname: "localhost",
    port: 3000,
    path: "/",
    method: "GET",
  });
  assert(rHeaders.headers["x-frame-options"] === "SAMEORIGIN", "Security header X-Frame-Options: SAMEORIGIN terpasang");
  assert(rHeaders.headers["x-content-type-options"] === "nosniff", "Security header X-Content-Type-Options: nosniff terpasang");
  assert(rHeaders.headers["x-xss-protection"] === "1; mode=block", "Security header X-XSS-Protection: 1; mode=block terpasang");

  // 7. Login as Siswa (siswa_rpl / siswa123)
  const loginRes = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/auth/login",
    method: "POST",
    headers: { "Content-Type": "application/json" },
  }, { username: "siswa_rpl", password: "siswa123" });

  assert(loginRes.statusCode === 200 && loginRes.json?.success, "Login Siswa (siswa_rpl) berhasil");
  const cookie = loginRes.headers["set-cookie"] ? loginRes.headers["set-cookie"][0].split(";")[0] : "";

  // 8. Test change password without currentPassword as Siswa
  const changePwRes = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/auth/profil",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
  }, { newPassword: "passwordbaru123", confirmPassword: "passwordbaru123" });
  assert(changePwRes.statusCode === 400, "POST /api/auth/profil tanpa currentPassword harus ditolak 400 Bad Request");

  // 9. Test Student exporting grades
  const exportRes = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/export/nilai?ujianId=ujian-pwpb-01",
    method: "GET",
    headers: {
      Cookie: cookie,
    },
  });
  assert(exportRes.statusCode === 403, "GET /api/export/nilai oleh akun Siswa harus 403 Forbidden");

  // 10. Test Student importing data
  const importRes = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/import/siswa",
    method: "POST",
    headers: {
      Cookie: cookie,
    },
  });
  assert(importRes.statusCode === 403, "POST /api/import/siswa oleh akun Siswa harus 403 Forbidden");

  // 11. Test IDOR protection: Student attempting to submit answers for someone else's pesertaId (peserta-02 belongs to usr-siswa-2)
  const idorRes = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/ujian/jawaban",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
  }, {
    pesertaId: "peserta-02",
    soalId: "soal-1",
    jawabanPG: "B",
  });
  assert(idorRes.statusCode === 403, "IDOR pada /api/ujian/jawaban (mengubah jawaban siswa lain) harus 403 Forbidden");

  // 12. Test IDOR protection on selesai ujian (attempting to finish someone else's exam)
  const idorSelesai = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/ujian/selesai",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
  }, {
    pesertaId: "peserta-02",
  });
  assert(idorSelesai.statusCode === 403, "IDOR pada /api/ujian/selesai (menyelesaikan sesi siswa lain) harus 403 Forbidden");

  // 13. Test IDOR on cetak kartu ujian: Student querying another student's id
  const idorKartu = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/cetak/kartu-ujian?siswaId=usr-siswa-2",
    method: "GET",
    headers: {
      Cookie: cookie,
    },
  });
  assert(idorKartu.statusCode === 403, "IDOR pada /api/cetak/kartu-ujian untuk akun siswa lain berhasil diblokir (403)");

  // 14. Admin Login test
  const adminLogin = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/auth/login",
    method: "POST",
    headers: { "Content-Type": "application/json" },
  }, { username: "admin", password: "admin123" });
  assert(adminLogin.statusCode === 200 && adminLogin.json?.success, "Login Admin (admin / admin123) berhasil");

  console.log(`\n=== HASIL AUDIT: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed === 0) {
    console.log("SEMUA PENGUJIAN KEAMANAN DAN ALUR SELESAI DENGAN SUKSES.");
  }
}

runTests().catch(console.error);
