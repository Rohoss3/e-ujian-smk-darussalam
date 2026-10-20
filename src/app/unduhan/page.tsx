"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  FileText,
  FileSpreadsheet,
  Printer,
  ShieldCheck,
  FolderDown,
  UploadCloud,
  Users,
  ShieldAlert,
  BarChart3,
  ExternalLink,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SessionUser } from "@/types";

export default function UnduhanPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const meRes = await fetch("/api/auth/me");
        const meData = await meRes.json();
        if (!meRes.ok || !meData.authenticated) {
          router.push("/");
          return;
        }
        setUser(meData.user);
      } catch (e) {
        console.error("Gagal memuat user:", e);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const downloads = [
    {
      title: "Berita Acara Pelaksanaan E-Ujian (A4)",
      desc: "Format standar resmi Kemendikbudristek: Kop surat sekolah, tabel peserta lengkap, status kehadiran, nilai akhir, log anti-cheat, dan tanda tangan digital pengawas & kepala sekolah.",
      type: "PDF RESMI A4",
      role: "GURU_ADMIN",
      href: "/api/berita-acara/ujian-pwpb-01/kls-11-rpl-1",
      icon: FileText,
      badgeVariant: "destructive" as const,
      isPdf: true,
    },
    {
      title: "Rekap Nilai Ujian Siswa (Excel)",
      desc: "Rekapitulasi lengkap nilai per siswa: NISN, Nama, Kelas, Nilai PG, Nilai Essay, Nilai Akhir, Status Lulus, dan Jumlah Pelanggaran.",
      type: "EXCEL (.XLSX)",
      role: "GURU_ADMIN",
      href: "/api/export/nilai",
      icon: FileSpreadsheet,
      badgeVariant: "success" as const,
      isPdf: false,
    },
    {
      title: "Log Pelanggaran Anti-Cheat (Excel)",
      desc: "Audit trail investigasi kecurangan: Timestamp insiden, NISN, Nama Siswa, Kelas, Jenis Pelanggaran, dan detail deskripsi.",
      type: "EXCEL (.XLSX)",
      role: "GURU_ADMIN",
      href: "/api/export/pelanggaran",
      icon: ShieldAlert,
      badgeVariant: "destructive" as const,
      isPdf: false,
    },
    {
      title: "Rekap Kelas & Analisis Soal Tersulit",
      desc: "Multi-sheet workbook: Rekapitulasi nilai kelas, analisis butir soal, dan identifikasi otomatis butir soal paling sulit di lapangan.",
      type: "EXCEL (.XLSX)",
      role: "GURU_ADMIN",
      href: "/api/export/rekap-kelas",
      icon: BarChart3,
      badgeVariant: "default" as const,
      isPdf: false,
    },
    {
      title: "Kartu Peserta Ujian SMK",
      desc: "Kartu peserta resmi lengkap dengan nomor peserta, NISN, foto, tingkat/kelas, kompetensi keahlian, ruang, dan sesi ujian.",
      type: "PDF RESMI",
      role: "SEMUA",
      href: `/api/cetak/kartu-ujian?siswaId=${user.id}`,
      icon: Printer,
      badgeVariant: "info" as const,
      isPdf: true,
    },
    {
      title: "Template Import Bank Soal SMK",
      desc: "File acuan spreadsheet standar untuk pembuatan dan upload massal butir soal Pilihan Ganda (A-E) dan Essay.",
      type: "EXCEL TEMPLATE",
      role: "GURU_ADMIN",
      href: "/api/templates/soal",
      icon: Download,
      badgeVariant: "outline" as const,
      isPdf: false,
    },
    {
      title: "Template Import Siswa Peserta",
      desc: "Format baku spreadsheet untuk mendaftarkan akun siswa secara massal sesuai format NISN Dapodik.",
      type: "EXCEL TEMPLATE",
      role: "GURU_ADMIN",
      href: "/api/templates/siswa",
      icon: Users,
      badgeVariant: "outline" as const,
      isPdf: false,
    },
  ];

  const visibleDownloads = downloads.filter((item) => {
    if (user.role === "SISWA") return item.role === "SEMUA";
    return true;
  });

  return (
    <AppShell user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FolderDown className="w-6 h-6 text-primary" />
            Pusat Berkas, Berita Acara & Unduhan
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Unduh seluruh berkas administrasi asesmen, kartu peserta, rekap nilai ujian, dan dokumen berita acara siap cetak.
          </p>
        </div>

        {/* Download Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleDownloads.map((item, idx) => {
            const Icon = item.icon;
            return (
              <Card key={idx} className="flex flex-col justify-between hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </div>
                    <Badge variant={item.badgeVariant} className="text-[10px]">
                      {item.type}
                    </Badge>
                  </div>

                  <CardTitle className="text-base font-bold leading-snug">
                    {item.title}
                  </CardTitle>
                  <CardDescription className="text-xs leading-relaxed mt-1">
                    {item.desc}
                  </CardDescription>
                </CardHeader>

                <CardFooter className="pt-0 border-t border-border mt-3 pt-3">
                  <a
                    href={item.href}
                    target={item.isPdf ? "_blank" : undefined}
                    rel="noreferrer"
                    className="w-full inline-flex items-center justify-center rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-muted transition-colors shadow-sm text-foreground"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5 text-primary" />
                    <span>Unduh Berkas</span>
                    {item.isPdf && <ExternalLink className="w-3 h-3 ml-1 text-muted-foreground" />}
                  </a>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
