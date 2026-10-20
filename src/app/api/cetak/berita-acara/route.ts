import { NextRequest, NextResponse } from "next/server";
import { generateBeritaAcaraResmiPdf, PesertaBeritaAcaraItem } from "@/lib/pdf";
import { loadStore } from "@/lib/data-store";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role === "SISWA") {
      return NextResponse.json({ success: false, message: "Akses tidak sah" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const ujianId = searchParams.get("ujianId");

    const store = loadStore();
    const ujian = store.ujian.find((u) => u.id === ujianId) || store.ujian[0];

    if (!ujian) {
      return NextResponse.json({ success: false, message: "Data ujian tidak ditemukan" }, { status: 404 });
    }

    if (user.role === "PENGAWAS") {
      const isAssigned = ujian.pengawasId === user.id || (ujian.pengawasIds && ujian.pengawasIds.includes(user.id));
      if (!isAssigned) {
        return NextResponse.json({ success: false, message: "Akses ditolak: Anda bukan pengawas ujian ini" }, { status: 403 });
      }
    }

    const mapel = store.mataPelajaran.find((m) => m.id === ujian.mataPelajaranId);
    const guru = store.users.find((u) => u.id === ujian.guruId);
    const pesertaList = store.pesertaUjian.filter((p) => p.ujianId === ujian.id);

    const daftarPeserta: PesertaBeritaAcaraItem[] = pesertaList.map((p, idx) => {
      const siswa = store.users.find((u) => u.id === p.siswaId);
      const kelas = store.kelas.find((k) => k.id === siswa?.kelasId)?.nama || "XI RPL 1";
      return {
        no: idx + 1,
        nisn: siswa?.nisn || siswa?.username || "0000000000",
        nama: siswa?.name || "Nama Siswa",
        kelas,
        status: p.status,
        jumlahPelanggaran: p.jumlahPelanggaran,
        nilaiPG: p.nilaiPG,
        nilaiEssay: p.nilaiEssay,
        totalNilai: p.totalNilai,
        statusKelulusan: p.statusKelulusan,
      };
    });

    const pdfBytes = await generateBeritaAcaraResmiPdf({
      namaSekolah: store.sekolah.nama,
      npsn: store.sekolah.npsn,
      alamatSekolah: store.sekolah.alamat,
      namaUjian: ujian.judul,
      kodeUjian: ujian.kodeUjian,
      mataPelajaran: mapel?.nama || "Pemrograman Web & Perangkat Bergerak",
      jurusan: "Rekayasa Perangkat Lunak (RPL)",
      kelas: "XI RPL 1",
      ruang: "Lab Komputer RPL 2",
      hariTanggal: "Senin, 19 Oktober 2026",
      waktuMulai: "08:00",
      waktuSelesai: "09:30",
      daftarPeserta,
      catatanKhusus: "Sistem Anti-Cheat aktif. Seluruh peserta terpantau webcam AI dan mode Layar Penuh.",
      namaPengawas: guru?.name || "Budi Santoso, S.Kom., M.T.",
      nipPengawas: guru?.nip || "19820415 200801 1 009",
      namaKepsek: store.sekolah.kepalaSekolah,
      nipKepsek: store.sekolah.nipKepala,
    });

    return new Response(pdfBytes as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Berita_Acara_${ujian.kodeUjian}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF Berita Acara Error:", error);
    return NextResponse.json({ success: false, message: "Gagal membuat PDF Berita Acara" }, { status: 500 });
  }
}
