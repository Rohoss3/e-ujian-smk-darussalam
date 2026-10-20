import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { loadStore } from "@/lib/data-store";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Akses tidak sah" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const ujianId = searchParams.get("ujianId");

    const store = loadStore();
    const ujian = store.ujian.find((u) => u.id === ujianId) || store.ujian[0];

    if (!ujian) {
      return NextResponse.json({ success: false, message: "Ujian tidak ditemukan" }, { status: 404 });
    }

    const mapel = store.mataPelajaran.find((m) => m.id === ujian.mataPelajaranId);
    const kkm = ujian.kkm ?? mapel?.kkm ?? 75;

    // Check if this exam has an associated remedial exam
    const existingRemedialExam = store.ujian.find(
      (ru) => ru.isRemedial && ru.ujianAsliId === ujian.id
    );

    // If Siswa, return their own specific result and list of their exams
    if (user.role === "SISWA") {
      const peserta = store.pesertaUjian.find((p) => p.ujianId === ujian.id && p.siswaId === user.id);
      const mySessions = store.pesertaUjian.filter((p) => p.siswaId === user.id && (p.status === "SELESAI" || p.status === "DIDISKUALIFIKASI"));
      const myExams = mySessions.map((s) => {
        const u = store.ujian.find((uj) => uj.id === s.ujianId);
        return {
          id: s.ujianId,
          judul: u?.judul || "Ujian",
          statusKelulusan: s.statusKelulusan,
          totalNilai: s.totalNilai,
          kkm: u?.kkm || 75,
        };
      });

      const pesanWajib = peserta && peserta.statusKelulusan === "REMEDIAL"
        ? `Nilai Anda pada ujian ${ujian.judul} adalah ${peserta.totalNilai}. KKM yang ditetapkan adalah ${kkm}. Anda wajib mengikuti remedial.`
        : null;

      return NextResponse.json({
        success: true,
        ujianId: ujian.id,
        ujianJudul: ujian.judul,
        mapelNama: mapel?.nama || "Umum",
        kkm,
        isRemedial: !!ujian.isRemedial,
        ujianAsliId: ujian.ujianAsliId || null,
        remedialExam: existingRemedialExam
          ? {
              id: existingRemedialExam.id,
              judul: existingRemedialExam.judul,
              tokenUjian: existingRemedialExam.tokenUjian,
              status: existingRemedialExam.status,
            }
          : null,
        pesanWajib,
        myExams,
        siswaResult: peserta || {
          totalNilai: 0,
          nilaiPG: 0,
          nilaiEssay: 0,
          statusKelulusan: "BELUM_DINILAI",
          jumlahPelanggaran: 0,
          nilaiRemedial: null,
        },
      });
    }

    // If Guru or Admin, return full recap
    const pesertaList = store.pesertaUjian.filter((p) => p.ujianId === ujian.id);
    const rekapList = pesertaList.map((p) => {
      const siswa = store.users.find((u) => u.id === p.siswaId);
      const kelas = store.kelas.find((k) => k.id === siswa?.kelasId)?.nama || "XI RPL 1";
      const answers = store.jawabanSiswa.filter((j) => j.pesertaUjianId === p.id && j.jawabanEssay);
      const essayAnswer = answers[0];

      return {
        pesertaId: p.id,
        siswaId: p.siswaId,
        nisn: siswa?.nisn || siswa?.username,
        nama: siswa?.name || "Siswa",
        kelas,
        nilaiPG: p.nilaiPG,
        nilaiEssay: p.nilaiEssay,
        totalNilai: p.totalNilai,
        statusKelulusan: p.statusKelulusan,
        nilaiRemedial: p.nilaiRemedial || null,
        jumlahPelanggaran: p.jumlahPelanggaran,
        status: p.status,
        feedbackEssay: essayAnswer?.feedbackEssay,
      };
    });

    const totalLulus = rekapList.filter((r) => r.statusKelulusan === "LULUS").length;
    const totalRemedial = rekapList.filter((r) => r.statusKelulusan === "REMEDIAL").length;
    const totalBelumDinilai = rekapList.filter((r) => r.statusKelulusan === "BELUM_DINILAI").length;

    const allExams = store.ujian.map((u) => ({
      id: u.id,
      judul: u.judul,
      kkm: u.kkm || 75,
      isRemedial: !!u.isRemedial,
      status: u.status,
    }));

    return NextResponse.json({
      success: true,
      ujianId: ujian.id,
      ujianJudul: ujian.judul,
      kelasTarget: ujian.kelasTarget,
      mapelNama: mapel?.nama || "Umum",
      kkm,
      isRemedial: !!ujian.isRemedial,
      ujianAsliId: ujian.ujianAsliId || null,
      remedialExam: existingRemedialExam
        ? {
            id: existingRemedialExam.id,
            judul: existingRemedialExam.judul,
            tokenUjian: existingRemedialExam.tokenUjian,
          }
        : null,
      stats: {
        totalPeserta: rekapList.length,
        totalLulus,
        totalRemedial,
        totalBelumDinilai,
        persenLulus: rekapList.length > 0 ? Math.round((totalLulus / rekapList.length) * 100) : 0,
      },
      allExams,
      rekapList,
    });
  } catch (error) {
    console.error("GET Hasil Error:", error);
    return NextResponse.json({ success: false, message: "Gagal memuat hasil" }, { status: 500 });
  }
}
