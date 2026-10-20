"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  GraduationCap,
  BookOpen,
  Radio,
  ShieldCheck,
  User,
  Lock,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Camera,
  Wifi,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.message || "Gagal masuk. Periksa kembali kredensial Anda.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setErrorMessage("Terjadi gangguan koneksi server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between selection:bg-teal-600 selection:text-white relative overflow-hidden transition-colors duration-200">
      {/* Background Harmonization (Teal, Green, & subtle Purple) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[360px] bg-teal-600/10 blur-[130px] pointer-events-none rounded-full" />
      <div className="absolute top-1/3 right-10 w-80 h-80 bg-purple-600/10 blur-[130px] pointer-events-none rounded-full" />

      {/* Top bar with Logo & Theme toggle */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/95 dark:bg-card border border-border flex items-center justify-center p-1 shadow-sm">
            <img
              src="/logo.png"
              alt="Logo SMK Darussalam Panongan"
              className="h-full w-full object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-foreground leading-none">
              SMK DARUSSALAM PANONGAN
            </span>
            <span className="text-[11px] text-muted-foreground font-medium">
              Platform E-Ujian & Asesmen Berbasis Komputer
            </span>
          </div>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-6 sm:py-8">
        <div className="w-full max-w-6xl mx-auto">
          {/* Section: 4 Role Cards */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 text-xs font-semibold mb-2 border border-teal-500/20">
              <Sparkles className="w-3.5 h-3.5" />
              Sistem Asesmen Terpadu & Multi-Role
            </div>
            <h1 className="text-xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Portal Asesmen & Ujian CBT
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto mt-1">
              Silakan pilih portal akses yang sesuai dengan peran dan penugasan Anda.
            </p>
          </div>

          {/* 4 Cards Grid: Responsive (1 col mobile, 2 cols tablet, 4 cols desktop) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* 1. Card Siswa */}
            <div
              onClick={() => handleQuickLogin("siswa_rpl", "siswa123")}
              className="p-5 rounded-2xl border border-border bg-card/80 hover:bg-card hover:border-teal-500/50 hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 flex items-center justify-center font-bold mb-3 group-hover:scale-105 transition-transform">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-foreground">Siswa</h3>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300">
                    Peserta
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Mengikuti ujian daring, melihat jadwal sesi, dan riwayat nilai asesmen.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-teal-600 dark:text-teal-400">
                <span>Pilih Siswa</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* 2. Card Guru */}
            <div
              onClick={() => handleQuickLogin("guru_rpl", "guru123")}
              className="p-5 rounded-2xl border border-border bg-card/80 hover:bg-card hover:border-emerald-500/50 hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold mb-3 group-hover:scale-105 transition-transform">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-foreground">Guru Pengampu</h3>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                    Pendidik
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Pembuatan bank soal, pengelolaan jadwal ujian, dan penilaian koreksi essay.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <span>Pilih Guru</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* 3. Card Pengawas (Kartu Keempat Aksen Ungu) */}
            <Link
              href="/login/pengawas"
              className="p-5 rounded-2xl border-2 border-purple-500/40 bg-purple-500/5 hover:bg-purple-500/10 hover:border-purple-600 hover:shadow-lg transition-all duration-200 flex flex-col justify-between group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 blur-xl pointer-events-none rounded-full" />
              <div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center font-bold mb-3 group-hover:scale-105 transition-transform">
                  <Radio className="w-6 h-6 animate-pulse" />
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-foreground">Pengawas</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300">
                    Proktor
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Monitoring pelaksanaan ujian dan keamanan sistem.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-purple-500/20 flex items-center justify-between text-xs font-bold text-purple-600 dark:text-purple-400">
                <span>Buka Login Pengawas</span>
                <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* 4. Card Admin */}
            <div
              onClick={() => handleQuickLogin("admin", "admin123")}
              className="p-5 rounded-2xl border border-border bg-card/80 hover:bg-card hover:border-blue-500/50 hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold mb-3 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-foreground">Administrator</h3>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300">
                    Admin
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Manajemen kurikulum, master jurusan, kelas, dan akun seluruh pengguna.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400">
                <span>Pilih Admin</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          {/* Login Form Box */}
          <div className="max-w-md mx-auto">
            <Card className="border-border shadow-xl backdrop-blur-sm">
              <CardHeader className="text-center pb-3">
                <CardTitle className="text-xl font-bold tracking-tight">
                  Masuk ke Akun
                </CardTitle>
                <CardDescription className="text-xs">
                  Gunakan NISN / NIP / Username yang telah didaftarkan
                </CardDescription>
              </CardHeader>

              <CardContent>
                {errorMessage && (
                  <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-3.5">
                  <Input
                    label="Username / NISN / NIP"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Contoh: siswa_rpl atau 0068192841"
                    disabled={isLoading}
                  />

                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1">
                      Kata Sandi
                    </label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        disabled={isLoading}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-10 font-semibold shadow-md bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Masuk ke Akun</span>
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>

                {/* Direct Proctor Login Shortcut Note */}
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Petugas Pengawas?</span>
                  <Link
                    href="/login/pengawas"
                    className="font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                  >
                    <Radio className="w-3.5 h-3.5" />
                    Login Portal Pengawas
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Badges footer */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Anti-Cheat Hardcore
              </span>
              <span className="flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                AI Face Proctoring
              </span>
              <span className="flex items-center gap-1.5">
                <Wifi className="w-4 h-4 text-amber-500" />
                PWA Serwist Offline
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full text-center py-4 text-xs text-muted-foreground border-t border-border/50">
        © 2026 SMK Darussalam Panongan • Standar Asesmen Kejuruan & Ujian Nasional Berbasis Komputer.
      </footer>
    </div>
  );
}
