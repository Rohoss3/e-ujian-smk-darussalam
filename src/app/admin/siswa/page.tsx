"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Plus,
  Edit2,
  KeyRound,
  Power,
  UploadCloud,
  FileSpreadsheet,
  History,
  CheckCircle2,
  AlertCircle,
  Filter,
  Eye,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DataTable, Column } from "@/components/ui/data-table";
import { ExcelImportModal } from "@/components/exam/ExcelImportModal";
import { useToast } from "@/components/ui/toast";
import { SessionUser } from "@/types";

export default function AdminSiswaPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [siswaList, setSiswaList] = useState<any[]>([]);
  const [kelasList, setKelasList] = useState<any[]>([]);
  const [jurusanList, setJurusanList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedKelas, setSelectedKelas] = useState("ALL");
  const [selectedJurusan, setSelectedJurusan] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  // Excel Modal
  const [isExcelOpen, setIsExcelOpen] = useState(false);

  // Create / Edit Dialog
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    nama: "",
    username: "",
    nisn: "",
    kelasId: "",
    jurusanId: "",
    email: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Exam History Modal
  const [historyTarget, setHistoryTarget] = useState<any | null>(null);
  const [examHistory, setExamHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadData = async () => {
    try {
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      if (!meRes.ok || !meData.authenticated || meData.user.role !== "ADMIN") {
        router.push("/dashboard");
        return;
      }
      setUser(meData.user);

      const url = `/api/master/siswa?kelasId=${selectedKelas}&jurusanId=${selectedJurusan}&status=${selectedStatus}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setSiswaList(data.siswa || []);
        setKelasList(data.kelasList || []);
        setJurusanList(data.jurusanList || []);
        if (data.kelasList?.length > 0 && !formData.kelasId) {
          setFormData((prev) => ({ ...prev, kelasId: data.kelasList[0].id }));
        }
      }
    } catch (err) {
      console.error("Gagal memuat siswa:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, selectedKelas, selectedJurusan, selectedStatus]);

  const handleOpenCreate = () => {
    setEditingTarget(null);
    setFormData({
      nama: "",
      username: "",
      nisn: "",
      kelasId: kelasList[0]?.id || "",
      jurusanId: jurusanList[0]?.id || "",
      email: "",
      password: "siswa123",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingTarget(item);
    setFormData({
      nama: item.nama,
      username: item.username,
      nisn: item.nisn || "",
      kelasId: item.kelasId || "",
      jurusanId: item.jurusanId || "",
      email: item.email || "",
      password: "",
    });
    setIsModalOpen(true);
  };

  const handleResetPassword = async (item: any) => {
    if (!confirm(`Reset kata sandi siswa ${item.nama} menjadi "siswa123"?`)) return;

    try {
      const res = await fetch("/api/master/siswa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset_password",
          id: item.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Sandi Direset", data.message);
      } else {
        toast.error("Gagal", data.message || "Terjadi kesalahan.");
      }
    } catch {
      toast.error("Gangguan Server", "Gagal menghubungi server.");
    }
  };

  const handleToggleStatus = async (item: any) => {
    try {
      const res = await fetch("/api/master/siswa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_status",
          id: item.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Status Diperbarui", data.message);
        loadData();
      } else {
        toast.error("Gagal", data.message || "Terjadi kesalahan.");
      }
    } catch {
      toast.error("Gangguan Server", "Gagal menghubungi server.");
    }
  };

  const handleDeleteSiswa = async (item: any) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus data siswa "${item.nama}" (NISN: ${item.nisn})? Data riwayat ujian terkait juga akan dibersihkan. Tindakan ini permanen.`)) {
      return;
    }

    try {
      const res = await fetch("/api/master/siswa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          id: item.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Siswa Dihapus", data.message);
        loadData();
      } else {
        toast.error("Gagal", data.message || "Gagal menghapus siswa.");
      }
    } catch {
      toast.error("Gangguan Server", "Gagal menghubungi server.");
    }
  };

  const handleViewHistory = async (item: any) => {
    setHistoryTarget(item);
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/master/siswa?riwayatSiswaId=${item.id}`);
      const data = await res.json();
      if (data.success) {
        setExamHistory(data.history || []);
      }
    } catch {
      toast.error("Gagal", "Tidak dapat memuat riwayat ujian.");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama.trim() || !formData.nisn.trim() || !formData.kelasId) {
      toast.error("Validasi Gagal", "Nama, NISN, dan kelas siswa wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/master/siswa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: editingTarget ? "edit" : "create",
          id: editingTarget?.id,
          ...formData,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error("Gagal Menyimpan", data.message || "Terjadi kesalahan.");
        return;
      }

      toast.success(editingTarget ? "Siswa Diperbarui" : "Siswa Didaftarkan", data.message);
      setIsModalOpen(false);
      loadData();
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

  const columns: Column<any>[] = [
    {
      key: "nisn",
      header: "NISN & Nama Lengkap",
      sortable: true,
      render: (item) => (
        <div>
          <div className="font-bold text-foreground text-sm">{item.nama}</div>
          <div className="text-[11px] font-mono text-muted-foreground">
            NISN: {item.nisn} • @{item.username}
          </div>
        </div>
      ),
    },
    {
      key: "kelasNama",
      header: "Kelas & Rombel",
      sortable: true,
      render: (item) => (
        <Badge variant="outline" className="font-normal text-xs">
          {item.kelasNama}
        </Badge>
      ),
    },
    {
      key: "jurusanNama",
      header: "Jurusan",
      sortable: true,
      render: (item) => (
        <span className="text-xs text-foreground font-medium">
          {item.jurusanKode} ({item.jurusanNama})
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      className: "text-center",
      render: (item) => (
        <Badge variant={item.status === "AKTIF" ? "success" : "secondary"}>
          {item.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Aksi & Riwayat",
      className: "text-right",
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewHistory(item)}
            className="h-7 px-2 text-xs"
            title="Lihat Riwayat Asesmen"
          >
            <History className="w-3.5 h-3.5 text-primary" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenEdit(item)}
            className="h-7 px-2 text-xs"
            title="Edit Data Siswa"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleResetPassword(item)}
            className="h-7 px-2 text-xs"
            title="Reset Password ke siswa123"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-500" />
          </Button>
          <Button
            variant={item.status === "AKTIF" ? "outline" : "secondary"}
            size="sm"
            onClick={() => handleToggleStatus(item)}
            className="h-7 px-2 text-xs"
            title={item.status === "AKTIF" ? "Nonaktifkan Akun" : "Aktifkan Akun"}
          >
            <Power className={`w-3.5 h-3.5 ${item.status === "AKTIF" ? "text-destructive" : "text-emerald-600"}`} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDeleteSiswa(item)}
            className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:border-destructive/30"
            title="Hapus Siswa"
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              Data Master Pengguna: Siswa Peserta Ujian
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Daftar siswa peserta asesmen, filter per kelas & jurusan, import massal Excel, serta riwayat audit ujian.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsExcelOpen(true)}
              className="font-semibold shadow-sm"
            >
              <UploadCloud className="w-4 h-4 mr-1.5 text-emerald-600" />
              Import Siswa (Excel)
            </Button>
            <Button onClick={handleOpenCreate} className="font-semibold shadow-sm">
              <Plus className="w-4 h-4 mr-1.5" />
              Tambah Siswa Manual
            </Button>
          </div>
        </div>

        {/* Filter Toolbar & DataTable */}
        <DataTable
          data={siswaList}
          columns={columns}
          searchPlaceholder="Cari siswa berdasarkan nama atau NISN..."
          searchKey="nama"
          filterSlot={
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Kelas:</span>
                <select
                  value={selectedKelas}
                  onChange={(e) => setSelectedKelas(e.target.value)}
                  className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="ALL">Semua Kelas</option>
                  {kelasList.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Jurusan:</span>
                <select
                  value={selectedJurusan}
                  onChange={(e) => setSelectedJurusan(e.target.value)}
                  className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="ALL">Semua Jurusan</option>
                  {jurusanList.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.kode}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Status:</span>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="AKTIF">Aktif</option>
                  <option value="NONAKTIF">Nonaktif</option>
                </select>
              </div>
            </div>
          }
        />

        {/* Create / Edit Dialog */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen} size="md">
          <DialogHeader>
            <DialogTitle>
              {editingTarget ? "Edit Data Siswa" : "Tambah Siswa Baru Manual"}
            </DialogTitle>
            <DialogDescription>
              Pastikan NISN unik 10 digit sesuai nomor induk Dapodik.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <Input
              label="Nama Lengkap Siswa"
              required
              placeholder="Contoh: Muhammad Rizky Pratama"
              value={formData.nama}
              onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="NISN (10 Digit)"
                required
                placeholder="0068192841"
                value={formData.nisn}
                onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
              />

              <Input
                label="Username Login"
                required
                disabled={!!editingTarget}
                placeholder="rizky_rpl"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                  Rombel / Kelas <span className="text-destructive">*</span>
                </label>
                <select
                  value={formData.kelasId}
                  onChange={(e) => setFormData({ ...formData, kelasId: e.target.value })}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {kelasList.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                  Jurusan Kejuruan
                </label>
                <select
                  value={formData.jurusanId}
                  onChange={(e) => setFormData({ ...formData, jurusanId: e.target.value })}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {jurusanList.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.kode} - {j.nama}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Input
              label="Email (Opsional)"
              type="email"
              placeholder="siswa@smknegeri1.sch.id"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />

            {!editingTarget && (
              <Input
                label="Kata Sandi Awal"
                type="text"
                placeholder="Default: siswa123"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : editingTarget ? "Simpan Perubahan" : "Daftarkan Siswa"}
              </Button>
            </DialogFooter>
          </form>
        </Dialog>

        {/* Student Exam History Dialog */}
        <Dialog open={!!historyTarget} onOpenChange={(open) => !open && setHistoryTarget(null)} size="lg">
          {historyTarget && (
            <>
              <DialogHeader>
                <DialogTitle>Riwayat Ujian & Integritas Siswa</DialogTitle>
                <DialogDescription>
                  Siswa: <strong>{historyTarget.nama}</strong> ({historyTarget.kelasNama} • NISN: {historyTarget.nisn})
                </DialogDescription>
              </DialogHeader>

              <div className="pt-4 space-y-4">
                {loadingHistory ? (
                  <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span>Memuat riwayat ujian...</span>
                  </div>
                ) : examHistory.length > 0 ? (
                  <div className="border border-border rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                        <tr>
                          <th className="p-3">Ujian</th>
                          <th className="p-3 text-center">PG</th>
                          <th className="p-3 text-center">Essay</th>
                          <th className="p-3 text-center">Nilai Akhir</th>
                          <th className="p-3 text-center">Status</th>
                          <th className="p-3 text-center">Pelanggaran</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {examHistory.map((h, idx) => (
                          <tr key={idx} className="hover:bg-muted/30">
                            <td className="p-3 font-semibold text-foreground">
                              <div>{h.judulUjian}</div>
                              <div className="text-[10px] text-muted-foreground font-mono">{h.kodeUjian}</div>
                            </td>
                            <td className="p-3 text-center font-mono">{h.nilaiPG}</td>
                            <td className="p-3 text-center font-mono">{h.nilaiEssay}</td>
                            <td className="p-3 text-center font-mono font-bold text-primary">
                              {h.totalNilai}
                            </td>
                            <td className="p-3 text-center">
                              <Badge variant={h.statusKelulusan === "LULUS" ? "success" : "destructive"}>
                                {h.statusKelulusan}
                              </Badge>
                            </td>
                            <td className="p-3 text-center">
                              <Badge variant={h.jumlahPelanggaran > 0 ? "warning" : "outline"}>
                                {h.jumlahPelanggaran} Insiden
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                    Siswa ini belum mengikuti sesi ujian apapun.
                  </div>
                )}

                <DialogFooter>
                  <Button onClick={() => setHistoryTarget(null)}>
                    Tutup Riwayat
                  </Button>
                </DialogFooter>
              </div>
            </>
          )}
        </Dialog>

        {/* Excel Import Modal */}
        <ExcelImportModal
          isOpen={isExcelOpen}
          onClose={() => setIsExcelOpen(false)}
          onSuccess={() => {
            toast.success("Import Siswa Berhasil", "Daftar siswa dari spreadsheet telah masuk ke sistem.");
            loadData();
          }}
          tipe="SISWA"
        />
      </div>
    </AppShell>
  );
}
