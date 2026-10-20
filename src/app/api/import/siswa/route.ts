import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCurrentUser } from "@/lib/auth";
import { loadStore, saveStore } from "@/lib/data-store";
import { validateAndParseSiswaExcel } from "@/lib/excel";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Akses ditolak: Hanya Administrator yang diizinkan mengimpor data siswa." }, { status: 403 });
    }

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const action = (formData.get("action") as string) || "preview";

      if (!file) {
        return NextResponse.json({ success: false, message: "File Excel siswa wajib diunggah." }, { status: 400 });
      }

      const arrayBuf = await file.arrayBuffer();
      const result = await validateAndParseSiswaExcel(arrayBuf);

      const store = loadStore();

      // Check existing NISNs in database
      const existingNisns = new Set(store.users.map((u) => u.nisn || u.username));
      const finalErrors = [...result.errors];
      const validFiltered: typeof result.previewData = [];

      result.previewData.forEach((row) => {
        if (existingNisns.has(row.nisn)) {
          finalErrors.push({
            baris: row.baris,
            kolom: "NISN",
            pesan: `NISN '${row.nisn}' sudah terdaftar di sistem.`,
            nilai: row.nisn,
          });
        } else {
          validFiltered.push(row);
        }
      });

      if (action === "preview") {
        return NextResponse.json({
          success: true,
          mode: "preview",
          preview: {
            tipe: "SISWA",
            totalBaris: result.totalBaris,
            totalValid: validFiltered.length,
            totalInvalid: result.totalBaris - validFiltered.length,
            errors: finalErrors,
            previewData: validFiltered,
          },
        });
      }

      // Commit action
      if (validFiltered.length === 0) {
        return NextResponse.json({
          success: false,
          message: "Tidak ada siswa baru yang valid untuk diimpor.",
          errors: finalErrors,
        }, { status: 400 });
      }

      const defaultHashedPassword = await bcrypt.hash("siswa123", 10);

      validFiltered.forEach((s) => {
        // Find or create Kelas & Jurusan if needed
        let targetJurusan = store.jurusan.find(
          (j) => j.kode.toLowerCase() === s.jurusan.toLowerCase() || j.nama.toLowerCase().includes(s.jurusan.toLowerCase())
        );
        if (!targetJurusan) {
          targetJurusan = {
            id: `jur-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            kode: s.jurusan.toUpperCase(),
            nama: `Kompetensi Keahlian ${s.jurusan.toUpperCase()}`,
            deskripsi: `Jurusan ${s.jurusan.toUpperCase()}`,
          };
          store.jurusan.push(targetJurusan);
        }

        let targetKelas = store.kelas.find((k) => k.nama.toLowerCase() === s.kelas.toLowerCase());
        if (!targetKelas) {
          targetKelas = {
            id: `kls-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            nama: s.kelas,
            tingkat: s.kelas.startsWith("X ") ? 10 : s.kelas.startsWith("XII") ? 12 : 11,
            jurusanId: targetJurusan.id,
          };
          store.kelas.push(targetKelas);
        }

        store.users.push({
          id: `usr-siswa-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          username: s.nisn,
          password: defaultHashedPassword,
          name: s.nama,
          email: s.email,
          role: "SISWA",
          nisn: s.nisn,
          kelasId: targetKelas.id,
          jurusanId: targetJurusan.id,
        });
      });

      store.importLogs.unshift({
        id: `implog-${Date.now()}`,
        tipe: "SISWA",
        fileName: file.name,
        status: finalErrors.length > 0 ? "PARTIAL" : "SUCCESS",
        errorDetail: finalErrors.length > 0 ? JSON.stringify(finalErrors.slice(0, 10)) : undefined,
        totalBaris: result.totalBaris,
        totalBerhasil: validFiltered.length,
        totalGagal: result.totalBaris - validFiltered.length,
        importedBy: user.name,
        createdAt: new Date().toISOString(),
      });

      saveStore(store);

      return NextResponse.json({
        success: true,
        mode: "commit",
        message: `Berhasil mendaftarkan ${validFiltered.length} siswa baru ke sistem. Password default: siswa123`,
        totalBerhasil: validFiltered.length,
        totalGagal: result.totalBaris - validFiltered.length,
        errors: finalErrors,
      });
    }

    return NextResponse.json({ success: false, message: "Metode request tidak didukung." }, { status: 400 });
  } catch (error) {
    console.error("Import Siswa Error:", error);
    return NextResponse.json({ success: false, message: "Gagal memproses file Excel siswa." }, { status: 500 });
  }
}
