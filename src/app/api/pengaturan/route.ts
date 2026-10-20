import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { loadStore, saveStore } from "@/lib/data-store";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Belum terautentikasi" }, { status: 401 });
    }

    const store = loadStore();
    return NextResponse.json({ success: true, sekolah: store.sekolah });
  } catch (error) {
    console.error("GET Pengaturan Error:", error);
    return NextResponse.json({ success: false, message: "Gagal memuat profil sekolah" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Hanya Admin yang dapat mengubah profil sekolah" }, { status: 403 });
    }

    const body = await req.json();
    const { nama, npsn, alamat, logoUrl, kepalaSekolah, nipKepala } = body;

    const store = loadStore();
    store.sekolah = {
      id: store.sekolah?.id || "sekolah-smk-01",
      nama: nama || store.sekolah.nama,
      npsn: npsn || store.sekolah.npsn,
      alamat: alamat || store.sekolah.alamat,
      logoUrl: logoUrl || store.sekolah.logoUrl,
      kepalaSekolah: kepalaSekolah || store.sekolah.kepalaSekolah,
      nipKepala: nipKepala || store.sekolah.nipKepala,
    };

    saveStore(store);

    return NextResponse.json({
      success: true,
      message: "Profil sekolah berhasil diperbarui",
      sekolah: store.sekolah,
    });
  } catch (error) {
    console.error("POST Pengaturan Error:", error);
    return NextResponse.json({ success: false, message: "Gagal menyimpan profil sekolah" }, { status: 500 });
  }
}
