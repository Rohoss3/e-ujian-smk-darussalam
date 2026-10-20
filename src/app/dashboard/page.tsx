"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  BookOpen,
  Calendar,
  Radio,
  FileSpreadsheet,
  Award,
  ArrowRight,
  ShieldCheck,
  Clock,
  Sparkles,
  ArrowUpDown,
  Building2,
  AlertTriangle,
  PlayCircle,
  FileText,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PengawasDashboard } from "@/components/exam/PengawasDashboard";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SessionUser } from "@/types";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

        // Fetch dashboard stats
        const statsRes = await fetch("/api/dashboard/stats");
        const statsData = await statsRes.json();
        if (statsData.success) {
          setStats(statsData.stats);
        }

        // Fetch exam schedules
        const examRes = await fetch("/api/ujian/list");
        const examData = await examRes.json();
        if (examData.success) {
          setExams(examData.exams || []);
        }
      } catch (err) {
        console.error("Gagal memuat dashboard:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background p-6 space-y-6 max-w-7xl mx-auto">
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (user.role === "PENGAWAS") {
    return (
      <AppShell user={user}>
        <PengawasDashboard user={user} />
      </AppShell>
    );
  }

  const isAdminOrGuru = user.role === "ADMIN" || user.role === "GURU";

  return (
    <AppShell user={user}>
      <div className="space-y-6">
        {/* Welcome Hero Banner */}
        <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-r from-card to-muted/50 p-6 sm:p-8 shadow-sm">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-background text-primary border-primary/20">
                  {stats?.sekolahNama || "SMK Pusat Keunggulan"}
                </Badge>
                <Badge variant="info">Tahun Ajaran 2026/2027</Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Selamat Datang, {user.name}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
                {isAdminOrGuru
                  ? "Sistem pengawasan asesmen, manajemen bank soal, koreksi essay, dan live proctoring kejuruan berbasis browser."
                  : `Ruang pengerjaan ujian terpadu kelas ${user.kelas || "SMK"}. Patuhi tata tertib dan pengawasan anti-cheat saat sesi berlangsung.`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {isAdminOrGuru ? (
                <>
                  <Button
                    onClick={() => router.push("/manajemen-ujian")}
                    size="sm"
                    className="font-semibold shadow-sm"
                  >
                    <Calendar className="w-4 h-4 mr-1.5" />
                    Jadwal Ujian
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/bank-soal")}
                  >
                    <BookOpen className="w-4 h-4 mr-1.5" />
                    Bank Soal
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => router.push("/jadwal")}
                  size="sm"
                  className="font-semibold shadow-sm"
                >
                  <Calendar className="w-4 h-4 mr-1.5" />
                  Lihat Jadwal Ujian Saya
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Remedial Obligation Banner (Alert Merah Wajib) */}
        {user.role === "SISWA" && stats?.userStats?.remedialObligations?.length > 0 && (
          <div className="space-y-3">
            {stats.userStats.remedialObligations.map((item: any, idx: number) => (
              <div
                key={idx}
                className="relative overflow-hidden rounded-xl border-2 border-destructive/40 bg-destructive/10 p-5 sm:p-6 text-destructive-foreground shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-destructive text-destructive-foreground flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                      <AlertTriangle className="w-5 h-5 text-white" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="font-bold tracking-wide uppercase text-[10px] px-2.5 py-0.5">
                          REMEDIAL WAJIB
                        </Badge>
                        <span className="text-xs font-semibold text-destructive">
                          KKM: {item.kkm} • Nilai Anda: {item.totalNilai}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-foreground">
                        “Nilai Anda pada ujian {item.judulUjian} adalah {item.totalNilai}. KKM yang ditetapkan adalah {item.kkm}. Anda wajib mengikuti remedial.”
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.remedialUjianId
                          ? "Sesi ujian remedial telah diterbitkan oleh Guru Pengampu. Silakan ikuti remedial sekarang."
                          : "Silakan tunggu jadwal dan token ujian remedial resmi dari Guru Pengampu."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 sm:self-center">
                    {item.remedialUjianId ? (
                      <Button
                        onClick={() => router.push("/jadwal")}
                        className="bg-destructive hover:bg-destructive/90 text-white font-bold text-xs shadow-sm"
                        size="sm"
                      >
                        <PlayCircle className="w-4 h-4 mr-1.5" />
                        Ikuti Remedial Sekarang
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/hasil?ujianId=${item.ujianId}`)}
                        className="border-destructive/30 text-destructive hover:bg-destructive/10 text-xs font-semibold"
                      >
                        <FileText className="w-4 h-4 mr-1.5" />
                        Detail Hasil
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Analytics Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {isAdminOrGuru ? (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
                    Total Siswa Terdaftar
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalSiswa || 0}</div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Aktif di semua jurusan kejuruan
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
                    Bank Soal Asesmen
                  </CardTitle>
                  <BookOpen className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalBankSoal || 0}</div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {stats?.totalSoal || 0} butir soal terverifikasi
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
                    Sesi Ujian Aktif
                  </CardTitle>
                  <Radio className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold flex items-center gap-2">
                    {stats?.activeUjian || 0}
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      Live
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Monitoring Socket.io aktif
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
                    Standar Anti-Cheat
                  </CardTitle>
                  <ShieldCheck className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">Hardcore</div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Layar penuh + AI Face Proctor
                  </p>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
                    Ujian Terdaftar
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats?.userStats?.myExams || exams.length}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Mata pelajaran kejuruan & umum
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
                    Ujian Selesai
                  </CardTitle>
                  <Award className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats?.userStats?.completedExams || 0}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Sudah dikirim & dinilai
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
                    Rata-rata Nilai
                  </CardTitle>
                  <Sparkles className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats?.userStats?.avgScore || 0}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Skala penilaian 0 - 100
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
                    Catatan Disiplin
                  </CardTitle>
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats?.userStats?.totalViolations || 0}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Total peringatan integritas
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Quick Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/jadwal"
            className="group block p-5 rounded-xl border border-border bg-card hover:bg-muted/40 transition-all duration-200"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-semibold text-foreground flex items-center justify-between">
              <span>{isAdminOrGuru ? "Jadwal & Monitoring" : "Jadwal Ujian Siswa"}</span>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              {isAdminOrGuru
                ? "Buka ruang pengawas real-time via Socket.io dan live proctoring."
                : "Akses ruang ujian, masukkan token, dan ikuti asesmen kejuruan."}
            </p>
          </Link>

          <Link
            href={isAdminOrGuru ? "/hasil" : "/hasil"}
            className="group block p-5 rounded-xl border border-border bg-card hover:bg-muted/40 transition-all duration-200"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-semibold text-foreground flex items-center justify-between">
              <span>{isAdminOrGuru ? "Rekap Nilai & Koreksi" : "Riwayat Nilai Siswa"}</span>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-emerald-600 transition-colors" />
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              {isAdminOrGuru
                ? "Koreksi essay manual, export nilai Excel, dan download Berita Acara PDF."
                : "Lihat hasil nilai ujian PG & Essay yang telah diverifikasi guru."}
            </p>
          </Link>

          <Link
            href={isAdminOrGuru ? "/import-export" : "/unduhan"}
            className="group block p-5 rounded-xl border border-border bg-card hover:bg-muted/40 transition-all duration-200"
          >
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              {isAdminOrGuru ? <ArrowUpDown className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <h4 className="text-sm font-semibold text-foreground flex items-center justify-between">
              <span>{isAdminOrGuru ? "Import & Export Hub" : "Unduh Kartu Ujian"}</span>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-amber-600 transition-colors" />
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              {isAdminOrGuru
                ? "Bulk import Excel bank soal, daftar siswa, dan export rekap kelas resmi."
                : "Cetak kartu ujian peserta dan panduan teknis asesmen SMK."}
            </p>
          </Link>
        </div>

        {/* Active & Scheduled Exams Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Jadwal Ujian Terkini
              </h3>
              <p className="text-xs text-muted-foreground">
                Daftar sesi asesmen yang siap diakses
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/jadwal")}
            >
              Lihat Semua
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exams.slice(0, 3).map((ujian) => (
              <Card key={ujian.id} className="flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <Badge variant="outline" className="font-semibold text-[11px]">
                      {ujian.mataPelajaran}
                    </Badge>
                    <Badge variant={ujian.status === "BERJALAN" ? "success" : "secondary"}>
                      {ujian.status === "BERJALAN" ? "Sedang Berjalan" : "Siap"}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-bold leading-snug">
                    {ujian.judul}
                  </CardTitle>
                  <CardDescription className="text-xs line-clamp-2">
                    {ujian.deskripsi}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                  <div className="rounded-lg bg-muted/50 p-2.5 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Kode:</span>
                      <span className="font-mono font-semibold">{ujian.kodeUjian}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Durasi:</span>
                      <span className="font-medium flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        {ujian.durasiMenit} Menit
                      </span>
                    </div>
                  </div>

                  {user.role === "SISWA" ? (
                    <Button
                      onClick={() => router.push("/jadwal")}
                      className="w-full h-8 text-xs font-semibold"
                    >
                      Buka Ruang Ujian
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => router.push(`/pengawas/${ujian.id}`)}
                        className="flex-1 h-8 text-xs font-semibold"
                      >
                        <Radio className="w-3.5 h-3.5 mr-1" />
                        Pantau
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => router.push(`/hasil?ujianId=${ujian.id}`)}
                        className="h-8 px-2.5 text-xs"
                        title="Rekap Nilai"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
