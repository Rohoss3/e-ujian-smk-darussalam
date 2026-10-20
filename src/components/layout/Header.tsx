"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  Bell,
  ChevronRight,
  LogOut,
  UserCheck,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  WifiOff,
} from "lucide-react";
import { SessionUser } from "@/types";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { cn } from "@/lib/utils";

interface HeaderProps {
  user: SessionUser;
  collapsed: boolean;
  onOpenMobile: () => void;
}

export function Header({ user, collapsed, onOpenMobile }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOffline, setIsOffline] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    if (!confirm("Apakah Anda yakin ingin keluar dari sistem?")) return;
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  // Build dynamic breadcrumb label
  const getBreadcrumbs = () => {
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length === 0) return [{ label: "Dashboard", href: "/dashboard" }];

    const breadcrumbs = [];
    let currentHref = "";
    for (const part of parts) {
      currentHref += `/${part}`;
      let label = part;
      if (part === "dashboard") label = "Dashboard";
      else if (part === "admin") label = "Admin";
      else if (part === "guru") label = "Guru";
      else if (part === "siswa") label = "Siswa";
      else if (part === "jurusan") label = "Jurusan";
      else if (part === "kelas") label = "Kelas";
      else if (part === "mata-pelajaran") label = "Mata Pelajaran";
      else if (part === "penilaian") label = "Penilaian";
      else if (part === "jadwal") label = "Jadwal Ujian";
      else if (part === "manajemen-ujian") label = "Manajemen Ujian";
      else if (part === "bank-soal") label = "Bank Soal";
      else if (part === "hasil") label = "Hasil & Nilai";
      else if (part === "import-export") label = "Import & Export";
      else if (part === "unduhan") label = "Berkas & Unduhan";
      else if (part === "pengaturan") label = "Pengaturan Sekolah";
      else if (part === "profil") label = "Profil";
      else if (part === "pengawas") label = "Ruang Pengawas";
      else if (part === "ujian") label = "Ruang Ujian";

      breadcrumbs.push({ label, href: currentHref });
    }
    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="sticky top-0 z-30 flex flex-col border-b border-border bg-card/80 backdrop-blur-md">
      {/* Offline Alert Strip */}
      {isOffline && (
        <div className="bg-amber-500 text-amber-950 px-4 py-1 text-center text-xs font-semibold flex items-center justify-center gap-2">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Mode Offline PWA Aktif — Fitur pengerjaan ujian mewajibkan koneksi stabil.</span>
        </div>
      )}

      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Left Side: Mobile Menu Button & Breadcrumbs */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobile}
            className="lg:hidden p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Buka Menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-label="Breadcrumb">
            <Link
              href="/dashboard"
              className="hover:text-foreground font-medium transition-colors"
            >
              SMK
            </Link>
            {breadcrumbs.map((bc, idx) => (
              <React.Fragment key={bc.href}>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                {idx === breadcrumbs.length - 1 ? (
                  <span className="font-semibold text-foreground truncate max-w-[150px] sm:max-w-none">
                    {bc.label}
                  </span>
                ) : (
                  <Link
                    href={bc.href}
                    className="hover:text-foreground font-medium transition-colors truncate max-w-[100px] sm:max-w-none"
                  >
                    {bc.label}
                  </Link>
                )}
              </React.Fragment>
            ))}
          </nav>
        </div>

        {/* Right Side: Theme Toggle, Notifications, User Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Dark Mode Toggle */}
          <ThemeToggle />

          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Notifikasi"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl border border-border bg-card p-4 shadow-xl z-50 text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
                  <span className="font-semibold text-foreground">Notifikasi Sistem</span>
                  <span className="text-[10px] text-primary font-medium">Asesmen Aktif</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">Sistem Anti-Cheat Siap</p>
                      <p className="text-muted-foreground text-[11px]">AI Proctoring & Webcam sync aktif normal.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">Jadwal Ujian Tersinkron</p>
                      <p className="text-muted-foreground text-[11px]">Sesi ujian semester berjalan sesuai kalender.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Menu Dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 p-1.5 rounded-lg border border-border bg-card hover:bg-muted transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center">
                {user.name.charAt(0)}
              </div>
              <div className="hidden md:flex flex-col text-left pr-1">
                <span className="text-xs font-semibold text-foreground leading-tight truncate max-w-[120px]">
                  {user.name}
                </span>
                <span
                  className={`text-[10px] uppercase leading-none font-semibold ${
                    user.role === "PENGAWAS"
                      ? "text-purple-600 dark:text-purple-400 font-bold"
                      : "text-muted-foreground"
                  }`}
                >
                  {user.role}
                </span>
              </div>
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-card p-2 shadow-xl z-50 text-xs">
                <div className="px-3 py-2 border-b border-border mb-1">
                  <p className="font-semibold text-foreground truncate">{user.name}</p>
                  <p className="text-muted-foreground text-[11px] truncate">
                    {user.nisn ? `NISN: ${user.nisn}` : user.nip ? `NIP: ${user.nip}` : user.username}
                  </p>
                  {user.kelas && (
                    <span className="inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {user.kelas}
                    </span>
                  )}
                </div>

                <Link
                  href="/profil"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted text-foreground transition-colors"
                >
                  <UserCheck className="w-4 h-4 text-muted-foreground" />
                  <span>Profil Saya</span>
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors text-left font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Keluar dari Akun</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
