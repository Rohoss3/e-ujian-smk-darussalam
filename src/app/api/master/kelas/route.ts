import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { loadStore, saveStore } from "@/lib/data-store";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "GURU")) {
      return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const jurusanIdFilter = searchParams.get("jurusanId");
    const tahunAjaranFilter = searchParams.get("tahunAjaran");

    const store = loadStore();

    let filteredKelas = store.kelas;
    if (jurusanIdFilter && jurusanIdFilter !== "ALL") {
      filteredKelas = filteredKelas.filter((k) => k.jurusanId === jurusanIdFilter);
    }
    if (tahunAjaranFilter && tahunAjaranFilter !== "ALL") {
      filteredKelas = filteredKelas.filter((k) => (k.tahunAjaran || "2026/2027") === tahunAjaranFilter);
    }

    const jurMap = new Map(store.jurusan.map((j) => [j.id, j]));
    const userMap = new Map(store.users.map((u) => [u.id, u]));

    // Precalculate student count per class in single pass
    const siswaCountMap = new Map<string, number>();
    for (let i = 0; i < store.users.length; i++) {
      const u = store.users[i];
      if (u.role === "SISWA" && u.kelasId) {
        siswaCountMap.set(u.kelasId, (siswaCountMap.get(u.kelasId) || 0) + 1);
      }
    }

    const result = filteredKelas.map((k) => {
      const jur = jurMap.get(k.jurusanId);
      const wali = k.waliKelasId ? userMap.get(k.waliKelasId) : undefined;
      const siswaCount = siswaCountMap.get(k.id) || 0;

      return {
        ...k,
        jurusanKode: jur?.kode || "-",
        jurusanNama: jur?.nama || "Umum",
        waliKelasNama: wali?.name || "Belum Ditentukan",
        waliKelasNip: wali?.nip || "-",
        tahunAjaran: k.tahunAjaran || "2026/2027",
        status: k.status || "AKTIF",
        jumlahSiswa: siswaCount,
      };
    });

    return NextResponse.json(
      {
        success: true,
        kelas: result,
        jurusanList: store.jurusan.filter((j) => (j.status || "AKTIF") === "AKTIF"),
        guruList: store.users.filter((u) => u.role === "GURU").map((g) => ({ id: g.id, name: g.name, nip: g.nip })),
        tahunAjaranList: store.tahunAjaran || [{ id: "ta-2026", nama: "2026/2027", isAktif: true }],
      },
      {
        headers: {
          "Cache-Control": "private, max-age=5, stale-while-revalidate=10",
        },
      }
    );
  } catch (error) {
    console.error("GET Master Kelas Error:", error);
    return NextResponse.json({ success: false, message: "Gagal memuat data kelas" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Akses khusus Administrator" }, { status: 403 });
    }

    const body = await req.json();
    const { action, id, nama, tingkat, jurusanId, tahunAjaran, waliKelasId } = body;

    const store = loadStore();

    if (action === "create") {
      if (!nama || !tingkat || !jurusanId) {
        return NextResponse.json({ success: false, message: "Nama, tingkat, dan jurusan kelas wajib diisi" }, { status: 400 });
      }

      const newKelas = {
        id: `kls-${Date.now()}`,
        nama,
        tingkat: Number(tingkat),
        jurusanId,
        tahunAjaran: tahunAjaran || "2026/2027",
        waliKelasId: waliKelasId || undefined,
        status: "AKTIF" as const,
      };

      store.kelas.push(newKelas);
      saveStore(store);

      return NextResponse.json({ success: true, message: `Kelas ${nama} berhasil ditambahkan`, kelas: newKelas });
    }

    if (action === "edit") {
      const target = store.kelas.find((k) => k.id === id);
      if (!target) {
        return NextResponse.json({ success: false, message: "Kelas tidak ditemukan" }, { status: 404 });
      }

      target.nama = nama || target.nama;
      target.tingkat = tingkat ? Number(tingkat) : target.tingkat;
      target.jurusanId = jurusanId || target.jurusanId;
      target.tahunAjaran = tahunAjaran || target.tahunAjaran;
      target.waliKelasId = waliKelasId !== undefined ? waliKelasId : target.waliKelasId;

      saveStore(store);
      return NextResponse.json({ success: true, message: "Data kelas berhasil diperbarui", kelas: target });
    }

    if (action === "pindah_tahun") {
      const target = store.kelas.find((k) => k.id === id);
      if (!target) {
        return NextResponse.json({ success: false, message: "Kelas tidak ditemukan" }, { status: 404 });
      }

      target.tahunAjaran = tahunAjaran;
      saveStore(store);
      return NextResponse.json({ success: true, message: `Kelas ${target.nama} dialihkan ke Tahun Ajaran ${tahunAjaran}`, kelas: target });
    }

    if (action === "toggle_status") {
      const target = store.kelas.find((k) => k.id === id);
      if (!target) {
        return NextResponse.json({ success: false, message: "Kelas tidak ditemukan" }, { status: 404 });
      }
      target.status = target.status === "NONAKTIF" ? "AKTIF" : "NONAKTIF";
      saveStore(store);
      return NextResponse.json({ success: true, message: `Status kelas diubah menjadi ${target.status}`, kelas: target });
    }

    if (action === "delete") {
      const index = store.kelas.findIndex((k) => k.id === id);
      if (index === -1) {
        return NextResponse.json({ success: false, message: "Kelas tidak ditemukan" }, { status: 404 });
      }

      const linkedStudents = store.users.filter((u) => u.role === "SISWA" && u.kelasId === id);
      if (linkedStudents.length > 0) {
        return NextResponse.json({
          success: false,
          message: `Tidak dapat menghapus kelas ini karena masih memiliki ${linkedStudents.length} siswa terdaftar.`,
        }, { status: 400 });
      }

      const deletedName = store.kelas[index].nama;
      store.kelas.splice(index, 1);
      saveStore(store);

      return NextResponse.json({
        success: true,
        message: `Kelas ${deletedName} berhasil dihapus`,
      });
    }

    return NextResponse.json({ success: false, message: "Aksi tidak dikenal" }, { status: 400 });
  } catch (error) {
    console.error("POST Master Kelas Error:", error);
    return NextResponse.json({ success: false, message: "Gagal memproses data kelas" }, { status: 500 });
  }
}
