import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { loadStore } from "@/lib/data-store";
import { simpanJawabanSiswa } from "@/lib/services";

const JawabanSchema = z.object({
  pesertaId: z.string().min(1),
  soalId: z.string().min(1),
  jawabanPG: z.string().optional(),
  jawabanEssay: z.string().optional(),
  raguRagu: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Akses tidak sah" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = JawabanSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, message: "Data jawaban tidak valid" }, { status: 400 });
    }

    const { pesertaId, soalId, jawabanPG, jawabanEssay, raguRagu } = parsed.data;

    const store = loadStore();
    const peserta = store.pesertaUjian.find((p) => p.id === pesertaId);
    if (!peserta) {
      return NextResponse.json({ success: false, message: "Peserta tidak ditemukan" }, { status: 404 });
    }

    // IDOR Protection: Student can only submit answers for their own session
    if (user.role === "SISWA" && peserta.siswaId !== user.id) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak: Anda tidak berhak mengubah jawaban peserta lain." },
        { status: 403 }
      );
    }

    if (peserta.status !== "SEDANG_MENGERJAKAN") {
      return NextResponse.json(
        { success: false, message: "Sesi ujian telah berakhir atau terkunci." },
        { status: 403 }
      );
    }

    const saved = simpanJawabanSiswa(pesertaId, soalId, jawabanPG, jawabanEssay, raguRagu);

    return NextResponse.json({ success: true, jawaban: saved });
  } catch (error) {
    console.error("Simpan Jawaban Error:", error);
    return NextResponse.json({ success: false, message: "Gagal menyimpan jawaban" }, { status: 500 });
  }
}
