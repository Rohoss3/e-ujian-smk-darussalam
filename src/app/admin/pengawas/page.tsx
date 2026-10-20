"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Radio,
  UserCheck,
  Plus,
  Search,
  Edit2,
  Trash2,
  Power,
  ShieldCheck,
  ClipboardList,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { SessionUser } from "@/types";

export default function AdminPengawasPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [pengawasList, setPengawasList] = useState<any[]>([]);
  const [availableExams, setAvailableExams] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    nama: "",
    username: "",
    nip: "",
    email: "",
    password: "",
    examIds: [] as string[],
  });

  const loadData = async () => {
    try {
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      if (!meRes.ok || !meData.authenticated || meData.user.role !== "ADMIN") {
        router.push("/dashboard");
        return;
      }
      setUser(meData.user);

      const res = await fetch("/api/master/pengawas");
      const data = await res.json();
      if (data.success) {
        setPengawasList(data.pengawas || []);
        setAvailableExams(data.availableExams || []);
      }
    } catch (err) {
      console.error("Gagal memuat pengawas:", err);
      toast.error("Gangguan Server", "Gagal memuat data pengawas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingTarget(null);
    setFormData({
      nama: "",
      username: "",
      nip: "",
      email: "",
      password: "",
      examIds: [],
    });
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const openEditModal = (target: any) => {
    setEditingTarget(target);
    setFormData({
      nama: target.nama,
      username: target.username,
      nip: target.nip === "-" ? "" : target.nip,
      email: target.email === "-" ? "" : target.email,
      password: "",
      examIds: target.assignedExamIds || [],
    });
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const action = editingTarget ? "edit" : "create";
      const payload: any = {
        action,
        id: editingTarget?.id,
        nama: formData.nama,
        username: formData.username,
        nip: formData.nip,
        email: formData.email,
        examIds: formData.examIds,
      };

      if (formData.password) {
        payload.password = formData.password;
      }

      const res = await fetch("/api/master/pengawas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error("Gagal", data.message || "Terjadi kesalahan.");
        return;
      }

      toast.success("Berhasil", data.message);
      setIsModalOpen(false);
      loadData();
    } catch {
      toast.error("Gangguan Server", "Gagal menghubungi server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (target: any) => {
    try {
      const res = await fetch("/api/master/pengawas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_status", id: target.id }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Status Diubah", data.message);
        loadData();
      }
    } catch {
      toast.error("Gagal", "Gagal mengubah status pengawas.");
    }
  };

  const handleDelete = async (target: any) => {
    if (!confirm(`Hapus akun pengawas ${target.nama} (${target.username})? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    try {
      const res = await fetch("/api/master/pengawas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: target.id }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Pengawas Dihapus", data.message);
        loadData();
      }
    } catch {
      toast.error("Gagal", "Gagal menghapus pengawas.");
    }
  };

  const toggleExamSelection = (examId: string) => {
    setFormData((prev) => ({
      ...prev,
      examIds: prev.examIds.includes(examId)
        ? prev.examIds.filter((id) => id !== examId)
        : [...prev.examIds, examId],
    }));
  };

  const filteredPengawas = pengawasList.filter((p) => {
    const query = searchQuery.toLowerCase();
    return (
      p.nama.toLowerCase().includes(query) ||
      p.username.toLowerCase().includes(query) ||
      (p.nip && p.nip.toLowerCase().includes(query))
    );
  });

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeCount = pengawasList.filter((p) => p.status === "AKTIF").length;
  const totalAssignedSessions = pengawasList.reduce(
    (acc, curr) => acc + (curr.assignedExams?.length || 0),
    0
  );

  return (
    <AppShell user={user}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <span className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Radio className="w-6 h-6" />
              </span>
              Manajemen Akun Pengawas Ujian
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Kelola akun resmi proktor ruang ujian, kredensial akun aman, dan penugasan sesi asesmen.
            </p>
          </div>

          <Button onClick={openCreateModal} className="font-semibold shadow-sm bg-purple-600 hover:bg-purple-700 text-white">
            <Plus className="w-4 h-4 mr-1.5" />
            Tambah Pengawas Baru
          </Button>
        </div>

        {/* Metric Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Pengawas</p>
                <p className="text-2xl font-black text-foreground mt-0.5">{pengawasList.length}</p>
                <p className="text-[11px] text-muted-foreground">Akun terdaftar</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <UserCheck className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Pengawas Aktif</p>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {activeCount}
                </p>
                <p className="text-[11px] text-muted-foreground">Siap bertugas memantau</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Sesi Terawasi</p>
                <p className="text-2xl font-black text-primary mt-0.5">
                  {totalAssignedSessions}
                </p>
                <p className="text-[11px] text-muted-foreground">Penugasan ujian aktif</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <ClipboardList className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Table Card */}
        <Card>
          <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold">Daftar Akun Pengawas Resmi</CardTitle>
              <CardDescription className="text-xs">
                Hak akses terbatas pada ruang monitoring dan telemetri peserta ujian yang ditugaskan.
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama / username / NIP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {filteredPengawas.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Radio className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm font-semibold">Belum ada akun pengawas</p>
                <p className="text-xs mt-1">
                  Klik tombol &quot;Tambah Pengawas Baru&quot; di atas untuk mendaftarkan akun pengawas.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-y border-border text-[11px] text-muted-foreground uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">Pengawas</th>
                      <th className="py-3 px-4">NIP / Identitas</th>
                      <th className="py-3 px-4">Ujian Ditugaskan</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y border-border divide-border">
                    {filteredPengawas.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold flex items-center justify-center shrink-0 border border-purple-500/20">
                              {p.nama.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-foreground text-sm">{p.nama}</p>
                              <p className="text-[11px] font-mono text-muted-foreground">
                                @{p.username}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-muted-foreground">
                          <div>
                            <span>{p.nip}</span>
                            {p.email && p.email !== "-" && (
                              <p className="text-[10px] text-muted-foreground/70 font-sans">{p.email}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {p.assignedExams && p.assignedExams.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {p.assignedExams.map((ex: any) => (
                                <Badge
                                  key={ex.id}
                                  variant="outline"
                                  className="text-[10px] font-mono bg-purple-500/5 border-purple-500/30 text-purple-700 dark:text-purple-300"
                                >
                                  {ex.kodeUjian}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic text-[11px]">
                              Belum ada ujian ditugaskan
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={p.status === "AKTIF" ? "success" : "secondary"}
                            className="text-[10px] font-semibold"
                          >
                            {p.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => openEditModal(p)}
                              title="Edit Pengawas"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleToggleStatus(p)}
                              title={p.status === "AKTIF" ? "Nonaktifkan Akun" : "Aktifkan Akun"}
                            >
                              <Power
                                className={`w-3.5 h-3.5 ${
                                  p.status === "AKTIF" ? "text-amber-500" : "text-emerald-500"
                                }`}
                              />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(p)}
                              title="Hapus Akun"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal Tambah / Edit Pengawas */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen} size="md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Radio className="w-4 h-4" />
              </span>
              {editingTarget ? "Edit Akun Pengawas" : "Tambah Pengawas Ujian Baru"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editingTarget
                ? "Perbarui nama, identitas, kata sandi, dan penugasan sesi pengawasan."
                : "Daftarkan akun pengawas baru. Password akan otomatis di-hash dengan aman oleh server."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Nama Lengkap Pengawas"
                required
                placeholder="Contoh: Dra. Hj. Siti Aminah, M.Pd."
                value={formData.nama}
                onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
              />
              <Input
                label="NIP / Identitas (Opsional)"
                placeholder="19800512 200604 2 008"
                value={formData.nip}
                onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Username Login"
                required
                placeholder="pengawas_ruang1"
                disabled={!!editingTarget}
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                helperText={editingTarget ? "Username tidak dapat diubah" : "Digunakan untuk masuk ke akun"}
              />
              <Input
                label="Email (Opsional)"
                type="email"
                placeholder="siti.aminah@darussalam.sch.id"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">
                {editingTarget ? "Ubah Kata Sandi (Kosongkan jika tidak diubah)" : "Kata Sandi Akun"}
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  required={!editingTarget}
                  placeholder={editingTarget ? "••••••••" : "Minimal 6 karakter"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Password disimpan aman dengan enkripsi bcrypt dan tidak dapat dilihat secara plaintext.
              </p>
            </div>

            {/* Exam Assignment Selection */}
            <div className="border border-border rounded-xl p-3 bg-muted/30 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <ClipboardList className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  Penugasan Sesi Ujian (Tanggung Jawab Pengawas)
                </label>
                <span className="text-[10px] text-muted-foreground">
                  {formData.examIds.length} sesi dipilih
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Pengawas hanya akan dapat memantau ujian yang dipilih di bawah ini.
              </p>

              {availableExams.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">
                  Belum ada sesi ujian yang dibuat di sistem.
                </p>
              ) : (
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {availableExams.map((ex) => {
                    const isSelected = formData.examIds.includes(ex.id);
                    return (
                      <div
                        key={ex.id}
                        onClick={() => toggleExamSelection(ex.id)}
                        className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                          isSelected
                            ? "bg-purple-500/10 border-purple-500/40 text-foreground"
                            : "bg-card border-border hover:bg-muted text-muted-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded text-purple-600"
                          />
                          <div>
                            <p className="font-semibold text-foreground leading-tight">{ex.judul}</p>
                            <p className="text-[10px] font-mono text-muted-foreground">
                              {ex.kodeUjian} • {ex.mataPelajaran}
                            </p>
                          </div>
                        </div>
                        <Badge variant={ex.status === "AKTIF" ? "success" : "outline"} className="text-[9px]">
                          {ex.status}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <DialogFooter className="pt-3 border-t border-border flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
              >
                {isSubmitting ? "Menyimpan..." : editingTarget ? "Simpan Perubahan" : "Buat Akun Pengawas"}
              </Button>
            </DialogFooter>
          </form>
        </Dialog>
      </div>
    </AppShell>
  );
}
