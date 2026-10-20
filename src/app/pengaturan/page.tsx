"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Save,
  CheckCircle2,
  FileText,
  School,
  ShieldCheck,
  Eye,
  GraduationCap,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { SessionUser } from "@/types";

export default function PengaturanSekolahPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    nama: "",
    npsn: "",
    alamat: "",
    logoUrl: "",
    kepalaSekolah: "",
    nipKepala: "",
  });

  useEffect(() => {
    async function loadData() {
      try {
        const meRes = await fetch("/api/auth/me");
        const meData = await meRes.json();
        if (!meRes.ok || !meData.authenticated || meData.user.role !== "ADMIN") {
          router.push("/dashboard");
          return;
        }
        setUser(meData.user);

        // Fetch school profile
        const res = await fetch("/api/pengaturan");
        const data = await res.json();
        if (data.success && data.sekolah) {
          setFormData({
            nama: data.sekolah.nama || "",
            npsn: data.sekolah.npsn || "",
            alamat: data.sekolah.alamat || "",
            logoUrl: data.sekolah.logoUrl || "",
            kepalaSekolah: data.sekolah.kepalaSekolah || "",
            nipKepala: data.sekolah.nipKepala || "",
          });
        }
      } catch (err) {
        console.error("Gagal memuat profil sekolah:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const res = await fetch("/api/pengaturan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error("Gagal Menyimpan", data.message || "Terjadi kesalahan.");
        return;
      }

      toast.success("Profil Disimpan", "Informasi resmi sekolah berhasil diperbarui.");
    } catch {
      toast.error("Gangguan Server", "Gagal menghubungi server.");
    } finally {
      setIsSaving(false);
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
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />
            Pengaturan & Identitas Sekolah
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Konfigurasi nama lembaga, NPSN, pimpinan sekolah, dan kop surat resmi untuk Berita Acara ujian.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Column */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold">
                  Data Pokok Lembaga Pendidikan
                </CardTitle>
                <CardDescription className="text-xs">
                  Informasi ini digunakan dalam seluruh laporan nilai dan dokumen PDF resmi Kemendikbudristek.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form id="pengaturan-form" onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Nama Resmi Lembaga SMK"
                      required
                      value={formData.nama}
                      onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                      placeholder="Contoh: SMK Negeri 1 Jakarta"
                    />

                    <Input
                      label="Nomor Pokok Sekolah Nasional (NPSN)"
                      required
                      value={formData.npsn}
                      onChange={(e) => setFormData({ ...formData, npsn: e.target.value })}
                      placeholder="Contoh: 20100123"
                    />
                  </div>

                  <Textarea
                    label="Alamat Lengkap Sekolah"
                    required
                    rows={2}
                    value={formData.alamat}
                    onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                    placeholder="Jl. Budi Utomo No. 7, Sawah Besar, Jakarta Pusat, DKI Jakarta"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Nama Kepala Sekolah"
                      required
                      value={formData.kepalaSekolah}
                      onChange={(e) =>
                        setFormData({ ...formData, kepalaSekolah: e.target.value })
                      }
                      placeholder="Drs. H. Ahmad Fauzi, M.Pd."
                    />

                    <Input
                      label="NIP Kepala Sekolah"
                      required
                      value={formData.nipKepala}
                      onChange={(e) =>
                        setFormData({ ...formData, nipKepala: e.target.value })
                      }
                      placeholder="19750815 199903 1 002"
                    />
                  </div>

                  <Input
                    label="URL Logo Sekolah (Opsional)"
                    value={formData.logoUrl}
                    onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                    placeholder="/icons/icon.svg atau https://..."
                    helperText="Biarkan kosong untuk menggunakan lambang Tut Wuri Handayani default."
                  />
                </form>
              </CardContent>

              <CardFooter className="flex justify-end pt-4 border-t border-border">
                <Button
                  type="submit"
                  form="pengaturan-form"
                  disabled={isSaving}
                  className="font-semibold shadow-sm"
                >
                  <Save className="w-4 h-4 mr-1.5" />
                  {isSaving ? "Menyimpan Data..." : "Simpan Perubahan Identitas"}
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Live Kop Surat Preview Column */}
          <div>
            <Card className="sticky top-20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
                    Pratinjau Kop Surat Resmi
                  </CardTitle>
                  <Eye className="w-4 h-4 text-primary" />
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-0">
                {/* Official Letterhead Mockup */}
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm text-center relative overflow-hidden">
                  <div className="flex items-center justify-center gap-3 pb-3 border-b-2 border-foreground/80 mb-3">
                    <div className="w-12 h-12 rounded-lg bg-white border border-border flex items-center justify-center p-0.5 shrink-0 shadow-sm">
                      <img
                        src={formData.logoUrl || "/logo.png"}
                        alt="Logo Sekolah"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase leading-none">
                        Pemerintah Provinsi • Dinas Pendidikan
                      </p>
                      <h4 className="text-xs font-black text-foreground uppercase tracking-tight mt-0.5">
                        {formData.nama || "SMK DARUSSALAM PANONGAN"}
                      </h4>
                      <p className="text-[9px] text-muted-foreground leading-tight">
                        NPSN: {formData.npsn || "20219482"} • {formData.alamat || "Alamat Lembaga"}
                      </p>
                    </div>
                  </div>

                  <p className="text-[10px] font-black uppercase text-foreground">
                    BERITA ACARA PELAKSANAAN UJIAN BERBASIS KOMPUTER
                  </p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">
                    Tahun Ajaran 2026/2027 • Dokumen Resmi Terverifikasi
                  </p>

                  <div className="mt-4 pt-3 border-t border-dashed border-border flex justify-between text-[9px] text-muted-foreground text-left">
                    <div>
                      <p>Mengetahui,</p>
                      <p className="font-semibold text-foreground mt-6">
                        {formData.kepalaSekolah || "Kepala Sekolah"}
                      </p>
                      <p className="font-mono text-[8px]">
                        NIP: {formData.nipKepala || "19750815..."}
                      </p>
                    </div>
                    <div className="text-right">
                      <p>Dicetak Pada:</p>
                      <p className="font-mono text-[8px] mt-6">Otomatis Server</p>
                      <span className="text-[8px] font-bold text-emerald-600">✓ Sah & Resmi</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Format Standar A4
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    Setiap perubahan pada form akan otomatis tertera pada generator PDF Berita Acara dan Kartu Ujian Siswa.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
