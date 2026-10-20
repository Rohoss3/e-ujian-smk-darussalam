import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { loadStore } from "@/lib/data-store";
import { generateBeritaAcaraResmiPdf, PesertaBeritaAcaraItem } from "@/lib/pdf";

interface RouteProps {
  params: Promise<{
    ujianId: string;
    kelasId: string;
  }>;
}

export async function GET(req: NextRequest, { params }: RouteProps) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role === "SISWA") {
      return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
    }

    const { ujianId, kelasId } = await params;

    const store = loadStore();
    const ujian = store.ujian.find((u) => u.id === ujianId) || store.ujian[0];

    if (!ujian) {
      return NextResponse.json({ success: false, message: "Data ujian tidak ditemukan" }, { status: 404 });
    }

    const targetKelas = store.kelas.find((k) => k.id === kelasId || k.nama === kelasId) || store.kelas[1]; // default XI RPL 1
    const jurusan = store.jurusan.find((j) => j.id === targetKelas?.jurusanId) || store.jurusan[0];
    const mapel = store.mataPelajaran.find((m) => m.id === ujian.mataPelajaranId);
    const guru = store.users.find((u) => u.id === ujian.guruId);

    // Filter students belonging to this class
    const siswaInClass = store.users.filter((u) => u.role === "SISWA" && (u.kelasId === targetKelas.id || !u.kelasId));

    const daftarPeserta: PesertaBeritaAcaraItem[] = siswaInClass.map((s, idx) => {
      const peserta = store.pesertaUjian.find((p) => p.ujianId === ujian.id && p.siswaId === s.id);
      return {
        no: idx + 1,
        nisn: s.nisn || s.username || "0000000000",
        nama: s.name,
        kelas: targetKelas.nama,
        status: peserta?.status || "BELUM_MULAI",
        jumlahPelanggaran: peserta?.jumlahPelanggaran || 0,
        nilaiPG: peserta?.nilaiPG || 0,
        nilaiEssay: peserta?.nilaiEssay || 0,
        totalNilai: peserta?.totalNilai || 0,
        statusKelulusan: peserta?.statusKelulusan || "BELUM_DINILAI",
      };
    });

    const pdfBytes = await generateBeritaAcaraResmiPdf({
      namaSekolah: store.sekolah.nama,
      npsn: store.sekolah.npsn,
      alamatSekolah: store.sekolah.alamat,
      namaUjian: ujian.judul,
      kodeUjian: ujian.kodeUjian,
      mataPelajaran: mapel?.nama || "Pemrograman Web & Perangkat Bergerak",
      kelas: targetKelas.nama,
      jurusan: jurusan.nama,
      ruang: "Lab Komputer 2 (Ruang CBT)",
      hariTanggal: "Senin, 19 Oktober 2026",
      waktuMulai: "08:00",
      waktuSelesai: "09:30",
      daftarPeserta,
      catatanKhusus: `Ujian berlangsung dengan tertib. Dari total ${daftarPeserta.length} siswa, seluruh aktivitas termonitor melalui AI Face Proctoring dan Anti-Cheat.`,
      namaPengawas: guru?.name || "Budi Santoso, S.Kom., M.T.",
      nipPengawas: guru?.nip || "19820415 200801 1 009",
      namaKepsek: store.sekolah.kepalaSekolah,
      nipKepsek: store.sekolah.nipKepala,
    });

    return new Response(pdfBytes as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Berita_Acara_${ujian.kodeUjian}_${targetKelas.nama.replace(/\s+/g, "_")}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Berita Acara PDF Error:", error);
    return NextResponse.json({ success: false, message: "Gagal membuat PDF Berita Acara" }, { status: 500 });
  }
}
