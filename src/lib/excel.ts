import ExcelJS from "exceljs";
import { ImportPreviewResult, RowValidationError, TingkatKesulitan, TipeSoal } from "@/types";

export interface ParsedSoalRow {
  baris: number;
  mataPelajaran: string;
  tipeSoal: TipeSoal;
  pertanyaan: string;
  opsiA?: string;
  opsiB?: string;
  opsiC?: string;
  opsiD?: string;
  opsiE?: string;
  kunciJawaban: string;
  bobot: number;
  tingkatKesulitan: TingkatKesulitan;
}

export interface ParsedSiswaRow {
  baris: number;
  nisn: string;
  nama: string;
  kelas: string;
  jurusan: string;
  email?: string;
}

export interface ParsedNilaiManualRow {
  baris: number;
  nisn: string;
  nilaiPG?: number;
  nilaiEssay: number;
  catatan?: string;
}

// -------------------------------------------------------------
// 1. TEMPLATE GENERATORS
// -------------------------------------------------------------

export async function generateTemplateSoalExcel(): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SMK E-Ujian Platform";
  const ws = workbook.addWorksheet("Template Bank Soal");

  // Title
  ws.mergeCells("A1:K1");
  const t = ws.getCell("A1");
  t.value = "TEMPLATE IMPORT BANK SOAL - E-UJIAN SMK";
  t.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  t.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
  t.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 36;

  // Headers
  const headers = [
    "No",
    "Mata Pelajaran",
    "Tipe Soal (PILIHAN_GANDA / ESSAY)",
    "Pertanyaan",
    "Opsi A",
    "Opsi B",
    "Opsi C",
    "Opsi D",
    "Opsi E",
    "Kunci Jawaban",
    "Bobot",
    "Tingkat Kesulitan (MUDAH / SEDANG / SULIT)",
  ];

  const headerRow = ws.getRow(2);
  headerRow.values = headers;
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  // Example rows
  const samples = [
    [
      1,
      "Pemrograman Web & Perangkat Bergerak",
      "PILIHAN_GANDA",
      "Perintah Linux untuk memeriksa alamat IP pada interface jaringan adalah...",
      "ipconfig",
      "ip addr show atau ifconfig",
      "ping 127.0.0.1",
      "traceroute",
      "netstat -tulnp",
      "B",
      10,
      "MUDAH",
    ],
    [
      2,
      "Pemrograman Web & Perangkat Bergerak",
      "PILIHAN_GANDA",
      "Dalam arsitektur MVC, komponen yang bertanggung jawab mengelola logika bisnis dan database adalah...",
      "View",
      "Router",
      "Model",
      "Controller",
      "Middleware",
      "C",
      10,
      "SEDANG",
    ],
    [
      3,
      "Pemrograman Web & Perangkat Bergerak",
      "ESSAY",
      "Jelaskan prinsip kerja Service Worker dalam Progressive Web App (PWA) dan perbedaannya dengan Web Worker biasa!",
      "",
      "",
      "",
      "",
      "",
      "Service Worker bertindak sebagai network proxy di background untuk menangani caching offline.",
      25,
      "SULIT",
    ],
  ];

  samples.forEach((row) => {
    const r = ws.addRow(row);
    r.height = 24;
    r.eachCell((cell, colNumber) => {
      cell.font = { name: "Arial", size: 10 };
      cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      cell.alignment = {
        vertical: "middle",
        horizontal: [1, 3, 10, 11, 12].includes(colNumber) ? "center" : "left",
        wrapText: true,
      };
    });
  });

  ws.columns = [
    { width: 6 },
    { width: 30 },
    { width: 22 },
    { width: 45 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
    { width: 18 },
    { width: 10 },
    { width: 18 },
  ];

  const buf = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buf as ArrayBuffer);
}

