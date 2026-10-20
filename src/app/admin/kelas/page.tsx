"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FolderTree,
  Plus,
  Edit2,
  Users,
  UserCheck,
  Calendar,
  Filter,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Eye,
  CalendarRange,
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

export default function AdminKelasPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [kelasList, setKelasList] = useState<any[]>([]);
  const [jurusanList, setJurusanList] = useState<any[]>([]);
  const [guruList, setGuruList] = useState<any[]>([]);
  const [tahunAjaranList, setTahunAjaranList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedJurusan, setSelectedJurusan] = useState("ALL");
  const [selectedTahun, setSelectedTahun] = useState("ALL");

  // Create/Edit Dialog
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    nama: "",
    tingkat: 10,
    jurusanId: "",
    tahunAjaran: "2026/2027",
    waliKelasId: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // View Students in Class Modal
  const [viewStudentsKelas, setViewStudentsKelas] = useState<any | null>(null);
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Pindah Tahun Modal
  const [pindahModalTarget, setPindahModalTarget] = useState<any | null>(null);
  const [targetTahunBaru, setTargetTahunBaru] = useState("2026/2027");
  const [isSubmittingPindah, setIsSubmittingPindah] = useState(false);

  const loadData = async () => {
    try {
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      if (!meRes.ok || !meData.authenticated || meData.user.role !== "ADMIN") {
        router.push("/dashboard");
        return;
      }
      setUser(meData.user);

      const url = `/api/master/kelas?jurusanId=${selectedJurusan}&tahunAjaran=${selectedTahun}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setKelasList(data.kelas || []);
        setJurusanList(data.jurusanList || []);
        setGuruList(data.guruList || []);
        setTahunAjaranList(data.tahunAjaranList || []);
        if (data.jurusanList?.length > 0 && !formData.jurusanId) {
          setFormData((prev) => ({ ...prev, jurusanId: data.jurusanList[0].id }));
        }
      }
    } catch (err) {
      console.error("Gagal memuat kelas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, selectedJurusan, selectedTahun]);

  const handleOpenCreate = () => {
    setEditingTarget(null);
    setFormData({
      nama: "",
      tingkat: 10,
      jurusanId: jurusanList[0]?.id || "",
      tahunAjaran: "2026/2027",
      waliKelasId: guruList[0]?.id || "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingTarget(item);
    setFormData({
      nama: item.nama,
      tingkat: item.tingkat,
      jurusanId: item.jurusanId,
      tahunAjaran: item.tahunAjaran || "2026/2027",
      waliKelasId: item.waliKelasId || "",
    });
    setIsModalOpen(true);
  };

  const handleViewStudents = async (kelas: any) => {
    setViewStudentsKelas(kelas);
    setLoadingStudents(true);
    try {
      const res = await fetch(`/api/master/kelas/${kelas.id}/siswa`);
      const data = await res.json();
      if (data.success) {
        setClassStudents(data.siswa || []);
      }
    } catch {
      toast.error("Gagal", "Tidak dapat memuat daftar siswa di kelas ini.");
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama.trim() || !formData.jurusanId) {
      toast.error("Validasi Gagal", "Nama kelas dan jurusan wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/master/kelas", {
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

      toast.success(editingTarget ? "Kelas Diperbarui" : "Kelas Dibuat", data.message);
      setIsModalOpen(false);
      loadData();
    } catch {
      toast.error("Gangguan Server", "Gagal menghubungi server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteKelas = async (item: any) => {
    if (!confirm(`Hapus kelas "${item.nama}"? Pastikan tidak ada siswa yang terdaftar di kelas ini.`)) return;

    try {
      const res = await fetch("/api/master/kelas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          id: item.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Kelas Dihapus", data.message);
        loadData();
      } else {
        toast.error("Gagal Menghapus", data.message || "Terjadi kesalahan.");
      }
    } catch {
      toast.error("Gangguan Server", "Gagal menghubungi server.");
    }
  };

  const handlePindahTahun = async () => {
    if (!pindahModalTarget) return;
    setIsSubmittingPindah(true);
    try {
      const res = await fetch("/api/master/kelas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "pindah_tahun",
          id: pindahModalTarget.id,
          tahunAjaran: targetTahunBaru,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Tahun Ajaran Berhasil Dipindah", data.message);
        setPindahModalTarget(null);
        loadData();
      } else {
        toast.error("Gagal", data.message || "Terjadi kesalahan.");
      }
    } catch {
      toast.error("Gangguan Server", "Gagal menghubungi server.");
    } finally {
      setIsSubmittingPindah(false);
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
      header: "Nama Rombel & Tingkat",
      sortable: true,
      render: (item) => (
        <div>
          <div className="font-bold text-foreground text-sm">{item.nama}</div>
          <div className="text-[11px] text-muted-foreground">Tingkat {item.tingkat} (Kelas {item.tingkat === 10 ? "X" : item.tingkat === 11 ? "XI" : "XII"})</div>
        </div>
      ),
    },
    {
      key: "jurusanNama",
      header: "Jurusan",
      sortable: true,
      render: (item) => (
        <Badge variant="outline" className="font-medium text-xs">
          {item.jurusanKode} • {item.jurusanNama}
        </Badge>
      ),
    },
    {
      key: "waliKelasNama",
      header: "Wali Kelas (Guru)",
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
            {item.waliKelasNama.charAt(0)}
          </div>
          <div className="text-xs">
            <span className="font-semibold text-foreground block">{item.waliKelasNama}</span>
            <span className="text-[10px] text-muted-foreground">{item.waliKelasNip}</span>
          </div>
        </div>
      ),
    },
    {
      key: "tahunAjaran",
      header: "Tahun Ajaran",
      sortable: true,
      className: "text-center",
      render: (item) => (
        <Badge variant="secondary" className="font-mono text-xs">
          {item.tahunAjaran}
        </Badge>
      ),
    },
    {
      key: "jumlahSiswa",
      header: "Siswa",
      sortable: true,
      className: "text-center",
      render: (item) => (
        <button
          type="button"
          onClick={() => handleViewStudents(item)}
          className="inline-flex items-center gap-1 font-semibold text-primary hover:underline text-xs"
        >
          <Users className="w-3.5 h-3.5" />
          <span>{item.jumlahSiswa} Siswa</span>
        </button>
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
            onClick={() => handleViewStudents(item)}
            className="h-7 px-2 text-xs"
            title="Lihat Siswa di Kelas"
          >
            <Eye className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenEdit(item)}
            className="h-7 px-2 text-xs"
            title="Edit Kelas"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPindahModalTarget(item);
              setTargetTahunBaru(item.tahunAjaran || "2026/2027");
            }}
            className="h-7 px-2 text-xs"
            title="Pindah Tahun Ajaran"
          >
            <CalendarRange className="w-3.5 h-3.5 text-primary" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDeleteKelas(item)}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:border-destructive/30"
            title="Hapus Kelas"
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
              <FolderTree className="w-6 h-6 text-primary" />
              Data Master Kelas & Rombel
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Atur rombongan belajar, filter per jurusan dan tahun ajaran, tugaskan wali kelas, dan pantau peserta didik.
            </p>
          </div>

          <Button onClick={handleOpenCreate} className="font-semibold shadow-sm">
            <Plus className="w-4 h-4 mr-1.5" />
            Tambah Kelas Baru
          </Button>
        </div>

        {/* Filter Toolbar & DataTable */}
        <DataTable
          data={kelasList}
          columns={columns}
          searchPlaceholder="Cari nama rombel atau wali kelas..."
          searchKey="nama"
          filterSlot={
            <div className="flex flex-wrap items-center gap-2">
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
                      {j.kode} - {j.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Tahun:</span>
                <select
                  value={selectedTahun}
                  onChange={(e) => setSelectedTahun(e.target.value)}
                  className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="ALL">Semua Tahun</option>
                  {tahunAjaranList.map((ta) => (
                    <option key={ta.id} value={ta.nama}>
                      {ta.nama} {ta.isAktif ? "(Aktif)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          }
        />

        {/* Create / Edit Dialog */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen} size="md">
          <DialogHeader>
            <DialogTitle>
              {editingTarget ? "Edit Data Rombongan Belajar" : "Tambah Kelas Baru"}
            </DialogTitle>
            <DialogDescription>
              Tentukan nama kelas, tingkatan, kompetensi keahlian, dan guru wali kelas.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <Input
              label="Nama Kelas"
              required
              placeholder="Contoh: X RPL 2, XI TKJ 1, XII DKV 1"
              value={formData.nama}
              onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                  Tingkat Kelas <span className="text-destructive">*</span>
                </label>
                <select
                  value={formData.tingkat}
                  onChange={(e) => setFormData({ ...formData, tingkat: Number(e.target.value) })}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value={10}>Tingkat 10 (Kelas X)</option>
                  <option value={11}>Tingkat 11 (Kelas XI)</option>
                  <option value={12}>Tingkat 12 (Kelas XII)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                  Jurusan <span className="text-destructive">*</span>
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                  Tahun Ajaran <span className="text-destructive">*</span>
                </label>
                <select
                  value={formData.tahunAjaran}
                  onChange={(e) => setFormData({ ...formData, tahunAjaran: e.target.value })}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {tahunAjaranList.map((ta) => (
                    <option key={ta.id} value={ta.nama}>
                      {ta.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                  Tugaskan Wali Kelas
                </label>
                <select
                  value={formData.waliKelasId}
                  onChange={(e) => setFormData({ ...formData, waliKelasId: e.target.value })}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">-- Belum Ditentukan --</option>
                  {guruList.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.nip || "Guru"})
                    </option>
                  ))}
                </select>
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
                {isSubmitting ? "Menyimpan..." : editingTarget ? "Simpan Perubahan" : "Tambah Kelas"}
              </Button>
            </DialogFooter>
          </form>
        </Dialog>

        {/* View Students in Class Modal */}
        <Dialog open={!!viewStudentsKelas} onOpenChange={(open) => !open && setViewStudentsKelas(null)} size="lg">
          {viewStudentsKelas && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Daftar Siswa Kelas {viewStudentsKelas.nama}
                </DialogTitle>
                <DialogDescription>
                  Kompetensi: {viewStudentsKelas.jurusanNama} • Wali Kelas: {viewStudentsKelas.waliKelasNama}
                </DialogDescription>
              </DialogHeader>

              <div className="pt-4 space-y-4">
                {loadingStudents ? (
                  <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span>Memuat siswa...</span>
                  </div>
                ) : classStudents.length > 0 ? (
                  <div className="border border-border rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                        <tr>
                          <th className="p-3">No</th>
                          <th className="p-3">NISN</th>
                          <th className="p-3">Nama Lengkap</th>
                          <th className="p-3">Username</th>
                          <th className="p-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {classStudents.map((s, idx) => (
                          <tr key={s.id} className="hover:bg-muted/30">
                            <td className="p-3 text-muted-foreground">{idx + 1}</td>
                            <td className="p-3 font-mono font-medium">{s.nisn}</td>
                            <td className="p-3 font-semibold text-foreground">{s.nama}</td>
                            <td className="p-3 font-mono text-muted-foreground">{s.username}</td>
                            <td className="p-3 text-center">
                              <Badge variant={s.status === "AKTIF" ? "success" : "secondary"}>
                                {s.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                    Belum ada siswa yang dimasukkan ke dalam kelas ini.
                  </div>
                )}

                <DialogFooter>
                  <Button onClick={() => setViewStudentsKelas(null)}>
                    Tutup
                  </Button>
                </DialogFooter>
              </div>
            </>
          )}
        </Dialog>

        {/* Pindah Tahun Ajaran Modal */}
        <Dialog open={!!pindahModalTarget} onOpenChange={(open) => !open && setPindahModalTarget(null)} size="sm">
          {pindahModalTarget && (
            <>
              <DialogHeader>
                <DialogTitle>Pindah Tahun Ajaran</DialogTitle>
                <DialogDescription>
                  Alihkan rombel <strong>{pindahModalTarget.nama}</strong> ke tahun ajaran baru.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                    Pilih Tahun Ajaran Target
                  </label>
                  <select
                    value={targetTahunBaru}
                    onChange={(e) => setTargetTahunBaru(e.target.value)}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {tahunAjaranList.map((ta) => (
                      <option key={ta.id} value={ta.nama}>
                        {ta.nama} {ta.isAktif ? "(Aktif)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setPindahModalTarget(null)}>
                    Batal
                  </Button>
                  <Button onClick={handlePindahTahun} disabled={isSubmittingPindah}>
                    {isSubmittingPindah ? "Memindahkan..." : "Konfirmasi Pindah"}
                  </Button>
                </DialogFooter>
              </div>
            </>
          )}
        </Dialog>
      </div>
    </AppShell>
  );
}
