import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { loadStore, saveStore } from "@/lib/data-store";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role === "SISWA") {
      return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
    }

    const store = loadStore();

    const jurMap = new Map(store.jurusan.map((j) => [j.id, j]));
    const userMap = new Map(store.users.map((u) => [u.id, u]));

    const bankCountMap = new Map<string, number>();
    for (let i = 0; i < store.bankSoal.length; i++) {
      const mid = store.bankSoal[i].mataPelajaranId;
      bankCountMap.set(mid, (bankCountMap.get(mid) || 0) + 1);
    }

    const result = store.mataPelajaran.map((m) => {
      const jur = m.jurusanId ? jurMap.get(m.jurusanId) : undefined;
      const guru = m.guruPengampuId ? userMap.get(m.guruPengampuId) : undefined;
      const bankCount = bankCountMap.get(m.id) || 0;

      return {
        ...m,
        jurusanKode: jur?.kode || "-",
        jurusanNama: jur?.nama || "Mata Pelajaran Umum (Semua Jurusan)",
        guruPengampuNama: guru?.name || "Belum Ditentukan",
        guruPengampuId: m.guruPengampuId,
        jumlahBankSoal: bankCount,
      };
    });

    return NextResponse.json(
      {
        success: true,
        mataPelajaran: result,
        jurusanList: store.jurusan.map((j) => ({ id: j.id, kode: j.kode, nama: j.nama })),
        guruList: store.users.filter((u) => u.role === "GURU").map((g) => ({ id: g.id, name: g.name })),
      },
      {
        headers: {
          "Cache-Control": "private, max-age=5, stale-while-revalidate=10",
        },
      }
    );
  } catch (error) {
    console.error("GET Master Mapel Error:", error);
    return NextResponse.json({ success: false, message: "Gagal memuat mata pelajaran" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Akses khusus Administrator" }, { status: 403 });
    }

    const body = await req.json();
    const { action, id, kode, nama, jurusanId, kkm, guruPengampuId } = body;

    const store = loadStore();

    if (action === "create") {
      if (!kode || !nama) {
        return NextResponse.json({ success: false, message: "Kode dan nama mata pelajaran wajib diisi" }, { status: 400 });
      }

      const newMapel = {
        id: `mapel-${kode.toLowerCase().replace(/\s+/g, "")}-${Date.now()}`,
        kode: kode.toUpperCase(),
        nama,
        jurusanId: jurusanId || undefined,
        kkm: Number(kkm) || 75,
        guruPengampuId: guruPengampuId || undefined,
      };

      store.mataPelajaran.push(newMapel);

      // If assigned to a teacher, update teacher mapelIds
      if (guruPengampuId) {
        const targetGuru = store.users.find((u) => u.id === guruPengampuId);
        if (targetGuru) {
          targetGuru.mapelIds = targetGuru.mapelIds || [];
          if (!targetGuru.mapelIds.includes(newMapel.id)) {
            targetGuru.mapelIds.push(newMapel.id);
          }
        }
      }

      saveStore(store);
      return NextResponse.json({ success: true, message: `Mata pelajaran ${nama} berhasil ditambahkan`, mataPelajaran: newMapel });
    }

    if (action === "edit") {
      const target = store.mataPelajaran.find((m) => m.id === id);
      if (!target) {
        return NextResponse.json({ success: false, message: "Mata pelajaran tidak ditemukan" }, { status: 404 });
      }

      const oldGuruId = target.guruPengampuId;
      target.kode = kode ? kode.toUpperCase() : target.kode;
      target.nama = nama || target.nama;
      target.jurusanId = jurusanId || undefined;
      target.kkm = kkm ? Number(kkm) : target.kkm;
      target.guruPengampuId = guruPengampuId || undefined;

      // Remove from previous guru if reassigned
      if (oldGuruId && oldGuruId !== guruPengampuId) {
        const oldGuru = store.users.find((u) => u.id === oldGuruId);
        if (oldGuru && Array.isArray(oldGuru.mapelIds)) {
          oldGuru.mapelIds = oldGuru.mapelIds.filter((mid) => mid !== target.id);
        }
      }

      // Add to new guru
      if (guruPengampuId) {
        const targetGuru = store.users.find((u) => u.id === guruPengampuId);
        if (targetGuru) {
          targetGuru.mapelIds = targetGuru.mapelIds || [];
          if (!targetGuru.mapelIds.includes(target.id)) {
            targetGuru.mapelIds.push(target.id);
          }
        }
      }

      saveStore(store);
      return NextResponse.json({ success: true, message: "Mata pelajaran berhasil diperbarui", mataPelajaran: target });
    }

    if (action === "delete") {
      const index = store.mataPelajaran.findIndex((m) => m.id === id);
      if (index === -1) {
        return NextResponse.json({ success: false, message: "Mata pelajaran tidak ditemukan" }, { status: 404 });
      }

      const linkedExams = store.ujian.filter((u) => u.mataPelajaranId === id);
      if (linkedExams.length > 0) {
        return NextResponse.json({
          success: false,
          message: `Tidak dapat menghapus mata pelajaran ini karena masih memiliki ${linkedExams.length} jadwal ujian terkait.`,
        }, { status: 400 });
      }

      const deleted = store.mataPelajaran[index];
      // Remove from teachers
      store.users.forEach((u) => {
        if (u.role === "GURU" && Array.isArray(u.mapelIds)) {
          u.mapelIds = u.mapelIds.filter((mid) => mid !== id);
        }
      });

      store.mataPelajaran.splice(index, 1);
      saveStore(store);

      return NextResponse.json({
        success: true,
        message: `Mata pelajaran ${deleted.nama} (${deleted.kode}) berhasil dihapus`,
      });
    }

    return NextResponse.json({ success: false, message: "Aksi tidak dikenal" }, { status: 400 });
  } catch (error) {
    console.error("POST Master Mapel Error:", error);
    return NextResponse.json({ success: false, message: "Gagal memproses mata pelajaran" }, { status: 500 });
  }
}
