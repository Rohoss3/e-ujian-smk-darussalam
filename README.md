# 🎓 SMK E-UJIAN & ASESMEN KEJURUAN (Web + PWA)
### *Production-Ready Electronic Examination Platform with Real-time AI Proctoring, Hardcore Anti-Cheat & Complete Import/Export Engine*

Platform aplikasi e-ujian resmi untuk Sekolah Menengah Kejuruan (SMK) dengan manajemen Jurusan, Kelas, Bank Soal (Pilihan Ganda A-E & Essay), pengawasan real-time Socket.io, AI Face Proctoring via Webcam, dukungan PWA (Serwist), ekspor/impor Excel dengan validasi ketat baris per baris, dan pencetakan PDF resmi (Berita Acara A4 & Kartu Ujian).

---

## 🚀 Fitur Unggulan Import, Export & Berita Acara

### 1. 📥 Import Excel (.xlsx) dengan Validasi Baris Ketat
* **Alur Aman (No Dirty Data)**: Upload file $\rightarrow$ **Preview & Validasi Baris per Baris** $\rightarrow$ Tampilkan rincian error spesifik $\rightarrow$ Konfirmasi guru/admin $\rightarrow$ Commit ke Database.
* **Import Bank Soal**:
  - Kolom Wajib: `Mata Pelajaran`, `Tipe Soal (PILIHAN_GANDA / ESSAY)`, `Pertanyaan`, `Opsi A`, `Opsi B`, `Opsi C`, `Opsi D`, `Opsi E`, `Kunci Jawaban`, `Bobot`, `Tingkat Kesulitan (MUDAH/SEDANG/SULIT)`.
  - Validasi: Memeriksa kelengkapan opsi (A-D minimal), format kunci jawaban (A-E), bobot numerik positif, dan rubrik essay.
* **Import Daftar Siswa**:
  - Kolom Wajib: `NISN (10 Digit)`, `Nama Lengkap`, `Kelas`, `Jurusan`, `Email (Opsional)`.
  - Validasi: Pemeriksaan format angka NISN, deteksi duplikasi NISN di dalam file maupun di database, serta pemetaan otomatis ke jurusan dan kelas.
* **Log Riwayat Import (`ImportLog`)**: Setiap aktivitas import tercatat otomatis (nama file, jumlah baris terbaca, berhasil, gagal, user pengunggah, timestamp).

### 2. 📤 Export Excel (.xlsx) Komprehensif
* **Export Bank Soal**: Mengunduh seluruh butir soal (opsi A-E, kunci, bobot, tingkat kesulitan) dengan filter per mata pelajaran.
* **Export Nilai Ujian**: Kolom standar: `NISN`, `Nama Siswa`, `Kelas`, `Nilai PG`, `Nilai Essay`, `Nilai Akhir`, `Status Lulus`, `Jumlah Pelanggaran`.
* **Export Log Pelanggaran Anti-Cheat**: Kolom: `No`, `Waktu Insiden (WIB)`, `NISN`, `Nama Siswa`, `Kelas`, `Jenis Pelanggaran`, `Deskripsi Kejadian`.
* **Export Rekap Kelas & Analisis Soal Tersulit**: Multi-sheet workbook yang memuat:
  1. *Rekap Nilai Siswa*.
  2. *Analisis Butir Soal* (persentase salah dan penanda otomatis **Soal Tersulit** di lapangan).
  3. *Statistik Kelas* (rata-rata nilai, nilai tertinggi, terendah, dan tingkat ketuntasan KKM).

### 3. 📄 Download Berita Acara Pelaksanaan Ujian (PDF Resmi A4)
* Dihasilkan secara dinamis di server dan di-stream ke browser pengguna.
* Format resmi standar Kemendikbudristek:
  - **Kop Surat Sekolah**: Pemprov, Cabang Dinas Pendidikan, Nama Sekolah, NPSN, Alamat, Kontak.
  - **Identitas Ujian & Sesi**: Nama Ujian, Kode Ujian, Mata Pelajaran, Kelas / Rombel, Ruang, Waktu Pelaksanaan.
  - **Tabel Rekap Kehadiran**: Jumlah Terdaftar, Hadir, Tidak Hadir, Diskualifikasi.
  - **Tabel Lengkap Peserta**: No, NISN, Nama Lengkap, Status (Hadir/Selesai/Diskualifikasi), Pelanggaran Anti-Cheat, Nilai PG, Nilai Essay, Nilai Akhir, Keterangan KKM.
  - **Catatan Khusus**: Rekaman audit trail kejadian / insiden kecurangan berat.
  - **Pengesahan Tanda Tangan**: Kolom ganda Guru Pengampu / Proktor (Nama + NIP) dan Mengetahui Kepala Sekolah (Nama + NIP).

