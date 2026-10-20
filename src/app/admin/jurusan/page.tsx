"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Layers,
  Plus,
  Edit2,
  Power,
  FolderTree,
  Users,
  CheckCircle2,
  AlertCircle,
  Sparkles,
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

export default function AdminJurusanPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [jurusanList, setJurusanList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal create/edit state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    kode: "",
    nama: "",
    deskripsi: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      if (!meRes.ok || !meData.authenticated || meData.user.role !== "ADMIN") {
        router.push("/dashboard");
        return;
      }
      setUser(meData.user);

      const res = await fetch("/api/master/jurusan");
      const data = await res.json();
      if (data.success) {
        setJurusanList(data.jurusan || []);
      }
    } catch (err) {
      console.error("Gagal memuat jurusan:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const handleOpenCreate = () => {
    setEditingTarget(null);
    setFormData({ kode: "", nama: "", deskripsi: "" });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingTarget(item);
    setFormData({
      kode: item.kode,
      nama: item.nama,
      deskripsi: item.deskripsi || "",
    });
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (item: any) => {
    try {
      const res = await fetch("/api/master/jurusan", {
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

  const handleDeleteJurusan = async (item: any) => {
    if (!confirm(`Hapus jurusan "${item.nama}" (${item.kode})? Aksi ini tidak dapat dibatalkan.`)) return;

    try {
      const res = await fetch("/api/master/jurusan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          id: item.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Jurusan Dihapus", data.message);
        loadData();
      } else {
        toast.error("Gagal Menghapus", data.message || "Terjadi kesalahan.");
      }
    } catch {
      toast.error("Gangguan Server", "Gagal menghubungi server.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.kode.trim() || !formData.nama.trim()) {
      toast.error("Validasi Gagal", "Kode dan nama jurusan wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/master/jurusan", {
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

      toast.success(
        editingTarget ? "Jurusan Diperbarui" : "Jurusan Dibuat",
        data.message
      );
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
      key: "kode",
      header: "Kode",
      sortable: true,
      className: "w-24",
      render: (item) => (
        <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded text-xs border border-primary/20">
          {item.kode}
        </span>
      ),
    },
    {
      key: "nama",
      header: "Nama Kompetensi Keahlian (Jurusan)",
      sortable: true,
      render: (item) => (
        <div>
          <div className="font-semibold text-foreground">{item.nama}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">{item.deskripsi}</div>
        </div>
      ),
    },
    {
      key: "jumlahKelas",
      header: "Kelas",
      sortable: true,
      className: "text-center w-28",
      render: (item) => (
        <Badge variant="outline" className="font-medium text-xs">
          {item.jumlahKelas} Rombel
        </Badge>
      ),
    },
    {
      key: "jumlahSiswa",
      header: "Total Siswa",
      sortable: true,
      className: "text-center w-28",
      render: (item) => (
        <span className="font-semibold text-foreground">{item.jumlahSiswa} Siswa</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      className: "text-center w-28",
      render: (item) => (
        <Badge variant={item.status === "AKTIF" ? "success" : "secondary"}>
          {item.status === "AKTIF" ? "Aktif" : "Nonaktif"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Aksi",
      className: "text-right w-36",
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenEdit(item)}
            className="h-7 px-2 text-xs"
            title="Edit Jurusan"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant={item.status === "AKTIF" ? "outline" : "secondary"}
            size="sm"
            onClick={() => handleToggleStatus(item)}
            className="h-7 px-2 text-xs"
            title={item.status === "AKTIF" ? "Nonaktifkan Jurusan" : "Aktifkan Jurusan"}
          >
            <Power className={`w-3.5 h-3.5 ${item.status === "AKTIF" ? "text-amber-500" : "text-emerald-600"}`} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDeleteJurusan(item)}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:border-destructive/30"
            title="Hapus Jurusan"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const totalJurusan = jurusanList.length;
  const totalKelas = jurusanList.reduce((acc, curr) => acc + (curr.jumlahKelas || 0), 0);
  const totalSiswa = jurusanList.reduce((acc, curr) => acc + (curr.jumlahSiswa || 0), 0);

  return (
    <AppShell user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Layers className="w-6 h-6 text-primary" />
              Data Master Jurusan (Kompetensi Keahlian)
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Kelola daftar jurusan kejuruan SMK, jumlah rombongan belajar, dan populasi siswa terdaftar.
            </p>
          </div>

          <Button onClick={handleOpenCreate} className="font-semibold shadow-sm">
            <Plus className="w-4 h-4 mr-1.5" />
            Tambah Jurusan Baru
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4">
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              Total Jurusan
            </span>
            <div className="text-2xl font-bold mt-1 text-foreground">{totalJurusan} Jurusan</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Program keahlian terverifikasi</p>
          </Card>

          <Card className="p-4">
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              Rombongan Belajar
            </span>
            <div className="text-2xl font-bold mt-1 text-primary">{totalKelas} Kelas</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Tingkat X, XI, dan XII</p>
          </Card>

          <Card className="p-4">
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              Populasi Siswa
            </span>
            <div className="text-2xl font-bold mt-1 text-foreground">{totalSiswa} Siswa</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Peserta asesmen aktif</p>
          </Card>
        </div>

        {/* DataTable */}
        <DataTable
          data={jurusanList}
          columns={columns}
          searchPlaceholder="Cari kode atau nama jurusan..."
          searchKey="nama"
        />

        {/* Create / Edit Dialog */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen} size="md">
          <DialogHeader>
            <DialogTitle>
              {editingTarget ? "Edit Data Jurusan" : "Tambah Jurusan Baru"}
            </DialogTitle>
            <DialogDescription>
              Pastikan kode kejuruan unik dan sesuai nomenklatur resmi Kemendikbudristek.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <Input
              label="Kode Jurusan"
              required
              placeholder="Contoh: RPL, TKJ, DKV, TO"
              value={formData.kode}
              onChange={(e) => setFormData({ ...formData, kode: e.target.value.toUpperCase() })}
            />

            <Input
              label="Nama Lengkap Kompetensi Keahlian"
              required
              placeholder="Contoh: Rekayasa Perangkat Lunak"
              value={formData.nama}
              onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
            />

            <Textarea
              label="Deskripsi / Fokus Keahlian"
              rows={3}
              placeholder="Penjelasan ringkas kompetensi kejuruan..."
              value={formData.deskripsi}
              onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : editingTarget ? "Simpan Perubahan" : "Tambah Jurusan"}
              </Button>
            </DialogFooter>
          </form>
        </Dialog>
      </div>
    </AppShell>
  );
}
