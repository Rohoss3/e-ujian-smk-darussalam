import { NextResponse } from "next/server";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { loadStore, saveStore } from "@/lib/data-store";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role === "SISWA" || user.role === "PENGAWAS") {
      return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const kelasIdFilter = searchParams.get("kelasId");
    const jurusanIdFilter = searchParams.get("jurusanId");
    const statusFilter = searchParams.get("status");
    const studentIdForHistory = searchParams.get("riwayatSiswaId");

    const store = loadStore();

    // If requested specific student exam history
    if (studentIdForHistory) {
      const target = store.users.find((u) => u.id === studentIdForHistory);
      const pesertaItems = store.pesertaUjian.filter((p) => p.siswaId === studentIdForHistory);
      const history = pesertaItems.map((p) => {
        const u = store.ujian.find((x) => x.id === p.ujianId);
        return {
          pesertaId: p.id,
          ujianId: p.ujianId,
          judulUjian: u?.judul || "Ujian",
          kodeUjian: u?.kodeUjian || "-",
          status: p.status,
          nilaiPG: p.nilaiPG,
          nilaiEssay: p.nilaiEssay,
          totalNilai: p.totalNilai,
          statusKelulusan: p.statusKelulusan,
          jumlahPelanggaran: p.jumlahPelanggaran,
          waktuSelesai: p.waktuSelesai,
        };
      });

      return NextResponse.json({
        success: true,
        siswaNama: target?.name,
        history,
      });
    }

    let students = store.users.filter((u) => u.role === "SISWA");

    if (kelasIdFilter && kelasIdFilter !== "ALL") {
      students = students.filter((s) => s.kelasId === kelasIdFilter);
    }
    if (jurusanIdFilter && jurusanIdFilter !== "ALL") {
      students = students.filter((s) => s.jurusanId === jurusanIdFilter);
    }
    if (statusFilter && statusFilter !== "ALL") {
      students = students.filter((s) => (s.status || "AKTIF") === statusFilter);
    }

    const kelasMap = new Map(store.kelas.map((k) => [k.id, k]));
    const jurusanMap = new Map(store.jurusan.map((j) => [j.id, j]));

    // Precompute exam count per student in single pass
    const examCountMap = new Map<string, number>();
    for (let i = 0; i < store.pesertaUjian.length; i++) {
      const sId = store.pesertaUjian[i].siswaId;
      examCountMap.set(sId, (examCountMap.get(sId) || 0) + 1);
    }

    const result = students.map((s) => {
      const k = s.kelasId ? kelasMap.get(s.kelasId) : undefined;
      const jurId = s.jurusanId || k?.jurusanId;
      const j = jurId ? jurusanMap.get(jurId) : undefined;
      const examCount = examCountMap.get(s.id) || 0;

      return {
        id: s.id,
        nama: s.name,
        username: s.username,
        nisn: s.nisn || "-",
        email: s.email || "-",
        kelasId: s.kelasId,
        kelasNama: k?.nama || "Belum Ditentukan",
        jurusanId: jurId,
        jurusanKode: j?.kode || "-",
        jurusanNama: j?.nama || "-",
        status: s.status || "AKTIF",
        totalUjianDiikuti: examCount,
      };
    });

    return NextResponse.json(
      {
        success: true,
        siswa: result,
        kelasList: store.kelas.map((k) => ({ id: k.id, nama: k.nama, tingkat: k.tingkat, jurusanId: k.jurusanId })),
        jurusanList: store.jurusan.map((j) => ({ id: j.id, kode: j.kode, nama: j.nama })),
      },
      {
        headers: {
          "Cache-Control": "private, max-age=5, stale-while-revalidate=10",
        },
      }
    );
  } catch (error) {
    console.error("GET Master Siswa Error:", error);
    return NextResponse.json({ success: false, message: "Gagal memuat data siswa" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Akses khusus Administrator" }, { status: 403 });
    }

    const body = await req.json();
    const { action, id, nama, username, nisn, kelasId, jurusanId, email, password } = body;

    const store = loadStore();

    if (action === "create") {
      if (!nama || !username || !nisn || !kelasId) {
        return NextResponse.json({ success: false, message: "Nama, username, NISN, dan kelas wajib diisi" }, { status: 400 });
      }

      const existingUser = store.users.find((u) => u.username.toLowerCase() === username.toLowerCase() || (u.nisn && u.nisn === nisn));
      if (existingUser) {
        return NextResponse.json({ success: false, message: "Username atau NISN sudah terdaftar" }, { status: 400 });
      }

      const selectedKelas = store.kelas.find((k) => k.id === kelasId);
      const assignedJurusan = jurusanId || selectedKelas?.jurusanId;
      const hashedPassword = await hashPassword(password || "siswa123");

      const newSiswa = {
        id: `usr-siswa-${Date.now()}`,
        username: username.toLowerCase().replace(/\s+/g, "_"),
        password: hashedPassword,
        name: nama,
        email: email || undefined,
        role: "SISWA" as const,
        nisn,
        kelasId,
        jurusanId: assignedJurusan,
        status: "AKTIF" as const,
      };

      store.users.push(newSiswa);
      saveStore(store);

      return NextResponse.json({ success: true, message: `Siswa ${nama} berhasil didaftarkan`, siswa: newSiswa });
    }

    if (action === "edit") {
      const target = store.users.find((u) => u.id === id && u.role === "SISWA");
      if (!target) {
        return NextResponse.json({ success: false, message: "Data siswa tidak ditemukan" }, { status: 404 });
      }

      target.name = nama || target.name;
      target.nisn = nisn || target.nisn;
      target.kelasId = kelasId || target.kelasId;
      target.jurusanId = jurusanId || target.jurusanId;
      target.email = email !== undefined ? email : target.email;

      saveStore(store);
      return NextResponse.json({ success: true, message: "Data siswa berhasil diperbarui", siswa: target });
    }

    if (action === "reset_password") {
      const target = store.users.find((u) => u.id === id && u.role === "SISWA");
      if (!target) {
        return NextResponse.json({ success: false, message: "Siswa tidak ditemukan" }, { status: 404 });
      }

      target.password = await hashPassword("siswa123");
      saveStore(store);

      return NextResponse.json({
        success: true,
        message: `Kata sandi untuk ${target.name} berhasil di-reset ke "siswa123"`,
      });
    }

    if (action === "toggle_status") {
      const target = store.users.find((u) => u.id === id && u.role === "SISWA");
      if (!target) {
        return NextResponse.json({ success: false, message: "Siswa tidak ditemukan" }, { status: 404 });
      }

      target.status = target.status === "NONAKTIF" ? "AKTIF" : "NONAKTIF";
      saveStore(store);

      return NextResponse.json({
        success: true,
        message: `Status siswa ${target.name} diubah menjadi ${target.status}`,
        status: target.status,
      });
    }

    if (action === "delete") {
      const index = store.users.findIndex((u) => u.id === id && u.role === "SISWA");
      if (index === -1) {
        return NextResponse.json({ success: false, message: "Data siswa tidak ditemukan" }, { status: 404 });
      }

      const deletedStudent = store.users[index];

      // Remove student from store.users
      store.users.splice(index, 1);

      // Clean up pesertaUjian records for this student
      store.pesertaUjian = store.pesertaUjian.filter((p) => p.siswaId !== id);

      saveStore(store);

      return NextResponse.json({
        success: true,
        message: `Data siswa ${deletedStudent.name} (NISN: ${deletedStudent.nisn || "-"}) berhasil dihapus dari sistem`,
      });
    }

    return NextResponse.json({ success: false, message: "Aksi tidak dikenal" }, { status: 400 });
  } catch (error) {
    console.error("POST Master Siswa Error:", error);
    return NextResponse.json({ success: false, message: "Gagal memproses data siswa" }, { status: 500 });
  }
}
