import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { verifikasiTokenUjian, mulaiPengerjaanUjian } from "@/lib/services";

const MulaiSchema = z.object({
  ujianId: z.string().min(1),
  tokenUjian: z.string().min(1, "Token ujian wajib diisi"),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Akses tidak diizinkan. Silakan login." }, { status: 401 });
    }

    const body = await req.json();
    const parsed = MulaiSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, message: parsed.error.errors[0].message }, { status: 400 });
    }

    const { ujianId, tokenUjian } = parsed.data;

    // Verify token
    const tokenCheck = verifikasiTokenUjian(ujianId, tokenUjian);
    if (!tokenCheck.valid) {
      return NextResponse.json({ success: false, message: tokenCheck.message }, { status: 400 });
    }

    // Start or resume participant session
    const peserta = mulaiPengerjaanUjian(ujianId, user.id);

    return NextResponse.json({
      success: true,
      pesertaId: peserta.id,
      status: peserta.status,
    });
  } catch (error: any) {
    console.error("Mulai Ujian Error:", error);
    const msg = error?.message || "Terjadi kesalahan server";
    const status = msg.includes("Akses Ditolak") ? 403 : 500;
    return NextResponse.json({ success: false, message: msg }, { status });
  }
}
