import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { SekolahProfile, TingkatKesulitan, TipeSoal } from "@/types";

export interface SMKStoreData {
  sekolah: SekolahProfile;
  tahunAjaran?: Array<{ id: string; nama: string; semester: "GANJIL" | "GENAP"; isAktif: boolean }>;
  jurusan: Array<{ id: string; kode: string; nama: string; deskripsi: string; status?: "AKTIF" | "NONAKTIF" }>;
  kelas: Array<{ id: string; nama: string; tingkat: number; jurusanId: string; tahunAjaran?: string; waliKelasId?: string; status?: "AKTIF" | "NONAKTIF" }>;
  mataPelajaran: Array<{ id: string; kode: string; nama: string; jurusanId?: string; kkm: number; guruPengampuId?: string }>;
  users: Array<{
    id: string;
    username: string;
    password: string; // bcrypt hash
    name: string;
    email?: string;
    role: "ADMIN" | "GURU" | "SISWA" | "PENGAWAS";
    nisn?: string;
    nip?: string;
    kelasId?: string;
    jurusanId?: string;
    avatar?: string;
    status?: "AKTIF" | "NONAKTIF";
    mapelIds?: string[];
  }>;
  bankSoal: Array<{
    id: string;
    judul: string;
    deskripsi: string;
    guruId: string;
    mataPelajaranId: string;
    jurusanId?: string;
    tingkat?: number;
  }>;
  soal: Array<{
    id: string;
    bankSoalId: string;
    nomorUrut: number;
    tipeSoal: TipeSoal;
    tingkatKesulitan: TingkatKesulitan;
    pertanyaan: string;
    gambarUrl?: string;
    opsiA?: string;
    opsiB?: string;
    opsiC?: string;
    opsiD?: string;
    opsiE?: string;
    kunciJawaban: string;
    bobot: number;
  }>;
  ujian: Array<{
    id: string;
    judul: string;
    kodeUjian: string;
    tokenUjian: string;
    deskripsi: string;
    bankSoalId: string;
    guruId: string;
    mataPelajaranId: string;
    kelasTarget: string; // JSON string
    waktuMulai: string;
    waktuSelesai: string;
    durasiMenit: number;
    acakSoal: boolean;
    acakOpsi: boolean;
    tampilkanHasil: boolean;
    maxPelanggaran: number;
    status: "DRAFT" | "AKTIF" | "SELESAI";
    kkm: number;
    isRemedial?: boolean;
    ujianAsliId?: string;
    pengawasId?: string;
    pengawasIds?: string[];
  }>;
  pesertaUjian: Array<{
    id: string;
    ujianId: string;
    siswaId: string;
    status: "BELUM_MULAI" | "SEDANG_MENGERJAKAN" | "SELESAI" | "DIDISKUALIFIKASI";
    waktuMulai?: string;
    waktuSelesai?: string;
    sisaWaktuDetik: number;
    jumlahPelanggaran: number;
    seedAcak: number;
    nilaiPG: number;
    nilaiEssay: number;
    totalNilai: number;
    statusKelulusan: "LULUS" | "REMEDIAL" | "REMIDIAL" | "BELUM_DINILAI";
    nilaiRemedial?: number;
    catatanPengawas?: string;
    deviceFingerprint?: string;
  }>;
  jawabanSiswa: Array<{
    id: string;
    pesertaUjianId: string;
    soalId: string;
    jawabanPG?: string;
    jawabanEssay?: string;
    raguRagu: boolean;
    isCorrect?: boolean;
    nilaiDidapat: number;
    feedbackEssay?: string;
    updatedAt: string;
  }>;
  logPelanggaran: Array<{
    id: string;
    pesertaUjianId: string;
    jenisPelanggaran: string;
    deskripsi: string;
    snapshotFoto?: string;
    timestamp: string;
  }>;
  beritaAcara: Array<{
    id: string;
    ujianId: string;
    kelasId?: string;
    pengawasId: string;
    tanggal: string;
    ruang: string;
    jumlahHadir: number;
    jumlahTidakHadir: number;
    catatanKejadian?: string;
    signedByPengawas: boolean;
    fileUrl?: string;
    generatedAt: string;
    generatedBy?: string;
  }>;
  importLogs: Array<{
    id: string;
    tipe: "SOAL" | "SISWA" | "NILAI";
    fileName: string;
    status: "SUCCESS" | "PARTIAL" | "ERROR";
    errorDetail?: string;
    totalBaris: number;
    totalBerhasil: number;
    totalGagal: number;
    importedBy: string;
    createdAt: string;
  }>;
}

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "smk-store.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function getInitialSeedData(): SMKStoreData {
  const hashAdmin = bcrypt.hashSync("admin123", 10);
  const hashGuru = bcrypt.hashSync("guru123", 10);
  const hashSiswa = bcrypt.hashSync("siswa123", 10);

  const sekolah: SekolahProfile = {
    id: "sch-01",
    nama: "SMK Darussalam Panongan",
    npsn: "20219482",
    alamat: "Jl. Raya Korelet - Panongan, Kec. Panongan, Kab. Tangerang, Banten",
    logoUrl: "/logo.png",
    kepalaSekolah: "Drs. H. Mulyono, M.Pd.",
    nipKepala: "19680512 199303 1 005",
  };

  const jurusan = [
    { id: "jur-rpl", kode: "RPL", nama: "Rekayasa Perangkat Lunak", deskripsi: "Pengembangan Software & Aplikasi Web" },
    { id: "jur-tkj", kode: "TKJ", nama: "Teknik Komputer & Jaringan", deskripsi: "Infrastruktur Jaringan & Server" },
    { id: "jur-dkv", kode: "DKV", nama: "Desain Komunikasi Visual", deskripsi: "Desain Grafis, Animasi & Multimedia" },
  ];

  const kelas = [
    { id: "kls-10-rpl-1", nama: "X RPL 1", tingkat: 10, jurusanId: "jur-rpl" },
    { id: "kls-11-rpl-1", nama: "XI RPL 1", tingkat: 11, jurusanId: "jur-rpl" },
    { id: "kls-12-rpl-1", nama: "XII RPL 1", tingkat: 12, jurusanId: "jur-rpl" },
    { id: "kls-11-tkj-1", nama: "XI TKJ 1", tingkat: 11, jurusanId: "jur-tkj" },
    { id: "kls-12-dkv-1", nama: "XII DKV 1", tingkat: 12, jurusanId: "jur-dkv" },
  ];

  const mataPelajaran = [
    { id: "mapel-pwpb", kode: "PWPB", nama: "Pemrograman Web & Perangkat Bergerak", jurusanId: "jur-rpl", kkm: 75 },
    { id: "mapel-aij", kode: "AIJ", nama: "Administrasi Infrastruktur Jaringan", jurusanId: "jur-tkj", kkm: 75 },
    { id: "mapel-dg", kode: "DG", nama: "Desain Grafis Percetakan", jurusanId: "jur-dkv", kkm: 75 },
    { id: "mapel-mtk", kode: "MTK", nama: "Matematika Kejuruan", kkm: 70 },
    { id: "mapel-ind", kode: "BIND", nama: "Bahasa Indonesia", kkm: 75 },
  ];

  const users: SMKStoreData["users"] = [
    {
      id: "usr-admin",
      username: "admin",
      password: hashAdmin,
      name: "Administrator SMK",
      email: "admin@smknegeri1.sch.id",
      role: "ADMIN",
    },
    {
      id: "usr-guru-rpl",
      username: "guru_rpl",
      password: hashGuru,
      name: "Budi Santoso, S.Kom., M.T.",
      email: "budi.santoso@smknegeri1.sch.id",
      role: "GURU",
      nip: "19820415 200801 1 009",
      jurusanId: "jur-rpl",
    },
    {
      id: "usr-guru-tkj",
      username: "guru_tkj",
      password: hashGuru,
      name: "Siti Rahmawati, S.T.",
      email: "siti.rahmawati@smknegeri1.sch.id",
      role: "GURU",
      nip: "19850920 201001 2 014",
      jurusanId: "jur-tkj",
    },
    {
      id: "usr-siswa-1",
      username: "siswa_rpl",
      password: hashSiswa,
      name: "Ahmad Rizky Pratama",
      email: "ahmad.rizky@siswa.smk.id",
      role: "SISWA",
      nisn: "0068192841",
      kelasId: "kls-11-rpl-1",
      jurusanId: "jur-rpl",
    },
    {
      id: "usr-siswa-2",
      username: "0068192842",
      password: hashSiswa,
      name: "Dewi Anggraini",
      email: "dewi.anggraini@siswa.smk.id",
      role: "SISWA",
      nisn: "0068192842",
      kelasId: "kls-11-rpl-1",
      jurusanId: "jur-rpl",
    },
    {
      id: "usr-siswa-3",
      username: "siswa_tkj",
      password: hashSiswa,
      name: "Fajar Nugraha",
      email: "fajar.nugraha@siswa.smk.id",
      role: "SISWA",
      nisn: "0068192843",
      kelasId: "kls-11-tkj-1",
      jurusanId: "jur-tkj",
    },
  ];

  const bankSoal = [
    {
      id: "bank-pwpb-11",
      judul: "Asesmen Kompetensi Kejuruan RPL - PWPB Kelas XI",
      deskripsi: "Materi Pemrograman Web Modern (Next.js, REST API, Database, State Management)",
      guruId: "usr-guru-rpl",
      mataPelajaranId: "mapel-pwpb",
      jurusanId: "jur-rpl",
      tingkat: 11,
    },
  ];

  const soal: SMKStoreData["soal"] = [
    {
      id: "soal-1",
      bankSoalId: "bank-pwpb-11",
      nomorUrut: 1,
      tipeSoal: "PILIHAN_GANDA",
      tingkatKesulitan: "MUDAH",
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
      id: "soal-2",
      bankSoalId: "bank-pwpb-11",
      nomorUrut: 2,
      tipeSoal: "PILIHAN_GANDA",
      tingkatKesulitan: "SEDANG",
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
      id: "soal-3",
      bankSoalId: "bank-pwpb-11",
      nomorUrut: 3,
      tipeSoal: "PILIHAN_GANDA",
      tingkatKesulitan: "SEDANG",
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
      id: "soal-4",
      bankSoalId: "bank-pwpb-11",
      nomorUrut: 4,
      tipeSoal: "PILIHAN_GANDA",
      tingkatKesulitan: "SULIT",
      pertanyaan: "Dalam konsep Progressive Web App (PWA), komponen JavaScript yang berjalan di latar belakang (background thread) secara terpisah dari halaman web utama dan bertugas menangani offline caching adalah...",
      opsiA: "Web Worker",
      opsiB: "Service Worker",
      opsiC: "Task Manager",
      opsiD: "Local Storage Engine",
      opsiE: "IndexedDB Driver",
      kunciJawaban: "B",
      bobot: 10,
    },
    {
      id: "soal-5",
      bankSoalId: "bank-pwpb-11",
      nomorUrut: 5,
      tipeSoal: "PILIHAN_GANDA",
      tingkatKesulitan: "SULIT",
      pertanyaan: "Dalam arsitektur keamanan web, serangan di mana pelaku memasukkan script berbahaya ke dalam form input yang kemudian dieksekusi di browser pengguna lain disebut...",
      opsiA: "SQL Injection (SQLi)",
      opsiB: "Cross-Site Scripting (XSS)",
      opsiC: "Cross-Site Request Forgery (CSRF)",
      opsiD: "Distributed Denial of Service (DDoS)",
      opsiE: "Man In The Middle (MITM)",
      kunciJawaban: "B",
      bobot: 10,
    },
    {
      id: "soal-6",
      bankSoalId: "bank-pwpb-11",
      nomorUrut: 6,
      tipeSoal: "ESSAY",
      tingkatKesulitan: "SEDANG",
      pertanyaan: "Jelaskan perbedaan mendasar antara Server-Side Rendering (SSR) dan Client-Side Rendering (CSR), serta sebutkan situasi di mana SSR lebih diunggulkan untuk aplikasi web SMK!",
      kunciJawaban: "SSR merender HTML di server sebelum dikirim ke client (baik untuk SEO, performa perangkat rendah), sedangkan CSR merender HTML di browser menggunakan JavaScript.",
      bobot: 25,
    },
    {
      id: "soal-7",
      bankSoalId: "bank-pwpb-11",
      nomorUrut: 7,
      tipeSoal: "ESSAY",
      tingkatKesulitan: "SULIT",
      pertanyaan: "Sebagai calon programmer SMK, analisislah langkah-langkah mitigasi untuk mencegah SQL Injection pada aplikasi web berbasis Node.js & PostgreSQL!",
      kunciJawaban: "Gunakan parameterized queries / prepared statements, ORM seperti Prisma, validasi input menggunakan Zod, sanitasi data, dan terapkan least privilege access pada database user.",
      bobot: 25,
    },
  ];

  const now = new Date();
  const waktuMulai = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const waktuSelesai = new Date(now.getTime() + 180 * 60 * 1000).toISOString();

  const ujian = [
    {
      id: "ujian-pwpb-01",
      judul: "Penilaian Akhir Semester: Pemrograman Web & Bergerak",
      kodeUjian: "PAS-PWPB-XI-2026",
      tokenUjian: "SMK2026",
      deskripsi: "Ujian online resmi dengan pengawasan ketat Anti-Cheat & Face Proctoring. Dilarang meninggalkan layar penuh atau membuka tab lain.",
      bankSoalId: "bank-pwpb-11",
      guruId: "usr-guru-rpl",
      mataPelajaranId: "mapel-pwpb",
      kelasTarget: JSON.stringify(["XI RPL 1"]),
      waktuMulai,
      waktuSelesai,
      durasiMenit: 90,
      acakSoal: true,
      acakOpsi: true,
      tampilkanHasil: false,
      maxPelanggaran: 3,
      status: "SELESAI" as const, // Set to SELESAI so Berita Acara button is ready
      kkm: 75,
      isRemedial: false,
    },
    {
      id: "ujian-mtk-01",
      judul: "Penilaian Harian: Matematika Terapan Kejuruan",
      kodeUjian: "PH-MTK-XI-2026",
      tokenUjian: "MTK2026",
      deskripsi: "Penilaian harian kalkulus dasar dan matriks komputasi kejuruan kelas XI.",
      bankSoalId: "bank-pwpb-11",
      guruId: "usr-guru-rpl",
      mataPelajaranId: "mapel-mtk",
      kelasTarget: JSON.stringify(["XI RPL 1"]),
      waktuMulai,
      waktuSelesai,
      durasiMenit: 60,
      acakSoal: true,
      acakOpsi: true,
      tampilkanHasil: false,
      maxPelanggaran: 3,
      status: "SELESAI" as const,
      kkm: 75,
      isRemedial: false,
    },
  ];

  const pesertaUjian = [
    {
      id: "peserta-01",
      ujianId: "ujian-pwpb-01",
      siswaId: "usr-siswa-1",
      status: "SELESAI" as const,
      waktuMulai: new Date(now.getTime() - 55 * 60 * 1000).toISOString(),
      waktuSelesai: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
      sisaWaktuDetik: 0,
      jumlahPelanggaran: 0,
      seedAcak: 48921,
      nilaiPG: 50,
      nilaiEssay: 45,
      totalNilai: 95,
      statusKelulusan: "LULUS" as const,
      catatanPengawas: "Peserta mengerjakan dengan tertib dan bersih.",
    },
    {
      id: "peserta-mtk-01",
      ujianId: "ujian-mtk-01",
      siswaId: "usr-siswa-1",
      status: "SELESAI" as const,
      waktuMulai: new Date(now.getTime() - 90 * 60 * 1000).toISOString(),
      waktuSelesai: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
      sisaWaktuDetik: 0,
      jumlahPelanggaran: 0,
      seedAcak: 59124,
      nilaiPG: 35,
      nilaiEssay: 25,
      totalNilai: 60,
      statusKelulusan: "REMEDIAL" as const,
      catatanPengawas: "Nilai di bawah KKM (75). Wajib mengikuti remedial materi matriks.",
    },
    {
      id: "peserta-02",
      ujianId: "ujian-pwpb-01",
      siswaId: "usr-siswa-2",
      status: "SELESAI" as const,
      waktuMulai: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
      waktuSelesai: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
      sisaWaktuDetik: 0,
      jumlahPelanggaran: 1,
      seedAcak: 83219,
      nilaiPG: 40,
      nilaiEssay: 45,
      totalNilai: 85,
      statusKelulusan: "LULUS" as const,
      catatanPengawas: "Pernah keluar fullscreen 1x saat ada notifikasi sistem.",
    },
  ];

  const jawabanSiswa = [
    {
      id: "jwb-01-1",
      pesertaUjianId: "peserta-01",
      soalId: "soal-1",
      jawabanPG: "A",
      raguRagu: false,
      isCorrect: true,
      nilaiDidapat: 10,
      updatedAt: now.toISOString(),
    },
    {
      id: "jwb-01-2",
      pesertaUjianId: "peserta-01",
      soalId: "soal-2",
      jawabanPG: "D",
      raguRagu: false,
      isCorrect: true,
      nilaiDidapat: 10,
      updatedAt: now.toISOString(),
    },
    {
      id: "jwb-01-3",
      pesertaUjianId: "peserta-01",
      soalId: "soal-3",
      jawabanPG: "A",
      raguRagu: false,
      isCorrect: true,
      nilaiDidapat: 10,
      updatedAt: now.toISOString(),
    },
    {
      id: "jwb-01-4",
      pesertaUjianId: "peserta-01",
      soalId: "soal-4",
      jawabanPG: "B",
      raguRagu: false,
      isCorrect: true,
      nilaiDidapat: 10,
      updatedAt: now.toISOString(),
    },
    {
      id: "jwb-01-5",
      pesertaUjianId: "peserta-01",
      soalId: "soal-5",
      jawabanPG: "B",
      raguRagu: false,
      isCorrect: true,
      nilaiDidapat: 10,
      updatedAt: now.toISOString(),
    },
    {
      id: "jwb-02-1",
      pesertaUjianId: "peserta-02",
      soalId: "soal-1",
      jawabanPG: "A",
      raguRagu: false,
      isCorrect: true,
      nilaiDidapat: 10,
      updatedAt: now.toISOString(),
    },
    {
      id: "jwb-02-2",
      pesertaUjianId: "peserta-02",
      soalId: "soal-2",
      jawabanPG: "D",
      raguRagu: false,
      isCorrect: true,
      nilaiDidapat: 10,
      updatedAt: now.toISOString(),
    },
    {
      id: "jwb-02-3",
      pesertaUjianId: "peserta-02",
      soalId: "soal-3",
      jawabanPG: "C", // salah
      raguRagu: false,
      isCorrect: false,
      nilaiDidapat: 0,
      updatedAt: now.toISOString(),
    },
    {
      id: "jwb-02-4",
      pesertaUjianId: "peserta-02",
      soalId: "soal-4",
      jawabanPG: "A", // salah (soal tersulit!)
      raguRagu: false,
      isCorrect: false,
      nilaiDidapat: 0,
      updatedAt: now.toISOString(),
    },
    {
      id: "jwb-02-5",
      pesertaUjianId: "peserta-02",
      soalId: "soal-5",
      jawabanPG: "B",
      raguRagu: false,
      isCorrect: true,
      nilaiDidapat: 10,
      updatedAt: now.toISOString(),
    },
    {
      id: "jwb-02-6",
      pesertaUjianId: "peserta-02",
      soalId: "soal-6",
      jawabanEssay: "SSR melakukan rendering HTML di server sehingga halaman tiba di browser sudah terisi konten, sedangkan CSR mengunduh bundle JavaScript dan merender di browser pengguna.",
      raguRagu: false,
      nilaiDidapat: 22.5,
      feedbackEssay: "Penjelasan sangat baik dan tepat.",
      updatedAt: now.toISOString(),
    },
  ];

  const logPelanggaran = [
    {
      id: "log-02-1",
      pesertaUjianId: "peserta-02",
      jenisPelanggaran: "KELUAR_FULLSCREEN",
      deskripsi: "Keluar dari mode layar penuh (Fullscreen) selama 3 detik.",
      timestamp: new Date(now.getTime() - 40 * 60 * 1000).toISOString(),
    },
  ];

  const beritaAcara = [
    {
      id: "ba-pwpb-01",
      ujianId: "ujian-pwpb-01",
      kelasId: "kls-11-rpl-1",
      pengawasId: "usr-guru-rpl",
      tanggal: now.toISOString(),
      ruang: "Lab RPL 2",
      jumlahHadir: 2,
      jumlahTidakHadir: 0,
      catatanKejadian: "Ujian berjalan tertib, sistem anti-cheat mencatat 1 insiden keluar fullscreen dan telah diklarifikasi.",
      signedByPengawas: true,
      fileUrl: "/api/berita-acara/ujian-pwpb-01/kls-11-rpl-1",
      generatedAt: now.toISOString(),
      generatedBy: "Budi Santoso, S.Kom., M.T.",
    },
  ];

  const importLogs = [
    {
      id: "implog-1",
      tipe: "SOAL" as const,
      fileName: "Soal_Pemrograman_Web_SMK.xlsx",
      status: "SUCCESS" as const,
      totalBaris: 7,
      totalBerhasil: 7,
      totalGagal: 0,
      importedBy: "Budi Santoso, S.Kom., M.T.",
      createdAt: new Date(now.getTime() - 120 * 60 * 1000).toISOString(),
    },
  ];

  return {
    sekolah,
    jurusan,
    kelas,
    mataPelajaran,
    users,
    bankSoal,
    soal,
    ujian,
    pesertaUjian,
    jawabanSiswa,
    logPelanggaran,
    beritaAcara,
    importLogs,
  };
}

