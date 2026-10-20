import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { loadStore } from "@/lib/data-store";
import { exportLogPelanggaranExcel } from "@/lib/excel";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role === "SISWA") {
      return NextResponse.json({ success: false, message: "Akses ditolak: Siswa tidak diizinkan mengekspor log pelanggaran." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const ujianId = searchParams.get("ujianId");

    if (!ujianId) {
      return NextResponse.json({ success: false, message: "ID Ujian wajib disertakan." }, { status: 400 });
    }

    const store = loadStore();
    const ujian = store.ujian.find((u) => u.id === ujianId);

    if (!ujian) {
      return NextResponse.json({ success: false, message: "Ujian tidak ditemukan." }, { status: 404 });
    }

    // Role check: GURU can only export their own exams, PENGAWAS their assigned exams, ADMIN can export all
    if (user.role === "GURU" && ujian.guruId !== user.id) {
      return NextResponse.json({ success: false, message: "Akses ditolak: Guru hanya dapat mengekspor log pelanggaran ujian miliknya." }, { status: 403 });
    }
    if (user.role === "PENGAWAS" && ujian.pengawasId !== user.id) {
      return NextResponse.json({ success: false, message: "Akses ditolak: Pengawas hanya dapat mengekspor log pelanggaran ujian yang ditugaskan." }, { status: 403 });
    }

    const pesertaList = store.pesertaUjian.filter((p) => p.ujianId === ujian.id);
    const pesertaIds = new Set(pesertaList.map((p) => p.id));
    const matchingLogs = store.logPelanggaran.filter((l) => pesertaIds.has(l.pesertaUjianId));

    const enrichedLogs = matchingLogs.map((l) => {
      const peserta = pesertaList.find((p) => p.id === l.pesertaUjianId);
      const siswa = store.users.find((u) => u.id === peserta?.siswaId);
      const kelas = store.kelas.find((k) => k.id === siswa?.kelasId)?.nama || "XI RPL 1";
      return {
        timestamp: l.timestamp,
        nisn: siswa?.nisn || siswa?.username || "-",
        namaSiswa: siswa?.name || "Nama Siswa",
        kelas,
        jenisPelanggaran: l.jenisPelanggaran,
        deskripsi: l.deskripsi,
      };
    });

    const uint8 = await exportLogPelanggaranExcel(ujian.judul, enrichedLogs);

    return new Response(uint8 as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Log_Pelanggaran_${ujian.kodeUjian}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Export Pelanggaran Error:", error);
    return NextResponse.json({ success: false, message: "Gagal mengekspor log pelanggaran" }, { status: 500 });
  }
}
