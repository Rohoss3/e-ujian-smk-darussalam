"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  UserCheck,
  Lock,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  Calendar,
  Building,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { SessionUser } from "@/types";

export default function ProfilPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const meRes = await fetch("/api/auth/me");
        const meData = await meRes.json();
        if (!meRes.ok || !meData.authenticated) {
          router.push("/");
          return;
        }
        setUser(meData.user);
      } catch (err) {
        console.error("Gagal memuat profil:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Validasi Gagal", "Kata sandi baru minimal 6 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Validasi Gagal", "Konfirmasi kata sandi tidak cocok.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch("/api/auth/profil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error("Gagal Memperbarui", data.message || "Terjadi kesalahan.");
        return;
      }

      toast.success("Sandi Diperbarui", "Kata sandi akun Anda berhasil diganti.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error("Gangguan Server", "Gagal menghubungi server.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AppShell user={user}>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-primary" />
            Profil Pengguna & Keamanan Akun
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Informasi identitas akun, peranan dalam asesmen, dan pengaturan keamanan kata sandi.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Identity Card */}
          <div className="md:col-span-1 space-y-4">
            <Card className="text-center p-6">
              <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/20 text-primary font-black text-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                {user.name.charAt(0)}
              </div>
              <h3 className="font-bold text-base text-foreground">{user.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {user.nisn ? `NISN: ${user.nisn}` : user.nip ? `NIP: ${user.nip}` : `@${user.username}`}
              </p>

              <div className="mt-3">
                <Badge variant="default" className="uppercase font-semibold">
                  {user.role}
                </Badge>
              </div>

              <div className="mt-6 pt-4 border-t border-border text-left text-xs space-y-2 text-muted-foreground">
                <div className="flex justify-between">
                  <span>Username:</span>
                  <span className="font-semibold text-foreground font-mono">{user.username}</span>
                </div>
                {user.kelas && (
                  <div className="flex justify-between">
                    <span>Kelas:</span>
                    <span className="font-semibold text-foreground">{user.kelas}</span>
                  </div>
                )}
                {user.jurusan && (
                  <div className="flex justify-between">
                    <span>Jurusan:</span>
                    <span className="font-semibold text-foreground">{user.jurusan}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Sesi Login:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Aktif</span>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-muted/40 text-xs text-muted-foreground space-y-2">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span>Keamanan Sesi JWT</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Token enkripsi tersimpan secara HttpOnly di browser. Sesi akan otomatis diperpanjang saat aktif.
              </p>
            </Card>
          </div>

          {/* Change Password Form */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-primary" />
                  Ganti Kata Sandi
                </CardTitle>
                <CardDescription className="text-xs">
                  Gunakan kombinasi minimal 6 karakter untuk menjaga keamanan akun Anda.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form id="password-form" onSubmit={handleChangePassword} className="space-y-4">
                  <Input
                    label="Kata Sandi Saat Ini"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Masukkan sandi saat ini"
                  />

                  <Input
                    label="Kata Sandi Baru"
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                  />

                  <Input
                    label="Konfirmasi Kata Sandi Baru"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi kata sandi baru"
                  />
                </form>
              </CardContent>

              <CardFooter className="flex justify-end pt-4 border-t border-border">
                <Button
                  type="submit"
                  form="password-form"
                  disabled={isChangingPassword}
                  className="font-semibold shadow-sm"
                >
                  <Lock className="w-4 h-4 mr-1.5" />
                  {isChangingPassword ? "Menyimpan Sandi..." : "Perbarui Kata Sandi"}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
