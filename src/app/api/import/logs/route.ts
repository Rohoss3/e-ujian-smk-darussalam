import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { loadStore } from "@/lib/data-store";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role === "SISWA") {
      return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
    }

    const store = loadStore();
    return NextResponse.json({
      success: true,
      logs: (store.importLogs || []).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    });
  } catch (error) {
    console.error("GET Import Logs Error:", error);
    return NextResponse.json({ success: false, message: "Gagal memuat log import" }, { status: 500 });
  }
}