let cachedStore: SMKStoreData | null = null;
let lastMtimeMs: number = 0;
let saveDebounceTimer: NodeJS.Timeout | null = null;

export function loadStore(): SMKStoreData {
  if (!fs.existsSync(STORE_FILE)) {
    const initial = getInitialSeedData();
    saveStore(initial, true);
    return initial;
  }
  try {
    const stat = fs.statSync(STORE_FILE);
    if (cachedStore && stat.mtimeMs === lastMtimeMs) {
      return cachedStore;
    }

    const raw = fs.readFileSync(STORE_FILE, "utf-8");
    const data = JSON.parse(raw);
    if (!data.sekolah || !data.importLogs) {
      const initial = getInitialSeedData();
      saveStore(initial, true);
      return initial;
    }
    if (!data.tahunAjaran) {
      data.tahunAjaran = [
        { id: "ta-2026", nama: "2026/2027", semester: "GANJIL", isAktif: true },
        { id: "ta-2025", nama: "2025/2026", semester: "GENAP", isAktif: false },
      ];
    }
    data.jurusan.forEach((j: any) => { if (!j.status) j.status = "AKTIF"; });
    data.kelas.forEach((k: any) => {
      if (!k.status) k.status = "AKTIF";
      if (!k.tahunAjaran) k.tahunAjaran = "2026/2027";
      if (!k.waliKelasId) k.waliKelasId = k.jurusanId === "jur-rpl" ? "usr-guru-rpl" : "usr-guru-tkj";
    });
    data.users.forEach((u: any) => {
      if (!u.status) u.status = "AKTIF";
      if (u.role === "GURU" && !u.mapelIds) {
        u.mapelIds = u.id === "usr-guru-rpl" ? ["mapel-pwpb"] : ["mapel-aij"];
      }
    });
    data.mataPelajaran.forEach((m: any) => {
      if (!m.guruPengampuId) {
        m.guruPengampuId = m.jurusanId === "jur-rpl" ? "usr-guru-rpl" : "usr-guru-tkj";
      }
    });
    data.ujian.forEach((u: any) => {
      if (u.kkm === undefined) {
        const mapel = data.mataPelajaran.find((m: any) => m.id === u.mataPelajaranId);
        u.kkm = mapel?.kkm || 75;
      }
      if (u.isRemedial === undefined) u.isRemedial = false;
    });
    data.pesertaUjian.forEach((p: any) => {
      if (p.statusKelulusan === "REMIDIAL") {
        p.statusKelulusan = "REMEDIAL";
      }
    });

    cachedStore = data;
    lastMtimeMs = stat.mtimeMs;
    return cachedStore;
  } catch {
    if (cachedStore) return cachedStore;
    const initial = getInitialSeedData();
    saveStore(initial, true);
    return initial;
  }
}

