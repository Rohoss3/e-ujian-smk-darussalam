/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Memulai seeding data SMK E-Ujian...");

  const hashAdmin = await bcrypt.hash("admin123", 10);
  const hashGuru = await bcrypt.hash("guru123", 10);
  const hashSiswa = await bcrypt.hash("siswa123", 10);

  // 1. Jurusan
  const rpl = await prisma.jurusan.upsert({
    where: { kode: "RPL" },
    update: {},
    create: {
      kode: "RPL",
      nama: "Rekayasa Perangkat Lunak",
      deskripsi: "Kompetensi Keahlian Pengembangan Aplikasi & Web",
    },
  });

  const tkj = await prisma.jurusan.upsert({
    where: { kode: "TKJ" },
    update: {},
    create: {
      kode: "TKJ",
      nama: "Teknik Komputer & Jaringan",
      deskripsi: "Infrastruktur Jaringan Komputer, Server & Keamanan Cyber",
    },
  });

  // 2. Kelas
  const klsRPL = await prisma.kelas.upsert({
    where: { nama: "XI RPL 1" },
    update: {},
    create: {
      nama: "XI RPL 1",
      tingkat: 11,
      jurusanId: rpl.id,
    },
  });

  const klsTKJ = await prisma.kelas.upsert({
    where: { nama: "XI TKJ 1" },
    update: {},
    create: {
      nama: "XI TKJ 1",
      tingkat: 11,
      jurusanId: tkj.id,
    },
  });

  // 3. Mata Pelajaran
  const mapelPWPB = await prisma.mataPelajaran.upsert({
    where: { kode: "PWPB" },
    update: {},
    create: {
      kode: "PWPB",
      nama: "Pemrograman Web & Perangkat Bergerak",
      jurusanId: rpl.id,
      kkm: 75.0,
    },
  });

  // 4. Users
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      password: hashAdmin,
      name: "Administrator SMK",
      role: "ADMIN",
    },
  });

  const guruRPL = await prisma.user.upsert({
    where: { username: "guru_rpl" },
    update: {},
    create: {
      username: "guru_rpl",
      password: hashGuru,
      name: "Budi Santoso, S.Kom., M.T.",
      role: "GURU",
      nip: "19820415 200801 1 009",
      jurusanId: rpl.id,
    },
  });

  const siswaRPL = await prisma.user.upsert({
    where: { username: "siswa_rpl" },
    update: {},
    create: {
      username: "siswa_rpl",
      password: hashSiswa,
      name: "Ahmad Rizky Pratama",
      role: "SISWA",
      nisn: "0068192841",
      kelasId: klsRPL.id,
      jurusanId: rpl.id,
    },
  });

  // 5. Bank Soal
  const bank = await prisma.bankSoal.create({
    data: {
      judul: "Asesmen Kompetensi Kejuruan RPL - PWPB Kelas XI",
      deskripsi: "Materi Web Modern, REST API, Database dan Progressive Web Apps",
      guruId: guruRPL.id,
      mataPelajaranId: mapelPWPB.id,
      jurusanId: rpl.id,
      tingkat: 11,
    },
  });

  // 6. Soal PG & Essay
  await prisma.soal.createMany({
    data: [
      {
        bankSoalId: bank.id,
        nomorUrut: 1,
        tipeSoal: "PILIHAN_GANDA",
        pertanyaan: "Dalam pengembangan web modern menggunakan Next.js App Router, direktori khusus yang digunakan untuk menangani Server-Side API endpoint adalah...",
        opsiA: "app/api/[route]/route.ts",
        opsiB: "pages/handlers/api.js",
        opsiC: "server/controller/index.ts",
        opsiD: "src/endpoints/server.js",
        opsiE: "public/routes/api.json",
        kunciJawaban: "A",
        bobot: 10,
      },
      {
        bankSoalId: bank.id,
        nomorUrut: 2,
        tipeSoal: "PILIHAN_GANDA",
        pertanyaan: "Metode HTTP yang paling tepat digunakan untuk memperbarui sebagian data spesifik (partial update) pada RESTful API adalah...",
        opsiA: "GET",
        opsiB: "POST",
        opsiC: "PUT",
        opsiD: "PATCH",
        opsiE: "DELETE",
        kunciJawaban: "D",
        bobot: 10,
      },
      {
        bankSoalId: bank.id,
        nomorUrut: 3,
        tipeSoal: "PILIHAN_GANDA",
        pertanyaan: "Manakah teknik optimasi database SQL berikut yang bertujuan untuk mempercepat operasi SELECT pada kolom yang sering dicari?",
        opsiA: "Menerapkan Indexing B-Tree pada kolom terkait",
        opsiB: "Melakukan TRUNCATE pada seluruh tabel",
        opsiC: "Menghapus Primary Key constraint",
        opsiD: "Mengubah tipe data VARCHAR menjadi TEXT",
        opsiE: "Mematikan Foreign Key check secara permanen",
        kunciJawaban: "A",
        bobot: 10,
      },
      {
        bankSoalId: bank.id,
        nomorUrut: 4,
        tipeSoal: "ESSAY",
        pertanyaan: "Jelaskan prinsip kerja Service Worker dalam PWA dan mengapa ujian online SMK mewajibkan koneksi aktif tanpa cache ujian!",
        kunciJawaban: "Service Worker memotong request jaringan dan menyimpan cache offline, namun rute ujian diatur NetworkOnly untuk menjaga integritas anti-cheat dan sinkronisasi server.",
        bobot: 20,
      },
    ],
  });

  // 7. Jadwal Ujian Aktif
  const now = new Date();
  await prisma.ujian.create({
    data: {
      judul: "Penilaian Akhir Semester: Pemrograman Web & Bergerak",
      kodeUjian: "PAS-PWPB-XI-2026",
      tokenUjian: "SMK2026",
      deskripsi: "Ujian online resmi dengan pengawasan ketat Anti-Cheat & Face Proctoring.",
      bankSoalId: bank.id,
      guruId: guruRPL.id,
      mataPelajaranId: mapelPWPB.id,
      kelasTarget: JSON.stringify(["XI RPL 1"]),
      waktuMulai: new Date(now.getTime() - 10 * 60 * 1000),
      waktuSelesai: new Date(now.getTime() + 180 * 60 * 1000),
      durasiMenit: 90,
      acakSoal: true,
      acakOpsi: true,
      maxPelanggaran: 3,
      status: "AKTIF",
    },
  });

  console.log("Seeding PostgreSQL selesai dengan sukses!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
