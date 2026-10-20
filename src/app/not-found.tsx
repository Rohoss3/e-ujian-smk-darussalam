import Link from "next/link";
import { FileQuestion, ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 shadow-xl space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto">
          <FileQuestion className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight text-foreground">404</h1>
          <h2 className="text-lg font-bold text-foreground">Halaman Tidak Ditemukan</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Halaman atau berkas ujian yang Anda cari tidak tersedia, telah dipindahkan, atau Anda belum memiliki izin akses.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-sm"
          >
            <Home className="w-4 h-4" />
            Halaman Utama
          </Link>
          <Link
            href="/dashboard"
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
