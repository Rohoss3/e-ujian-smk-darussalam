import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { loginUser } from "@/lib/services";
import { TOKEN_COOKIE_NAME } from "@/lib/auth";

const LoginSchema = z.object({
  username: z.string().min(1, "Username / NISN / NIP harus diisi"),
  password: z.string().min(1, "Kata sandi harus diisi"),
  expectedRole: z.enum(["ADMIN", "GURU", "SISWA", "PENGAWAS"]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { username, password, expectedRole } = parsed.data;
    const result = await loginUser(username, password, expectedRole);

    if (!result.success || !result.token) {
      return NextResponse.json({ success: false, message: result.message }, { status: 401 });
    }

    const res = NextResponse.json({
      success: true,
      user: result.user,
    });

    res.cookies.set({
      name: TOKEN_COOKIE_NAME,
      value: result.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 12, // 12 hours
      path: "/",
    });

    return res;
  } catch (error) {
    console.error("Login API Error:", error);
    return NextResponse.json({ success: false, message: "Terjadi kesalahan server" }, { status: 500 });
  }
}
