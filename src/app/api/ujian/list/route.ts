import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getJadwalUjianForUser } from "@/lib/services";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Akses tidak sah" }, { status: 401 });
    }

    const exams = getJadwalUjianForUser(user);
    return NextResponse.json(
      { success: true, exams },
      {
        headers: {
          "Cache-Control": "private, max-age=3, stale-while-revalidate=6",
        },
      }
    );
  } catch (error) {
    console.error("List Ujian Error:", error);
    return NextResponse.json({ success: false, message: "Gagal memuat daftar ujian" }, { status: 500 });
  }
}
