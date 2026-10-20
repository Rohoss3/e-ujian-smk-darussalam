import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { loadStore, saveStore } from "@/lib/data-store";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Akses khusus Administrator" }, { status: 403 });
    }

    const store = loadStore();
    const jurusanWithCounts = store.jurusan.map((j) => {
      const kelasList = store.kelas.filter((k) => k.jurusanId === j.id);
      const kelasIds = new Set(kelasList.map((k) => k.id));
      const siswaCount = store.users.filter(
        (u) => u.role === "SISWA" && (u.jurusanId === j.id || (u.kelasId && kelasIds.has(u.kelasId)))
      ).length;

      return {
        ...j,
        status: j.status || "AKTIF",
        jumlahKelas: kelasList.length,
        jumlahSiswa: siswaCount,
      };
    });

    return NextResponse.json({ success: true, jurusan: jurusanWithCounts });
  } catch (error) {
    console.error("GET Master Jurusan Error:", error);
    return NextResponse.json({ success: false, message: "Gagal memuat data jurusan" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Akses khusus Administrator" }, { status: 403 });
    }

    const body = await req.json();
    const { action, id, kode, nama, deskripsi, status } = body;

    const store = loadStore();

    if (action === "create") {
      if (!kode || !nama) {
        return NextResponse.json({ success: false, message: "Kode dan nama jurusan wajib diisi" }, { status: 400 });
      }

      const existing = store.jurusan.find((j) => j.kode.toUpperCase() === kode.toUpperCase());
      if (existing) {
        return NextResponse.json({ success: false, message: "Kode jurusan sudah terdaftar" }, { status: 400 });
      }

      const newJurusan = {
        id: `jur-${kode.toLowerCase().replace(/\s+/g, "")}-${Date.now()}`,
        kode: kode.toUpperCase(),
        nama,
        deskripsi: deskripsi || "",
        status: "AKTIF" as const,
      };
      store.jurusan.push(newJurusan);
      saveStore(store);

      return NextResponse.json({ success: true, message: "Jurusan baru berhasil ditambahkan", jurusan: newJurusan });
    }

    if (action === "edit") {
      const target = store.jurusan.find((j) => j.id === id);
      if (!target) {
        return NextResponse.json({ success: false, message: "Jurusan tidak ditemukan" }, { status: 404 });
      }

      target.kode = kode ? kode.toUpperCase() : target.kode;
      target.nama = nama || target.nama;
      target.deskripsi = deskripsi !== undefined ? deskripsi : target.deskripsi;
      if (status) target.status = status;

      saveStore(store);
      return NextResponse.json({ success: true, message: "Data jurusan berhasil diperbarui", jurusan: target });
    }

    if (action === "toggle_status") {
      const target = store.jurusan.find((j) => j.id === id);
      if (!target) {
        return NextResponse.json({ success: false, message: "Jurusan tidak ditemukan" }, { status: 404 });
      }
      target.status = target.status === "NONAKTIF" ? "AKTIF" : "NONAKTIF";
      saveStore(store);
      return NextResponse.json({ success: true, message: `Status jurusan diubah menjadi ${target.status}`, jurusan: target });
    }

    if (action === "delete") {
      const index = store.jurusan.findIndex((j) => j.id === id);
      if (index === -1) {
        return NextResponse.json({ success: false, message: "Jurusan tidak ditemukan" }, { status: 404 });
      }

      const linkedKelas = store.kelas.filter((k) => k.jurusanId === id);
      if (linkedKelas.length > 0) {
        return NextResponse.json({
          success: false,
          message: `Tidak dapat menghapus jurusan ini karena masih memiliki ${linkedKelas.length} rombel kelas terkait.`,
        }, { status: 400 });
      }

      const deletedName = store.jurusan[index].nama;
      store.jurusan.splice(index, 1);
      saveStore(store);

      return NextResponse.json({
        success: true,
        message: `Jurusan ${deletedName} berhasil dihapus`,
      });
    }

    return NextResponse.json({ success: false, message: "Aksi tidak dikenal" }, { status: 400 });
  } catch (error) {
    console.error("POST Master Jurusan Error:", error);
    return NextResponse.json({ success: false, message: "Gagal memproses data jurusan" }, { status: 500 });
  }
}