---

## 🛡️ Anti-Cheat Hardcore & Real-Time AI Proctoring

1. **Layar Penuh Terkunci (Fullscreen Enforcement)**: Wajib fullscreen. Keluar fullscreen $\rightarrow$ alarm bunyi, overlay peringatan, dan penambahan poin pelanggaran.
2. **Deteksi Tab Switch / Blur Window**: Memantau `visibilitychange` dan `blur`. Siswa berpindah tab atau aplikasi lain langsung terdeteksi.
3. **Perisai Tangkapan Layar (Screenshot Shield)**: Tombol `PrintScreen` / *Snipping Tool* membuat layar hitam pekat (*blackout*) selama 1 detik.
4. **Blokir Shortcut Berbahaya**: Mematikan F12, Ctrl+Shift+I/J/C (DevTools), Ctrl+U, Ctrl+C/V/X/A, Ctrl+P, dan klik kanan.
5. **Perangkap DevTools**: Anomali dimensi jendela browser (`outerWidth - innerWidth > 160px`).
6. **Webcam AI Face Proctoring**: Deteksi *Wajah Hilang*, *Banyak Orang*, *Menoleh Mencurigakan*, dan penangkapan foto bukti snapshot otomatis ke pengawas.
7. **Pengacakan Deterministik**: Butir soal dan pilihan A-E diacak deterministik per siswa.
8. **Toleransi Pelanggaran**: Pelanggaran $\ge$ 3 kali otomatis mendiskualifikasi ujian.

---

## 📱 Progressive Web App (PWA Serwist)

* **Ujian Hanya Online (Anti-Cheat)**: Rute `/ujian/*` diatur `NetworkOnly` pada Service Worker.
* **PWA Offline Caching**: Rute `/jadwal`, `/hasil`, `/unduhan`, dan `/` diatur `NetworkFirst`, sehingga jadwal, hasil nilai, dan pusat unduhan berkas tetap dapat diakses saat koneksi internet sekolah offline.

---

## 🌐 Daftar Endpoint API Tambahan

| Method | Endpoint | Fungsi |
| :--- | :--- | :--- |
| `POST` | `/api/import/soal` | Validasi baris per baris & commit Bank Soal Excel |
| `POST` | `/api/import/siswa` | Validasi & registrasi massal akun siswa dari Excel |
| `GET` | `/api/export/soal?mataPelajaranId=` | Unduh spreadsheet Bank Soal (filter mapel) |
| `GET` | `/api/export/nilai?ujianId=` | Unduh spreadsheet rekap nilai ujian siswa |
| `GET` | `/api/export/pelanggaran?ujianId=` | Unduh audit log pelanggaran anti-cheat |
| `GET` | `/api/export/rekap-kelas?ujianId=` | Unduh rekap kelas + analisis soal tersulit |
| `GET` | `/api/berita-acara/[ujianId]/[kelasId]` | Generate & stream PDF Berita Acara A4 resmi |
| `GET` | `/api/templates/soal` | Unduh template Excel format Bank Soal baku |
| `GET` | `/api/templates/siswa` | Unduh template Excel format Data Siswa baku |
| `GET` | `/api/cetak/kartu-ujian?siswaId=` | Cetak Kartu Peserta Ujian SMK (PDF) |

---

## 👥 Akun Demo Siap Pakai

| Role | Username / NISN | Password | Keterangan |
| :--- | :--- | :--- | :--- |
| **Siswa RPL** | `siswa_rpl` | `siswa123` | Ahmad Rizky Pratama (Kelas XI RPL 1) |
| **Siswa TKJ** | `siswa_tkj` | `siswa123` | Fajar Nugraha (Kelas XI TKJ 1) |
| **Guru RPL** | `guru_rpl` | `guru123` | Budi Santoso, S.Kom., M.T. (Pengampu & Pengawas) |
| **Admin SMK** | `admin` | `admin123` | Administrator Kurikulum & Sekolah |

> **Token Ujian Masuk Default**: `SMK2026`
