import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { loadStore } from "@/lib/data-store";
import { selesaikanUjianManual } from "@/lib/services";

const SelesaiSchema = z.object({
  pesertaId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Akses tidak sah: Silakan login terlebih dahulu" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = SelesaiSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, message: "ID Peserta tidak valid" }, { status: 400 });
    }

    const { pesertaId } = parsed.data;
    const store = loadStore();
    const peserta = store.pesertaUjian.find((p) => p.id === pesertaId);

    if (!peserta) {
      return NextResponse.json({ success: false, message: "Data peserta ujian tidak ditemukan" }, { status: 404 });
    }

    // Authorization: Siswa can only submit their own exam
    if (user.role === "SISWA" && peserta.siswaId !== user.id) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak: Anda tidak memiliki izin menyelesaikan sesi ujian siswa lain" },
        { status: 403 }
      );
    }

    // Idempotency: If already submitted or disqualified, return existing state safely
    if (peserta.status === "SELESAI" || peserta.status === "DIDISKUALIFIKASI") {
      return NextResponse.json({
        success: true,
        peserta,
        message: "Ujian telah selesai sebelumnya.",
      });
    }

    const updatedPeserta = selesaikanUjianManual(pesertaId);

    return NextResponse.json({
      success: true,
      peserta: updatedPeserta,
      message: "Ujian berhasil diselesaikan dan dikirim.",
    });
  } catch (error) {
    console.error("Selesai Ujian Error:", error);
    return NextResponse.json({ success: false, message: "Gagal menyelesaikan ujian" }, { status: 500 });
  }
}
