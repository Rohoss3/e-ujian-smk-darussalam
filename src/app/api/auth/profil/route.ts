import { NextResponse } from "next/server";
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { loadStore, saveStore } from "@/lib/data-store";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Akses tidak sah: Belum login" }, { status: 401 });
    }

    const body = await req.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    // Security Hardening: currentPassword is now strictly mandatory
    if (!currentPassword || typeof currentPassword !== "string") {
      return NextResponse.json(
        { success: false, message: "Kata sandi saat ini wajib diisi demi keamanan akun." },
        { status: 400 }
      );
    }

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: "Kata sandi baru minimal 6 karakter." },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, message: "Konfirmasi kata sandi tidak cocok." },
        { status: 400 }
      );
    }

    const store = loadStore();
    const targetUser = store.users.find((u) => u.id === user.id);
    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: "Pengguna tidak ditemukan." },
        { status: 404 }
      );
    }

    // Verify current password against database hash
    const isMatch = await verifyPassword(currentPassword, targetUser.password);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: "Kata sandi saat ini tidak valid." },
        { status: 400 }
      );
    }

    targetUser.password = await hashPassword(newPassword);
    saveStore(store);

    return NextResponse.json({
      success: true,
      message: "Kata sandi berhasil diperbarui.",
    });
  } catch (error) {
    console.error("Change Password Error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memperbarui kata sandi." },
      { status: 500 }
    );
  }
}
