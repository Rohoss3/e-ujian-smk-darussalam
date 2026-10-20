import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { loadStore } from "@/lib/data-store";
import { exportRekapKelasExcel } from "@/lib/excel";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role === "SISWA") {
      return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const ujianId = searchParams.get("ujianId");

    const store = loadStore();
    const ujian = store.ujian.find((u) => u.id === ujianId) || store.ujian[0];

    if (!ujian) {
      return NextResponse.json({ success: false, message: "Ujian tidak ditemukan" }, { status: 404 });
    }

    const mapel = store.mataPelajaran.find((m) => m.id === ujian.mataPelajaranId);
    const guru = store.users.find((u) => u.id === ujian.guruId);
    const pesertaList = store.pesertaUjian.filter((p) => p.ujianId === ujian.id);
    const soalList = store.soal.filter((s) => s.bankSoalId === ujian.bankSoalId);

    const pesertaIds = new Set(pesertaList.map((p) => p.id));
    const jawabanList = store.jawabanSiswa.filter((j) => pesertaIds.has(j.pesertaUjianId));

    const enrichedPeserta = pesertaList.map((p) => {
      const siswa = store.users.find((u) => u.id === p.siswaId);
      const kelas = store.kelas.find((k) => k.id === siswa?.kelasId)?.nama || "XI RPL 1";
      return {
        nisn: siswa?.nisn || siswa?.username || "-",
        nama: siswa?.name || "Nama Siswa",
        kelas,
        nilaiPG: p.nilaiPG,
        nilaiEssay: p.nilaiEssay,
        totalNilai: p.totalNilai,
        statusKelulusan: p.statusKelulusan,
        jumlahPelanggaran: p.jumlahPelanggaran,
      };
    });

    const uint8 = await exportRekapKelasExcel(
      {
        namaSekolah: store.sekolah.nama,
        judulUjian: ujian.judul,
        mataPelajaran: mapel?.nama || "Pemrograman Web & Bergerak",
        kelas: "XI RPL 1",
        jurusan: "Rekayasa Perangkat Lunak",
        kkm: mapel?.kkm || 75,
        guruPengampu: guru?.name || "Budi Santoso, S.Kom., M.T.",
      },
      enrichedPeserta,
      soalList,
      jawabanList
    );

    return new Response(uint8 as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Rekap_Kelas_Analisis_${ujian.kodeUjian}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Export Rekap Kelas Error:", error);
    return NextResponse.json({ success: false, message: "Gagal mengekspor rekap kelas" }, { status: 500 });
  }
}
