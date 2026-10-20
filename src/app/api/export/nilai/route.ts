import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getCurrentUser } from "@/lib/auth";
import { loadStore } from "@/lib/data-store";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role === "SISWA") {
      return NextResponse.json({ success: false, message: "Akses ditolak: Siswa tidak diizinkan mengekspor rekap nilai." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const ujianId = searchParams.get("ujianId");

    if (!ujianId) {
      return NextResponse.json({ success: false, message: "ID Ujian wajib disertakan." }, { status: 400 });
    }

    const store = loadStore();
    const ujian = store.ujian.find((u) => u.id === ujianId);

    if (!ujian) {
      return NextResponse.json({ success: false, message: "Data ujian tidak ditemukan." }, { status: 404 });
    }

    // Role check: GURU can only export their own exams, PENGAWAS their assigned exams, ADMIN can export all
    if (user.role === "GURU" && ujian.guruId !== user.id) {
      return NextResponse.json({ success: false, message: "Akses ditolak: Guru hanya dapat mengekspor rekap nilai ujian miliknya." }, { status: 403 });
    }
    if (user.role === "PENGAWAS" && ujian.pengawasId !== user.id) {
      return NextResponse.json({ success: false, message: "Akses ditolak: Pengawas hanya dapat mengekspor rekap nilai ujian yang ditugaskan." }, { status: 403 });
    }

    const mapel = store.mataPelajaran.find((m) => m.id === ujian.mataPelajaranId);
    const pesertaList = store.pesertaUjian.filter((p) => p.ujianId === ujian.id);

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet("Nilai Ujian Siswa");

    // Title
    ws.mergeCells("A1:H1");
    const t = ws.getCell("A1");
    t.value = `DAFTAR NILAI UJIAN - ${ujian.judul.toUpperCase()}`;
    t.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    t.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
    t.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(1).height = 34;

    const meta = [
      ["Mata Pelajaran", `: ${mapel?.nama || "Umum"}`, "Kode Ujian", `: ${ujian.kodeUjian}`],
      ["Standar KKM", `: ${mapel?.kkm || 75}`, "Total Peserta", `: ${pesertaList.length} Siswa`],
    ];
    meta.forEach((m) => {
      const r = ws.addRow(m);
      r.font = { name: "Arial", size: 10, bold: true };
      r.height = 20;
    });
    ws.addRow([]);

    // Headers exact requested: NISN, Nama, Kelas, Nilai PG, Nilai Essay, Nilai Akhir, Status Lulus, Jumlah Pelanggaran
    const headers = [
      "NISN",
      "Nama Siswa",
      "Kelas",
      "Nilai PG",
      "Nilai Essay",
      "Nilai Akhir",
      "Status Lulus",
      "Jumlah Pelanggaran",
    ];

    const hRow = ws.addRow(headers);
    hRow.height = 26;
    hRow.eachCell((cell) => {
      cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    });

    pesertaList.forEach((p) => {
      const siswa = store.users.find((u) => u.id === p.siswaId);
      const kelas = store.kelas.find((k) => k.id === siswa?.kelasId)?.nama || "XI RPL 1";

      const row = ws.addRow([
        siswa?.nisn || siswa?.username || "-",
        siswa?.name || "Nama Siswa",
        kelas,
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
        cell.alignment = { vertical: "middle", horizontal: [1, 3, 4, 5, 6, 7, 8].includes(colNumber) ? "center" : "left" };
        if (colNumber === 7) {
          cell.font = { name: "Arial", size: 10, bold: true, color: { argb: p.statusKelulusan === "LULUS" ? "FF16A34A" : "FFDC2626" } };
        }
      });
    });

    ws.columns = [
      { width: 18 },
      { width: 34 },
      { width: 16 },
      { width: 14 },
      { width: 14 },
      { width: 14 },
      { width: 18 },
      { width: 22 },
    ];

    const buf = await workbook.xlsx.writeBuffer();
    return new Response(new Uint8Array(buf as ArrayBuffer) as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Nilai_${ujian.kodeUjian}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Export Nilai Error:", error);
    return NextResponse.json({ success: false, message: "Gagal mengekspor nilai" }, { status: 500 });
  }
}
