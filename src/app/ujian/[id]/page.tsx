import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { loadStore } from "@/lib/data-store";
import { getSoalForSiswa, getJawabanSiswa, mulaiPengerjaanUjian, selesaikanUjianManual } from "@/lib/services";
import { ExamRoom } from "@/components/exam/ExamRoom";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function UjianDetailPage({ params }: PageProps) {
  const { id: ujianId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  // Khusus Siswa: Guru atau Admin diarahkan ke ruang monitoring pengawas
  if (user.role !== "SISWA") {
    redirect(`/pengawas/${ujianId}`);
  }

  const store = loadStore();
  const ujian = store.ujian.find((u) => u.id === ujianId);

  if (!ujian) {
    redirect("/jadwal");
  }

  // Ensure or get participant session
  let peserta = store.pesertaUjian.find((p) => p.ujianId === ujianId && p.siswaId === user.id);
  if (!peserta) {
    try {
      peserta = mulaiPengerjaanUjian(ujianId, user.id);
    } catch (err: any) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card border border-destructive/30 rounded-xl p-6 text-center space-y-4 shadow-lg">
            <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Akses Ujian Remedial Ditolak</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {err?.message || "Anda tidak memiliki hak akses untuk mengikuti sesi remedial ini."}
            </p>
            <a
              href="/jadwal"
              className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
            >
              Kembali ke Jadwal Ujian
            </a>
          </div>
        </div>
      );
    }
  }

  // If already finished or disqualified, redirect to results
  if (peserta.status === "SELESAI" || peserta.status === "DIDISKUALIFIKASI") {
    redirect(`/hasil?ujianId=${ujianId}`);
  }

  // Authoritative server-side timer integrity check
  if (peserta.waktuMulai) {
    const durasiDetik = (ujian.durasiMenit || 60) * 60;
    const waktuMulaiMs = new Date(peserta.waktuMulai).getTime();
    const elapsedDetik = Math.max(0, Math.floor((Date.now() - waktuMulaiMs) / 1000));
    const serverRemaining = Math.max(0, durasiDetik - elapsedDetik);

    if (serverRemaining <= 0) {
      selesaikanUjianManual(peserta.id);
      redirect(`/hasil?ujianId=${ujianId}`);
    }

    peserta.sisaWaktuDetik = Math.min(peserta.sisaWaktuDetik, serverRemaining);
  }

  const mapel = store.mataPelajaran.find((m) => m.id === ujian.mataPelajaranId);

  // Retrieve deterministic shuffled questions and existing student answers
  const initialSoal = getSoalForSiswa(ujianId, peserta.id);
  const initialJawaban = getJawabanSiswa(peserta.id).map((j) => ({
    soalId: j.soalId,
    jawabanPG: j.jawabanPG || undefined,
    jawabanEssay: j.jawabanEssay || undefined,
    raguRagu: j.raguRagu || false,
  }));

  return (
    <ExamRoom
      ujian={{
        id: ujian.id,
        judul: ujian.judul,
        kodeUjian: ujian.kodeUjian,
        durasiMenit: ujian.durasiMenit,
        maxPelanggaran: ujian.maxPelanggaran,
        mataPelajaran: mapel?.nama || "Umum",
      }}
      peserta={{
        id: peserta.id,
        sisaWaktuDetik: peserta.sisaWaktuDetik,
        jumlahPelanggaran: peserta.jumlahPelanggaran,
        seedAcak: peserta.seedAcak,
      }}
      siswa={{
        id: user.id,
        nama: user.name,
        nisn: user.nisn || undefined,
        kelas: user.kelas || "SMK",
      }}
      initialSoal={initialSoal}
      initialJawaban={initialJawaban}
    />
  );
}
