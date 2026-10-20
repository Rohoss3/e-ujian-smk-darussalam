"use client";

import React, { useState } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Download,
  AlertCircle,
  FileCheck,
  ArrowRight,
  RefreshCw,
  X,
} from "lucide-react";
import { ImportPreviewResult, RowValidationError } from "@/types";
import { Button } from "@/components/ui/button";

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tipe: "SOAL" | "SISWA";
  bankSoalId?: string;
}

export function ExcelImportModal({
  isOpen,
  onClose,
  onSuccess,
  tipe,
  bankSoalId,
}: ExcelImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [previewResult, setPreviewResult] = useState<ImportPreviewResult<any> | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  if (!isOpen) return null;

  const templateDownloadUrl = tipe === "SOAL" ? "/api/templates/soal" : "/api/templates/siswa";
  const templateName = tipe === "SOAL" ? "Template_Bank_Soal_SMK.xlsx" : "Template_Import_Siswa_SMK.xlsx";

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setGeneralError(null);
    setIsValidating(true);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("action", "preview");
    if (bankSoalId) formData.append("bankSoalId", bankSoalId);

    const endpoint = tipe === "SOAL" ? "/api/import/soal" : "/api/import/siswa";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setGeneralError(data.message || "Gagal memvalidasi file Excel.");
        setPreviewResult(null);
        return;
      }

      setPreviewResult(data.preview);
    } catch {
      setGeneralError("Terjadi gangguan koneksi saat membaca file Excel.");
    } finally {
      setIsValidating(false);
    }
  };

  const handleCommit = async () => {
    if (!file || !previewResult || previewResult.totalValid === 0) return;

    setIsCommitting(true);
    setGeneralError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("action", "commit");
    if (bankSoalId) formData.append("bankSoalId", bankSoalId);

    const endpoint = tipe === "SOAL" ? "/api/import/soal" : "/api/import/siswa";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setGeneralError(data.message || "Gagal menyimpan data import.");
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setGeneralError("Terjadi kesalahan server saat commit data.");
    } finally {
      setIsCommitting(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setPreviewResult(null);
    setGeneralError(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card text-card-foreground rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-border my-8 flex flex-col max-h-[90vh] transition-all">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold text-foreground tracking-tight">
                {tipe === "SOAL"
                  ? "Import Bank Soal dari Excel (.xlsx)"
                  : "Import Data Siswa Peserta dari Excel (.xlsx)"}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sistem akan memvalidasi ketat setiap baris data sebelum disimpan ke database.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-5 space-y-5">
          {/* Template Info & Download Banner */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-primary">
                Gunakan Format Spreadsheet Resmi SMK
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {tipe === "SOAL"
                  ? "Format wajib: Mata Pelajaran, Tipe (PG/ESSAY), Pertanyaan, Opsi A-E, Kunci, Bobot, Tingkat Kesulitan."
                  : "Format wajib: NISN (10 Digit), Nama Lengkap, Kelas, Jurusan, Email (Opsional)."}
              </p>
            </div>

            <a
              href={templateDownloadUrl}
              download={templateName}
              className="py-1.5 px-3 rounded-lg font-semibold text-xs bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Unduh Template (.xlsx)
            </a>
          </div>

          {/* General Error Alert */}
          {generalError && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{generalError}</span>
            </div>
          )}

          {/* File Upload Dropzone (if not yet chosen) */}
          {!file && (
            <label className="border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition text-center group">
              <div className="w-12 h-12 rounded-xl bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary flex items-center justify-center mb-3 transition-colors">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">
                Pilih atau seret file Excel (.xlsx) ke sini
              </p>
              <p className="text-xs text-muted-foreground">
                Maksimal ukuran file: 10MB • Format .xlsx
              </p>
              <input
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          )}

          {/* Validating Spinner */}
          {isValidating && (
            <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center">
              <RefreshCw className="w-8 h-8 animate-spin text-primary mb-2" />
              <p className="text-xs font-semibold text-foreground">
                Sedang memvalidasi baris per baris data Excel...
              </p>
            </div>
          )}

          {/* Validation Result Preview */}
          {previewResult && !isValidating && (
            <div className="space-y-4">
              {/* Stat Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/50 p-3 rounded-xl border border-border text-center">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
                    Total Baris
                  </span>
                  <span className="text-lg font-bold text-foreground">
                    {previewResult.totalBaris}
                  </span>
                </div>
                <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 text-center">
                  <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase block">
                    Baris Valid
                  </span>
                  <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                    {previewResult.totalValid}
                  </span>
                </div>
                <div className="bg-destructive/10 p-3 rounded-xl border border-destructive/20 text-center">
                  <span className="text-[10px] font-semibold text-destructive uppercase block">
                    Baris Error
                  </span>
                  <span className="text-lg font-bold text-destructive">
                    {previewResult.totalInvalid}
                  </span>
                </div>
              </div>

              {/* Error Detail Table (if any) */}
              {previewResult.errors.length > 0 && (
                <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Daftar Kesalahan Baris (Akan Diabaikan):</span>
                  </div>

                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                    {previewResult.errors.map((err, i) => (
                      <div
                        key={i}
                        className="text-[11px] bg-card p-2 rounded-lg border border-destructive/20 flex items-start gap-2 text-foreground"
                      >
                        <span className="font-semibold px-1.5 py-0.5 rounded bg-destructive/15 text-destructive text-[10px] shrink-0">
                          Baris {err.baris}
                        </span>
                        <div className="flex-1">
                          <span className="font-medium text-destructive">[{err.kolom}] </span>
                          <span className="text-muted-foreground">{err.pesan}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Valid Sample Preview */}
              {previewResult.previewData && previewResult.previewData.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-foreground">
                    Pratinjau Data Valid ({previewResult.previewData.length} baris siap disimpan):
                  </p>
                  <div className="border border-border rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                        <tr>
                          <th className="p-2">No</th>
                          {tipe === "SOAL" ? (
                            <>
                              <th className="p-2">Tipe</th>
                              <th className="p-2">Pertanyaan</th>
                              <th className="p-2">Kunci</th>
                              <th className="p-2">Bobot</th>
                            </>
                          ) : (
                            <>
                              <th className="p-2">NISN</th>
                              <th className="p-2">Nama</th>
                              <th className="p-2">Kelas</th>
                              <th className="p-2">Jurusan</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {previewResult.previewData.map((item, idx) => (
                          <tr key={idx} className="hover:bg-muted/30">
                            <td className="p-2 text-muted-foreground">{idx + 1}</td>
                            {tipe === "SOAL" ? (
                              <>
                                <td className="p-2 font-medium">{item.tipeSoal}</td>
                                <td className="p-2 truncate max-w-xs">{item.pertanyaan}</td>
                                <td className="p-2 font-mono font-bold text-primary">
                                  {item.kunciJawaban}
                                </td>
                                <td className="p-2">{item.bobot}</td>
                              </>
                            ) : (
                              <>
                                <td className="p-2 font-mono">{item.nisn}</td>
                                <td className="p-2 font-medium">{item.nama}</td>
                                <td className="p-2">{item.kelas}</td>
                                <td className="p-2">{item.jurusan}</td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-border flex items-center justify-between">
          {file ? (
            <button
              type="button"
              onClick={resetUpload}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Ganti File Excel
            </button>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Batal
            </Button>
            {previewResult && previewResult.totalValid > 0 && (
              <Button
                size="sm"
                onClick={handleCommit}
                disabled={isCommitting}
              >
                {isCommitting ? (
                  "Menyimpan ke Database..."
                ) : (
                  <>
                    <span>Simpan {previewResult.totalValid} Baris</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
