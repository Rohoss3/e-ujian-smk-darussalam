import { NextResponse } from "next/server";
import { TOKEN_COOKIE_NAME, getCurrentUser } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ success: true, message: "Berhasil keluar" });
  res.cookies.delete(TOKEN_COOKIE_NAME);
  return res;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, user });
}
