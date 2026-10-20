import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { loadStore } from "@/lib/data-store";
import { updateHeartbeatSiswa } from "@/lib/services";

const HeartbeatSchema = z.object({
  pesertaId: z.string().min(1),
  sisaWaktuDetik: z.number().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Akses tidak sah" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = HeartbeatSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, message: "Parameter heartbeat tidak valid" }, { status: 400 });
    }

    const { pesertaId, sisaWaktuDetik } = parsed.data;
    const store = loadStore();
    const peserta = store.pesertaUjian.find((p) => p.id === pesertaId);

    if (!peserta) {
      return NextResponse.json({ success: false, message: "Peserta tidak ditemukan" }, { status: 404 });
    }

    // IDOR Protection: Student can only send heartbeat for their own session
    if (user.role === "SISWA" && peserta.siswaId !== user.id) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak: ID peserta tidak sesuai dengan identitas akun Anda." },
        { status: 403 }
      );
    }

    // If session is already finalized, return current status immediately
    if (peserta.status !== "SEDANG_MENGERJAKAN") {
      return NextResponse.json({
        success: true,
        status: peserta.status,
        sisaWaktuDetik: peserta.sisaWaktuDetik || 0,
      });
    }

    // Authoritative Server-Side Timer Calculation
    const ujian = store.ujian.find((u) => u.id === peserta.ujianId);
    let authoritativeRemaining = peserta.sisaWaktuDetik;

    if (ujian && peserta.waktuMulai) {
      const durasiDetik = (ujian.durasiMenit || 60) * 60;
      const startTime = new Date(peserta.waktuMulai).getTime();
      const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
      const serverCalculatedRemaining = Math.max(0, durasiDetik - elapsedSeconds);

      // Prevent client-side clock tampering: client time cannot exceed server calculated remaining
      if (sisaWaktuDetik !== undefined) {
        authoritativeRemaining = Math.min(sisaWaktuDetik, serverCalculatedRemaining);
      } else {
        authoritativeRemaining = serverCalculatedRemaining;
      }
    } else if (sisaWaktuDetik !== undefined) {
      authoritativeRemaining = Math.min(sisaWaktuDetik, peserta.sisaWaktuDetik);
    }

    const updatedPeserta = updateHeartbeatSiswa(pesertaId, authoritativeRemaining);

    return NextResponse.json({
      success: true,
      status: updatedPeserta?.status || peserta.status,
      sisaWaktuDetik: authoritativeRemaining,
    });
  } catch (error) {
    console.error("Heartbeat API Error:", error);
    return NextResponse.json({ success: false, message: "Gagal memproses heartbeat" }, { status: 500 });
  }
}
