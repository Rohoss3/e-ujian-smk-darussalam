import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { loadStore } from "@/lib/data-store";

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: RouteProps) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role === "SISWA") {
      return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
    }

    const { id: kelasId } = await params;
    const store = loadStore();

    const targetKelas = store.kelas.find((k) => k.id === kelasId);
    if (!targetKelas) {
      return NextResponse.json({ success: false, message: "Kelas tidak ditemukan" }, { status: 404 });
    }

    const siswaList = store.users
      .filter((u) => u.role === "SISWA" && u.kelasId === kelasId)
      .map((s) => ({
        id: s.id,
        nama: s.name,
        username: s.username,
        nisn: s.nisn || "-",
        email: s.email || "-",
        status: s.status || "AKTIF",
      }));

    return NextResponse.json({
      success: true,
      kelasNama: targetKelas.nama,
      siswa: siswaList,
      total: siswaList.length,
    });
  } catch (error) {
    console.error("GET Kelas Siswa Error:", error);
    return NextResponse.json({ success: false, message: "Gagal memuat siswa di kelas" }, { status: 500 });
  }
}
