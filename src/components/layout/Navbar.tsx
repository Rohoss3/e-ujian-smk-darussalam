"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  GraduationCap,
  Calendar,
  FileSpreadsheet,
  Award,
  Download,
  LogOut,
  User,
  ShieldCheck,
  Radio,
  BookOpen,
} from "lucide-react";
import { SessionUser } from "@/types";

interface NavbarProps {
  user: SessionUser;
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOffline, setIsOffline] = useState(false);

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

  const handleLogout = async () => {
    if (!confirm("Apakah Anda yakin ingin keluar?")) return;
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  const navLinks =
    user.role === "SISWA"
      ? [
          { href: "/jadwal", label: "Jadwal Ujian", icon: Calendar },
          { href: "/hasil", label: "Riwayat Nilai", icon: Award },
          { href: "/unduhan", label: "Kartu Ujian & Unduhan", icon: Download },
        ]
      : [
          { href: "/jadwal", label: "Jadwal & Monitoring", icon: Radio },
          { href: "/bank-soal", label: "Bank Soal", icon: BookOpen },
          { href: "/hasil", label: "Rekap Nilai", icon: FileSpreadsheet },
          { href: "/unduhan", label: "Cetak Berkas & Laporan", icon: Download },
        ];

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
      {/* Offline Banner indicator */}
      {isOffline && (
        <div className="bg-amber-500 text-slate-950 px-4 py-1.5 text-center text-xs font-bold flex items-center justify-center gap-2">
          <span>Mode Offline PWA Aktif — Jadwal & Hasil tetap dapat diakses, tetapi pengerjaan Ujian mewajibkan koneksi Online.</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo Brand */}
          <Link href="/jadwal" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-1 shadow-md shadow-blue-900/10 group-hover:scale-105 transition">
              <img src="/logo.png" alt="Logo SMK" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-900 text-base tracking-tight">SMK DARUSSALAM</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                  {user.role}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-none">Panongan • E-Ujian CBT</p>
            </div>
          </Link>

          {/* Navigation Items */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-blue-700" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-900 leading-tight">{user.name}</span>
              <span className="text-[11px] text-slate-500">
                {user.role === "SISWA" ? `${user.kelas || "SMK"} • NISN: ${user.nisn || user.username}` : user.nip ? `NIP: ${user.nip}` : "Administrator"}
              </span>
            </div>

            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs">
              {user.name.charAt(0)}
            </div>

            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
              title="Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
