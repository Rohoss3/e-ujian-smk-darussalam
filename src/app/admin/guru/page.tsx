"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  UserCheck,
  Plus,
  Edit2,
  BookOpen,
  Power,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Users,
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

export default function AdminGuruPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [guruList, setGuruList] = useState<any[]>([]);
  const [availableMapel, setAvailableMapel] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    nama: "",
    username: "",
    nip: "",
    email: "",
    password: "",
    mapelIds: [] as string[],
  });
  const [mapelFilterQuery, setMapelFilterQuery] = useState("");
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

      const res = await fetch("/api/master/guru");
      const data = await res.json();
      if (data.success) {
        setGuruList(data.guru || []);
        setAvailableMapel(data.availableMapel || []);
      }
    } catch (err) {
      console.error("Gagal memuat guru:", err);
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
    setMapelFilterQuery("");
    setFormData({
      nama: "",
      username: "",
      nip: "",
      email: "",
      password: "guru123",
      mapelIds: [],
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingTarget(item);
    setMapelFilterQuery("");
    setFormData({
      nama: item.nama,
      username: item.username,
      nip: item.nip || "",
      email: item.email || "",
      password: "",
      mapelIds: item.mapelIds || [],
    });
    setIsModalOpen(true);
  };

  const handleToggleMapel = (mapelId: string) => {
    setFormData((prev) => {
      const exists = prev.mapelIds.includes(mapelId);
      return {
        ...prev,
        mapelIds: exists
          ? prev.mapelIds.filter((id) => id !== mapelId)
          : [...prev.mapelIds, mapelId],
      };
    });
  };

  const handleToggleStatus = async (item: any) => {
    try {
      const res = await fetch("/api/master/guru", {
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

  const handleDeleteGuru = async (item: any) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus data guru "${item.nama}" (@${item.username})? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    try {
      const res = await fetch("/api/master/guru", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          id: item.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Guru Dihapus", data.message);
        loadData();
      } else {
        toast.error("Gagal", data.message || "Gagal menghapus data guru.");
      }
    } catch {
      toast.error("Gangguan Server", "Gagal menghubungi server.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama.trim() || !formData.username.trim()) {
      toast.error("Validasi Gagal", "Nama dan username guru wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/master/guru", {
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

      toast.success(editingTarget ? "Guru Diperbarui" : "Guru Didaftarkan", data.message);
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
      key: "nama",
      header: "Nama Lengkap & NIP",
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
            {item.nama.charAt(0)}
          </div>
          <div>
            <div className="font-bold text-foreground text-sm">{item.nama}</div>
            <div className="text-[11px] font-mono text-muted-foreground">
              NIP: {item.nip} • @{item.username}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "mapelList",
      header: "Mata Pelajaran Diampu",
      render: (item) => (
        <div className="space-y-1.5 max-w-sm">
          {item.mapelList && item.mapelList.length > 0 ? (
            <>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20 font-bold">
                  {item.mapelList.length} Mapel
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1">
                {item.mapelList.map((m: any) => (
                  <Badge key={m.id} variant="outline" className="text-[10px] bg-card border-border/80 text-foreground">
                    <span className="font-bold text-primary mr-1">{m.kode}</span>
                    <span>{m.nama}</span>
                  </Badge>
                ))}
              </div>
            </>
          ) : (
            <span className="text-xs text-muted-foreground italic">Belum ditugaskan mapel</span>
          )}
        </div>
      ),
    },
    {
      key: "waliKelasList",
      header: "Wali Kelas",
      render: (item) => (
        <div>
          {item.waliKelasList && item.waliKelasList.length > 0 ? (
            item.waliKelasList.map((k: any) => (
              <Badge key={k.id} variant="secondary" className="text-xs">
                {k.nama}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </div>
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
      header: "Aksi",
      className: "text-right",
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenEdit(item)}
            className="h-7 px-2 text-xs"
            title="Edit Guru & Mapel Diampu"
          >
            <Edit2 className="w-3.5 h-3.5" />
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
            onClick={() => handleDeleteGuru(item)}
            className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:border-destructive/30"
            title="Hapus Guru"
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
              <UserCheck className="w-6 h-6 text-primary" />
              Data Master Pengguna: Guru Pengampu & Pengawas
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Kelola pendidik kejuruan, penugasan mata pelajaran yang diampu, serta peranan wali kelas asesmen.
            </p>
          </div>

          <Button onClick={handleOpenCreate} className="font-semibold shadow-sm">
            <Plus className="w-4 h-4 mr-1.5" />
            Tambah Guru Baru
          </Button>
        </div>

        {/* DataTable */}
        <DataTable
          data={guruList}
          columns={columns}
          searchPlaceholder="Cari guru atau NIP..."
          searchKey="nama"
        />

        {/* Create / Edit Dialog */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen} size="lg">
          <DialogHeader>
            <DialogTitle>
              {editingTarget ? "Edit Data Guru & Penugasan Mapel" : "Tambah Guru Pengampu Baru"}
            </DialogTitle>
            <DialogDescription>
              Tugaskan mata pelajaran yang menjadi kewenangan guru dalam membuat soal dan mengoreksi essay.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <Input
              label="Nama Lengkap Guru (Beserta Gelar)"
              required
              placeholder="Contoh: Budi Santoso, S.Kom., M.T."
              value={formData.nama}
              onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="NIP (Nomor Induk Pegawai)"
                placeholder="19820415 200801 1 009"
                value={formData.nip}
                onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
              />

              <Input
                label="Username Login"
                required
                disabled={!!editingTarget}
                placeholder="guru_rpl"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>

            <Input
              label="Alamat Email"
              type="email"
              placeholder="guru@smknegeri1.sch.id"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />

            {!editingTarget && (
              <Input
                label="Kata Sandi Login"
                type="text"
                placeholder="Default: guru123"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            )}

            {/* Mata Pelajaran Checkboxes */}
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                    Penugasan Mata Pelajaran yang Diampu
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Guru ini berhak membuat bank soal, menambah butir soal, dan mengoreksi essay untuk mapel yang dipilih.
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-semibold">
                    {formData.mapelIds.length} Terpilih
                  </Badge>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, mapelIds: availableMapel.map((m) => m.id) })}
                    className="text-[11px] text-primary hover:underline font-medium"
                  >
                    Pilih Semua
                  </button>
                  <span className="text-muted-foreground text-[10px]">•</span>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, mapelIds: [] })}
                    className="text-[11px] text-muted-foreground hover:text-foreground font-medium"
                  >
                    Kosongkan
                  </button>
                </div>
              </div>

              {/* Search Mapel */}
              <input
                type="text"
                placeholder="Cari mata pelajaran atau kode kejuruan..."
                value={mapelFilterQuery}
                onChange={(e) => setMapelFilterQuery(e.target.value)}
                className="w-full text-xs px-3 py-1.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-3 rounded-lg border border-border bg-muted/20">
                {availableMapel
                  .filter((m) => {
                    if (!mapelFilterQuery.trim()) return true;
                    const q = mapelFilterQuery.toLowerCase();
                    return (
                      m.nama.toLowerCase().includes(q) ||
                      m.kode.toLowerCase().includes(q) ||
                      (m.jurusanKode && m.jurusanKode.toLowerCase().includes(q))
                    );
                  })
                  .map((m) => {
                    const isChecked = formData.mapelIds.includes(m.id);
                    return (
                      <label
                        key={m.id}
                        className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                          isChecked
                            ? "bg-primary/10 border-primary text-foreground shadow-xs font-semibold"
                            : "border-border hover:bg-muted/70 text-muted-foreground"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleMapel(m.id)}
                          className="mt-0.5 rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                        <div className="space-y-0.5 leading-snug">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-foreground">{m.kode}</span>
                            <Badge variant="secondary" className="text-[9px] px-1 py-0">
                              {m.jurusanKode || "UMUM"}
                            </Badge>
                          </div>
                          <div className="text-[11px] text-muted-foreground line-clamp-1">{m.nama}</div>
                        </div>
                      </label>
                    );
                  })}
              </div>
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
                {isSubmitting ? "Menyimpan..." : editingTarget ? "Simpan Perubahan" : "Daftarkan Guru"}
              </Button>
            </DialogFooter>
          </form>
        </Dialog>
      </div>
    </AppShell>
  );
}
