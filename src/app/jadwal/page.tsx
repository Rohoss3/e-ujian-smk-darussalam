"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  KeyRound,
  ShieldAlert,
  PlayCircle,
  Eye,
  CheckCircle,
  AlertTriangle,
  Radio,
  FileText,
  Users,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { SessionUser } from "@/types";

export default function JadwalPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Token Modal
  const [selectedExam, setSelectedExam] = useState<any | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

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

        // Fetch exam schedules
        const res = await fetch("/api/ujian/list");
        const data = await res.json();
        if (data.success) {
          setExams(data.exams || []);
        }
      } catch (err) {
        console.error("Gagal memuat jadwal:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  const handleStartExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExam) return;
    setIsVerifying(true);
    setTokenError(null);

    try {
      const res = await fetch("/api/ujian/mulai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ujianId: selectedExam.id,
          tokenUjian: tokenInput,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setTokenError(data.message || "Token ujian tidak valid.");
        return;
      }

      // Redirect to Exam Room
      router.push(`/ujian/${selectedExam.id}`);
    } catch {
      setTokenError("Terjadi gangguan koneksi server.");
    } finally {
      setIsVerifying(false);
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
      <div className="space-y-6">
        {/* Banner Section */}
        <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-r from-card to-muted/40 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <Badge variant="outline" className="border-primary/20 bg-background text-primary">
                <ShieldAlert className="w-3.5 h-3.5 mr-1" />
                Sistem Asesmen Resmi SMK
              </Badge>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {user.role === "SISWA"
                  ? `Jadwal Ujian Siswa • ${user.kelas || "SMK"}`
                  : "Pusat Kontrol Jadwal & Pengawas Ujian"}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
                {user.role === "SISWA"
                  ? "Pastikan kamera (webcam) aktif dan Anda siap memasuki mode Layar Penuh (Fullscreen) sebelum memasukkan token ujian."
                  : "Pantau pengerjaan siswa secara real-time via Socket.io, lakukan live proctoring, dan kelola insiden kecurangan."}
              </p>
            </div>

            {user.role !== "SISWA" && (
              <Button
                onClick={() => router.push("/manajemen-ujian")}
                size="sm"
                className="font-semibold shadow-sm shrink-0"
              >
                Kelola Jadwal & Ujian
              </Button>
            )}
          </div>
        </div>

        {/* Schedule List Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Daftar Ujian Terjadwal
            </h2>
            <span className="text-xs text-muted-foreground font-medium">
              Total {exams.length} Jadwal Tersedia
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exams.map((ujian) => {
              const isFinished = ujian.pesertaStatus === "SELESAI";
              const isInProgress = ujian.pesertaStatus === "SEDANG_MENGERJAKAN";
              const isDisqualified = ujian.pesertaStatus === "DIDISKUALIFIKASI";

              return (
                <Card key={ujian.id} className="flex flex-col justify-between hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-xs font-semibold">
                          {ujian.mataPelajaran}
                        </Badge>
                        {ujian.isRemedial && (
                          <Badge variant="destructive" className="text-[9px] px-1.5 py-0 font-bold uppercase tracking-wider">
                            REMEDIAL
                          </Badge>
                        )}
                      </div>

                      {user.role === "SISWA" ? (
                        <Badge
                          variant={
                            isFinished
                              ? "secondary"
                              : isDisqualified
                              ? "destructive"
                              : isInProgress
                              ? "warning"
                              : "default"
                          }
                          className="uppercase text-[10px]"
                        >
                          {isFinished
                            ? "Selesai"
                            : isDisqualified
                            ? "Didiskualifikasi"
                            : isInProgress
                            ? "Sedang Berjalan"
                            : "Siap"}
                        </Badge>
                      ) : (
                        <Badge variant="success" className="flex items-center gap-1 text-[10px] uppercase">
                          <Radio className="w-3 h-3 animate-ping" /> Live
                        </Badge>
                      )}
                    </div>

                    <CardTitle className="text-base font-bold leading-snug">
                      {ujian.judul}
                    </CardTitle>
                    <CardDescription className="text-xs line-clamp-2">
                      {ujian.deskripsi}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-0">
                    {/* Metadata Specs */}
                    <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1.5 border border-border">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Kode Ujian:</span>
                        <span className="font-mono font-semibold text-foreground">{ujian.kodeUjian}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Durasi & KKM:</span>
                        <span className="font-semibold text-foreground flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-primary" />
                          {ujian.durasiMenit} Menit • KKM: <strong>{ujian.kkm || 75}</strong>
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Maks. Pelanggaran:</span>
                        <span className="font-bold text-destructive">
                          {ujian.maxPelanggaran} Kali (Auto-Diskualifikasi)
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div>
                      {user.role === "SISWA" ? (
                        isFinished ? (
                          <div className="space-y-2">
                            <Button
                              variant="secondary"
                              onClick={() => router.push(`/hasil?ujianId=${ujian.id}`)}
                              className="w-full font-semibold"
                              size="sm"
                            >
                              <Eye className="w-4 h-4 mr-1.5" />
                              Lihat Hasil & Nilai
                            </Button>
                            {ujian.statusKelulusan === "REMEDIAL" && ujian.remedialUjianId && (
                              <Button
                                onClick={() => {
                                  const targetRem = exams.find((e) => e.id === ujian.remedialUjianId);
                                  if (targetRem) {
                                    setSelectedExam(targetRem);
                                    setTokenInput(targetRem.tokenUjian || "");
                                  }
                                }}
                                className="w-full bg-destructive text-white hover:bg-destructive/90 font-bold text-xs shadow-sm"
                                size="sm"
                              >
                                <PlayCircle className="w-3.5 h-3.5 mr-1" />
                                Ikuti Ujian Remedial
                              </Button>
                            )}
                          </div>
                        ) : isDisqualified ? (
                          <div className="w-full py-2 rounded-lg font-semibold text-xs bg-destructive/10 text-destructive text-center border border-destructive/20">
                            Ujian Dihentikan (Pelanggaran)
                          </div>
                        ) : isInProgress ? (
                          <Button
                            onClick={() => router.push(`/ujian/${ujian.id}`)}
                            className="w-full font-semibold bg-amber-500 hover:bg-amber-600 text-white"
                            size="sm"
                          >
                            <PlayCircle className="w-4 h-4 mr-1.5" />
                            Lanjutkan Pengerjaan Ujian
                          </Button>
                        ) : ujian.isRemedial && !ujian.isEligibleRemedial ? (
                          <div className="w-full py-2.5 px-3 rounded-lg bg-muted text-center border border-border">
                            <span className="text-xs font-semibold text-muted-foreground block">
                              🔒 Khusus Siswa Remedial
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              Hanya untuk siswa belum tuntas KKM pada ujian utama.
                            </span>
                          </div>
                        ) : (
                          <Button
                            onClick={() => {
                              setSelectedExam(ujian);
                              setTokenInput(ujian.tokenUjian || "SMK2026");
                            }}
                            className={`w-full font-semibold shadow-sm ${
                              ujian.isRemedial ? "bg-destructive hover:bg-destructive/90 text-white font-bold" : ""
                            }`}
                            size="sm"
                          >
                            <KeyRound className="w-4 h-4 mr-1.5" />
                            {ujian.isRemedial ? "Mulai Ujian Remedial" : "Masukkan Token & Mulai Ujian"}
                          </Button>
                        )
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => router.push(`/pengawas/${ujian.id}`)}
                            className="flex-1 font-semibold"
                            size="sm"
                          >
                            <Radio className="w-3.5 h-3.5 mr-1.5" />
                            Live Proctoring
                          </Button>
                          {user?.role !== "PENGAWAS" && (
                            <Button
                              variant="outline"
                              onClick={() => router.push(`/hasil?ujianId=${ujian.id}`)}
                              size="sm"
                              className="px-2.5"
                              title="Rekap Nilai"
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Token Entry Dialog */}
        <Dialog open={!!selectedExam} onOpenChange={(open) => !open && setSelectedExam(null)} size="sm">
          {selectedExam && (
            <>
              <DialogHeader className="text-center pb-2">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mx-auto mb-2 border border-primary/20">
                  <KeyRound className="w-6 h-6" />
                </div>
                <DialogTitle className="text-center">Masukkan Token Ujian</DialogTitle>
                <DialogDescription className="text-center">
                  Minta token kepada pengawas kelas. (Demo token: <code className="font-bold text-primary">SMK2026</code>)
                </DialogDescription>
              </DialogHeader>

              {tokenError && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold border border-destructive/20 flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{tokenError}</span>
                </div>
              )}

              <form onSubmit={handleStartExam} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1 text-center">
                    Token Ujian
                  </label>
                  <input
                    type="text"
                    required
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                    placeholder="SMK2026"
                    className="w-full h-11 rounded-lg border border-input bg-background text-foreground font-mono text-center text-lg tracking-widest font-black uppercase focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>

                <div className="bg-amber-500/10 p-3 rounded-lg border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-400 space-y-1">
                  <p className="font-semibold">⚠️ Ketentuan Pengawasan Anti-Cheat:</p>
                  <p>Browser akan mengunci ke mode Layar Penuh dan mengaktifkan AI Face Proctoring melalui webcam Anda.</p>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedExam(null)}
                  >
                    Batal
                  </Button>
                  <Button type="submit" disabled={isVerifying}>
                    {isVerifying ? "Memverifikasi..." : "Konfirmasi Masuk"}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </Dialog>
      </div>
    </AppShell>
  );
}