export async function generateTemplateSiswaExcel(): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Template Siswa");

  ws.mergeCells("A1:E1");
  const t = ws.getCell("A1");
  t.value = "TEMPLATE IMPORT DATA SISWA PESERTA UJIAN SMK";
  t.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  t.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
  t.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 36;

  const headerRow = ws.getRow(2);
  headerRow.values = [
    "NISN (10 Digit Wajib)",
    "Nama Lengkap Siswa",
    "Kelas (Contoh: XI RPL 1)",
    "Jurusan (Contoh: RPL / TKJ / DKV)",
    "Email (Opsional)",
  ];
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
  });

  const samples = [
    ["0068192841", "Ahmad Rizky Pratama", "XI RPL 1", "RPL", "ahmad.rizky@siswa.smk.id"],
    ["0068192842", "Dewi Anggraini", "XI RPL 1", "RPL", "dewi.anggraini@siswa.smk.id"],
    ["0068192843", "Fajar Nugraha", "XI TKJ 1", "TKJ", "fajar.nugraha@siswa.smk.id"],
  ];

  samples.forEach((row) => {
    const r = ws.addRow(row);
    r.height = 22;
    r.eachCell((cell, colNumber) => {
      cell.font = { name: "Arial", size: 10 };
      cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      cell.alignment = { vertical: "middle", horizontal: colNumber === 1 || colNumber === 3 || colNumber === 4 ? "center" : "left" };
    });
  });

  ws.columns = [{ width: 22 }, { width: 34 }, { width: 18 }, { width: 18 }, { width: 30 }];

  const buf = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buf as ArrayBuffer);
}

// -------------------------------------------------------------
// 2. IMPORT VALIDATION PARSERS (ROW-BY-ROW STRICT VALIDATION)
// -------------------------------------------------------------

