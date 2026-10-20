import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { loadStore, saveStore } from "@/lib/data-store";
import { validateAndParseSoalExcel } from "@/lib/excel";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role === "SISWA" || user.role === "PENGAWAS") {
      return NextResponse.json({ success: false, message: "Akses tidak diizinkan. Hanya Guru & Admin." }, { status: 403 });
    }

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const bankSoalId = (formData.get("bankSoalId") as string) || "";
      const action = (formData.get("action") as string) || "preview"; // preview or commit

      if (!file) {
        return NextResponse.json({ success: false, message: "File Excel wajib diunggah." }, { status: 400 });
      }

      const arrayBuf = await file.arrayBuffer();
      const result = await validateAndParseSoalExcel(arrayBuf);

      if (action === "preview") {
        return NextResponse.json({
          success: true,
          mode: "preview",
          preview: result,
        });
      }

      // Action is commit
      if (result.previewData.length === 0) {
        return NextResponse.json({
          success: false,
          message: "Tidak ada baris soal valid yang dapat diimpor. Perbaiki kesalahan data terlebih dahulu.",
          errors: result.errors,
        }, { status: 400 });
      }

      const store = loadStore();
      const targetBank = store.bankSoal.find((b) => b.id === bankSoalId) || store.bankSoal[0];

      if (!targetBank) {
        return NextResponse.json({ success: false, message: "Bank soal tujuan tidak ditemukan." }, { status: 404 });
      }

      let startNo = store.soal.filter((s) => s.bankSoalId === targetBank.id).length;

      result.previewData.forEach((row, i) => {
        store.soal.push({
          id: `soal-${Date.now()}-${i}`,
          bankSoalId: targetBank.id,
          nomorUrut: startNo + i + 1,
          tipeSoal: row.tipeSoal,
          tingkatKesulitan: row.tingkatKesulitan,
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

      // Add to ImportLog
      store.importLogs.unshift({
        id: `implog-${Date.now()}`,
        tipe: "SOAL",
        fileName: file.name,
        status: result.totalInvalid > 0 ? "PARTIAL" : "SUCCESS",
        errorDetail: result.errors.length > 0 ? JSON.stringify(result.errors.slice(0, 10)) : undefined,
        totalBaris: result.totalBaris,
        totalBerhasil: result.totalValid,
        totalGagal: result.totalInvalid,
        importedBy: user.name,
        createdAt: new Date().toISOString(),
      });

      saveStore(store);

      return NextResponse.json({
        success: true,
        mode: "commit",
        message: `Berhasil mengimpor ${result.totalValid} butir soal ke ${targetBank.judul}.`,
        totalBerhasil: result.totalValid,
        totalGagal: result.totalInvalid,
        errors: result.errors,
      });
    }

    // Direct JSON commit from confirmed preview payload
    const body = await req.json();
    const { bankSoalId, confirmedRows, fileName } = body;

    if (!confirmedRows || confirmedRows.length === 0) {
      return NextResponse.json({ success: false, message: "Data soal kosong." }, { status: 400 });
    }

    const store = loadStore();
    const targetBank = store.bankSoal.find((b) => b.id === bankSoalId) || store.bankSoal[0];

    if (!targetBank) {
      return NextResponse.json({ success: false, message: "Bank Soal tidak ditemukan." }, { status: 404 });
    }

    let startNo = store.soal.filter((s) => s.bankSoalId === targetBank.id).length;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    confirmedRows.forEach((row: any, i: number) => {
      store.soal.push({
        id: `soal-${Date.now()}-${i}`,
        bankSoalId: targetBank.id,
        nomorUrut: startNo + i + 1,
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

    store.importLogs.unshift({
      id: `implog-${Date.now()}`,
      tipe: "SOAL",
      fileName: fileName || "Import_Manual_Soal.xlsx",
      status: "SUCCESS",
      totalBaris: confirmedRows.length,
      totalBerhasil: confirmedRows.length,
      totalGagal: 0,
      importedBy: user.name,
      createdAt: new Date().toISOString(),
    });

    saveStore(store);

    return NextResponse.json({
      success: true,
      message: `Berhasil menyimpan ${confirmedRows.length} soal ke ${targetBank.judul}.`,
    });
  } catch (error) {
    console.error("Import Soal Error:", error);
    return NextResponse.json({ success: false, message: "Terjadi kesalahan saat memproses file Excel." }, { status: 500 });
  }
}
