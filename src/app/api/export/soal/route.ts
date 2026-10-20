import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { loadStore } from "@/lib/data-store";
import { exportBankSoalExcel } from "@/lib/excel";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role === "SISWA" || user.role === "PENGAWAS") {
      return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const mataPelajaranId = searchParams.get("mataPelajaranId");
    const bankSoalId = searchParams.get("bankSoalId");

    const store = loadStore();

    let mapelNama = "Semua Mata Pelajaran";
    let questions = store.soal;

    if (bankSoalId) {
      const bank = store.bankSoal.find((b) => b.id === bankSoalId);
      if (bank) {
        questions = store.soal.filter((s) => s.bankSoalId === bank.id);
        const mapel = store.mataPelajaran.find((m) => m.id === bank.mataPelajaranId);
        mapelNama = mapel?.nama || bank.judul;
      }
    } else if (mataPelajaranId) {
      const mapel = store.mataPelajaran.find((m) => m.id === mataPelajaranId);
      if (mapel) {
        mapelNama = mapel.nama;
        const matchingBanks = store.bankSoal.filter((b) => b.mataPelajaranId === mataPelajaranId).map((b) => b.id);
        questions = store.soal.filter((s) => matchingBanks.includes(s.bankSoalId));
      }
    }

    const uint8 = await exportBankSoalExcel(mapelNama, questions);

    return new Response(uint8 as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Bank_Soal_${mapelNama.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Export Soal Error:", error);
    return NextResponse.json({ success: false, message: "Gagal mengekspor bank soal" }, { status: 500 });
  }
}