export async function validateAndParseSoalExcel(
  fileBuffer: Buffer | Uint8Array | ArrayBuffer
): Promise<ImportPreviewResult<ParsedSoalRow>> {
  const workbook = new ExcelJS.Workbook();
  const nodeBuf = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer as ArrayBuffer);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(nodeBuf as any);

  const ws = workbook.worksheets[0];
  if (!ws) {
    throw new Error("Lembar kerja Excel (worksheet) kosong atau tidak ditemukan.");
  }

  const errors: RowValidationError[] = [];
  const previewData: ParsedSoalRow[] = [];
  let totalDataRows = 0;

  ws.eachRow((row, rowNumber) => {
    // Skip title and header (row 1 & 2)
    if (rowNumber <= 2) return;

    totalDataRows++;

    const mataPelajaran = String(row.getCell(2).value || "").trim();
    const tipeRaw = String(row.getCell(3).value || "").trim().toUpperCase();
    const pertanyaan = String(row.getCell(4).value || "").trim();

    const opsiA = row.getCell(5).value ? String(row.getCell(5).value).trim() : "";
    const opsiB = row.getCell(6).value ? String(row.getCell(6).value).trim() : "";
    const opsiC = row.getCell(7).value ? String(row.getCell(7).value).trim() : "";
    const opsiD = row.getCell(8).value ? String(row.getCell(8).value).trim() : "";
    const opsiE = row.getCell(9).value ? String(row.getCell(9).value).trim() : "";

    let kunciJawaban = String(row.getCell(10).value || "").trim();
    const bobotRaw = row.getCell(11).value;
    const kesulitanRaw = String(row.getCell(12).value || "").trim().toUpperCase();

    let hasRowError = false;

    // 1. Validasi Tipe Soal
    let tipeSoal: TipeSoal = "PILIHAN_GANDA";
    if (tipeRaw.includes("ESSAY") || tipeRaw === "URAIAN") {
      tipeSoal = "ESSAY";
    } else if (tipeRaw.includes("PILIHAN") || tipeRaw === "PG" || tipeRaw === "PILIHAN_GANDA") {
      tipeSoal = "PILIHAN_GANDA";
    } else {
      errors.push({
        baris: rowNumber,
        kolom: "Tipe Soal",
        pesan: "Tipe soal harus 'PILIHAN_GANDA' atau 'ESSAY'.",
        nilai: tipeRaw,
      });
      hasRowError = true;
    }

    // 2. Validasi Pertanyaan
    if (!pertanyaan || pertanyaan.length < 5) {
      errors.push({
        baris: rowNumber,
        kolom: "Pertanyaan",
        pesan: "Pertanyaan wajib diisi minimal 5 karakter.",
        nilai: pertanyaan,
      });
      hasRowError = true;
    }

    // 3. Validasi Opsi dan Kunci PG
    if (tipeSoal === "PILIHAN_GANDA") {
      if (!opsiA || !opsiB || !opsiC || !opsiD) {
        errors.push({
          baris: rowNumber,
          kolom: "Opsi Pilihan (A-D)",
          pesan: "Soal Pilihan Ganda SMK wajib memiliki minimal Opsi A, B, C, dan D.",
          nilai: `A:${opsiA ? 'OK' : 'Kosong'}, B:${opsiB ? 'OK' : 'Kosong'}`,
        });
        hasRowError = true;
      }

      kunciJawaban = kunciJawaban.toUpperCase().charAt(0);
      if (!["A", "B", "C", "D", "E"].includes(kunciJawaban)) {
        errors.push({
          baris: rowNumber,
          kolom: "Kunci Jawaban",
          pesan: "Kunci jawaban pilihan ganda harus salah satu dari: A, B, C, D, atau E.",
          nilai: kunciJawaban,
        });
        hasRowError = true;
      }
    } else {
      // Validasi Essay
      if (!kunciJawaban || kunciJawaban.length < 3) {
        errors.push({
          baris: rowNumber,
          kolom: "Kunci Jawaban / Rubrik",
          pesan: "Panduan / rubrik jawaban essay wajib diisi.",
          nilai: kunciJawaban,
        });
        hasRowError = true;
      }
    }

    // 4. Validasi Bobot
    const bobot = Number(bobotRaw);
    if (isNaN(bobot) || bobot <= 0) {
      errors.push({
        baris: rowNumber,
        kolom: "Bobot Nilai",
        pesan: "Bobot nilai harus berupa angka positif lebih dari 0.",
        nilai: String(bobotRaw),
      });
      hasRowError = true;
    }

    // 5. Validasi Tingkat Kesulitan
    let tingkatKesulitan: TingkatKesulitan = "SEDANG";
    if (kesulitanRaw.includes("MUDAH") || kesulitanRaw === "EASY") {
      tingkatKesulitan = "MUDAH";
    } else if (kesulitanRaw.includes("SULIT") || kesulitanRaw === "HARD") {
      tingkatKesulitan = "SULIT";
    } else if (kesulitanRaw.includes("SEDANG") || kesulitanRaw === "MEDIUM" || kesulitanRaw === "") {
      tingkatKesulitan = "SEDANG";
    } else {
      errors.push({
        baris: rowNumber,
        kolom: "Tingkat Kesulitan",
        pesan: "Tingkat kesulitan harus 'MUDAH', 'SEDANG', atau 'SULIT'.",
        nilai: kesulitanRaw,
      });
      hasRowError = true;
    }

    if (!hasRowError) {
      previewData.push({
        baris: rowNumber,
        mataPelajaran: mataPelajaran || "Umum",
        tipeSoal,
        pertanyaan,
        opsiA,
        opsiB,
        opsiC,
        opsiD,
        opsiE,
        kunciJawaban,
        bobot,
        tingkatKesulitan,
      });
    }
  });

  return {
    tipe: "SOAL",
    totalBaris: totalDataRows,
    totalValid: previewData.length,
    totalInvalid: totalDataRows - previewData.length,
    errors,
    previewData,
  };
}

