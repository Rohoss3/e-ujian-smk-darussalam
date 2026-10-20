"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpDown,
  UploadCloud,
  FileSpreadsheet,
  Download,
  FileText,
  ShieldAlert,
  BarChart3,
  Users,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Clock,
  History,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, Column } from "@/components/ui/data-table";
import { ExcelImportModal } from "@/components/exam/ExcelImportModal";
import { useToast } from "@/components/ui/toast";
import { SessionUser } from "@/types";
import { formatDateIndo } from "@/lib/utils";

export default function ImportExportPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [importType, setImportType] = useState<"SOAL" | "SISWA" | null>(null);

  const loadData = async () => {
    try {
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      if (!meRes.ok || !meData.authenticated || meData.user.role === "SISWA") {
        router.push("/jadwal");
        return;
      }
      setUser(meData.user);

      // Load import logs
      const logsRes = await fetch("/api/import/logs");
      const logsData = await logsRes.json();
      if (logsData.success) {
        setLogs(logsData.logs || []);
      }
    } catch (err) {
      console.error("Gagal memuat import logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const logColumns: Column<any>[] = [
    {
      key: "fileName",
      header: "Nama Berkas File",
      sortable: true,
      render: (item) => (
        <div>
          <div className="font-semibold text-foreground flex items-center gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="truncate max-w-xs">{item.fileName}</span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Oleh: {item.importedBy}
          </div>
        </div>
      ),
    },
    {
      key: "tipe",
      header: "Kategori",
      sortable: true,
      render: (item) => (
        <Badge variant={item.tipe === "SOAL" ? "default" : "secondary"}>
          {item.tipe === "SOAL" ? "Bank Soal" : "Data Siswa"}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (item) => (
        <Badge
          variant={
            item.status === "SUCCESS"
              ? "success"
              : item.status === "PARTIAL"
              ? "warning"
              : "destructive"
          }
        >
          {item.status === "SUCCESS"
            ? "Berhasil Penuh"
            : item.status === "PARTIAL"
            ? "Sebagian Masuk"
            : "Gagal"}
        </Badge>
      ),
    },
    {
      key: "rekap",
      header: "Hasil Validasi",
      render: (item) => (
        <div className="text-[11px] space-y-0.5">
          <span className="text-foreground font-semibold">
            {item.totalBerhasil} berhasil
          </span>
          <span className="text-muted-foreground"> dari {item.totalBaris} baris</span>
          {item.totalGagal > 0 && (
            <span className="text-destructive font-medium block">
              ({item.totalGagal} baris error)
            </span>
          )}
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Waktu Import",
      sortable: true,
      render: (item) => (
        <span className="text-muted-foreground text-[11px]">
          {formatDateIndo(item.createdAt)}
        </span>
      ),
    },
  ];

  return (
    <AppShell user={user}>
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ArrowUpDown className="w-6 h-6 text-primary" />
            Pusat Data Import & Export SMK
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 max-w-2xl">
            Unggah bank soal & daftar peserta secara massal via Excel (.xlsx) dengan validasi baris ketat, atau unduh rekap nilai & berita acara resmi.
          </p>
        </div>

        {/* 1. Import Section */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            1. Import Data Massal (.xlsx)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Import Bank Soal Card */}
            <Card className="flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                  <BookOpen className="w-5 h-5" />
                </div>
                <CardTitle className="text-base font-bold">
                  Import Bank Soal Asesmen
                </CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  Unggah puluhan butir soal PG (A-E) dan Essay sekaligus. Sistem memvalidasi kolom Mata Pelajaran, Tipe, Opsi, Kunci, Bobot, dan Tingkat Kesulitan.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                  <a
                    href="/api/templates/soal"
                    className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted transition-colors shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5 text-primary" />
                    Unduh Template Soal (.xlsx)
                  </a>
                  <Button
                    size="sm"
                    onClick={() => setImportType("SOAL")}
                    className="font-semibold"
                  >
                    <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
                    Upload & Validasi Excel
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Import Siswa Card */}
            <Card className="flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
                  <Users className="w-5 h-5" />
                </div>
                <CardTitle className="text-base font-bold">
                  Import Daftar Siswa Peserta
                </CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  Daftarkan seluruh siswa se-angkatan dari spreadsheet Dapodik/Tata Usaha. Format kolom: NISN, Nama Siswa, Kelas, Jurusan, dan Email.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                  <a
                    href="/api/templates/siswa"
                    className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted transition-colors shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                    Unduh Template Siswa (.xlsx)
                  </a>
                  <Button
                    size="sm"
                    onClick={() => setImportType("SISWA")}
                    className="font-semibold"
                  >
                    <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
                    Upload & Validasi Excel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 2. Export & Berita Acara Section */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            2. Export Nilai & Berita Acara Resmi
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Export Nilai */}
            <Card className="p-4 flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-foreground">Export Nilai Ujian</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Format lengkap NISN, Nama, Nilai PG, Nilai Essay, Nilai Akhir, dan Status Lulus.
                </p>
              </div>
              <a
                href="/api/export/nilai?ujianId=ujn-tkj-01"
                className="mt-4 inline-flex items-center justify-center w-full rounded-lg border border-border bg-card py-2 text-xs font-semibold hover:bg-muted transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                Download Excel (.xlsx)
              </a>
            </Card>

            {/* Export Log Pelanggaran */}
            <Card className="p-4 flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center mb-2">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-foreground">Log Pelanggaran Siswa</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Catatan audit deteksi keluar tab, wajah ganda, hilang pandangan, dan alt-tab.
                </p>
              </div>
              <a
                href="/api/export/pelanggaran?ujianId=ujn-tkj-01"
                className="mt-4 inline-flex items-center justify-center w-full rounded-lg border border-border bg-card py-2 text-xs font-semibold hover:bg-muted transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5 mr-1.5 text-destructive" />
                Download Excel (.xlsx)
              </a>
            </Card>

            {/* Export Rekap Kelas */}
            <Card className="p-4 flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-foreground">Rekap & Soal Tersulit</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Statistik rata-rata kelas, persentase tuntas, dan butir soal yang paling sering salah.
                </p>
              </div>
              <a
                href="/api/export/rekap-kelas?ujianId=ujn-tkj-01"
                className="mt-4 inline-flex items-center justify-center w-full rounded-lg border border-border bg-card py-2 text-xs font-semibold hover:bg-muted transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5 mr-1.5 text-primary" />
                Download Excel (.xlsx)
              </a>
            </Card>

            {/* Cetak Berita Acara PDF */}
            <Card className="p-4 flex flex-col justify-between border-destructive/20 bg-destructive/5">
              <div>
                <div className="w-8 h-8 rounded-lg bg-destructive text-destructive-foreground flex items-center justify-center mb-2 shadow-sm">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-foreground">Berita Acara Resmi (PDF)</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Dokumen standar A4 dengan kop sekolah, daftar hadir, nilai, dan tanda tangan digital.
                </p>
              </div>
              <a
                href="/api/berita-acara/ujn-tkj-01/kls-11-tkj-1"
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center justify-center w-full rounded-lg bg-destructive text-destructive-foreground py-2 text-xs font-semibold hover:bg-destructive/90 transition-colors shadow-sm"
              >
                <FileText className="w-3.5 h-3.5 mr-1.5" />
                Unduh PDF Resmi (A4)
              </a>
            </Card>
          </div>
        </div>

        {/* 3. Import Logs History */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <History className="w-4 h-4" />
              3. Riwayat Log Import Massal
            </h2>
            <span className="text-xs text-muted-foreground">
              {logs.length} riwayat tercatat
            </span>
          </div>

          <DataTable
            data={logs}
            columns={logColumns}
            searchPlaceholder="Cari riwayat nama file..."
            searchKey="fileName"
            emptyTitle="Belum ada riwayat import"
            emptyDescription="Semua aktivitas upload spreadsheet akan tercatat secara permanen di sini."
          />
        </div>

        {/* Excel Import Modal */}
        {importType && (
          <ExcelImportModal
            isOpen={true}
            onClose={() => setImportType(null)}
            onSuccess={() => {
              toast.success("Import Sukses", "Data spreadsheet berhasil disimpan ke database.");
              loadData();
            }}
            tipe={importType}
          />
        )}
      </div>
    </AppShell>
  );
}
