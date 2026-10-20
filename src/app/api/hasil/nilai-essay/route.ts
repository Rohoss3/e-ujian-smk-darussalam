import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { loadStore, saveStore } from "@/lib/data-store";

const EssayScoreSchema = z.object({
  pesertaId: z.string().min(1),
  nilaiEssay: z.number().min(0).max(100),
  feedback: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role === "SISWA" || user.role === "PENGAWAS") {
      return NextResponse.json({ success: false, message: "Akses ditolak: Hanya Guru & Admin yang berhak menilai." }, { status: 403 });
    }

    const body = await req.json();
    const parsed = EssayScoreSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, message: "Format nilai essay tidak valid" }, { status: 400 });
    }

    const { pesertaId, nilaiEssay, feedback } = parsed.data;

    const store = loadStore();
    const peserta = store.pesertaUjian.find((p) => p.id === pesertaId);

    if (!peserta) {
      return NextResponse.json({ success: false, message: "Peserta tidak ditemukan" }, { status: 404 });
    }

    const ujian = store.ujian.find((u) => u.id === peserta.ujianId);
    const mapel = store.mataPelajaran.find((m) => m.id === ujian?.mataPelajaranId);
    const kkm = ujian?.kkm ?? mapel?.kkm ?? 75;

    peserta.nilaiEssay = nilaiEssay;
    peserta.totalNilai = peserta.nilaiPG + nilaiEssay;
    peserta.statusKelulusan = peserta.totalNilai >= kkm ? "LULUS" : "REMEDIAL";

    if (ujian?.isRemedial) {
      peserta.nilaiRemedial = peserta.totalNilai;
      if (ujian.ujianAsliId) {
        const originalSession = store.pesertaUjian.find(
          (p) => p.ujianId === ujian.ujianAsliId && p.siswaId === peserta.siswaId
        );
        if (originalSession) {
          originalSession.nilaiRemedial = peserta.totalNilai;
        }
      }
    }

    // Update feedback on the essay answer record
    const essayJawaban = store.jawabanSiswa.find(
      (j) => j.pesertaUjianId === pesertaId && j.jawabanEssay
    );
    if (essayJawaban) {
      essayJawaban.nilaiDidapat = nilaiEssay;
      essayJawaban.feedbackEssay = feedback;
    }

    saveStore(store);

    return NextResponse.json({
      success: true,
      message: "Nilai essay dan kelulusan berhasil diperbarui",
      peserta,
    });
  } catch (error) {
    console.error("Nilai Essay API Error:", error);
    return NextResponse.json({ success: false, message: "Gagal menyimpan nilai essay" }, { status: 500 });
  }
}