export async function validateAndParseSiswaExcel(
  fileBuffer: Buffer | Uint8Array | ArrayBuffer
): Promise<ImportPreviewResult<ParsedSiswaRow>> {
  const workbook = new ExcelJS.Workbook();
  const nodeBuf = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer as ArrayBuffer);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(nodeBuf as any);

  const ws = workbook.worksheets[0];
  if (!ws) {
    throw new Error("Lembar kerja Excel siswa tidak ditemukan.");
  }

  const errors: RowValidationError[] = [];
  const previewData: ParsedSiswaRow[] = [];
  const seenNisn = new Set<string>();
  let totalDataRows = 0;

  ws.eachRow((row, rowNumber) => {
    if (rowNumber <= 2) return;
    totalDataRows++;

    const nisnRaw = String(row.getCell(1).value || "").trim();
    const nama = String(row.getCell(2).value || "").trim();
    const kelas = String(row.getCell(3).value || "").trim();
    const jurusan = String(row.getCell(4).value || "").trim();
    const email = row.getCell(5).value ? String(row.getCell(5).value).trim() : undefined;

    let hasError = false;

    // NISN Check
    const cleanNisn = nisnRaw.replace(/[^0-9]/g, "");
    if (!cleanNisn || cleanNisn.length < 5) {
      errors.push({
        baris: rowNumber,
        kolom: "NISN",
        pesan: "NISN wajib diisi berupa angka (minimal 5-10 digit).",
        nilai: nisnRaw,
      });
      hasError = true;
    } else if (seenNisn.has(cleanNisn)) {
      errors.push({
        baris: rowNumber,
        kolom: "NISN",
        pesan: `Duplikat NISN '${cleanNisn}' terdeteksi pada file Excel yang sama.`,
        nilai: cleanNisn,
      });
      hasError = true;
    } else {
      seenNisn.add(cleanNisn);
    }

    // Nama Check
    if (!nama || nama.length < 3) {
      errors.push({
        baris: rowNumber,
        kolom: "Nama Siswa",
        pesan: "Nama lengkap siswa wajib diisi minimal 3 karakter.",
        nilai: nama,
      });
      hasError = true;
    }

    // Kelas Check
    if (!kelas) {
      errors.push({
        baris: rowNumber,
        kolom: "Kelas",
        pesan: "Rombel / Kelas siswa wajib diisi (contoh: XI RPL 1).",
        nilai: kelas,
      });
      hasError = true;
    }

    // Jurusan Check
    if (!jurusan) {
      errors.push({
        baris: rowNumber,
        kolom: "Jurusan",
        pesan: "Kompetensi keahlian / jurusan wajib diisi (contoh: RPL / TKJ).",
        nilai: jurusan,
      });
      hasError = true;
    }

    if (!hasError) {
      previewData.push({
        baris: rowNumber,
        nisn: cleanNisn,
        nama,
        kelas,
        jurusan,
        email,
      });
    }
  });

  return {
    tipe: "SISWA",
    totalBaris: totalDataRows,
    totalValid: previewData.length,
    totalInvalid: totalDataRows - previewData.length,
    errors,
    previewData,
  };
}

// -------------------------------------------------------------
// 3. EXPORTERS
// -------------------------------------------------------------

