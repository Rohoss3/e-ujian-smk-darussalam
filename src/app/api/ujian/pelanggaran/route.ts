import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { loadStore } from "@/lib/data-store";
import { catatPelanggaranAntiCheat } from "@/lib/services";
import { JenisPelanggaran } from "@/types";

const PelanggaranSchema = z.object({
  pesertaId: z.string().min(1),
  jenis: z.string().min(1),
  deskripsi: z.string().min(1),
  snapshotFoto: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Akses tidak sah: Silakan login terlebih dahulu" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = PelanggaranSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, message: "Data pelanggaran tidak valid" }, { status: 400 });
    }

    const { pesertaId, jenis, deskripsi, snapshotFoto } = parsed.data;

    const store = loadStore();
    const peserta = store.pesertaUjian.find((p) => p.id === pesertaId);

    if (!peserta) {
      return NextResponse.json({ success: false, message: "Peserta tidak ditemukan" }, { status: 404 });
    }

    // IDOR Protection: Siswa can only report violations for their own session
    if (user.role === "SISWA" && peserta.siswaId !== user.id) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak: Anda tidak memiliki wewenang melaporkan pelanggaran untuk peserta lain." },
        { status: 403 }
      );
    }

    if (peserta.status !== "SEDANG_MENGERJAKAN") {
      return NextResponse.json(
        { success: false, message: "Sesi ujian telah berakhir atau peserta telah didiskualifikasi." },
        { status: 400 }
      );
    }

    const result = catatPelanggaranAntiCheat(
      pesertaId,
      jenis as JenisPelanggaran,
      deskripsi,
      snapshotFoto
    );

    return NextResponse.json({
      success: true,
      jumlahPelanggaran: result.jumlahPelanggaran,
      maxPelanggaran: result.maxPelanggaran,
      isDisqualified: result.isDisqualified,
      isAutoSubmitted: result.isAutoSubmitted,
    });
  } catch (error) {
    console.error("Pelanggaran API Error:", error);
    return NextResponse.json({ success: false, message: "Gagal mencatat pelanggaran" }, { status: 500 });
  }
}
