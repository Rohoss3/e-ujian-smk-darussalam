import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface PesertaBeritaAcaraItem {
  no: number;
  nisn: string;
  nama: string;
  kelas: string;
  status: "BELUM_MULAI" | "SEDANG_MENGERJAKAN" | "SELESAI" | "DIDISKUALIFIKASI";
  jumlahPelanggaran: number;
  nilaiPG: number;
  nilaiEssay: number;
  totalNilai: number;
  statusKelulusan: "LULUS" | "REMEDIAL" | "REMIDIAL" | "BELUM_DINILAI";
}

export interface BeritaAcaraResmiData {
  namaSekolah: string;
  npsn: string;
  alamatSekolah: string;
  namaUjian: string;
  kodeUjian: string;
  mataPelajaran: string;
  kelas: string;
  jurusan: string;
  ruang: string;
  hariTanggal: string;
  waktuMulai: string;
  waktuSelesai: string;
  daftarPeserta: PesertaBeritaAcaraItem[];
  catatanKhusus?: string;
  namaPengawas: string;
  nipPengawas: string;
  namaKepsek: string;
  nipKepsek: string;
}

export async function generateBeritaAcaraResmiPdf(data: BeritaAcaraResmiData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // A4 dimensions: 595.28 x 841.89 points
  const pageWidth = 595.28;
  const pageHeight = 841.89;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - 45;

  // Function to draw official Kop Surat
  const drawKopSurat = async () => {
    let textX = 50;

    try {
      const logoPath = path.join(process.cwd(), "public", "logo.jpg");
      if (fs.existsSync(logoPath)) {
        const logoBytes = fs.readFileSync(logoPath);
        const logoImage = await pdfDoc.embedJpg(logoBytes);
        page.drawImage(logoImage, {
          x: 50,
          y: y - 50,
          width: 52,
          height: 52,
        });
        textX = 112;
      }
    } catch (e) {
      console.warn("Logo embed error in Berita Acara:", e);
    }

    page.drawText("PEMERINTAH DAERAH PROVINSI BANTEN", {
      x: textX,
      y,
      size: 9.5,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 13;
    page.drawText("DINAS PENDIDIKAN DAN KEBUDAYAAN", {
      x: textX,
      y,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 15;
    page.drawText(data.namaSekolah.toUpperCase(), {
      x: textX,
      y,
      size: 13,
      font: fontBold,
      color: rgb(0.12, 0.23, 0.54), // SMK Navy
    });
    y -= 13;
    page.drawText(`NPSN: ${data.npsn} • ${data.alamatSekolah}`, {
      x: textX,
      y,
      size: 8,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });
    y -= 16;

    // Kop lines
    page.drawLine({ start: { x: 50, y }, end: { x: pageWidth - 50, y }, thickness: 2, color: rgb(0, 0, 0) });
    y -= 3;
    page.drawLine({ start: { x: 50, y }, end: { x: pageWidth - 50, y }, thickness: 0.5, color: rgb(0, 0, 0) });
    y -= 20;
  };

  await drawKopSurat();

  // Document Title
  page.drawText("BERITA ACARA PELAKSANAAN ASESMEN / E-UJIAN", {
    x: 130,
    y,
    size: 12,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  y -= 14;
  page.drawText("PENILAIAN AKHIR SEMESTER & ASESMEN KOMPETENSI KEJURUAN", {
    x: 110,
    y,
    size: 9.5,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.2),
  });
  y -= 20;

  // Intro paragraph
  const textIntro = `Pada hari ini, ${data.hariTanggal}, telah diselenggarakan Penilaian Asesmen Berbasis Komputer`;
  page.drawText(textIntro, { x: 50, y, size: 9, font: fontRegular });
  y -= 13;
  page.drawText("secara daring dengan pengawasan ketat Anti-Cheat & Webcam AI Proctoring, dengan rincian:", {
    x: 50,
    y,
    size: 9,
    font: fontRegular,
  });
  y -= 18;

  // Metadata Grid
  const metaRows = [
    ["1. Nama Ujian", `: ${data.namaUjian} (${data.kodeUjian})`],
    ["2. Mata Pelajaran", `: ${data.mataPelajaran}`],
    ["3. Kelas / Jurusan", `: ${data.kelas} (${data.jurusan})`],
    ["4. Ruang / Server", `: ${data.ruang}`],
    ["5. Waktu Pelaksanaan", `: Pukul ${data.waktuMulai} s.d. ${data.waktuSelesai} WIB`],
  ];

  metaRows.forEach(([lbl, val]) => {
    page.drawText(lbl, { x: 55, y, size: 8.5, font: fontRegular });
    page.drawText(val, { x: 190, y, size: 8.5, font: fontBold });
    y -= 14;
  });

  const totalTerdaftar = data.daftarPeserta.length;
  const totalHadir = data.daftarPeserta.filter((p) => p.status === "SEDANG_MENGERJAKAN" || p.status === "SELESAI").length;
  const totalDiskualifikasi = data.daftarPeserta.filter((p) => p.status === "DIDISKUALIFIKASI").length;
  const totalTidakHadir = totalTerdaftar - totalHadir - totalDiskualifikasi;

  const rekapRows = [
    ["6. Jumlah Terdaftar", `: ${totalTerdaftar} Siswa`],
    ["7. Jumlah Hadir", `: ${totalHadir} Siswa`],
    ["8. Jumlah Diskualifikasi", `: ${totalDiskualifikasi} Siswa`],
    ["9. Jumlah Tidak Hadir", `: ${totalTidakHadir} Siswa`],
  ];

  rekapRows.forEach(([lbl, val]) => {
    page.drawText(lbl, { x: 55, y, size: 8.5, font: fontRegular });
    page.drawText(val, { x: 190, y, size: 8.5, font: fontBold });
    y -= 14;
  });

  y -= 8;

  // Student Attendance & Results Table Header
  page.drawText("Daftar Siswa Peserta Ujian, Hasil & Catatan Integritas Anti-Cheat:", {
    x: 50,
    y,
    size: 9,
    font: fontBold,
  });
  y -= 15;

  const tableHeaders = [
    { title: "No", x: 50, w: 22 },
    { title: "NISN", x: 72, w: 68 },
    { title: "Nama Lengkap Siswa", x: 140, w: 145 },
    { title: "Status", x: 285, w: 60 },
    { title: "Pelanggaran", x: 345, w: 55 },
    { title: "Nilai PG", x: 400, w: 42 },
    { title: "Essay", x: 442, w: 38 },
    { title: "Akhir", x: 480, w: 35 },
    { title: "Ket", x: 515, w: 30 },
  ];

  // Draw header row box
  page.drawRectangle({
    x: 50,
    y: y - 14,
    width: pageWidth - 100,
    height: 18,
    color: rgb(0.12, 0.23, 0.54), // Navy
  });

  tableHeaders.forEach((col) => {
    page.drawText(col.title, {
      x: col.x + 3,
      y: y - 10,
      size: 7.5,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
  });

  y -= 22;

  // Draw table rows
  data.daftarPeserta.forEach((p, idx) => {
    // If running out of vertical space, add new page!
    if (y < 160) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - 50;

      // Repeat table header on next page
      page.drawRectangle({
        x: 50,
        y: y - 14,
        width: pageWidth - 100,
        height: 18,
        color: rgb(0.12, 0.23, 0.54),
      });
      tableHeaders.forEach((col) => {
        page.drawText(col.title, {
          x: col.x + 3,
          y: y - 10,
          size: 7.5,
          font: fontBold,
          color: rgb(1, 1, 1),
        });
      });
      y -= 22;
    }

    // Alternating background
    if (idx % 2 === 1) {
      page.drawRectangle({
        x: 50,
        y: y - 10,
        width: pageWidth - 100,
        height: 14,
        color: rgb(0.96, 0.97, 0.99),
      });
    }

    page.drawText(String(idx + 1), { x: 53, y: y - 6, size: 7.5, font: fontRegular });
    page.drawText(p.nisn, { x: 75, y: y - 6, size: 7.5, font: fontRegular });
    page.drawText(p.nama.length > 25 ? p.nama.substring(0, 25) + "..." : p.nama, {
      x: 143,
      y: y - 6,
      size: 7.5,
      font: fontBold,
    });
    page.drawText(p.status === "SELESAI" ? "Hadir/Selesai" : p.status === "DIDISKUALIFIKASI" ? "Diskualifikasi" : "Hadir", {
      x: 287,
      y: y - 6,
      size: 7,
      font: fontRegular,
      color: p.status === "DIDISKUALIFIKASI" ? rgb(0.8, 0, 0) : rgb(0, 0, 0),
    });
    page.drawText(p.jumlahPelanggaran > 0 ? `${p.jumlahPelanggaran} Kali` : "0 (Bersih)", {
      x: 348,
      y: y - 6,
      size: 7,
      font: fontRegular,
      color: p.jumlahPelanggaran > 0 ? rgb(0.8, 0.2, 0) : rgb(0.1, 0.5, 0.2),
    });
    page.drawText(String(p.nilaiPG), { x: 408, y: y - 6, size: 7.5, font: fontRegular });
    page.drawText(String(p.nilaiEssay), { x: 448, y: y - 6, size: 7.5, font: fontRegular });
    page.drawText(String(p.totalNilai), { x: 485, y: y - 6, size: 7.5, font: fontBold });
    page.drawText(p.statusKelulusan === "LULUS" ? "L" : "R", {
      x: 520,
      y: y - 6,
      size: 7.5,
      font: fontBold,
      color: p.statusKelulusan === "LULUS" ? rgb(0.1, 0.5, 0.2) : rgb(0.8, 0, 0),
    });

    y -= 14;
  });

  y -= 10;

  // Catatan Khusus & Kejadian
  if (y < 140) {
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    y = pageHeight - 50;
  }

  page.drawText("Catatan Kejadian Khusus & Insiden Selama Pelaksanaan:", {
    x: 50,
    y,
    size: 8.5,
    font: fontBold,
  });
  y -= 14;

  const notesY = y - 35;
  page.drawRectangle({
    x: 50,
    y: notesY,
    width: pageWidth - 100,
    height: 35,
    borderColor: rgb(0.7, 0.7, 0.7),
    borderWidth: 0.5,
    color: rgb(0.98, 0.99, 1),
  });

  const notes = data.catatanKhusus || "Pelaksanaan asesmen berlangsung aman, tertib, dan lancar. Seluruh data log anti-cheat tercatat otomatis pada server CBT.";
  page.drawText(notes, {
    x: 56,
    y: y - 14,
    size: 8,
    font: fontRegular,
    color: rgb(0.1, 0.1, 0.1),
  });

  y = notesY - 25;

  // Signatures
  page.drawText(`Kota Bandung, ${data.hariTanggal.split(",")[1]?.trim() || "19 Oktober 2026"}`, {
    x: 370,
    y,
    size: 8.5,
    font: fontRegular,
  });
  y -= 14;

  page.drawText("Mengetahui,", { x: 60, y, size: 8.5, font: fontRegular });
  page.drawText("Guru Pengampu / Pengawas,", { x: 370, y, size: 8.5, font: fontRegular });
  y -= 12;
  page.drawText("Kepala Sekolah,", { x: 60, y, size: 8.5, font: fontRegular });

  y -= 45; // Space for signature

  page.drawText(data.namaKepsek, { x: 60, y, size: 9, font: fontBold });
  page.drawText(data.namaPengawas, { x: 370, y, size: 9, font: fontBold });
  y -= 11;
  page.drawText(`NIP. ${data.nipKepsek}`, { x: 60, y, size: 8, font: fontRegular });
  page.drawText(`NIP. ${data.nipPengawas}`, { x: 370, y, size: 8, font: fontRegular });

  return pdfDoc.save();
}

export interface KartuUjianPdfData {
  namaSekolah: string;
  nomorPeserta: string;
  nisn: string;
  namaSiswa: string;
  kelas: string;
  jurusan: string;
  ruang: string;
  sesi: string;
  tahunAjaran: string;
}

export async function generateKartuUjianPdf(data: KartuUjianPdfData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([420, 297]);
  const { width, height } = page.getSize();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Outer border
  page.drawRectangle({
    x: 15,
    y: 15,
    width: width - 30,
    height: height - 30,
    borderColor: rgb(0.12, 0.23, 0.54),
    borderWidth: 2,
    color: rgb(1, 1, 1),
  });

  // Header Banner
  page.drawRectangle({
    x: 16,
    y: height - 60,
    width: width - 32,
    height: 44,
    color: rgb(0.12, 0.23, 0.54),
  });

  let bannerTextX = 25;
  try {
    const logoPath = path.join(process.cwd(), "public", "logo.jpg");
    if (fs.existsSync(logoPath)) {
      const logoBytes = fs.readFileSync(logoPath);
      const logoImage = await pdfDoc.embedJpg(logoBytes);
      page.drawImage(logoImage, {
        x: 22,
        y: height - 56,
        width: 36,
        height: 36,
      });
      bannerTextX = 66;
    }
  } catch (e) {
    console.warn("Logo embed error in kartu:", e);
  }

  page.drawText(data.namaSekolah.toUpperCase(), {
    x: bannerTextX,
    y: height - 36,
    size: 11,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText(`KARTU PESERTA E-UJIAN SMK - TA ${data.tahunAjaran}`, {
    x: bannerTextX,
    y: height - 50,
    size: 9,
    font: fontRegular,
    color: rgb(0.9, 0.9, 0.9),
  });

  let y = height - 85;

  // Photo Box
  page.drawRectangle({
    x: 30,
    y: y - 95,
    width: 75,
    height: 95,
    borderColor: rgb(0.7, 0.7, 0.7),
    borderWidth: 1,
    color: rgb(0.95, 0.95, 0.95),
  });
  page.drawText("FOTO 3x4", {
    x: 45,
    y: y - 50,
    size: 9,
    font: fontRegular,
    color: rgb(0.5, 0.5, 0.5),
  });

  // Student Details
  const startX = 120;
  const details = [
    ["No. Peserta", `: ${data.nomorPeserta}`],
    ["NISN", `: ${data.nisn}`],
    ["Nama Lengkap", `: ${data.namaSiswa}`],
    ["Tingkat / Kelas", `: ${data.kelas}`],
    ["Kompetensi Keahlian", `: ${data.jurusan}`],
    ["Ruang / Sesi", `: ${data.ruang} / Sesi ${data.sesi}`],
  ];

  details.forEach(([lbl, val]) => {
    page.drawText(lbl, { x: startX, y, size: 9, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });
    page.drawText(val, { x: startX + 105, y, size: 9, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
    y -= 16;
  });

  // Warning text footer
  page.drawRectangle({
    x: 25,
    y: 25,
    width: width - 50,
    height: 38,
    color: rgb(0.95, 0.96, 0.98),
  });

  page.drawText("Ketentuan Ujian: Wajib membawa kartu ini, webcam aktif, dan mengaktifkan mode Fullscreen.", {
    x: 32,
    y: 47,
    size: 7.5,
    font: fontBold,
    color: rgb(0.7, 0.1, 0.1),
  });
  page.drawText("Segala bentuk kecurangan dicatat otomatis oleh sistem anti-cheat dan dapat berakibat diskualifikasi.", {
    x: 32,
    y: 33,
    size: 7,
    font: fontRegular,
    color: rgb(0.4, 0.4, 0.4),
  });

  return pdfDoc.save();
}
