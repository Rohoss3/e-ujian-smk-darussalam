"use client";

import React, { createContext, useContext, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  GraduationCap,
  Users,
  UserCheck,
  BookOpen,
  ClipboardList,
  Radio,
  FileSpreadsheet,
  FileDown,
  Building2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FolderTree,
  Calendar,
  Award,
  Sparkles,
  ShieldAlert,
  ArrowUpDown,
  FileCheck,
  CheckCircle2,
  Bookmark,
  LogOut,
} from "lucide-react";
import { SessionUser } from "@/types";
import { cn } from "@/lib/utils";

interface SidebarProps {
  user: SessionUser;
  collapsed: boolean;
  setCollapsed: (val: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (val: boolean) => void;
}

export function Sidebar({
  user,
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
}: SidebarProps) {
  const pathname = usePathname();

  // Collapsible section toggle state for desktop
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    master: true,
    pengguna: true,
    ujianAdmin: true,
    laporanAdmin: true,
    pengaturanAdmin: true,
    ujianGuru: true,
    penilaianGuru: true,
    laporanGuru: true,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/";
    }
  };

  // 1. Navigation items for Admin Sekolah
  const adminSections = [
    {
      key: "utama",
      title: "Utama",
      items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
    },
    {
      key: "master",
      title: "Data Master",
      items: [
        { href: "/admin/jurusan", label: "Jurusan", icon: Layers },
        { href: "/admin/kelas", label: "Kelas", icon: FolderTree },
        { href: "/admin/mata-pelajaran", label: "Mata Pelajaran", icon: BookOpen },
      ],
    },
    {
      key: "pengguna",
      title: "Pengguna",
      items: [
        { href: "/admin/guru", label: "Guru", icon: UserCheck },
        { href: "/admin/siswa", label: "Siswa", icon: Users },
        { href: "/admin/pengawas", label: "Pengawas Ujian", icon: Radio },
      ],
    },
    {
      key: "ujianAdmin",
      title: "Ujian",
      items: [
        { href: "/manajemen-ujian", label: "Semua Ujian", icon: ClipboardList },
        { href: "/jadwal", label: "Monitoring", icon: Radio },
      ],
    },
    {
      key: "laporanAdmin",
      title: "Laporan",
      items: [
        { href: "/hasil", label: "Nilai", icon: FileSpreadsheet },
        { href: "/import-export", label: "Pelanggaran & Ekspor", icon: ArrowUpDown },
        { href: "/unduhan", label: "Berita Acara", icon: FileDown },
      ],
    },
    {
      key: "pengaturanAdmin",
      title: "Pengaturan",
      items: [
        { href: "/pengaturan", label: "Profil Sekolah & TTD", icon: Building2 },
      ],
    },
  ];

  // 2. Navigation items for Guru
  const guruSections = [
    {
      key: "utama",
      title: "Utama",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/guru/bank-soal", label: "Bank Soal", icon: BookOpen },
      ],
    },
    {
      key: "ujianGuru",
      title: "Ujian Saya",
      items: [
        { href: "/guru/ujian", label: "Daftar & Buat Ujian", icon: ClipboardList },
        { href: "/jadwal", label: "Monitoring", icon: Radio },
      ],
    },
    {
      key: "penilaianGuru",
      title: "Penilaian",
      items: [
        { href: "/guru/penilaian", label: "Koreksi Essay", icon: FileCheck },
        { href: "/hasil", label: "Rekap Nilai", icon: FileSpreadsheet },
      ],
    },
    {
      key: "laporanGuru",
      title: "Laporan",
      items: [
        { href: "/import-export", label: "Export Nilai", icon: ArrowUpDown },
        { href: "/unduhan", label: "Unduh Berita Acara", icon: FileDown },
      ],
    },
    {
      key: "profilGuru",
      title: "Akun",
      items: [{ href: "/profil", label: "Profil Guru", icon: UserCheck }],
    },
  ];

  // 3. Navigation items for Siswa
  const siswaSections = [
    {
      key: "siswa",
      title: "Menu Siswa",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/siswa/jadwal", label: "Jadwal Ujian", icon: Calendar },
        { href: "/siswa/hasil", label: "Hasil Ujian", icon: Award },
        { href: "/profil", label: "Profil", icon: UserCheck },
      ],
    },
  ];

  // 4. Navigation items for Pengawas Ujian
  const pengawasSections = [
    {
      key: "pengawasan",
      title: "Menu Pengawas",
      items: [
        { href: "/dashboard", label: "Dashboard Pengawas", icon: LayoutDashboard },
        { href: "/jadwal", label: "Live Monitoring Ujian", icon: Radio },
      ],
    },
    {
      key: "dokumen",
      title: "Dokumen & Akun",
      items: [
        { href: "/unduhan", label: "Berita Acara Ujian", icon: FileDown },
        { href: "/profil", label: "Profil Pengawas", icon: UserCheck },
      ],
    },
  ];

  const sections =
    user.role === "ADMIN"
      ? adminSections
      : user.role === "GURU"
      ? guruSections
      : user.role === "PENGAWAS"
      ? pengawasSections
      : siswaSections;

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-40 flex flex-col border-r border-border bg-card transition-all duration-200 select-none",
          collapsed ? "w-16" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center px-4 border-b border-border justify-between shrink-0">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 overflow-hidden"
            onClick={() => setMobileOpen(false)}
          >
            <div className="h-9 w-9 rounded-lg bg-white/90 dark:bg-card border border-border flex items-center justify-center shrink-0 shadow-sm p-0.5">
              <img src="/logo.png" alt="Logo SMK" className="h-full w-full object-contain" />
            </div>
            {!collapsed && (
              <div className="flex flex-col truncate">
                <span className="font-extrabold text-sm tracking-tight text-foreground flex items-center gap-1.5 truncate">
                  SMK DARUSSALAM
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-primary/10 text-primary shrink-0">
                    PRO
                  </span>
                </span>
                <span className="text-[11px] text-muted-foreground truncate">
                  Panongan • E-Ujian
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {sections.map((section) => (
            <div key={section.key} className="space-y-1">
              {!collapsed && (
                <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 mb-1">
                  {section.title}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname === item.href ||
                        (item.href !== "/dashboard" && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors duration-150",
                        isActive
                          ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        collapsed && "justify-center px-0 py-2.5"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isActive ? "text-primary-foreground" : "text-muted-foreground"
                        )}
                      />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom User Info & Collapse / Logout Actions */}
        <div className="border-t border-border p-2.5 flex flex-col gap-2 shrink-0 bg-card">
          {!collapsed ? (
            <div className="flex items-center justify-between min-w-0 gap-2">
              <div className="flex items-center gap-2.5 min-w-0 pr-1">
                <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                  {user.name.charAt(0)}
                </div>
                <div className="min-w-0 truncate">
                  <p className="text-xs font-semibold text-foreground truncate leading-tight">
                    {user.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate uppercase font-medium">
                    {user.role} {user.kelas ? `• ${user.kelas}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Keluar / Logout"
                  aria-label="Keluar / Logout"
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCollapsed(!collapsed)}
                  aria-label="Perkecil Sidebar"
                  className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div
                title={`${user.name} (${user.role})`}
                className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs"
              >
                {user.name.charAt(0)}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Keluar / Logout"
                aria-label="Keluar / Logout"
                className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setCollapsed(!collapsed)}
                aria-label="Perluas Sidebar"
                className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
