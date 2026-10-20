"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Radio,
  Users,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  Eye,
  FileDown,
  RefreshCw,
  Search,
  Filter,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { SessionUser } from "@/types";

interface PengawasDashboardProps {
  user: SessionUser;
}

export function PengawasDashboard({ user }: PengawasDashboardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    assignedExams: any[];
    participants: any[];
    violations: any[];
  }>({
    assignedExams: [],
    participants: [],
    violations: [],
  });

  const [selectedExamFilter, setSelectedExamFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);

    try {
      const res = await fetch("/api/pengawas/data");
      const resData = await res.json();
      if (resData.success) {
        setData({
          assignedExams: resData.assignedExams || [],
          participants: resData.participants || [],
          violations: resData.violations || [],
        });
      }
    } catch (err) {
      console.error("Gagal memuat data pengawas:", err);
      toast.error("Gangguan Server", "Gagal memperbarui data pengawasan.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    // Auto-refresh telemetry every 10 seconds for real-time monitoring
    const interval = setInterval(() => {
      loadData(true);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

  const { assignedExams, participants, violations } = data;
  const activeExams = assignedExams.filter((u) => u.status === "AKTIF");
  const workingParticipants = participants.filter((p) => p.status === "SEDANG_MENGERJAKAN");
  const finishedParticipants = participants.filter((p) => p.status === "SELESAI");
  const disqualifiedParticipants = participants.filter((p) => p.status === "DIDISKUALIFIKASI");

  // Filtered Participants List
  const filteredParticipants = participants.filter((p) => {
    const matchExam = selectedExamFilter === "ALL" || p.ujianId === selectedExamFilter;
    const matchStatus = statusFilter === "ALL" || p.status === statusFilter;
    const matchSearch =
      searchQuery === "" ||
      p.namaSiswa.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.nisn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.kelas.toLowerCase().includes(searchQuery.toLowerCase());
    return matchExam && matchStatus && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Proctor Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-purple-500/20 bg-gradient-to-r from-card via-purple-500/5 to-card p-6 sm:p-8 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="bg-background text-purple-600 dark:text-purple-400 border-purple-500/30 font-semibold">
                SMK Darussalam Panongan
              </Badge>
              <Badge className="bg-purple-600 hover:bg-purple-700 text-white font-semibold">
                Role: Pengawas Ujian
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                Live Sync Aktif
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Selamat Bertugas, {user.name}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Monitoring pelaksanaan ujian dan keamanan sistem. Anda hanya memiliki hak pantau pada sesi ujian yang ditugaskan kepada Anda.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              onClick={() => loadData(true)}
              variant="outline"
              size="sm"
              disabled={isRefreshing}
              className="text-xs font-semibold"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Menyegarkan..." : "Segarkan Data"}
            </Button>
            {activeExams.length > 0 && (
              <Button
                onClick={() => router.push(`/pengawas/${activeExams[0].id}`)}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-md shadow-purple-600/20"
              >
                <Radio className="w-4 h-4 mr-1.5 animate-pulse" />
                Live Proctoring ({activeExams[0].kodeUjian})
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 4 Metric Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Ujian Ditugaskan */}
        <Card className="border-border">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Ujian Ditugaskan</p>
              <p className="text-2xl font-black text-foreground mt-0.5">{assignedExams.length}</p>
              <p className="text-[11px] text-muted-foreground">Sesi tanggung jawab Anda</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <Radio className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Ujian Berlangsung */}
        <Card className="border-border">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Ujian Berlangsung</p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {activeExams.length}
              </p>
              <p className="text-[11px] text-muted-foreground">Status AKTIF saat ini</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <PlayCircle className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Peserta Mengerjakan */}
        <Card className="border-border">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Peserta Aktif</p>
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-0.5">
                {workingParticipants.length}
                <span className="text-xs font-normal text-muted-foreground ml-1.5">
                  / {participants.length} total
                </span>
              </p>
              <p className="text-[11px] text-muted-foreground">Sedang di ruang ujian</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Users className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Pelanggaran Terdeteksi */}
        <Card className="border-border">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Insiden Anti-Cheat</p>
              <p className={`text-2xl font-black mt-0.5 ${violations.length > 0 ? "text-destructive" : "text-emerald-600"}`}>
                {violations.length}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {disqualifiedParticipants.length > 0
                  ? `${disqualifiedParticipants.length} diskualifikasi`
                  : "Sistem terpantau aman"}
              </p>
            </div>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold ${
              violations.length > 0 ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-600"
            }`}>
              <ShieldAlert className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section: Ujian Yang Ditugaskan */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Radio className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                Daftar Ujian Yang Ditugaskan
              </CardTitle>
              <CardDescription className="text-xs">
                Sesi ujian resmi yang menjadi wewenang pengawasan Anda di SMK Darussalam Panongan.
              </CardDescription>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {assignedExams.length} Sesi Terdaftar
            </span>
          </div>
        </CardHeader>

        <CardContent>
          {assignedExams.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <ShieldCheck className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm font-semibold text-foreground">Belum Ada Sesi Ujian Ditugaskan</p>
              <p className="text-xs max-w-sm mx-auto mt-1">
                Akun pengawas Anda belum ditautkan ke sesi ujian aktif. Silakan hubungi Administrator atau Panitia Ujian Sekolah.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {assignedExams.map((ujian) => {
                const isActive = ujian.status === "AKTIF";
                return (
                  <div
                    key={ujian.id}
                    className={`rounded-xl border p-4 sm:p-5 flex flex-col justify-between transition-all ${
                      isActive
                        ? "border-purple-500/40 bg-purple-500/5 shadow-sm"
                        : "border-border bg-card"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <Badge
                          variant={isActive ? "success" : "secondary"}
                          className="text-[10px] font-semibold"
                        >
                          {isActive ? "SEDANG BERLANGSUNG" : ujian.status}
                        </Badge>
                        <span className="text-[11px] font-mono text-muted-foreground">
                          Kode: <strong className="text-foreground">{ujian.kodeUjian}</strong>
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-foreground leading-snug">
                        {ujian.judul}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {ujian.mataPelajaran} • Pengampu: {ujian.namaGuru}
                      </p>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-3 border-t border-border/60">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground/70" />
                          <span>Durasi: {ujian.durasiMenit} Menit</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-muted-foreground/70" />
                          <span>Peserta: {ujian.totalPeserta} Siswa</span>
                        </div>
                      </div>

                      {/* Participant Status Bar */}
                      <div className="mt-3 pt-3 border-t border-border/60 space-y-1.5">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-muted-foreground font-medium">Status Peserta Aktual:</span>
                          <span className="font-semibold text-foreground">
                            {ujian.pesertaMengerjakan} Mengerjakan • {ujian.pesertaSelesai} Selesai
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1 text-center text-[10px] font-medium">
                          <div className="p-1 rounded bg-muted/60 text-muted-foreground">
                            Belum: {ujian.pesertaBelumMulai}
                          </div>
                          <div className="p-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold">
                            Aktif: {ujian.pesertaMengerjakan}
                          </div>
                          <div className="p-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                            Selesai: {ujian.pesertaSelesai}
                          </div>
                          <div className={`p-1 rounded ${
                            ujian.pesertaDidiskualifikasi > 0
                              ? "bg-destructive/15 text-destructive font-bold"
                              : "bg-muted/60 text-muted-foreground"
                          }`}>
                            Diskualifikasi: {ujian.pesertaDidiskualifikasi}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        onClick={() => router.push(`/pengawas/${ujian.id}`)}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs flex-1 shadow-sm"
                      >
                        <Radio className="w-3.5 h-3.5 mr-1.5" />
                        Buka Live Proctoring
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedExamFilter(ujian.id)}
                        className="text-xs font-medium"
                      >
                        Lihat Peserta
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section: Daftar Peserta Ujian (Data Aktual) */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                Daftar Peserta Ujian & Status Pengerjaan (Aktual)
              </CardTitle>
              <CardDescription className="text-xs">
                Data real-time status pengerjaan, countdown timer sisa waktu, dan rekap pelanggaran.
              </CardDescription>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Exam select filter */}
              <select
                value={selectedExamFilter}
                onChange={(e) => setSelectedExamFilter(e.target.value)}
                className="h-9 px-3 rounded-lg border border-border bg-card text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="ALL">Semua Sesi Ujian ({participants.length})</option>
                {assignedExams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.kodeUjian} - {ex.judul}
                  </option>
                ))}
              </select>

              {/* Status select filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 px-3 rounded-lg border border-border bg-card text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="ALL">Semua Status</option>
                <option value="SEDANG_MENGERJAKAN">Sedang Mengerjakan</option>
                <option value="SELESAI">Selesai</option>
                <option value="BELUM_MULAI">Belum Mulai</option>
                <option value="DIDISKUALIFIKASI">Didiskualifikasi</option>
              </select>

              {/* Search box */}
              <div className="relative w-full sm:w-48">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Cari siswa / NISN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredParticipants.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <p className="text-xs">Tidak ada data peserta yang cocok dengan filter yang dipilih.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 border-y border-border text-[11px] text-muted-foreground uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">No</th>
                    <th className="py-3 px-4">Siswa</th>
                    <th className="py-3 px-4">Kelas</th>
                    <th className="py-3 px-4">Sesi Ujian</th>
                    <th className="py-3 px-4">Status Pengerjaan</th>
                    <th className="py-3 px-4">Sisa Waktu</th>
                    <th className="py-3 px-4">Pelanggaran</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-border divide-border">
                  {filteredParticipants.map((p, idx) => {
                    const formatMinutes = Math.floor(p.sisaWaktuDetik / 60);
                    const formatSecs = p.sisaWaktuDetik % 60;
                    return (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 text-muted-foreground font-mono">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-bold text-foreground text-sm">{p.namaSiswa}</p>
                            <p className="text-[11px] font-mono text-muted-foreground">
                              NISN: {p.nisn}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-foreground">{p.kelas}</td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-foreground truncate max-w-[160px]">
                            {p.judulUjian}
                          </p>
                          <p className="text-[10px] font-mono text-muted-foreground">{p.kodeUjian}</p>
                        </td>
                        <td className="py-3 px-4">
                          {p.status === "SEDANG_MENGERJAKAN" ? (
                            <Badge variant="info" className="text-[10px] font-semibold animate-pulse">
                              Sedang Mengerjakan
                            </Badge>
                          ) : p.status === "SELESAI" ? (
                            <Badge variant="success" className="text-[10px] font-semibold">
                              Selesai
                            </Badge>
                          ) : p.status === "DIDISKUALIFIKASI" ? (
                            <Badge variant="destructive" className="text-[10px] font-bold">
                              Didiskualifikasi
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] font-semibold">
                              Belum Mulai
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-foreground">
                          {p.status === "SEDANG_MENGERJAKAN" ? (
                            <span className="text-amber-600 dark:text-amber-400">
                              {formatMinutes}m {formatSecs}s
                            </span>
                          ) : p.status === "SELESAI" ? (
                            <span className="text-muted-foreground">-</span>
                          ) : (
                            <span className="text-muted-foreground">{p.durasiMenit}m</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {p.jumlahPelanggaran === 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Bersih
                            </span>
                          ) : p.jumlahPelanggaran >= 3 ? (
                            <span className="text-destructive font-black text-xs flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {p.jumlahPelanggaran} (Maks)
                            </span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {p.jumlahPelanggaran} Insiden
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section: Laporan Kejadian & Pelanggaran Anti-Cheat */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-destructive" />
                Laporan Insiden Anti-Cheat Sesi Pengawasan
              </CardTitle>
              <CardDescription className="text-xs">
                Audit trail rekaman kejadian kecurangan (pindah tab, keluar layar penuh, devtools, kamera).
              </CardDescription>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {violations.length} Kejadian Tercatat
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {violations.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5 opacity-80" />
              <p className="text-xs font-semibold text-foreground">Tidak Ada Pelanggaran</p>
              <p className="text-[11px]">Seluruh peserta pada sesi yang Anda awasi tertib dan taat tata tertib.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 border-y border-border text-[11px] text-muted-foreground uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Waktu (WIB)</th>
                    <th className="py-2.5 px-4">Peserta</th>
                    <th className="py-2.5 px-4">Ujian</th>
                    <th className="py-2.5 px-4">Jenis Pelanggaran</th>
                    <th className="py-2.5 px-4">Deskripsi Kejadian</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-border divide-border">
                  {violations.map((v) => (
                    <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-4 font-mono text-muted-foreground whitespace-nowrap">
                        {new Date(v.timestamp).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td className="py-2.5 px-4">
                        <p className="font-bold text-foreground">{v.namaSiswa}</p>
                        <p className="text-[10px] text-muted-foreground">{v.kelas}</p>
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground max-w-[150px] truncate">
                        {v.judulUjian}
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge variant="destructive" className="text-[10px] font-semibold">
                          {v.jenisPelanggaran}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground">
                        {v.deskripsi}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
