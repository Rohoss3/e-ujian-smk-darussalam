import { NextRequest, NextResponse } from "next/server";
import { validateAndParseSoalExcel } from "@/lib/excel";
import { loadStore, saveStore } from "@/lib/data-store";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const bankSoalId = formData.get("bankSoalId") as string;
    const file = formData.get("file") as File;

    if (!file || !bankSoalId) {
      return NextResponse.json(
        { success: false, message: "File Excel dan ID Bank Soal wajib diunggah" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const result = await validateAndParseSoalExcel(arrayBuffer);

    if (result.previewData.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Tidak ada baris soal valid yang ditemukan dalam file Excel.",
          errors: result.errors,
        },
        { status: 400 }
      );
    }

    const store = loadStore();
    const existingCount = store.soal.filter((s) => s.bankSoalId === bankSoalId).length;

    result.previewData.forEach((row, i) => {
      store.soal.push({
        id: `soal-${Date.now()}-${i}`,
        bankSoalId,
        nomorUrut: existingCount + i + 1,
        tipeSoal: row.tipeSoal,
        tingkatKesulitan: row.tingkatKesulitan || "SEDANG",
        pertanyaan: row.pertanyaan,
        opsiA: row.opsiA,
        opsiB: row.opsiB,
        opsiC: row.opsiC,
        opsiD: row.opsiD,
        opsiE: row.opsiE,
        kunciJawaban: row.kunciJawaban,
        bobot: row.bobot,
      });
    });

    saveStore(store);

    return NextResponse.json({
      success: true,
      message: `Berhasil mengimpor ${result.previewData.length} butir soal dari Excel.`,
      totalImported: result.previewData.length,
      errors: result.errors,
    });
  } catch (error) {
    console.error("Excel Import Error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memproses file Excel: format tidak sesuai." },
      { status: 500 }
    );
  }
}
