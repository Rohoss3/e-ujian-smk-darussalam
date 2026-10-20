import { NextRequest, NextResponse } from "next/server";
import { generateKartuUjianPdf } from "@/lib/pdf";
import { getCurrentUser } from "@/lib/auth";
import { loadStore } from "@/lib/data-store";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Akses tidak sah: Silakan login terlebih dahulu" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedSiswaId = searchParams.get("siswaId");

    // IDOR Protection: Siswa can only access their own exam card
    if (user.role === "SISWA" && requestedSiswaId && requestedSiswaId !== user.id) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak: Siswa hanya diizinkan mencetak kartu ujian miliknya sendiri" },
        { status: 403 }
      );
    }

    const targetUserId = user.role === "SISWA" ? user.id : (requestedSiswaId || user.id);

    const store = loadStore();
    const siswa = store.users.find((u) => u.id === targetUserId && u.role === "SISWA");

    if (!siswa) {
      return NextResponse.json({ success: false, message: "Data siswa tidak ditemukan" }, { status: 404 });
    }

    const kelas = store.kelas.find((k) => k.id === siswa.kelasId)?.nama || "Kelas SMK";
    const jurusan = store.jurusan.find((j) => j.id === siswa.jurusanId)?.nama || "Kompetensi Keahlian SMK";

    const pdfBytes = await generateKartuUjianPdf({
      namaSekolah: store.sekolah?.nama || "SMK Darussalam Panongan",
      nomorPeserta: `26-01-${siswa.username}`,
      nisn: siswa.nisn || siswa.username,
      namaSiswa: siswa.name,
      kelas,
      jurusan,
      ruang: "Ruang Lab Komputer",
      sesi: "01 (Reguler)",
      tahunAjaran: "2026/2027",
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Kartu_Ujian_${siswa.username}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF Kartu Ujian Error:", error);
    return NextResponse.json({ success: false, message: "Gagal membuat PDF Kartu Ujian" }, { status: 500 });
  }
}
