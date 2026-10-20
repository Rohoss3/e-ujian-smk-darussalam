import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldAlert, Radio } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { loadStore } from "@/lib/data-store";
import { getProctoringMonitoringData } from "@/lib/services";
import { LiveProctoringDashboard } from "@/components/exam/LiveProctoringDashboard";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PengawasPage({ params }: PageProps) {
  const { id: ujianId } = await params;
  const user = await getCurrentUser();

  if (!user || user.role === "SISWA") {
    redirect("/jadwal");
  }

  const store = loadStore();
  const ujian = store.ujian.find((u) => u.id === ujianId);

  if (!ujian) {
    redirect("/jadwal");
  }

  // If user is PENGAWAS, ensure they are assigned to this exam
  if (user.role === "PENGAWAS") {
    const isAssigned = ujian.pengawasId === user.id || (ujian.pengawasIds && ujian.pengawasIds.includes(user.id));
    if (!isAssigned) {
      redirect("/dashboard");
    }
  }

  const initialPeserta = getProctoringMonitoringData(ujianId);

  return (
    <AppShell user={user}>
      <div className="space-y-6">
        {/* Header Breadcrumb & Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Link
              href="/jadwal"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-2 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali ke Daftar Jadwal
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center font-bold">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  Live Monitoring Pengawas Ujian
                </h1>
                <p className="text-xs text-muted-foreground">
                  {ujian.judul} • Kode Ujian: <span className="font-mono font-semibold">{ujian.kodeUjian}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <Badge variant="success" className="font-semibold text-xs py-1 px-3">
              Socket.io Proctoring Terhubung
            </Badge>
          </div>
        </div>

        {/* Dashboard Component */}
        <LiveProctoringDashboard
          ujianId={ujian.id}
          judulUjian={ujian.judul}
          kodeUjian={ujian.kodeUjian}
          initialPeserta={initialPeserta}
        />
      </div>
    </AppShell>
  );
}
