import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { loadStore, saveStore } from "@/lib/data-store";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role === "SISWA" || user.role === "PENGAWAS") {
      return NextResponse.json({ success: false, message: "Akses ditolak: Hanya Guru & Admin yang dapat mengelola ujian." }, { status: 403 });
    }

    const body = await req.json();
    const {
      judul,
      kodeUjian,
      tokenUjian,
      deskripsi,
      bankSoalId,
      mataPelajaranId,
      kelasTarget,
      waktuMulai,
      waktuSelesai,
      durasiMenit,
      maxPelanggaran,
      kkm,
      isRemedial,
      ujianAsliId,
      pengawasId,
    } = body;

    if (!judul || !bankSoalId || !tokenUjian) {
      return NextResponse.json(
        { success: false, message: "Judul, bank soal, dan token wajib diisi" },
        { status: 400 }
      );
    }

    const kkmNum = Number(kkm);
    if (kkm === undefined || kkm === null || isNaN(kkmNum) || kkmNum < 0 || kkmNum > 100) {
      return NextResponse.json(
        { success: false, message: "Nilai KKM wajib diisi dengan rentang 0 - 100" },
        { status: 400 }
      );
    }

    const store = loadStore();

    if (isRemedial && ujianAsliId) {
      const originalExam = store.ujian.find((u) => u.id === ujianAsliId);
      if (!originalExam) {
        return NextResponse.json(
          { success: false, message: "Ujian utama rujukan remedial tidak ditemukan" },
          { status: 404 }
        );
      }
    }

    const newId = `ujian-${Date.now()}`;
    const generatedKode = kodeUjian || (isRemedial ? `REM-${Math.floor(1000 + Math.random() * 9000)}` : `UJN-${Math.floor(1000 + Math.random() * 9000)}`);
    const formattedJudul = isRemedial && !judul.startsWith("[REMEDIAL]") ? `[REMEDIAL] ${judul}` : judul;

    // Intelligently resolve kelasTarget
    let resolvedKelasTarget: string[] = [];
    if (kelasTarget) {
      if (Array.isArray(kelasTarget)) {
        resolvedKelasTarget = kelasTarget.map((k: string) => k.trim()).filter(Boolean);
      } else if (typeof kelasTarget === "string") {
        try {
          const parsed = JSON.parse(kelasTarget);
          resolvedKelasTarget = (Array.isArray(parsed) ? parsed : [parsed]).map((k: string) => String(k).trim()).filter(Boolean);
        } catch {
          resolvedKelasTarget = kelasTarget.split(",").map((k: string) => k.trim()).filter(Boolean);
        }
      }
    }

    // Fallback: If not provided, infer from Bank Soal's major (jurusanId) and grade (tingkat)
    if (resolvedKelasTarget.length === 0) {
      const bankSoal = store.bankSoal.find((b) => b.id === bankSoalId);
      if (bankSoal) {
        const matching = store.kelas.filter((k) => {
          const matchJurusan = !bankSoal.jurusanId || k.jurusanId === bankSoal.jurusanId;
          const matchTingkat = !bankSoal.tingkat || k.tingkat === bankSoal.tingkat;
          return matchJurusan && matchTingkat;
        });
        if (matching.length > 0) {
          resolvedKelasTarget = matching.map((k) => k.nama);
        }
      }
      if (resolvedKelasTarget.length === 0 && store.kelas.length > 0) {
        resolvedKelasTarget = [store.kelas[0].nama];
      }
    }

    const newUjian = {
      id: newId,
      judul: formattedJudul,
      kodeUjian: generatedKode,
      tokenUjian: tokenUjian.toUpperCase(),
      deskripsi: deskripsi || (isRemedial ? "Sesi ujian remedial resmi." : "Ujian Penilaian Asesmen SMK"),
      bankSoalId,
      guruId: user.id,
      mataPelajaranId: mataPelajaranId || store.bankSoal.find((b) => b.id === bankSoalId)?.mataPelajaranId || store.mataPelajaran[0].id,
      kelasTarget: JSON.stringify(resolvedKelasTarget),
      waktuMulai: waktuMulai || new Date().toISOString(),
      waktuSelesai: waktuSelesai || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      durasiMenit: Number(durasiMenit) || 60,
      acakSoal: true,
      acakOpsi: true,
      tampilkanNilai: true,
      tampilkanHasil: true,
      maxPelanggaran: Number(maxPelanggaran) || 3,
      status: "AKTIF" as const,
      kkm: kkmNum,
      isRemedial: !!isRemedial,
      ujianAsliId: isRemedial ? ujianAsliId : undefined,
      pengawasId: pengawasId || undefined,
      pengawasIds: pengawasId ? [pengawasId] : [],
    };

    store.ujian.push(newUjian);
    saveStore(store);

    return NextResponse.json({
      success: true,
      message: isRemedial ? "Sesi ujian remedial berhasil diterbitkan" : "Jadwal ujian berhasil dibuat",
      ujian: newUjian,
    });
  } catch (error) {
    console.error("Create Ujian Error:", error);
    return NextResponse.json({ success: false, message: "Gagal membuat jadwal ujian" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role === "SISWA" || user.role === "PENGAWAS") {
      return NextResponse.json({ success: false, message: "Akses ditolak: Hanya Guru & Admin yang dapat mengedit ujian." }, { status: 403 });
    }

    const body = await req.json();
    const { id, judul, tokenUjian, durasiMenit, maxPelanggaran, kkm, deskripsi, status, pengawasId, kelasTarget } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: "ID Ujian wajib diisi" }, { status: 400 });
    }

    const store = loadStore();
    const ujian = store.ujian.find((u) => u.id === id);
    if (!ujian) {
      return NextResponse.json({ success: false, message: "Ujian tidak ditemukan" }, { status: 404 });
    }

    if (kkm !== undefined) {
      const kkmNum = Number(kkm);
      if (isNaN(kkmNum) || kkmNum < 0 || kkmNum > 100) {
        return NextResponse.json({ success: false, message: "Nilai KKM harus antara 0 - 100" }, { status: 400 });
      }
      ujian.kkm = kkmNum;
    }

    if (judul) ujian.judul = judul;
    if (tokenUjian) ujian.tokenUjian = tokenUjian.toUpperCase();
    if (durasiMenit) ujian.durasiMenit = Number(durasiMenit);
    if (maxPelanggaran) ujian.maxPelanggaran = Number(maxPelanggaran);
    if (deskripsi !== undefined) ujian.deskripsi = deskripsi;
    if (status) ujian.status = status;
    if (pengawasId !== undefined) {
      ujian.pengawasId = pengawasId || undefined;
      ujian.pengawasIds = pengawasId ? [pengawasId] : [];
    }
    if (kelasTarget !== undefined) {
      if (Array.isArray(kelasTarget)) {
        ujian.kelasTarget = JSON.stringify(kelasTarget.map((k: string) => String(k).trim()).filter(Boolean));
      } else if (typeof kelasTarget === "string") {
        try {
          const parsed = JSON.parse(kelasTarget);
          ujian.kelasTarget = JSON.stringify(Array.isArray(parsed) ? parsed : [parsed]);
        } catch {
          ujian.kelasTarget = JSON.stringify(kelasTarget.split(",").map((k: string) => k.trim()).filter(Boolean));
        }
      }
    }

    saveStore(store);

    return NextResponse.json({
      success: true,
      message: "Data ujian berhasil diperbarui",
      ujian,
    });
  } catch (error) {
    console.error("Update Ujian Error:", error);
    return NextResponse.json({ success: false, message: "Gagal memperbarui ujian" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role === "SISWA" || user.role === "PENGAWAS") {
      return NextResponse.json({ success: false, message: "Akses ditolak: Hanya Guru & Admin yang dapat menghapus jadwal ujian." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, message: "ID Ujian wajib disertakan" }, { status: 400 });
    }

    const store = loadStore();
    const index = store.ujian.findIndex((u) => u.id === id);
    if (index === -1) {
      return NextResponse.json({ success: false, message: "Jadwal ujian tidak ditemukan" }, { status: 404 });
    }

    // Role check: If teacher, only allow deleting exams they created
    if (user.role === "GURU" && store.ujian[index].guruId && store.ujian[index].guruId !== user.id) {
      return NextResponse.json({ success: false, message: "Anda hanya berhak menghapus jadwal ujian yang Anda buat sendiri" }, { status: 403 });
    }

    const deletedExam = store.ujian[index];
    store.ujian.splice(index, 1);

    // Cascade delete associated pesertaUjian
    store.pesertaUjian = store.pesertaUjian.filter((p) => p.ujianId !== id);

    saveStore(store);

    return NextResponse.json({
      success: true,
      message: `Jadwal ujian "${deletedExam.judul}" (${deletedExam.kodeUjian}) berhasil dihapus`,
    });
  } catch (error) {
    console.error("Delete Ujian Error:", error);
    return NextResponse.json({ success: false, message: "Gagal menghapus jadwal ujian" }, { status: 500 });
  }
}

