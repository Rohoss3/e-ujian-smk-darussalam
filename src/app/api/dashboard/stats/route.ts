import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { loadStore } from "@/lib/data-store";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Belum terautentikasi" }, { status: 401 });
    }

    const store = loadStore();

    // Single-pass user counts
    let totalSiswa = 0;
    let totalGuru = 0;
    for (let i = 0; i < store.users.length; i++) {
      const role = store.users[i].role;
      if (role === "SISWA") totalSiswa++;
      else if (role === "GURU") totalGuru++;
    }

    const totalBankSoal = store.bankSoal.length;
    const totalSoal = store.soal.length;
    const totalUjian = store.ujian.length;

    // Single-pass exam counts
    let activeUjian = 0;
    const examMap = new Map();
    for (let i = 0; i < store.ujian.length; i++) {
      const u = store.ujian[i];
      if (u.status === "AKTIF") activeUjian++;
      examMap.set(u.id, u);
    }

    // Student specific stats
    let userStats = null;
    let remedialObligations: any[] = [];
    if (user.role === "SISWA") {
      let myExams = 0;
      let completedExams = 0;
      let scoreSum = 0;
      let totalViolations = 0;

      for (let i = 0; i < store.pesertaUjian.length; i++) {
        const p = store.pesertaUjian[i];
        if (p.siswaId !== user.id) continue;
        myExams++;
        totalViolations += p.jumlahPelanggaran || 0;
        if (p.status === "SELESAI") {
          completedExams++;
          scoreSum += p.totalNilai || 0;
        }
        if (p.statusKelulusan === "REMEDIAL") {
          const exam = examMap.get(p.ujianId);
          const remedialExam = store.ujian.find(
            (ru) => ru.isRemedial && ru.ujianAsliId === exam?.id
          );
          const kkm = exam?.kkm || 75;
          remedialObligations.push({
            ujianId: p.ujianId,
            judulUjian: exam?.judul || "Ujian",
            totalNilai: p.totalNilai,
            kkm,
            pesanWajib: `Nilai Anda pada ujian ${exam?.judul || "Ujian"} adalah ${p.totalNilai}. KKM yang ditetapkan adalah ${kkm}. Anda wajib mengikuti remedial.`,
            remedialUjianId: remedialExam?.id || null,
            remedialJudul: remedialExam?.judul || null,
            remedialToken: remedialExam?.tokenUjian || null,
            nilaiRemedial: p.nilaiRemedial || null,
          });
        }
      }

      const avgScore = completedExams > 0 ? Math.round(scoreSum / completedExams) : 0;
      userStats = {
        myExams,
        completedExams,
        avgScore,
        totalViolations,
        remedialObligations,
      };
    }

    let proctorStats = null;
    if (user.role === "PENGAWAS") {
      const assignedExams = store.ujian.filter(
        (u) => u.pengawasId === user.id || (u.pengawasIds && u.pengawasIds.includes(user.id))
      );
      const assignedIds = new Set(assignedExams.map((u) => u.id));
      const activeAssigned = assignedExams.filter((u) => u.status === "AKTIF").length;

      let totalPeserta = 0;
      let activePesertaCount = 0;
      let finishedPesertaCount = 0;
      let waitingPesertaCount = 0;
      let disqualifiedCount = 0;
      let totalViolations = 0;

      for (let i = 0; i < store.pesertaUjian.length; i++) {
        const p = store.pesertaUjian[i];
        if (!assignedIds.has(p.ujianId)) continue;
        totalPeserta++;
        totalViolations += p.jumlahPelanggaran || 0;
        if (p.status === "SEDANG_MENGERJAKAN") activePesertaCount++;
        else if (p.status === "SELESAI") finishedPesertaCount++;
        else if (p.status === "BELUM_MULAI") waitingPesertaCount++;
        else if (p.status === "DIDISKUALIFIKASI") disqualifiedCount++;
      }

      proctorStats = {
        totalAssignedExams: assignedExams.length,
        activeAssignedExams: activeAssigned,
        totalPeserta,
        activePesertaCount,
        finishedPesertaCount,
        waitingPesertaCount,
        disqualifiedCount,
        totalViolations,
      };
    }

    // Single-pass peserta counts
    const totalPesertaAll = store.pesertaUjian.length;
    let totalLulus = 0;
    let totalRemedial = 0;
    for (let i = 0; i < store.pesertaUjian.length; i++) {
      const status = store.pesertaUjian[i].statusKelulusan;
      if (status === "LULUS") totalLulus++;
      else if (status === "REMEDIAL") totalRemedial++;
    }

    return NextResponse.json(
      {
        success: true,
        stats: {
          totalSiswa,
          totalGuru,
          totalBankSoal,
          totalSoal,
          totalUjian,
          activeUjian,
          totalPesertaAll,
          totalLulus,
          totalRemedial,
          sekolahNama: store.sekolah.nama,
          userStats,
          proctorStats,
        },
      },
      {
        headers: {
          "Cache-Control": "private, max-age=3, stale-while-revalidate=5",
        },
      }
    );
  } catch (error) {
    console.error("GET Dashboard Stats Error:", error);
    return NextResponse.json({ success: false, message: "Gagal memuat statistik" }, { status: 500 });
  }
}
