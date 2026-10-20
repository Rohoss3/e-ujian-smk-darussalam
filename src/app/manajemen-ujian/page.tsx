"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  Plus,
  KeyRound,
  Copy,
  Radio,
  FileSpreadsheet,
  Clock,
  ShieldAlert,
  Check,
  AlertCircle,
  Eye,
  Edit2,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DataTable, Column } from "@/components/ui/data-table";
import { useToast } from "@/components/ui/toast";
import { SessionUser } from "@/types";

export default function ManajemenUjianPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [exams, setExams] = useState<any[]>([]);
  const [bankSoalList, setBankSoalList] = useState<any[]>([]);
  const [classList, setClassList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Helper to suggest classes matching Bank Soal major and grade level
  const getDefaultClassesForBank = (bank: any, classes: any[]) => {
    if (!bank || !classes || classes.length === 0) return [];
    const matching = classes.filter((k) => {
      const matchJur = !bank.jurusanId || k.jurusanId === bank.jurusanId;
      const matchTingkat = !bank.tingkat || k.tingkat === bank.tingkat;
      return matchJur && matchTingkat;
    });
    if (matching.length > 0) return matching.map((k) => k.nama);
    return classes.length > 0 ? [classes[0].nama] : [];
  };

  // Create Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState<{
    judul: string;
    bankSoalId: string;
    tokenUjian: string;
    durasiMenit: number;
    maxPelanggaran: number;
    kkm: number;
    isRemedial: boolean;
    ujianAsliId: string;
    deskripsi: string;
    kelasTarget: string[];
  }>({
    judul: "",
    bankSoalId: "",
    tokenUjian: "",
    durasiMenit: 60,
    maxPelanggaran: 3,
    kkm: 75,
    isRemedial: false,
    ujianAsliId: "",
    deskripsi: "",
    kelasTarget: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState<{
    judul: string;
    tokenUjian: string;
    durasiMenit: number;
    maxPelanggaran: number;
    kkm: number;
    status: string;
    deskripsi: string;
    kelasTarget: string[];
  }>({
    judul: "",
    tokenUjian: "",
    durasiMenit: 60,
    maxPelanggaran: 3,
    kkm: 75,
    status: "AKTIF",
    deskripsi: "",
    kelasTarget: [],
  });

  const resetForm = () => {
    const firstBank = bankSoalList[0];
    const suggested = getDefaultClassesForBank(firstBank, classList);
    setFormData({
      judul: "",
      bankSoalId: firstBank?.id || "",
      tokenUjian: "",
      durasiMenit: 60,
      maxPelanggaran: 3,
      kkm: 75,
      isRemedial: false,
      ujianAsliId: "",
      deskripsi: "",
      kelasTarget: suggested,
    });
  };

  const openRemedialDialog = (item: any) => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let token = "";
    for (let i = 0; i < 6; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const cleanJudul = item.judul.replace(/^\[REMEDIAL\]\s*/i, "");
    let origTargets: string[] = [];
    try {
      if (Array.isArray(item.kelasTarget)) origTargets = item.kelasTarget;
      else if (typeof item.kelasTarget === "string") origTargets = JSON.parse(item.kelasTarget);
    } catch {
      origTargets = [item.kelasTarget || ""];
    }

    setFormData({
      judul: `[REMEDIAL] ${cleanJudul}`,
      bankSoalId: item.bankSoalId,
      tokenUjian: token,
      durasiMenit: item.durasiMenit || 60,
      maxPelanggaran: item.maxPelanggaran || 3,
      kkm: item.kkm || 75,
      isRemedial: true,
      ujianAsliId: item.id,
      deskripsi: `Sesi ujian remedial resmi khusus siswa yang belum mencapai KKM (${item.kkm || 75}) pada ujian ${cleanJudul}.`,
      kelasTarget: origTargets.filter(Boolean),
    });
    setIsCreateOpen(true);
  };

  useEffect(() => {
    async function init() {
      try {
        const meRes = await fetch("/api/auth/me");
        const meData = await meRes.json();
        if (!meRes.ok || !meData.authenticated) {
          router.push("/");
          return;
        }
        setUser(meData.user);

        // Load classes for target selection
        let loadedClasses: any[] = [];
        try {
          const klsRes = await fetch("/api/master/kelas");
          const klsData = await klsRes.json();
          if (klsData.success) {
            loadedClasses = klsData.kelas || [];
            setClassList(loadedClasses);
          }
        } catch (e) {
          console.error("Error loading classes:", e);
        }

        // Load exams
        const examRes = await fetch("/api/ujian/list");
        const examData = await examRes.json();
        const loadedExams = examData.exams || [];
        if (examData.success) {
          setExams(loadedExams);
        }

        // Load bank soal for selection
        let loadedBankList: any[] = [];
        if (meData.user.role !== "SISWA") {
          const bsRes = await fetch("/api/bank-soal");
          const bsData = await bsRes.json();
          if (bsData.success) {
            loadedBankList = bsData.bankSoal || [];
            setBankSoalList(loadedBankList);
            if (loadedBankList.length > 0) {
              const firstBank = loadedBankList[0];
              const suggested = getDefaultClassesForBank(firstBank, loadedClasses);
              setFormData((prev) => ({
                ...prev,
                bankSoalId: firstBank.id,
                kelasTarget: suggested,
              }));
            }
          }
        }

        // Check query param for immediate creation from Bank Soal or remedial
        if (typeof window !== "undefined") {
          const urlParams = new URLSearchParams(window.location.search);
          const buatBankId = urlParams.get("buatUjianBankId");
          const remedialTargetId = urlParams.get("buatRemedialUjianId");

          if (buatBankId && loadedBankList.length > 0) {
            const targetBank = loadedBankList.find((b: any) => b.id === buatBankId);
            if (targetBank) {
              const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
              let token = "";
              for (let i = 0; i < 6; i++) {
                token += chars.charAt(Math.floor(Math.random() * chars.length));
              }
              const suggested = getDefaultClassesForBank(targetBank, loadedClasses);
              setFormData({
                judul: `Asesmen: ${targetBank.judul}`,
                bankSoalId: targetBank.id,
                tokenUjian: token,
                durasiMenit: 60,
                maxPelanggaran: 3,
                kkm: 75,
                isRemedial: false,
                ujianAsliId: "",
                deskripsi: `Sesi ujian resmi untuk bank soal ${targetBank.judul}.`,
                kelasTarget: suggested,
              });
              setIsCreateOpen(true);
            }
          } else if (remedialTargetId && loadedExams.length > 0) {
            const target = loadedExams.find((e: any) => e.id === remedialTargetId);
            if (target) {
              openRemedialDialog(target);
            }
          }
        }
      } catch (err) {
        console.error("Error loading ujian list:", err);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [router]);

  const generateRandomToken = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let token = "";
    for (let i = 0; i < 6; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, tokenUjian: token }));
  };

  const handleCopyToken = (token: string, examId: string) => {
    navigator.clipboard.writeText(token);
    setCopiedId(examId);
    toast.success("Token Disalin", `Token ujian ${token} berhasil disalin ke clipboard.`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleBankSelectChange = (newBankId: string) => {
    const selected = bankSoalList.find((b) => b.id === newBankId);
    const suggested = getDefaultClassesForBank(selected, classList);
    setFormData((prev) => ({
      ...prev,
      bankSoalId: newBankId,
      kelasTarget: suggested.length > 0 ? suggested : prev.kelasTarget,
    }));
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.judul.trim() || !formData.bankSoalId || !formData.tokenUjian.trim()) {
      toast.error("Validasi Gagal", "Mohon lengkapi semua kolom wajib.");
      return;
    }

    if (formData.kelasTarget.length === 0) {
      toast.error("Validasi Gagal", "Pilih minimal 1 kelas target peserta ujian agar ujian muncul di akun siswa.");
      return;
    }

    if (formData.kkm === undefined || formData.kkm < 0 || formData.kkm > 100) {
      toast.error("Validasi KKM", "Nilai KKM wajib diisi antara 0 sampai 100.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/ujian/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error("Gagal Menyimpan", data.message || "Terjadi kesalahan.");
        return;
      }

      toast.success(
        formData.isRemedial ? "Sesi Remedial Diterbitkan" : "Jadwal Ujian Dibuat",
        `Ujian "${formData.judul}" berhasil dijadwalkan untuk kelas ${formData.kelasTarget.join(", ")}.`
      );
      setIsCreateOpen(false);
      resetForm();

      // Refresh list
      await loadExamsList();
    } catch {
      toast.error("Gangguan Jaringan", "Gagal menghubungi server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadExamsList = async () => {
    try {
      const examRes = await fetch("/api/ujian/list");
      const examData = await examRes.json();
      if (examData.success) setExams(examData.exams || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenEdit = (item: any) => {
    let existingClasses: string[] = [];
    try {
      if (Array.isArray(item.kelasTarget)) existingClasses = item.kelasTarget;
      else if (typeof item.kelasTarget === "string") existingClasses = JSON.parse(item.kelasTarget);
    } catch {
      existingClasses = [item.kelasTarget || ""];
    }

    setEditingExam(item);
    setEditFormData({
      judul: item.judul || "",
      tokenUjian: item.tokenUjian || "",
      durasiMenit: item.durasiMenit || 60,
      maxPelanggaran: item.maxPelanggaran || 3,
      kkm: item.kkm !== undefined ? item.kkm : 75,
      status: item.status || "AKTIF",
      deskripsi: item.deskripsi || "",
      kelasTarget: existingClasses.filter(Boolean),
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.judul.trim() || !editFormData.tokenUjian.trim()) {
      toast.error("Validasi Gagal", "Judul dan token ujian wajib diisi.");
      return;
    }

    if (editFormData.kelasTarget.length === 0) {
      toast.error("Validasi Gagal", "Pilih minimal 1 kelas target peserta ujian.");
      return;
    }

    if (editFormData.kkm === undefined || editFormData.kkm < 0 || editFormData.kkm > 100) {
      toast.error("Validasi KKM", "Nilai KKM wajib diisi antara 0 sampai 100.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/ujian/create", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingExam.id,
          ...editFormData,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error("Gagal Menyimpan", data.message || "Terjadi kesalahan.");
        return;
      }

      toast.success("Ujian Diperbarui", `Perubahan ujian "${editFormData.judul}" berhasil disimpan.`);
      setIsEditOpen(false);
      await loadExamsList();
    } catch {
      toast.error("Gangguan Jaringan", "Gagal menghubungi server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUjian = async (item: any) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus jadwal ujian "${item.judul}" (${item.kodeUjian})? Data sesi ujian siswa terkait juga akan dihapus. Tindakan ini permanen.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/ujian/create?id=${item.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Ujian Dihapus", data.message);
        await loadExamsList();
      } else {
        toast.error("Gagal Menghapus", data.message || "Gagal menghapus jadwal ujian.");
      }
    } catch {
      toast.error("Gangguan Server", "Gagal menghubungi server.");
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const columns: Column<any>[] = [
    {
      key: "judul",
      header: "Nama Ujian & Mata Pelajaran",
      sortable: true,
      render: (item) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground leading-snug">{item.judul}</span>
            {item.isRemedial && (
              <Badge variant="destructive" className="text-[9px] px-1.5 py-0 font-bold uppercase tracking-wider">
                REMEDIAL
              </Badge>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <span className="font-mono text-primary font-medium">{item.kodeUjian}</span>
            <span>•</span>
            <span>{item.mataPelajaran}</span>
          </div>
        </div>
      ),
    },
    {
      key: "kelasTarget",
      header: "Target Kelas Siswa",
      render: (item) => {
        let targets: string[] = [];
        try {
          if (Array.isArray(item.kelasTarget)) {
            targets = item.kelasTarget;
          } else if (typeof item.kelasTarget === "string") {
            const parsed = JSON.parse(item.kelasTarget);
            targets = Array.isArray(parsed) ? parsed : [parsed];
          }
        } catch {
          targets = [item.kelasTarget || "-"];
        }
        return (
          <div className="flex flex-wrap gap-1 max-w-[160px]">
            {targets.map((t: string) => (
              <Badge key={t} variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-semibold">
                {t}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      key: "durasiMenit",
      header: "Durasi & Spesifikasi",
      sortable: true,
      render: (item) => (
        <div className="space-y-1 text-[11px]">
          <span className="flex items-center gap-1 text-foreground font-medium">
            <Clock className="w-3.5 h-3.5 text-primary" />
            {item.durasiMenit} Menit • KKM: <strong className="text-foreground">{item.kkm || 75}</strong>
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <ShieldAlert className="w-3.5 h-3.5 text-destructive" />
            Maks. {item.maxPelanggaran} Pelanggaran
          </span>
        </div>
      ),
    },
    {
      key: "tokenUjian",
      header: "Token Akses",
      render: (item) => (
        <div className="flex items-center gap-2">
          <code className="px-2.5 py-1 rounded-md bg-muted text-foreground font-mono font-bold text-xs tracking-wider border border-border">
            {item.tokenUjian}
          </code>
          <button
            type="button"
            onClick={() => handleCopyToken(item.tokenUjian, item.id)}
            title="Salin Token"
            className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded"
          >
            {copiedId === item.id ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (item) => (
        <Badge
          variant={
            item.status === "BERJALAN"
              ? "success"
              : item.status === "SELESAI"
              ? "secondary"
              : "outline"
          }
        >
          {item.status === "BERJALAN" ? "Sedang Berjalan" : item.status || "Siap"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Aksi",
      className: "text-right",
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          {!item.isRemedial && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => openRemedialDialog(item)}
              className="h-7 px-2 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 font-semibold"
              title="Buat Ujian Remedial"
            >
              <Plus className="w-3 h-3 mr-1" />
              Remedial
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => router.push(`/pengawas/${item.id}`)}
            className="h-7 text-xs font-semibold"
          >
            <Radio className="w-3 h-3 mr-1" />
            Pantau
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/hasil?ujianId=${item.id}`)}
            className="h-7 px-2 text-xs"
            title="Rekap Nilai"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenEdit(item)}
            className="h-7 px-2 text-xs"
            title="Edit Jadwal & Pengaturan Ujian"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDeleteUjian(item)}
            className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:border-destructive/30"
            title="Hapus Jadwal Ujian"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppShell user={user}>
      <div className="space-y-6">
        {/* Header Title Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-primary" />
              Manajemen Ujian & Sesi Asesmen
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Kelola jadwal pengerjaan, KKM, token masuk peserta, batas waktu, dan ujian remedial.
            </p>
          </div>

          <Button
            onClick={() => {
              resetForm();
              generateRandomToken();
              setIsCreateOpen(true);
            }}
            className="font-semibold"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Jadwalkan Ujian Baru
          </Button>
        </div>

        {/* Data Table */}
        <DataTable
          data={exams}
          columns={columns}
          searchPlaceholder="Cari jadwal ujian atau mata pelajaran..."
          searchKey="judul"
        />

        {/* Create Exam Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen} size="lg">
          <DialogHeader>
            <DialogTitle>
              {formData.isRemedial ? "Terbitkan Sesi Ujian Remedial" : "Jadwalkan Sesi Ujian Baru"}
            </DialogTitle>
            <DialogDescription>
              {formData.isRemedial
                ? "Sesi remedial hanya dapat diakses oleh siswa yang berstatus REMEDIAL pada ujian utama terkait."
                : "Tentukan mata pelajaran, bank soal, standar KKM, alokasi durasi, dan token keamanan."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateExam} className="space-y-4 pt-4">
            {formData.isRemedial && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center gap-2.5 text-xs text-destructive font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Mode Sesi Remedial Aktif. Siswa yang telah LULUS pada ujian rujukan otomatis diblokir dari sesi ini.</span>
              </div>
            )}

            <Input
              label="Judul Ujian"
              required
              value={formData.judul}
              onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
              placeholder="Contoh: Asesmen Tengah Semester - Pemrograman Web RPL"
            />

            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                Pilih Bank Soal <span className="text-destructive">*</span>
              </label>
              <select
                value={formData.bankSoalId}
                onChange={(e) => handleBankSelectChange(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                required
              >
                {bankSoalList.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.judul} ({b.mataPelajaranNama} • {b.soal?.length || 0} Soal)
                  </option>
                ))}
              </select>
            </div>

            {/* Target Kelas Siswa */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                  Target Kelas Siswa Peserta Ujian <span className="text-destructive">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, kelasTarget: classList.map((k) => k.nama) }))}
                    className="text-[11px] text-primary hover:underline font-medium"
                  >
                    Pilih Semua Kelas
                  </button>
                  <span className="text-muted-foreground text-xs">•</span>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, kelasTarget: [] }))}
                    className="text-[11px] text-muted-foreground hover:underline"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-lg border border-input bg-muted/20">
                {classList.map((k) => {
                  const isChecked = formData.kelasTarget.includes(k.nama);
                  return (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          kelasTarget: isChecked
                            ? prev.kelasTarget.filter((c) => c !== k.nama)
                            : [...prev.kelasTarget, k.nama],
                        }));
                      }}
                      className={`p-2 rounded-lg text-xs font-semibold border transition text-left flex items-center justify-between ${
                        isChecked
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <span>{k.nama}</span>
                      {isChecked && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>
              {formData.kelasTarget.length === 0 ? (
                <p className="text-[11px] text-destructive mt-1 font-medium">
                  ⚠️ Wajib memilih minimal 1 kelas agar ujian muncul pada portal siswa kelas tersebut.
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Ujian akan muncul di akun siswa dari kelas: <strong className="text-foreground">{formData.kelasTarget.join(", ")}</strong>
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                  Token Ujian <span className="text-destructive">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={formData.tokenUjian}
                    onChange={(e) =>
                      setFormData({ ...formData, tokenUjian: e.target.value.toUpperCase() })
                    }
                    placeholder="SMK2026"
                    className="flex-1 h-9 rounded-lg border border-input bg-background px-3 py-1 font-mono font-bold text-center text-sm uppercase text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateRandomToken}
                    className="h-9 px-3 text-xs"
                  >
                    Acak
                  </Button>
                </div>
              </div>

              <Input
                label="Standar KKM (0-100)"
                type="number"
                min="0"
                max="100"
                required
                value={formData.kkm}
                onChange={(e) =>
                  setFormData({ ...formData, kkm: Number(e.target.value) })
                }
                helperText="Nilai batas kelulusan."
              />

              <Input
                label="Durasi (Menit)"
                type="number"
                min="10"
                max="300"
                required
                value={formData.durasiMenit}
                onChange={(e) =>
                  setFormData({ ...formData, durasiMenit: Number(e.target.value) })
                }
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Maksimal Pelanggaran Anti-Cheat"
                type="number"
                min="1"
                max="10"
                required
                value={formData.maxPelanggaran}
                onChange={(e) =>
                  setFormData({ ...formData, maxPelanggaran: Number(e.target.value) })
                }
                helperText="Siswa otomatis didiskualifikasi jika melampaui batas ini."
              />

              <div className="pt-2">
                <span className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                  Proteksi Asesmen
                </span>
                <div className="p-2.5 rounded-lg bg-muted text-[11px] text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-primary" /> Layar Penuh & AI Kamera Wajib
                  </p>
                  <p>Acak nomor urut soal dan pilihan ganda aktif secara otomatis.</p>
                </div>
              </div>
            </div>

            <Textarea
              label="Deskripsi / Petunjuk Pengerjaan"
              value={formData.deskripsi}
              onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
              placeholder="Instruksi khusus kepada siswa..."
              rows={2}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan & Terbitkan Jadwal"}
              </Button>
            </DialogFooter>
          </form>
        </Dialog>

        {/* Edit Exam Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogHeader>
            <DialogTitle>Edit Jadwal & Pengaturan Ujian</DialogTitle>
            <DialogDescription>
              Perbarui judul ujian, token akses, durasi, KKM kelulusan, dan status sesi asesmen.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4">
            <Input
              label="Judul / Nama Sesi Ujian"
              required
              value={editFormData.judul}
              onChange={(e) => setEditFormData({ ...editFormData, judul: e.target.value })}
              placeholder="Contoh: Asesmen Sumatif Akhir Semester"
            />

            {/* Target Kelas Siswa */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                  Target Kelas Siswa Peserta Ujian <span className="text-destructive">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditFormData((prev) => ({ ...prev, kelasTarget: classList.map((k) => k.nama) }))}
                    className="text-[11px] text-primary hover:underline font-medium"
                  >
                    Pilih Semua Kelas
                  </button>
                  <span className="text-muted-foreground text-xs">•</span>
                  <button
                    type="button"
                    onClick={() => setEditFormData((prev) => ({ ...prev, kelasTarget: [] }))}
                    className="text-[11px] text-muted-foreground hover:underline"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-lg border border-input bg-muted/20">
                {classList.map((k) => {
                  const isChecked = editFormData.kelasTarget.includes(k.nama);
                  return (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => {
                        setEditFormData((prev) => ({
                          ...prev,
                          kelasTarget: isChecked
                            ? prev.kelasTarget.filter((c) => c !== k.nama)
                            : [...prev.kelasTarget, k.nama],
                        }));
                      }}
                      className={`p-2 rounded-lg text-xs font-semibold border transition text-left flex items-center justify-between ${
                        isChecked
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <span>{k.nama}</span>
                      {isChecked && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>
              {editFormData.kelasTarget.length === 0 ? (
                <p className="text-[11px] text-destructive mt-1 font-medium">
                  ⚠️ Wajib memilih minimal 1 kelas agar ujian muncul pada portal siswa kelas tersebut.
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Ujian akan muncul di akun siswa dari kelas: <strong className="text-foreground">{editFormData.kelasTarget.join(", ")}</strong>
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Token Akses Siswa
                </label>
                <div className="flex gap-2">
                  <Input
                    required
                    value={editFormData.tokenUjian}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, tokenUjian: e.target.value.toUpperCase() })
                    }
                    placeholder="Contoh: ABC123"
                    className="font-mono font-bold tracking-wider uppercase"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
                      let token = "";
                      for (let i = 0; i < 6; i++) {
                        token += chars.charAt(Math.floor(Math.random() * chars.length));
                      }
                      setEditFormData({ ...editFormData, tokenUjian: token });
                    }}
                    title="Buat Token Acak Baru"
                  >
                    Acak
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Status Pelaksanaan
                </label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  className="w-full text-sm rounded-lg border border-input bg-background p-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="AKTIF">AKTIF (Siap dikerjakan)</option>
                  <option value="BERJALAN">BERJALAN (Sedang berlangsung)</option>
                  <option value="SELESAI">SELESAI (Ditutup)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Durasi (Menit)"
                type="number"
                min="5"
                max="360"
                required
                value={editFormData.durasiMenit}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, durasiMenit: Number(e.target.value) })
                }
              />

              <Input
                label="Batas KKM Kelulusan"
                type="number"
                min="0"
                max="100"
                required
                value={editFormData.kkm}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, kkm: Number(e.target.value) })
                }
                helperText="Nilai minimal kompeten (0 - 100)."
              />

              <Input
                label="Maksimal Pelanggaran"
                type="number"
                min="1"
                max="10"
                required
                value={editFormData.maxPelanggaran}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, maxPelanggaran: Number(e.target.value) })
                }
                helperText="Batas pelanggaran anti-cheat."
              />
            </div>

            <Textarea
              label="Deskripsi / Petunjuk Pengerjaan"
              value={editFormData.deskripsi}
              onChange={(e) => setEditFormData({ ...editFormData, deskripsi: e.target.value })}
              placeholder="Instruksi khusus kepada siswa..."
              rows={2}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </form>
        </Dialog>
      </div>
    </AppShell>
  );
}