export function saveStore(data: SMKStoreData, immediate: boolean = false): void {
  cachedStore = data;

  const persistToDisk = () => {
    try {
      fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), "utf-8");
      try {
        lastMtimeMs = fs.statSync(STORE_FILE).mtimeMs;
      } catch {
        lastMtimeMs = Date.now();
      }
    } catch (err) {
      console.error("[DataStore] Gagal menyimpan ke disk:", err);
    }
  };

  if (immediate) {
    if (saveDebounceTimer) {
      clearTimeout(saveDebounceTimer);
      saveDebounceTimer = null;
    }
    persistToDisk();
  } else {
    if (saveDebounceTimer) {
      clearTimeout(saveDebounceTimer);
    }
    saveDebounceTimer = setTimeout(() => {
      saveDebounceTimer = null;
      persistToDisk();
    }, 150);
  }
}

export function flushStoreSync(): void {
  if (saveDebounceTimer && cachedStore) {
    clearTimeout(saveDebounceTimer);
    saveDebounceTimer = null;
    try {
      fs.writeFileSync(STORE_FILE, JSON.stringify(cachedStore, null, 2), "utf-8");
      lastMtimeMs = fs.statSync(STORE_FILE).mtimeMs;
    } catch (err) {
      console.error("[DataStore] Flush sync error:", err);
    }
  }
}

if (typeof process !== "undefined") {
  process.on("beforeExit", () => flushStoreSync());
}

