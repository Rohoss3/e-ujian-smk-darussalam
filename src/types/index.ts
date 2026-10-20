export type UserRole = "ADMIN" | "GURU" | "SISWA" | "PENGAWAS";

export interface SessionUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  email?: string | null;
  nisn?: string | null;
  nip?: string | null;
  kelas?: string | null;
  kelasId?: string | null;
  jurusan?: string | null;
  jurusanId?: string | null;
  foto?: string | null;
  mapelIds?: string[] | null;
}

export type TipeSoal = "PILIHAN_GANDA" | "ESSAY";
export type TingkatKesulitan = "MUDAH" | "SEDANG" | "SULIT";

export interface SekolahProfile {
  id: string;
  nama: string;
  npsn: string;
  alamat: string;
  logoUrl?: string | null;
  kepalaSekolah: string;
  nipKepala: string;
}

export interface SoalItem {
  id: string;
  bankSoalId: string;
  nomorUrut: number;
  tipeSoal: TipeSoal;
  tingkatKesulitan: TingkatKesulitan;
  pertanyaan: string;
  gambarUrl?: string | null;
  opsiA?: string | null;
  opsiB?: string | null;
  opsiC?: string | null;
  opsiD?: string | null;
  opsiE?: string | null;
  kunciJawaban?: string | null;
  bobot: number;
}

export interface SoalTampil {
  id: string;
  nomorUrut: number;
  tipeSoal: TipeSoal;
  tingkatKesulitan: TingkatKesulitan;
  pertanyaan: string;
  gambarUrl?: string | null;
  opsi: {
    label: "A" | "B" | "C" | "D" | "E";
    text: string;
    originalKey: "A" | "B" | "C" | "D" | "E";
  }[];
  bobot: number;
}

export type StatusPengerjaan = "BELUM_MULAI" | "SEDANG_MENGERJAKAN" | "SELESAI" | "DIDISKUALIFIKASI";

export type JenisPelanggaran =
  | "KELUAR_FULLSCREEN"
  | "PINDAH_TAB"
  | "TIDAK_ADA_WAJAH"
  | "BANYAK_WAJAH"
  | "MENOLEH_CURIGA"
  | "DEVTOOLS"
  | "SHORTCUT_TERLARANG";

export interface ProctorTelemetryEvent {
  pesertaUjianId: string;
  ujianId: string;
  siswaId: string;
  siswaNama: string;
  kelompokKelas: string;
  status: StatusPengerjaan;
  sisaWaktuDetik: number;
  jumlahPelanggaran: number;
  nomorAktif: number;
  totalSoal: number;
  terjawab: number;
  lastSnapshot?: string;
  lastViolation?: {
    jenis: JenisPelanggaran;
    deskripsi: string;
    timestamp: string;
  };
}

export interface RowValidationError {
  baris: number;
  kolom: string;
  pesan: string;
  nilai: string;
}

export interface ImportPreviewResult<T> {
  tipe: "SOAL" | "SISWA" | "NILAI";
  totalBaris: number;
  totalValid: number;
  totalInvalid: number;
  errors: RowValidationError[];
  previewData: T[];
}