export async function exportBankSoalExcel(
  mataPelajaranNama: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  soalList: any[]
): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Bank Soal");

  ws.mergeCells("A1:K1");
  const t = ws.getCell("A1");
  t.value = `EKSPOR BANK SOAL - ${mataPelajaranNama.toUpperCase()}`;
  t.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  t.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
  t.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 36;

  const headerRow = ws.getRow(2);
  headerRow.values = [
    "No",
    "Tipe Soal",
    "Tingkat Kesulitan",
    "Pertanyaan",
    "Opsi A",
    "Opsi B",
    "Opsi C",
    "Opsi D",
    "Opsi E",
    "Kunci Jawaban",
    "Bobot",
  ];
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
  });

  soalList.forEach((s, idx) => {
    const row = ws.addRow([
      idx + 1,
      s.tipeSoal,
      s.tingkatKesulitan || "SEDANG",
      s.pertanyaan,
      s.opsiA || "",
      s.opsiB || "",
      s.opsiC || "",
      s.opsiD || "",
      s.opsiE || "",
      s.kunciJawaban,
      s.bobot,
    ]);
    row.height = 24;
    row.eachCell((cell, colNumber) => {
      cell.font = { name: "Arial", size: 10 };
      cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      cell.alignment = {
        vertical: "middle",
        horizontal: [1, 2, 3, 10, 11].includes(colNumber) ? "center" : "left",
        wrapText: true,
      };
    });
  });

  ws.columns = [
    { width: 6 },
    { width: 18 },
    { width: 18 },
    { width: 45 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
    { width: 18 },
    { width: 10 },
  ];

  const buf = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buf as ArrayBuffer);
}

export async function exportLogPelanggaranExcel(
  ujianJudul: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logs: any[]
): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Log Pelanggaran Anti-Cheat");

  ws.mergeCells("A1:G1");
  const t = ws.getCell("A1");
  t.value = `LOG AUDIT PELANGGARAN ANTI-CHEAT - ${ujianJudul.toUpperCase()}`;
  t.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  t.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF991B1B" } }; // Dark red
  t.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 36;

  const headerRow = ws.getRow(2);
  headerRow.values = [
    "No",
    "Waktu Insiden (WIB)",
    "NISN",
    "Nama Siswa",
    "Kelas",
    "Jenis Pelanggaran",
    "Deskripsi Kejadian",
  ];
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDC2626" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
  });

  logs.forEach((l, idx) => {
    const row = ws.addRow([
      idx + 1,
      new Date(l.timestamp).toLocaleString("id-ID"),
      l.nisn,
      l.namaSiswa,
      l.kelas,
      l.jenisPelanggaran,
      l.deskripsi,
    ]);
    row.height = 22;
    row.eachCell((cell, colNumber) => {
      cell.font = { name: "Arial", size: 10 };
      cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      cell.alignment = { vertical: "middle", horizontal: [1, 2, 3, 5, 6].includes(colNumber) ? "center" : "left" };
    });
  });

  ws.columns = [
    { width: 6 },
    { width: 22 },
    { width: 16 },
    { width: 30 },
    { width: 16 },
    { width: 26 },
    { width: 45 },
  ];

  const buf = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buf as ArrayBuffer);
}

