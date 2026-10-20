"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  FileSpreadsheet,
  UploadCloud,
  Plus,
  Download,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sparkles,
  Layers,
  GraduationCap,
  Trash2,
  FolderPlus,
  ChevronDown,
  Edit2,
  ClipboardList,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DataTable, Column } from "@/components/ui/data-table";
import { ExcelImportModal } from "@/components/exam/ExcelImportModal";
import { useToast } from "@/components/ui/toast";
import { SessionUser } from "@/types";

export default function BankSoalPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<SessionUser | null>(null);

  // Bank Soal and Subjects state
  const [bankSoalList, setBankSoalList] = useState<any[]>([]);
  const [availableMapel, setAvailableMapel] = useState<any[]>([]);
  const [teacherMapelList, setTeacherMapelList] = useState<any[]>([]);
  const [selectedMapelFilter, setSelectedMapelFilter] = useState<string>("ALL");
  const [selectedBank, setSelectedBank] = useState<any | null>(null);
  const [soalItems, setSoalItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isNewBankModalOpen, setIsNewBankModalOpen] = useState(false);

  // Manual Question Dialog state
  const [formData, setFormData] = useState({
    mataPelajaranId: "",
    bankSoalId: "",
    tipeSoal: "PILIHAN_GANDA",
    tingkatKesulitan: "SEDANG",
    pertanyaan: "",
    opsiA: "",
    opsiB: "",
    opsiC: "",
    opsiD: "",
    opsiE: "",
    kunciJawaban: "A",
    bobot: 5,
  });

  // Create Bank Soal Dialog state
  const [newBankData, setNewBankData] = useState({
    mataPelajaranId: "",
    judul: "",
    tingkat: 11,
    deskripsi: "",
  });

  // Edit Bank Soal Dialog state
  const [isEditBankModalOpen, setIsEditBankModalOpen] = useState(false);
  const [editBankData, setEditBankData] = useState({
    bankId: "",
    judul: "",
    tingkat: 11,
    deskripsi: "",
  });

  // Edit Question Dialog state
  const [isEditSoalModalOpen, setIsEditSoalModalOpen] = useState(false);
  const [editSoalData, setEditSoalData] = useState({
    soalId: "",
    tipeSoal: "PILIHAN_GANDA",
    tingkatKesulitan: "SEDANG",
    pertanyaan: "",
    opsiA: "",
    opsiB: "",
    opsiC: "",
    opsiD: "",
    opsiE: "",
    kunciJawaban: "A",
    bobot: 5,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [difficultyFilter, setDifficultyFilter] = useState("ALL");

  const loadData = async (preferredBankId?: string, preferredMapelId?: string) => {
    try {
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      if (!meRes.ok || !meData.authenticated || meData.user.role === "SISWA") {
        router.push("/jadwal");
        return;
      }
      setUser(meData.user);

      const res = await fetch("/api/bank-soal");
      const data = await res.json();
      if (data.success) {
        const banks: any[] = data.bankSoal || [];
        const allMapels: any[] = data.availableMapel || [];
        const tMapels: any[] = data.teacherMapelList || [];

        setBankSoalList(banks);
        setAvailableMapel(allMapels);
        setTeacherMapelList(tMapels);

        // Determine active Mapel Filter
        let activeMapel = preferredMapelId || selectedMapelFilter;
        if (activeMapel === "ALL" && tMapels.length > 0 && meData.user.role === "GURU") {
          activeMapel = tMapels[0].id;
          setSelectedMapelFilter(activeMapel);
        }

        // Determine active Bank Soal
        const candidateBanks = activeMapel !== "ALL"
          ? banks.filter((b) => b.mataPelajaranId === activeMapel)
          : banks;

        let current = null;
        if (preferredBankId) {
          current = banks.find((b) => b.id === preferredBankId) || candidateBanks[0] || banks[0];
        } else if (selectedBank) {
          current = banks.find((b) => b.id === selectedBank.id) || candidateBanks[0] || banks[0];
        } else {
          current = candidateBanks[0] || banks[0];
        }

        setSelectedBank(current || null);
        setSoalItems(current ? current.soal || [] : []);
      }
    } catch (err) {
      console.error("Gagal memuat bank soal:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // When changing Mata Pelajaran filter in the UI
  const handleMapelFilterChange = (mapelId: string) => {
    setSelectedMapelFilter(mapelId);
    const candidateBanks = mapelId === "ALL"
      ? bankSoalList
      : bankSoalList.filter((b) => b.mataPelajaranId === mapelId);

    const firstBank = candidateBanks[0] || null;
    setSelectedBank(firstBank);
    setSoalItems(firstBank ? firstBank.soal || [] : []);
  };

  const handleBankChange = (bankId: string) => {
    const bank = bankSoalList.find((b) => b.id === bankId);
    if (bank) {
      setSelectedBank(bank);
      setSoalItems(bank.soal || []);
      if (selectedMapelFilter === "ALL") {
        setSelectedMapelFilter(bank.mataPelajaranId);
      }
    }
  };

  // Open Create Question Modal
  const handleOpenCreateQuestion = () => {
    const initialMapelId = selectedBank
      ? selectedBank.mataPelajaranId
      : (selectedMapelFilter !== "ALL" ? selectedMapelFilter : (teacherMapelList[0]?.id || availableMapel[0]?.id || ""));

    const initialBankId = selectedBank ? selectedBank.id : "";

    setFormData({
      mataPelajaranId: initialMapelId,
      bankSoalId: initialBankId,
      tipeSoal: "PILIHAN_GANDA",
      tingkatKesulitan: "SEDANG",
      pertanyaan: "",
      opsiA: "",
      opsiB: "",
      opsiC: "",
      opsiD: "",
      opsiE: "",
      kunciJawaban: "A",
      bobot: 5,
    });
    setIsCreateModalOpen(true);
  };

  // Open Create Bank Soal Modal
  const handleOpenCreateBank = (preselectedMapelId?: string) => {
    const targetMapelId = preselectedMapelId || (selectedMapelFilter !== "ALL" ? selectedMapelFilter : (teacherMapelList[0]?.id || availableMapel[0]?.id || ""));
    const mapel = availableMapel.find((m) => m.id === targetMapelId);

    setNewBankData({
      mataPelajaranId: targetMapelId,
      judul: mapel ? `Asesmen ${mapel.nama}` : "",
      tingkat: 11,
      deskripsi: "",
    });
    setIsNewBankModalOpen(true);
  };

  const handleCreateBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankData.judul.trim() || !newBankData.mataPelajaranId) {
      toast.error("Validasi Gagal", "Mata pelajaran dan judul paket bank soal wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/bank-soal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_bank",
          ...newBankData,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error("Gagal Membuat Bank Soal", data.message || "Terjadi kesalahan.");
        return;
      }

      toast.success("Bank Soal Berhasil Dibuat", data.message);
      setIsNewBankModalOpen(false);
      setSelectedMapelFilter(newBankData.mataPelajaranId);
      loadData(data.bankSoal?.id, newBankData.mataPelajaranId);
    } catch {
      toast.error("Gangguan Server", "Gagal menghubungi server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateSoal = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.pertanyaan.trim() || !formData.kunciJawaban.trim()) {
      toast.error("Validasi Gagal", "Pertanyaan dan kunci jawaban wajib diisi.");
      return;
    }

    if (!formData.bankSoalId && !formData.mataPelajaranId) {
      toast.error("Validasi Gagal", "Silakan pilih Mata Pelajaran atau Bank Soal tujuan.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/bank-soal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error("Gagal Menyimpan", data.message || "Terjadi kesalahan.");
        return;
      }

      toast.success("Soal Berhasil Ditambahkan", data.message);
      setIsCreateModalOpen(false);
      loadData(data.bankSoalId || formData.bankSoalId, formData.mataPelajaranId);
    } catch {
      toast.error("Gangguan Server", "Gagal menghubungi server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSoal = async (soalId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus butir soal ini?")) return;

    try {
      const res = await fetch("/api/bank-soal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_soal",
          soalId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Soal Dihapus", "Butir soal berhasil dihapus dari bank soal.");
        loadData(selectedBank?.id);
      } else {
        toast.error("Gagal", data.message || "Gagal menghapus butir soal.");
      }
    } catch {
      toast.error("Gangguan Server", "Gagal menghubungi server.");
    }
  };

  const handleOpenEditBank = (bank: any) => {
    setEditBankData({
      bankId: bank.id,
      judul: bank.judul || "",
      tingkat: bank.tingkat || 11,
      deskripsi: bank.deskripsi || "",
    });
    setIsEditBankModalOpen(true);
  };

  const handleEditBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBankData.judul.trim()) {
      toast.error("Validasi Gagal", "Judul paket bank soal wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/bank-soal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit_bank",
          ...editBankData,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error("Gagal Memperbarui Bank Soal", data.message || "Terjadi kesalahan.");
        return;
      }

      toast.success("Bank Soal Diperbarui", data.message);
      setIsEditBankModalOpen(false);
      loadData(editBankData.bankId);
    } catch {
      toast.error("Gangguan Server", "Gagal menghubungi server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBank = async (bank: any) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus paket bank soal "${bank.judul}" beserta seluruh butir soal di dalamnya? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    try {
      const res = await fetch("/api/bank-soal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_bank",
          bankId: bank.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Bank Soal Dihapus", data.message);
        loadData(undefined, selectedMapelFilter);
      } else {
        toast.error("Gagal Menghapus", data.message || "Gagal menghapus paket bank soal.");
      }
    } catch {
      toast.error("Gangguan Server", "Gagal menghubungi server.");
    }
  };

  const handleOpenEditSoal = (soal: any) => {
    setEditSoalData({
      soalId: soal.id,
      tipeSoal: soal.tipeSoal || "PILIHAN_GANDA",
      tingkatKesulitan: soal.tingkatKesulitan || "SEDANG",
      pertanyaan: soal.pertanyaan || "",
      opsiA: soal.opsiA || "",
      opsiB: soal.opsiB || "",
      opsiC: soal.opsiC || "",
      opsiD: soal.opsiD || "",
      opsiE: soal.opsiE || "",
      kunciJawaban: soal.kunciJawaban || "A",
      bobot: soal.bobot || 5,
    });
    setIsEditSoalModalOpen(true);
  };

  const handleEditSoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSoalData.pertanyaan.trim() || !editSoalData.kunciJawaban.trim()) {
      toast.error("Validasi Gagal", "Pertanyaan dan kunci jawaban wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/bank-soal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit_soal",
          ...editSoalData,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error("Gagal Menyimpan", data.message || "Terjadi kesalahan.");
        return;
      }

      toast.success("Soal Diperbarui", data.message);
      setIsEditSoalModalOpen(false);
      loadData(selectedBank?.id);
    } catch {
      toast.error("Gangguan Server", "Gagal menghubungi server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Filter bank soal based on active mapel filter
  const displayedBankSoalList = selectedMapelFilter === "ALL"
    ? bankSoalList
    : bankSoalList.filter((b) => b.mataPelajaranId === selectedMapelFilter);

  const filteredSoal = soalItems.filter((s) => {
    if (difficultyFilter === "ALL") return true;
    return s.tingkatKesulitan === difficultyFilter;
  });

  const activeMapelObj = availableMapel.find((m) => m.id === selectedMapelFilter);

  const columns: Column<any>[] = [
    {
      key: "nomorUrut",
      header: "No",
      sortable: true,
      className: "w-12 text-center",
      render: (item) => (
        <span className="font-semibold text-muted-foreground">{item.nomorUrut}</span>
      ),
    },
    {
      key: "pertanyaan",
      header: "Butir Soal & Pilihan Jawaban",
      render: (item) => (
        <div className="space-y-1.5 max-w-xl">
          <p className="font-medium text-foreground text-xs leading-relaxed">
            {item.pertanyaan}
          </p>
          {item.tipeSoal === "PILIHAN_GANDA" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-muted-foreground pt-1">
              {item.opsiA && <span><strong className="text-foreground">A.</strong> {item.opsiA}</span>}
              {item.opsiB && <span><strong className="text-foreground">B.</strong> {item.opsiB}</span>}
              {item.opsiC && <span><strong className="text-foreground">C.</strong> {item.opsiC}</span>}
              {item.opsiD && <span><strong className="text-foreground">D.</strong> {item.opsiD}</span>}
              {item.opsiE && <span><strong className="text-foreground">E.</strong> {item.opsiE}</span>}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "tipeSoal",
      header: "Tipe & Tingkat",
      sortable: true,
      render: (item) => (
        <div className="space-y-1">
          <Badge variant={item.tipeSoal === "PILIHAN_GANDA" ? "secondary" : "outline"}>
            {item.tipeSoal === "PILIHAN_GANDA" ? "PG (A-E)" : "Essay"}
          </Badge>
          <div>
            <Badge
              variant={
                item.tingkatKesulitan === "MUDAH"
                  ? "success"
                  : item.tingkatKesulitan === "SULIT"
                  ? "destructive"
                  : "warning"
              }
            >
              {item.tingkatKesulitan}
            </Badge>
          </div>
        </div>
      ),
    },
    {
      key: "kunciJawaban",
      header: "Kunci",
      render: (item) => (
        <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded text-xs border border-primary/20">
          {item.kunciJawaban}
        </span>
      ),
    },
    {
      key: "bobot",
      header: "Bobot",
      sortable: true,
      className: "w-20 text-center",
      render: (item) => (
        <span className="font-semibold text-foreground">{item.bobot} Poin</span>
      ),
    },
    {
      key: "actions",
      header: "Aksi",
      className: "w-20 text-right",
      render: (item) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenEditSoal(item)}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            title="Edit butir soal ini"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDeleteSoal(item.id)}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:border-destructive/30"
            title="Hapus butir soal ini"
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
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-primary" />
              Manajemen Bank Soal & Penyusunan Asesmen
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Pilih mata pelajaran yang diampu untuk menyusun butir soal Pilihan Ganda (A-E) dan Essay.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/api/templates/soal"
              className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5 mr-1.5 text-primary" />
              Template Excel
            </a>

            <a
              href={`/api/export/soal${selectedBank ? `?mataPelajaranId=${selectedBank.mataPelajaranId}` : ""}`}
              className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted transition-colors shadow-sm"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
              Export Excel
            </a>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsImportModalOpen(true)}
              className="font-semibold"
              disabled={!selectedBank}
            >
              <UploadCloud className="w-3.5 h-3.5 mr-1.5 text-primary" />
              Import Excel
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenCreateBank()}
              className="font-semibold text-primary border-primary/30 hover:bg-primary/5"
            >
              <FolderPlus className="w-3.5 h-3.5 mr-1.5" />
              Buat Paket Soal
            </Button>

            <Button
              size="sm"
              onClick={handleOpenCreateQuestion}
              className="font-semibold shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Tambah Butir Soal
            </Button>
          </div>
        </div>

        {/* Mata Pelajaran & Bank Soal Filter Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* 1. Mata Pelajaran Selector Card */}
          <Card className="md:col-span-5 border-primary/20 shadow-xs">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-primary" />
                  Mata Pelajaran:
                </label>
                {user.role === "GURU" && (
                  <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                    {teacherMapelList.length} Mapel Diampu
                  </Badge>
                )}
              </div>

              <select
                value={selectedMapelFilter}
                onChange={(e) => handleMapelFilterChange(e.target.value)}
                className="w-full text-xs font-semibold rounded-lg border border-input bg-background p-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                {user.role === "ADMIN" && (
                  <option value="ALL">🌐 Semua Mata Pelajaran (Semua Jurusan)</option>
                )}

                {teacherMapelList.length > 0 && (
                  <optgroup label="⭐ Mata Pelajaran yang Anda Ampu">
                    {teacherMapelList.map((m) => (
                      <option key={m.id} value={m.id}>
                        [{m.kode}] {m.nama} ({m.jurusanKode || "UMUM"})
                      </option>
                    ))}
                  </optgroup>
                )}

                {availableMapel.filter((m) => !teacherMapelList.some((t) => t.id === m.id)).length > 0 && (
                  <optgroup label="📚 Mata Pelajaran Lainnya">
                    {availableMapel
                      .filter((m) => !teacherMapelList.some((t) => t.id === m.id))
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          [{m.kode}] {m.nama} ({m.jurusanKode || "UMUM"})
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>

              {activeMapelObj && (
                <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground">
                  <span>Jurusan: <strong className="text-foreground">{activeMapelObj.jurusanKode}</strong></span>
                  <span>•</span>
                  <span>Kode: <strong className="font-mono text-primary">{activeMapelObj.kode}</strong></span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2. Paket Bank Soal Selector Card */}
          <Card className="md:col-span-7">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-primary" />
                  Paket Bank Soal Aktif:
                </label>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground text-[11px]">
                    {displayedBankSoalList.length} Paket Tersedia
                  </span>
                </div>
              </div>

              {displayedBankSoalList.length > 0 ? (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <select
                    value={selectedBank?.id || ""}
                    onChange={(e) => handleBankChange(e.target.value)}
                    className="flex-1 font-bold text-xs rounded-lg border border-input bg-background p-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    {displayedBankSoalList.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.judul} (Tingkat {b.tingkat || 11} • {b.jumlahSoal || 0} Soal)
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="rounded-lg bg-muted px-3 py-2 text-center">
                      <span className="text-[10px] text-muted-foreground block">Jumlah Soal</span>
                      <span className="font-bold text-xs text-foreground">{soalItems.length} Butir</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-dashed border-border bg-muted/20">
                  <div className="text-xs text-muted-foreground">
                    Belum ada paket bank soal untuk mata pelajaran ini.
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenCreateBank(selectedMapelFilter !== "ALL" ? selectedMapelFilter : undefined)}
                    className="text-xs h-7 text-primary font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Buat Paket Pertama
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Selected Bank Soal Banner */}
        {selectedBank ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-card shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-sm text-foreground">{selectedBank.judul}</h2>
                  <Badge variant="outline" className="text-[10px] bg-muted/40 font-mono">
                    Kelas {selectedBank.tingkat || 11}
                  </Badge>
                  {selectedBank.isMine && (
                    <Badge variant="success" className="text-[9px]">Penyusun Anda</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedBank.deskripsi || `Bank soal mata pelajaran ${selectedBank.mataPelajaranNama}`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
              {selectedBank.isMine && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenEditBank(selectedBank)}
                    className="font-semibold text-xs h-8"
                    title="Edit Judul & Tingkat Paket Bank Soal"
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-1" />
                    Edit Paket
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteBank(selectedBank)}
                    className="font-semibold text-xs h-8 text-destructive hover:bg-destructive/10 hover:border-destructive/30"
                    title="Hapus Paket Bank Soal Ini"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Hapus Paket
                  </Button>
                </>
              )}
              <Button
                size="sm"
                onClick={handleOpenCreateQuestion}
                className="font-semibold text-xs h-8"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Tambah Butir Soal
              </Button>
              <Button
                size="sm"
                onClick={() => router.push(`/manajemen-ujian?buatUjianBankId=${selectedBank.id}`)}
                className="font-semibold text-xs h-8 bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
                title="Terbitkan paket bank soal ini sebagai jadwal ujian siswa"
              >
                <ClipboardList className="w-3.5 h-3.5 mr-1" />
                Terbitkan Jadwal Ujian
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center rounded-xl border border-dashed border-border bg-muted/10 space-y-3">
            <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/60" />
            <div>
              <h3 className="font-bold text-foreground text-sm">Belum Ada Bank Soal yang Dipilih</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                Pilih mata pelajaran yang Anda ampu di atas atau buat paket bank soal baru untuk mulai menyusun butir soal ujian.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <Button size="sm" onClick={() => handleOpenCreateBank()}>
                <FolderPlus className="w-4 h-4 mr-1.5" />
                Buat Paket Bank Soal Baru
              </Button>
              <Button size="sm" variant="outline" onClick={handleOpenCreateQuestion}>
                <Plus className="w-4 h-4 mr-1.5" />
                Tulis Butir Soal Langsung
              </Button>
            </div>
          </div>
        )}

        {/* Filter Toolbar & Data Table */}
        <DataTable
          data={filteredSoal}
          columns={columns}
          searchPlaceholder="Cari pertanyaan butir soal..."
          searchKey="pertanyaan"
          filterSlot={
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="ALL">Semua Tingkat Kesulitan</option>
                <option value="MUDAH">Mudah</option>
                <option value="SEDANG">Sedang</option>
                <option value="SULIT">Sulit</option>
              </select>
            </div>
          }
        />

        {/* Modal 1: Create New Bank Soal (Paket) */}
        <Dialog open={isNewBankModalOpen} onOpenChange={setIsNewBankModalOpen} size="md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-primary" />
              Buat Paket Bank Soal Baru
            </DialogTitle>
            <DialogDescription>
              Tentukan mata pelajaran dan identitas paket soal yang ingin Anda susun.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateBankSubmit} className="space-y-4 pt-3">
            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                Pilih Mata Pelajaran <span className="text-destructive">*</span>
              </label>
              <select
                value={newBankData.mataPelajaranId}
                onChange={(e) => {
                  const mapelId = e.target.value;
                  const targetM = availableMapel.find((m) => m.id === mapelId);
                  setNewBankData({
                    ...newBankData,
                    mataPelajaranId: mapelId,
                    judul: targetM ? `Asesmen ${targetM.nama} Kelas XI` : newBankData.judul,
                  });
                }}
                required
                className="w-full text-xs font-semibold rounded-lg border border-input bg-background p-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="" disabled>-- Pilih Mata Pelajaran --</option>
                {teacherMapelList.length > 0 && (
                  <optgroup label="⭐ Mata Pelajaran yang Anda Ampu">
                    {teacherMapelList.map((m) => (
                      <option key={m.id} value={m.id}>
                        [{m.kode}] {m.nama} ({m.jurusanKode || "UMUM"})
                      </option>
                    ))}
                  </optgroup>
                )}
                {availableMapel.filter((m) => !teacherMapelList.some((t) => t.id === m.id)).length > 0 && (
                  <optgroup label="📚 Mata Pelajaran Lainnya">
                    {availableMapel
                      .filter((m) => !teacherMapelList.some((t) => t.id === m.id))
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          [{m.kode}] {m.nama} ({m.jurusanKode || "UMUM"})
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>
            </div>

            <Input
              label="Judul Paket Bank Soal"
              required
              placeholder="Contoh: Asesmen Sumatif Pemrograman Web Semester Genap"
              value={newBankData.judul}
              onChange={(e) => setNewBankData({ ...newBankData, judul: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                  Tingkat / Kelas
                </label>
                <select
                  value={newBankData.tingkat}
                  onChange={(e) => setNewBankData({ ...newBankData, tingkat: Number(e.target.value) })}
                  className="w-full text-xs rounded-lg border border-input bg-background p-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value={10}>Kelas X (10)</option>
                  <option value={11}>Kelas XI (11)</option>
                  <option value={12}>Kelas XII (12)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                  Guru Penyusun
                </label>
                <div className="p-2 text-xs rounded-lg border border-border bg-muted/40 font-medium text-foreground truncate">
                  {user.name}
                </div>
              </div>
            </div>

            <Textarea
              label="Deskripsi / Catatan Kisi-Kisi (Opsional)"
              rows={2}
              placeholder="Contoh: Mencakup materi komponen react, rest api, database..."
              value={newBankData.deskripsi}
              onChange={(e) => setNewBankData({ ...newBankData, deskripsi: e.target.value })}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsNewBankModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Buat Paket Bank Soal"}
              </Button>
            </DialogFooter>
          </form>
        </Dialog>

        {/* Modal 2: Create Question (With Mapel Selector) */}
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} size="lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Tambah Butir Soal Baru
            </DialogTitle>
            <DialogDescription>
              Pilih mata pelajaran dan paket bank soal tujuan untuk butir soal ini.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSoal} className="space-y-4 pt-3">
            {/* Subject and Target Bank Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl border border-border bg-muted/20">
              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                  Mata Pelajaran <span className="text-destructive">*</span>
                </label>
                <select
                  value={formData.mataPelajaranId}
                  onChange={(e) => {
                    const newMapelId = e.target.value;
                    const mapelBanks = bankSoalList.filter((b) => b.mataPelajaranId === newMapelId);
                    setFormData({
                      ...formData,
                      mataPelajaranId: newMapelId,
                      bankSoalId: mapelBanks[0]?.id || "",
                    });
                  }}
                  required
                  className="w-full text-xs font-semibold rounded-lg border border-input bg-background p-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {teacherMapelList.length > 0 && (
                    <optgroup label="⭐ Mata Pelajaran yang Anda Ampu">
                      {teacherMapelList.map((m) => (
                        <option key={m.id} value={m.id}>
                          [{m.kode}] {m.nama}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {availableMapel.filter((m) => !teacherMapelList.some((t) => t.id === m.id)).length > 0 && (
                    <optgroup label="📚 Mata Pelajaran Lainnya">
                      {availableMapel
                        .filter((m) => !teacherMapelList.some((t) => t.id === m.id))
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            [{m.kode}] {m.nama}
                          </option>
                        ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                  Paket Bank Soal Tujuan
                </label>
                <select
                  value={formData.bankSoalId}
                  onChange={(e) => setFormData({ ...formData, bankSoalId: e.target.value })}
                  className="w-full text-xs font-semibold rounded-lg border border-input bg-background p-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {bankSoalList.filter((b) => b.mataPelajaranId === formData.mataPelajaranId).length > 0 ? (
                    bankSoalList
                      .filter((b) => b.mataPelajaranId === formData.mataPelajaranId)
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.judul} ({b.soal?.length || 0} Soal)
                        </option>
                      ))
                  ) : (
                    <option value="">(Otomatis dibuat paket bank soal baru)</option>
                  )}
                </select>
              </div>
            </div>

            {/* Question Type, Difficulty, Points */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                  Tipe Soal
                </label>
                <select
                  value={formData.tipeSoal}
                  onChange={(e) => setFormData({ ...formData, tipeSoal: e.target.value })}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="PILIHAN_GANDA">Pilihan Ganda (A-E)</option>
                  <option value="ESSAY">Essay / Uraian</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                  Tingkat Kesulitan
                </label>
                <select
                  value={formData.tingkatKesulitan}
                  onChange={(e) => setFormData({ ...formData, tingkatKesulitan: e.target.value })}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="MUDAH">Mudah</option>
                  <option value="SEDANG">Sedang</option>
                  <option value="SULIT">Sulit</option>
                </select>
              </div>

              <Input
                label="Bobot Nilai (Poin)"
                type="number"
                min="1"
                max="100"
                required
                value={formData.bobot}
                onChange={(e) => setFormData({ ...formData, bobot: Number(e.target.value) })}
              />
            </div>

            <Textarea
              label="Pertanyaan Soal"
              required
              rows={3}
              value={formData.pertanyaan}
              onChange={(e) => setFormData({ ...formData, pertanyaan: e.target.value })}
              placeholder="Tuliskan butir soal atau studi kasus kejuruan..."
            />

            {formData.tipeSoal === "PILIHAN_GANDA" ? (
              <div className="space-y-2.5 pt-1">
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                  Pilihan Jawaban (A-E)
                </label>
                <div className="space-y-2">
                  <Input
                    placeholder="Pilihan A"
                    value={formData.opsiA}
                    onChange={(e) => setFormData({ ...formData, opsiA: e.target.value })}
                  />
                  <Input
                    placeholder="Pilihan B"
                    value={formData.opsiB}
                    onChange={(e) => setFormData({ ...formData, opsiB: e.target.value })}
                  />
                  <Input
                    placeholder="Pilihan C"
                    value={formData.opsiC}
                    onChange={(e) => setFormData({ ...formData, opsiC: e.target.value })}
                  />
                  <Input
                    placeholder="Pilihan D"
                    value={formData.opsiD}
                    onChange={(e) => setFormData({ ...formData, opsiD: e.target.value })}
                  />
                  <Input
                    placeholder="Pilihan E"
                    value={formData.opsiE}
                    onChange={(e) => setFormData({ ...formData, opsiE: e.target.value })}
                  />
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                    Kunci Jawaban Benar
                  </label>
                  <select
                    value={formData.kunciJawaban}
                    onChange={(e) => setFormData({ ...formData, kunciJawaban: e.target.value })}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 py-1 font-mono font-bold text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                    <option value="E">E</option>
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <Textarea
                  label="Pedoman / Kata Kunci Jawaban Essay"
                  rows={2}
                  value={formData.kunciJawaban}
                  onChange={(e) => setFormData({ ...formData, kunciJawaban: e.target.value })}
                  placeholder="Panduan rubrik penilaian untuk koreksi guru..."
                />
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan Butir Soal"}
              </Button>
            </DialogFooter>
          </form>
        </Dialog>

        {/* Edit Bank Soal Dialog */}
        <Dialog open={isEditBankModalOpen} onOpenChange={setIsEditBankModalOpen}>
          <DialogHeader>
            <DialogTitle>Edit Paket Bank Soal</DialogTitle>
            <DialogDescription>
              Perbarui judul, tingkat kelas, atau catatan kisi-kisi paket bank soal ini.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditBankSubmit} className="space-y-4">
            <Input
              label="Judul Paket Bank Soal"
              required
              placeholder="Contoh: Asesmen Sumatif Pemrograman Web Semester Genap"
              value={editBankData.judul}
              onChange={(e) => setEditBankData({ ...editBankData, judul: e.target.value })}
            />

            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                Tingkat / Kelas
              </label>
              <select
                value={editBankData.tingkat}
                onChange={(e) => setEditBankData({ ...editBankData, tingkat: Number(e.target.value) })}
                className="w-full text-xs rounded-lg border border-input bg-background p-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value={10}>Kelas X (10)</option>
                <option value={11}>Kelas XI (11)</option>
                <option value={12}>Kelas XII (12)</option>
              </select>
            </div>

            <Textarea
              label="Deskripsi / Catatan Kisi-Kisi (Opsional)"
              rows={2}
              placeholder="Contoh: Mencakup materi komponen react, rest api, database..."
              value={editBankData.deskripsi}
              onChange={(e) => setEditBankData({ ...editBankData, deskripsi: e.target.value })}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditBankModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </form>
        </Dialog>

        {/* Edit Butir Soal Dialog */}
        <Dialog open={isEditSoalModalOpen} onOpenChange={setIsEditSoalModalOpen}>
          <DialogHeader>
            <DialogTitle>Edit Butir Soal</DialogTitle>
            <DialogDescription>
              Ubah teks pertanyaan, opsi pilihan ganda A-E, kunci jawaban, dan bobot nilai butir soal.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSoalSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                  Tipe Soal
                </label>
                <select
                  value={editSoalData.tipeSoal}
                  onChange={(e) => setEditSoalData({ ...editSoalData, tipeSoal: e.target.value })}
                  className="w-full text-xs rounded-lg border border-input bg-background p-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="PILIHAN_GANDA">Pilihan Ganda (A-E)</option>
                  <option value="ESSAY">Essay / Uraian</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                  Tingkat Kesulitan
                </label>
                <select
                  value={editSoalData.tingkatKesulitan}
                  onChange={(e) =>
                    setEditSoalData({ ...editSoalData, tingkatKesulitan: e.target.value })
                  }
                  className="w-full text-xs rounded-lg border border-input bg-background p-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="MUDAH">Mudah</option>
                  <option value="SEDANG">Sedang</option>
                  <option value="SULIT">Sulit</option>
                </select>
              </div>

              <div>
                <Input
                  label="Bobot Poin Soal"
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={editSoalData.bobot}
                  onChange={(e) => setEditSoalData({ ...editSoalData, bobot: Number(e.target.value) })}
                />
              </div>
            </div>

            <Textarea
              label="Teks Pertanyaan Soal"
              required
              rows={3}
              value={editSoalData.pertanyaan}
              onChange={(e) => setEditSoalData({ ...editSoalData, pertanyaan: e.target.value })}
              placeholder="Tuliskan teks pertanyaan soal..."
            />

            {editSoalData.tipeSoal === "PILIHAN_GANDA" ? (
              <div className="space-y-3 pt-1">
                <span className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                  Pilihan Ganda (A sampai E)
                </span>
                <div className="space-y-2">
                  <Input
                    placeholder="Pilihan A"
                    value={editSoalData.opsiA}
                    onChange={(e) => setEditSoalData({ ...editSoalData, opsiA: e.target.value })}
                  />
                  <Input
                    placeholder="Pilihan B"
                    value={editSoalData.opsiB}
                    onChange={(e) => setEditSoalData({ ...editSoalData, opsiB: e.target.value })}
                  />
                  <Input
                    placeholder="Pilihan C"
                    value={editSoalData.opsiC}
                    onChange={(e) => setEditSoalData({ ...editSoalData, opsiC: e.target.value })}
                  />
                  <Input
                    placeholder="Pilihan D"
                    value={editSoalData.opsiD}
                    onChange={(e) => setEditSoalData({ ...editSoalData, opsiD: e.target.value })}
                  />
                  <Input
                    placeholder="Pilihan E"
                    value={editSoalData.opsiE}
                    onChange={(e) => setEditSoalData({ ...editSoalData, opsiE: e.target.value })}
                  />
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                    Kunci Jawaban Benar
                  </label>
                  <select
                    value={editSoalData.kunciJawaban}
                    onChange={(e) => setEditSoalData({ ...editSoalData, kunciJawaban: e.target.value })}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 py-1 font-mono font-bold text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                    <option value="E">E</option>
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <Textarea
                  label="Pedoman / Kata Kunci Jawaban Essay"
                  rows={2}
                  value={editSoalData.kunciJawaban}
                  onChange={(e) => setEditSoalData({ ...editSoalData, kunciJawaban: e.target.value })}
                  placeholder="Panduan rubrik penilaian untuk koreksi guru..."
                />
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditSoalModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan Perubahan Soal"}
              </Button>
            </DialogFooter>
          </form>
        </Dialog>

        {/* Excel Import Modal */}
        <ExcelImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={() => {
            toast.success("Import Sukses", "Soal dari file Excel berhasil dimasukkan.");
            loadData(selectedBank?.id);
          }}
          tipe="SOAL"
          bankSoalId={selectedBank?.id}
        />
      </div>
    </AppShell>
  );
}
