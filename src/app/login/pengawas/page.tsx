"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Radio,
  Lock,
  User,
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  ArrowLeft,
  Activity,
  Wifi,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export default function LoginPengawasPage() {
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
        body: JSON.stringify({
          username: username.trim(),
          password,
          expectedRole: "PENGAWAS",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.message || "Gagal masuk. Periksa kembali kredensial pengawas Anda.");
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

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between selection:bg-purple-600 selection:text-white relative overflow-hidden transition-colors duration-200">
      {/* Background glow with purple-emerald harmonization */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[360px] bg-purple-600/10 blur-[130px] pointer-events-none rounded-full" />
      <div className="absolute bottom-0 right-10 w-96 h-96 bg-emerald-600/5 blur-[120px] pointer-events-none rounded-full" />

      {/* Top Navbar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="h-9 w-9 rounded-lg bg-white/90 dark:bg-card border border-border flex items-center justify-center p-0.5 shadow-sm group-hover:scale-105 transition-transform">
            <img src="/logo.png" alt="Logo SMK Darussalam Panongan" className="h-full w-full object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight text-foreground leading-none">
              SMK DARUSSALAM
            </span>
            <span className="text-[10px] text-muted-foreground font-medium">
              Panongan • Ruang Pengawas
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Portal Utama
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Form Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          <Card className="border-border shadow-2xl backdrop-blur-sm border-t-4 border-t-purple-600">
            <CardHeader className="text-center pb-4">
              {/* Official School Logo */}
              <div className="w-20 h-20 rounded-2xl bg-white/95 dark:bg-card border border-border shadow-md flex items-center justify-center mx-auto mb-3 p-1.5 transition-transform hover:scale-105 duration-200">
                <img
                  src="/logo.png"
                  alt="Logo SMK Darussalam Panongan"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 text-xs font-semibold mx-auto mb-2 border border-purple-500/20">
                <Radio className="w-3.5 h-3.5 animate-pulse text-purple-600 dark:text-purple-400" />
                Portal Pengawas Ujian
              </div>

              <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                Login Pengawas
              </CardTitle>
              <CardDescription className="text-xs max-w-xs mx-auto text-muted-foreground">
                Monitoring pelaksanaan ujian dan keamanan sistem SMK Darussalam Panongan
              </CardDescription>
            </CardHeader>

            <CardContent>
              {errorMessage && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <Input
                  label="Username / NIP Pengawas"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Contoh: pengawas_ruang1 atau NIP"
                  disabled={isLoading}
                />

                <div>
                  <label className="text-xs font-medium text-foreground block mb-1.5">
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
                      aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-10 font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Masuk sebagai Pengawas</span>
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>

              {/* Informational proctor note */}
              <div className="mt-5 p-3 rounded-xl bg-muted/40 border border-border text-[11px] text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  Hak Akses Terverifikasi
                </p>
                <p className="leading-relaxed">
                  Akun pengawas hanya memiliki hak pantau pada sesi ujian yang ditugaskan oleh pihak Panitia & Admin Sekolah.
                </p>
              </div>

              {/* Back to Home link */}
              <div className="mt-5 pt-4 border-t border-border text-center">
                <Link
                  href="/"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 font-medium"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Kembali ke Pilihan Portal Utama
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Feature Badges Footer */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              Real-time Telemetry
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Audit Trail Anti-Cheat
            </span>
            <span className="flex items-center gap-1.5">
              <Wifi className="w-4 h-4 text-blue-500" />
              Socket.io Live Sync
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full text-center py-4 text-xs text-muted-foreground border-t border-border/50">
        © 2026 SMK Darussalam Panongan • Platform Asesmen Kejuruan & Sistem Ujian Resmi.
      </footer>
    </div>
  );
}
