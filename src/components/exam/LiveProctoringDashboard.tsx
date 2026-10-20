"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Users,
  ShieldAlert,
  AlertTriangle,
  Clock,
  Radio,
  Send,
  Ban,
  CheckCircle,
  Eye,
  Camera,
  Search,
  FileSpreadsheet,
  FileText,
  Filter,
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import { ProctorTelemetryEvent, JenisPelanggaran } from "@/types";
import { formatTime, formatDateIndo } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

interface LiveProctoringDashboardProps {
  ujianId: string;
  judulUjian: string;
  kodeUjian: string;
  initialPeserta: ProctorTelemetryEvent[];
}

export function LiveProctoringDashboard({
  ujianId,
  judulUjian,
  kodeUjian,
  initialPeserta,
}: LiveProctoringDashboardProps) {
  const { toast } = useToast();
  const [pesertaList, setPesertaList] = useState<ProctorTelemetryEvent[]>(initialPeserta);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // Warning Modal State
  const [warningModalTarget, setWarningModalTarget] = useState<ProctorTelemetryEvent | null>(null);
  const [warningMessage, setWarningMessage] = useState("Harap selalu menghadap ke monitor dan perhatikan kamera!");

  // Snapshot / Incident View Modal
  const [incidentModalTarget, setIncidentModalTarget] = useState<ProctorTelemetryEvent | null>(null);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io({ path: "/socket.io" });
    socketRef.current = socket;

    socket.emit("join_pengawas", { ujianId });

    // Real-time telemetry update
    socket.on("update_telemetri", (data: any) => {
      setPesertaList((prev) =>
        prev.map((p) =>
          p.pesertaUjianId === data.pesertaId
            ? {
                ...p,
                sisaWaktuDetik: data.sisaWaktuDetik,
                jumlahPelanggaran: data.jumlahPelanggaran,
                nomorAktif: data.nomorAktif,
                terjawab: data.terjawab,
                totalSoal: data.totalSoal,
              }
            : p
        )
      );
    });

    // Real-time violation incident with snapshot
    socket.on("insiden_pelanggaran", (data: any) => {
      setPesertaList((prev) =>
        prev.map((p) =>
          p.pesertaUjianId === data.pesertaId
            ? {
                ...p,
                jumlahPelanggaran: data.jumlahPelanggaran,
                lastSnapshot: data.snapshot,
                lastViolation: {
                  jenis: data.jenis as JenisPelanggaran,
                  deskripsi: data.deskripsi,
                  timestamp: data.receivedAt,
                },
              }
            : p
        )
      );
      toast.warning(
        `Pelanggaran Terdeteksi!`,
        `${data.siswaNama}: ${data.deskripsi}`
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [ujianId, toast]);

  const handleSendWarning = () => {
    if (!warningModalTarget || !socketRef.current) return;
    socketRef.current.emit("kirim_peringatan_siswa", {
      pesertaId: warningModalTarget.pesertaUjianId,
      pesan: warningMessage,
    });
    toast.success("Peringatan Terkirim", `Pesan telah muncul di layar ${warningModalTarget.siswaNama}.`);
    setWarningModalTarget(null);
  };

  const handleForceSubmit = (target: ProctorTelemetryEvent) => {
    if (!confirm(`Yakin ingin memaksa selesai ujian siswa: ${target.siswaNama}?`)) return;
    if (socketRef.current) {
      socketRef.current.emit("paksa_kumpulkan_siswa", {
        pesertaId: target.pesertaUjianId,
        alasan: "Dihentikan oleh Pengawas Ruang Ujian.",
      });
      toast.info("Ujian Dihentikan", `Pengerjaan ${target.siswaNama} telah dihentikan.`);
    }
  };

  const filteredPeserta = pesertaList.filter((p) => {
    const matchesSearch =
      p.siswaNama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.kelompokKelas.toLowerCase().includes(searchQuery.toLowerCase());

    if (filterStatus === "ALL") return matchesSearch;
    if (filterStatus === "SEDANG_MENGERJAKAN") {
      return matchesSearch && p.status === "SEDANG_MENGERJAKAN";
    }
    if (filterStatus === "VIOLATION") {
      return matchesSearch && p.jumlahPelanggaran > 0;
    }
    if (filterStatus === "SELESAI") {
      return matchesSearch && p.status === "SELESAI";
    }
    return matchesSearch;
  });

  const totalSiswa = pesertaList.length;
  const activeSiswa = pesertaList.filter((p) => p.status === "SEDANG_MENGERJAKAN").length;
  const totalPelanggaran = pesertaList.reduce((acc, curr) => acc + curr.jumlahPelanggaran, 0);

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              Total Peserta
            </span>
            <Users className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold mt-1 text-foreground">{totalSiswa} Siswa</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Terkonfirmasi di kelas ujian</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              Sedang Mengerjakan
            </span>
            <Radio className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            {activeSiswa}
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              Aktif
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Kamera & anti-cheat sinkron</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              Total Pelanggaran
            </span>
            <ShieldAlert className="w-4 h-4 text-destructive" />
          </div>
          <div className="text-2xl font-bold mt-1 text-destructive">{totalPelanggaran}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Insiden dicatat secara otomatis</p>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama peserta atau NISN..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="ALL">Semua Peserta ({pesertaList.length})</option>
            <option value="SEDANG_MENGERJAKAN">Sedang Berjalan</option>
            <option value="VIOLATION">Ada Pelanggaran</option>
            <option value="SELESAI">Sudah Selesai</option>
          </select>
        </div>
      </div>

      {/* Student Proctoring Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPeserta.map((p) => {
          const hasViolations = p.jumlahPelanggaran > 0;
          const isDone = p.status === "SELESAI";

          return (
            <Card
              key={p.pesertaUjianId}
              className={`flex flex-col justify-between overflow-hidden transition-all ${
                hasViolations
                  ? "border-destructive/40 shadow-destructive/5"
                  : "border-border"
              }`}
            >
              <CardHeader className="pb-3 border-b border-border bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="truncate pr-2">
                    <h3 className="font-bold text-sm text-foreground truncate">
                      {p.siswaNama}
                    </h3>
                    <p className="text-[11px] font-mono text-muted-foreground">
                      ID: {p.siswaId} • {p.kelompokKelas}
                    </p>
                  </div>
                  <Badge
                    variant={
                      isDone
                        ? "secondary"
                        : p.status === "SEDANG_MENGERJAKAN"
                        ? "success"
                        : "outline"
                    }
                    className="shrink-0 text-[10px]"
                  >
                    {isDone ? "Selesai" : "Mengerjakan"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  {/* Camera Thumbnail Preview */}
                  <div className="w-24 h-20 bg-muted rounded-lg overflow-hidden shrink-0 flex items-center justify-center relative border border-border">
                    {p.lastSnapshot ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.lastSnapshot}
                        alt="Webcam snapshot"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center text-muted-foreground text-[10px]">
                        <Camera className="w-5 h-5 mb-1" />
                        <span>Live Cam</span>
                      </div>
                    )}

                    {hasViolations && (
                      <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-destructive animate-ping" />
                    )}
                  </div>

                  {/* Progress Details */}
                  <div className="flex-1 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Progres:</span>
                      <span className="font-semibold text-foreground">
                        {p.terjawab} / {p.totalSoal} Soal
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sisa Waktu:</span>
                      <span className="font-mono font-bold text-primary">
                        {formatTime(p.sisaWaktuDetik)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Pelanggaran:</span>
                      <Badge
                        variant={hasViolations ? "destructive" : "outline"}
                        className="text-[10px] px-2 py-0"
                      >
                        {p.jumlahPelanggaran} Kali
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Incident Alert Strip if any */}
                {p.lastViolation && (
                  <div className="p-2.5 bg-destructive/10 text-[11px] text-destructive rounded-lg border border-destructive/20 flex items-center justify-between">
                    <span className="truncate pr-1">
                      <strong>{p.lastViolation.jenis}:</strong> {p.lastViolation.deskripsi}
                    </span>
                    <button
                      onClick={() => setIncidentModalTarget(p)}
                      className="font-bold underline text-[10px] shrink-0"
                    >
                      Bukti Foto
                    </button>
                  </div>
                )}
              </CardContent>

              {/* Action Buttons */}
              <div className="p-3 bg-muted/30 border-t border-border flex items-center justify-between gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setWarningModalTarget(p);
                    setWarningMessage("Perhatian: Jangan menoleh atau membuka aplikasi lain!");
                  }}
                  className="flex-1 h-8 text-xs font-semibold"
                >
                  <Send className="w-3.5 h-3.5 mr-1 text-amber-500" />
                  Kirim Peringatan
                </Button>

                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleForceSubmit(p)}
                  className="h-8 px-2.5 text-xs font-semibold"
                  title="Paksa Selesai"
                >
                  <Ban className="w-3.5 h-3.5 mr-1" />
                  Hentikan
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Warning Message Dialog */}
      <Dialog
        open={!!warningModalTarget}
        onOpenChange={(open) => !open && setWarningModalTarget(null)}
        size="md"
      >
        {warningModalTarget && (
          <>
            <DialogHeader>
              <DialogTitle>Kirim Peringatan ke Layar Siswa</DialogTitle>
              <DialogDescription>
                Pesan ini akan muncul seketika sebagai pop-up audio pada layar{" "}
                <strong className="text-foreground">{warningModalTarget.siswaNama}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="pt-4 space-y-4">
              <Textarea
                rows={3}
                value={warningMessage}
                onChange={(e) => setWarningMessage(e.target.value)}
                placeholder="Tulis pesan teguran..."
              />

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setWarningModalTarget(null)}
                >
                  Batal
                </Button>
                <Button onClick={handleSendWarning}>
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Kirim Peringatan
                </Button>
              </DialogFooter>
            </div>
          </>
        )}
      </Dialog>

      {/* Incident Proof / Snapshot Dialog */}
      <Dialog
        open={!!incidentModalTarget}
        onOpenChange={(open) => !open && setIncidentModalTarget(null)}
        size="md"
      >
        {incidentModalTarget && incidentModalTarget.lastViolation && (
          <>
            <DialogHeader>
              <DialogTitle>Bukti Tangkapan AI Proctoring</DialogTitle>
              <DialogDescription>
                {incidentModalTarget.siswaNama} • {incidentModalTarget.kelompokKelas}
              </DialogDescription>
            </DialogHeader>

            <div className="pt-4 space-y-4 text-center">
              <div className="aspect-[4/3] bg-muted rounded-xl overflow-hidden border border-border flex items-center justify-center">
                {incidentModalTarget.lastSnapshot ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={incidentModalTarget.lastSnapshot}
                    alt="Snapshot Bukti"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <p className="text-xs text-muted-foreground">Snapshot webcam tidak tersedia.</p>
                )}
              </div>

              <div className="bg-destructive/10 p-3 rounded-lg text-left text-xs border border-destructive/20 space-y-1">
                <p className="font-bold text-destructive">
                  Jenis: {incidentModalTarget.lastViolation.jenis}
                </p>
                <p className="text-muted-foreground">
                  {incidentModalTarget.lastViolation.deskripsi}
                </p>
              </div>

              <DialogFooter>
                <Button
                  className="w-full"
                  onClick={() => setIncidentModalTarget(null)}
                >
                  Tutup Pratinjau
                </Button>
              </DialogFooter>
            </div>
          </>
        )}
      </Dialog>
    </div>
  );
}
