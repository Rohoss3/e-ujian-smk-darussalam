import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPengawasDetailData } from "@/lib/services";
import { loadStore } from "@/lib/data-store";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Belum terautentikasi" }, { status: 401 });
    }

    if (user.role !== "PENGAWAS" && user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Akses ditolak: Hanya Pengawas Ujian & Administrator yang diizinkan." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const targetProctorId = user.role === "ADMIN" ? searchParams.get("pengawasId") || user.id : user.id;

    const data = getPengawasDetailData(targetProctorId);

    // If Admin wants list of all proctors to view
    let allProctors: any[] = [];
    if (user.role === "ADMIN") {
      const store = loadStore();
      allProctors = store.users
        .filter((u) => u.role === "PENGAWAS")
        .map((p) => ({
          id: p.id,
          nama: p.name,
          username: p.username,
          nip: p.nip || "-",
        }));
    }

    return NextResponse.json({
      success: true,
      proctorId: targetProctorId,
      allProctors,
      ...data,
    });
  } catch (error) {
    console.error("GET Pengawas Data Error:", error);
    return NextResponse.json({ success: false, message: "Gagal memuat data pengawasan" }, { status: 500 });
  }
}
