"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Plus,
  Edit2,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Award,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DataTable, Column } from "@/components/ui/data-table";
import { useToast } from "@/components/ui/toast";
import { SessionUser } from "@/types";

export default function AdminMataPelajaranPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [mapelList, setMapelList] = useState<any[]>([]);
  const [jurusanList, setJurusanList] = useState<any[]>([]);
  const [guruList, setGuruList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    kode: "",
    nama: "",
    jurusanId: "",
    kkm: 75,
    guruPengampuId: "",
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

      const res = await fetch("/api/master/mata-pelajaran");
      const data = await res.json();
      if (data.success) {
        setMapelList(data.mataPelajaran || []);
        setJurusanList(data.jurusanList || []);
        setGuruList(data.guruList || []);
      }
    } catch (err) {
      console.error("Gagal memuat mata pelajaran:", err);
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
    setFormData({
      kode: "",
      nama: "",
      jurusanId: "",
      kkm: 75,
      guruPengampuId: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingTarget(item);
    setFormData({
      kode: item.kode,
      nama: item.nama,
      jurusanId: item.jurusanId || "",
      kkm: item.kkm || 75,
      guruPengampuId: item.guruPengampuId || "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.kode.trim() || !formData.nama.trim()) {
      toast.error("Validasi Gagal", "Kode dan nama mata pelajaran wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/master/mata-pelajaran", {
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

      toast.success(editingTarget ? "Mata Pelajaran Diperbarui" : "Mata Pelajaran Dibuat", data.message);
      setIsModalOpen(false);
      loadData();
    } catch {
      toast.error("Gangguan Server", "Gagal menghubungi server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMapel = async (item: any) => {
    if (!confirm(`Hapus mata pelajaran "${item.nama}" (${item.kode})? Pastikan tidak ada jadwal ujian aktif untuk mapel ini.`)) return;

    try {
      const res = await fetch("/api/master/mata-pelajaran", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          id: item.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Mata Pelajaran Dihapus", data.message);
        loadData();
      } else {
        toast.error("Gagal Menghapus", data.message || "Terjadi kesalahan.");
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
      header: "Mata Pelajaran & Kurikulum",
      sortable: true,
      render: (item) => (
        <div>
          <div className="font-bold text-foreground text-sm">{item.nama}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {item.jurusanNama}
          </div>
        </div>
      ),
    },
    {
      key: "guruPengampuNama",
      header: "Guru Pengampu Utama",
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
            {item.guruPengampuNama.charAt(0)}
          </div>
          <span className="text-xs font-semibold text-foreground">
            {item.guruPengampuNama}
          </span>
        </div>
      ),
    },
    {
      key: "kkm",
      header: "Standar KKM",
      sortable: true,
      className: "text-center w-28",
      render: (item) => (
        <Badge variant="outline" className="font-mono font-bold text-xs bg-muted/40">
          {item.kkm} Poin
        </Badge>
      ),
    },
    {
      key: "jumlahBankSoal",
      header: "Bank Soal",
      sortable: true,
      className: "text-center w-28",
      render: (item) => (
        <span className="font-semibold text-foreground">{item.jumlahBankSoal} Bank</span>
      ),
    },
    {
      key: "actions",
      header: "Aksi",
      className: "text-right w-24",
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenEdit(item)}
            className="h-7 px-2 text-xs"
            title="Edit Mata Pelajaran"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDeleteMapel(item)}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:border-destructive/30"
            title="Hapus Mata Pelajaran"
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
              <BookOpen className="w-6 h-6 text-primary" />
              Data Master Mata Pelajaran & Standar KKM
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Kelola mata pelajaran kejuruan & umum, standar Kriteria Ketuntasan Minimal (KKM), dan guru penanggung jawab.
            </p>
          </div>

          <Button onClick={handleOpenCreate} className="font-semibold shadow-sm">
            <Plus className="w-4 h-4 mr-1.5" />
            Tambah Mata Pelajaran
          </Button>
        </div>

        {/* DataTable */}
        <DataTable
          data={mapelList}
          columns={columns}
          searchPlaceholder="Cari kode atau mata pelajaran..."
          searchKey="nama"
        />

        {/* Create / Edit Dialog */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen} size="md">
          <DialogHeader>
            <DialogTitle>
              {editingTarget ? "Edit Mata Pelajaran" : "Tambah Mata Pelajaran Baru"}
            </DialogTitle>
            <DialogDescription>
              Tentukan kode mapel, KKM kelulusan, dan guru pengampu yang berwenang.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Kode Mapel"
                required
                placeholder="PWPB, AIJ"
                value={formData.kode}
                onChange={(e) => setFormData({ ...formData, kode: e.target.value.toUpperCase() })}
              />

              <div className="col-span-2">
                <Input
                  label="Nama Mata Pelajaran"
                  required
                  placeholder="Pemrograman Web & Perangkat Bergerak"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                  Jurusan / Kejuruan
                </label>
                <select
                  value={formData.jurusanId}
                  onChange={(e) => setFormData({ ...formData, jurusanId: e.target.value })}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">-- Umum (Semua Jurusan) --</option>
                  {jurusanList.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.kode} - {j.nama}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Standar KKM (Skala 0-100)"
                type="number"
                min="50"
                max="95"
                required
                value={formData.kkm}
                onChange={(e) => setFormData({ ...formData, kkm: Number(e.target.value) })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                Guru Pengampu Utama
              </label>
              <select
                value={formData.guruPengampuId}
                onChange={(e) => setFormData({ ...formData, guruPengampuId: e.target.value })}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">-- Belum Ditentukan --</option>
                {guruList.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : editingTarget ? "Simpan Perubahan" : "Simpan Mapel"}
              </Button>
            </DialogFooter>
          </form>
        </Dialog>
      </div>
    </AppShell>
  );
}