export async function exportRekapKelasExcel(
  ujianData: {
    namaSekolah: string;
    judulUjian: string;
    mataPelajaran: string;
    kelas: string;
    jurusan: string;
    kkm: number;
    guruPengampu: string;
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pesertaList: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  soalList: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jawabanList: any[]
): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();

  // Sheet 1: Rekap Nilai Siswa
  const wsNilai = workbook.addWorksheet("Rekap Nilai");
  wsNilai.mergeCells("A1:H1");
  const t1 = wsNilai.getCell("A1");
  t1.value = `REKAPITULASI ASESMEN SISWA - ${ujianData.namaSekolah.toUpperCase()}`;
  t1.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  t1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
  t1.alignment = { horizontal: "center", vertical: "middle" };
  wsNilai.getRow(1).height = 34;

  const meta = [
    ["Mata Pelajaran", `: ${ujianData.mataPelajaran}`, "Kelas / Rombel", `: ${ujianData.kelas}`],
    ["Guru Pengampu", `: ${ujianData.guruPengampu}`, "KKM", `: ${ujianData.kkm}`],
  ];
  meta.forEach((m) => {
    const r = wsNilai.addRow(m);
    r.font = { name: "Arial", size: 10, bold: true };
    r.height = 20;
  });
  wsNilai.addRow([]);

  const headers = ["No", "NISN", "Nama Lengkap", "Kelas", "Nilai PG", "Nilai Essay", "Nilai Akhir", "Status Lulus", "Pelanggaran"];
  const hRow = wsNilai.addRow(headers);
  hRow.height = 26;
  hRow.eachCell((cell) => {
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
  });

  pesertaList.forEach((p, idx) => {
    const row = wsNilai.addRow([
      idx + 1,
      p.nisn,
      p.nama,
      p.kelas,
      p.nilaiPG,
      p.nilaiEssay,
      p.totalNilai,
      p.statusKelulusan,
      p.jumlahPelanggaran,
    ]);
    row.height = 22;
    row.eachCell((cell, colNumber) => {
      cell.font = { name: "Arial", size: 10 };
      cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      cell.alignment = { vertical: "middle", horizontal: [1, 2, 4, 5, 6, 7, 8, 9].includes(colNumber) ? "center" : "left" };
      if (colNumber === 8) {
        cell.font = { name: "Arial", size: 10, bold: true, color: { argb: p.statusKelulusan === "LULUS" ? "FF16A34A" : "FFDC2626" } };
      }
    });
  });

  wsNilai.columns = [
    { width: 6 },
    { width: 16 },
    { width: 32 },
    { width: 14 },
    { width: 12 },
    { width: 12 },
    { width: 14 },
    { width: 16 },
    { width: 16 },
  ];

  // Sheet 2: Analisis Butir Soal & Soal Tersulit
  const wsAnalisis = workbook.addWorksheet("Analisis Butir Soal");
  wsAnalisis.mergeCells("A1:G1");
  const t2 = wsAnalisis.getCell("A1");
  t2.value = "ANALISIS BUTIR SOAL & IDENTIFIKASI SOAL TERSULIT";
  t2.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  t2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
  t2.alignment = { horizontal: "center", vertical: "middle" };
  wsAnalisis.getRow(1).height = 34;

  const aHeaders = [
    "No Soal",
    "Tipe Soal",
    "Pertanyaan",
    "Tingkat Rencana",
    "Jumlah Benar",
    "Jumlah Salah",
    "Tingkat Kesulitan Lapangan",
  ];
  const aHRow = wsAnalisis.addRow(aHeaders);
  aHRow.height = 26;
  aHRow.eachCell((cell) => {
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0D9488" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
  });

  // Calculate difficulty per question
  soalList.forEach((s) => {
    const answersForSoal = jawabanList.filter((j: any) => j.soalId === s.id);
    const correctCount = answersForSoal.filter((j: any) => j.isCorrect === true).length;
    const incorrectCount = answersForSoal.length - correctCount;
    const totalAnswered = answersForSoal.length || 1;
    const failRate = incorrectCount / totalAnswered;

    let fieldDifficulty = "SEDANG";
    if (failRate >= 0.5) fieldDifficulty = "SANGAT SULIT (Soal Tersulit!)";
    else if (failRate >= 0.3) fieldDifficulty = "SULIT";
    else if (failRate < 0.15) fieldDifficulty = "MUDAH";

    const row = wsAnalisis.addRow([
      s.nomorUrut,
      s.tipeSoal,
      s.pertanyaan,
      s.tingkatKesulitan || "SEDANG",
      correctCount,
      incorrectCount,
      fieldDifficulty,
    ]);
    row.height = 24;
    row.eachCell((cell, colNumber) => {
      cell.font = { name: "Arial", size: 10 };
      cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      cell.alignment = { vertical: "middle", horizontal: [1, 2, 4, 5, 6, 7].includes(colNumber) ? "center" : "left", wrapText: true };
      if (colNumber === 7 && fieldDifficulty.includes("SULIT")) {
        cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFB91C1C" } };
      }
    });
  });

  wsAnalisis.columns = [
    { width: 8 },
    { width: 16 },
    { width: 45 },
    { width: 18 },
    { width: 14 },
    { width: 14 },
    { width: 28 },
  ];

  const buf = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buf as ArrayBuffer);
}
