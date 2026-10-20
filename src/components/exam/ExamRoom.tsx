"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  AlertOctagon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  HelpCircle,
  ShieldAlert,
  Send,
  Flag,
  Wifi,
  FileQuestion,
  Bell,
  RefreshCw,
  Keyboard,
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import { SoalTampil, JenisPelanggaran } from "@/types";
import { AntiCheatEngine, requestFullscreenElement } from "@/lib/anti-cheat";
import { FaceProctor } from "./FaceProctor";
import { formatTime } from "@/lib/utils";

interface ExamRoomProps {
  ujian: {
    id: string;
    judul: string;
    kodeUjian: string;
    durasiMenit: number;
    maxPelanggaran: number;
    mataPelajaran: string;
  };
  peserta: {
    id: string;
    sisaWaktuDetik: number;
    jumlahPelanggaran: number;
    seedAcak: number;
  };
  siswa: {
    id: string;
    nama: string;
    nisn?: string;
    kelas: string;
  };
  initialSoal: SoalTampil[];
  initialJawaban: Array<{
    soalId: string;
    jawabanPG?: string;
    jawabanEssay?: string;
    raguRagu: boolean;
  }>;
}

export function ExamRoom({
  ujian,
  peserta,
  siswa,
  initialSoal,
  initialJawaban,
}: ExamRoomProps) {
  const router = useRouter();

  // Questions and active index
  const [soalList] = useState<SoalTampil[]>(initialSoal);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Answers Map: soalId -> { jawabanPG, jawabanEssay, raguRagu }
  const [answers, setAnswers] = useState<
    Record<string, { jawabanPG?: string; jawabanEssay?: string; raguRagu: boolean }>
  >(() => {
    const map: Record<string, { jawabanPG?: string; jawabanEssay?: string; raguRagu: boolean }> = {};
    initialJawaban.forEach((j) => {
      map[j.soalId] = {
        jawabanPG: j.jawabanPG,
        jawabanEssay: j.jawabanEssay,
        raguRagu: j.raguRagu,
      };
    });

    // Check localStorage fallback for cached offline answers
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(`smk_ans_${peserta.id}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          Object.keys(parsed).forEach((k) => {
            if (!map[k] || (!map[k].jawabanPG && parsed[k].jawabanPG)) {
              map[k] = parsed[k];
            }
          });
        }
      } catch {
        // Ignore JSON error
      }
    }

    return map;
  });

  // Autosave and sync states
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "offline">("saved");
  const pendingSyncQueue = useRef<Array<{ soalId: string; jawabanPG?: string; jawabanEssay?: string; raguRagu?: boolean }>>([]);

  // Fullscreen and Anti-Cheat state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasStartedFullscreen, setHasStartedFullscreen] = useState(false);
  const [violationCount, setViolationCount] = useState(peserta.jumlahPelanggaran);
  const [activeViolationNotice, setActiveViolationNotice] = useState<string | null>(null);
  const [isDisqualified, setIsDisqualified] = useState(false);
  const [teacherMessage, setTeacherMessage] = useState<string | null>(null);

  // Timer state
  const [timeLeft, setTimeLeft] = useState(peserta.sisaWaktuDetik || ujian.durasiMenit * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // References
  const socketRef = useRef<Socket | null>(null);
  const antiCheatRef = useRef<AntiCheatEngine | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const essayDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Live state refs to keep timer loops clean without re-renders
  const timeLeftRef = useRef(timeLeft);
  timeLeftRef.current = timeLeft;

  const answersRef = useRef(answers);
  answersRef.current = answers;

  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  const violationCountRef = useRef(violationCount);
  violationCountRef.current = violationCount;

  const currentSoal = soalList[currentIndex];
  const currentAnswer = currentSoal ? answers[currentSoal.id] : undefined;

  // Real-time violation handler
  const handleViolation = useCallback(
    async (type: JenisPelanggaran, description: string, snapshotBase64?: string) => {
      if (isDisqualified || isSubmitting) return;

      try {
        const res = await fetch("/api/ujian/pelanggaran", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pesertaId: peserta.id,
            jenis: type,
            deskripsi: description,
            snapshotFoto: snapshotBase64,
          }),
        });
        const data = await res.json();

        if (data.success) {
          setViolationCount(data.jumlahPelanggaran);
          setActiveViolationNotice(
            `PELANGGARAN (${data.jumlahPelanggaran}/${data.maxPelanggaran}): ${description}`
          );

          // Emit to teacher via socket
          if (socketRef.current) {
            socketRef.current.emit("lapor_pelanggaran", {
              ujianId: ujian.id,
              pesertaId: peserta.id,
              siswaNama: siswa.nama,
              jenis: type,
              deskripsi: description,
              snapshot: snapshotBase64,
              jumlahPelanggaran: data.jumlahPelanggaran,
            });
          }

          if (data.isDisqualified) {
            setIsDisqualified(true);
            setTimeout(() => {
              router.push(`/hasil?ujianId=${ujian.id}`);
            }, 3000);
          }
        }
      } catch (err) {
        console.error("Gagal mencatat pelanggaran:", err);
      }
    },
    [isDisqualified, isSubmitting, peserta.id, router, siswa.nama, ujian.id]
  );

  // Initialize Anti-Cheat Engine when fullscreen is accepted
  useEffect(() => {
    if (!hasStartedFullscreen) return;

    const engine = new AntiCheatEngine({
      maxViolations: ujian.maxPelanggaran,
      onViolation: handleViolation,
    });

    engine.init();
    antiCheatRef.current = engine;

    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);

    return () => {
      engine.destroy();
      document.removeEventListener("fullscreenchange", handleFsChange);
    };
  }, [hasStartedFullscreen, handleViolation, ujian.maxPelanggaran]);

  // Connect Real-time Socket.IO to Proctor Channel
  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    socket.emit("join_ujian", {
      ujianId: ujian.id,
      pesertaId: peserta.id,
      siswaNama: siswa.nama,
    });

    // Listen for teacher warning message
    socket.on("peringatan_pengawas", (data: { pesan: string }) => {
      setTeacherMessage(data.pesan);
      if (antiCheatRef.current) {
        antiCheatRef.current.playAlertSound();
      }
    });

    // Listen for force submit by teacher
    socket.on("perintah_selesai_paksa", (data: { alasan: string }) => {
      alert(`Ujian Anda telah diselesaikan oleh Pengawas!\nAlasan: ${data.alasan}`);
      router.push(`/hasil?ujianId=${ujian.id}`);
    });

    return () => {
      socket.disconnect();
    };
  }, [peserta.id, router, siswa.nama, ujian.id]);

  // Submit Handler
  const handleAutoSubmit = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    if (essayDebounceTimerRef.current) {
      clearTimeout(essayDebounceTimerRef.current);
      essayDebounceTimerRef.current = null;
    }
    try {
      await fetch("/api/ujian/selesai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pesertaId: peserta.id }),
      });
    } finally {
      router.push(`/hasil?ujianId=${ujian.id}`);
    }
  }, [isSubmitting, peserta.id, router, ujian.id]);

  // Stable 1-second Countdown Timer
  useEffect(() => {
    if (!hasStartedFullscreen || isDisqualified) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [hasStartedFullscreen, isDisqualified, handleAutoSubmit]);

  // Stable 5-second Heartbeat Telemetry Loop (runs without restarting)
  useEffect(() => {
    if (!hasStartedFullscreen || isDisqualified) return;

    const heartbeat = setInterval(async () => {
      const currentSeconds = timeLeftRef.current;
      try {
        const res = await fetch("/api/ujian/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pesertaId: peserta.id,
            sisaWaktuDetik: currentSeconds,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.status === "SELESAI" || data.status === "DIDISKUALIFIKASI") {
            router.push(`/hasil?ujianId=${ujian.id}`);
            return;
          }
          if (typeof data.sisaWaktuDetik === "number") {
            setTimeLeft((current) => {
              if (Math.abs(current - data.sisaWaktuDetik) > 5) {
                return data.sisaWaktuDetik;
              }
              return current;
            });
          }
        }
      } catch {
        // Network temporary fail
      }

      if (socketRef.current) {
        const answeredCount = Object.values(answersRef.current).filter(
          (a) => (a.jawabanPG && a.jawabanPG.length > 0) || (a.jawabanEssay && a.jawabanEssay.length > 0)
        ).length;

        socketRef.current.emit("telemetri_siswa", {
          ujianId: ujian.id,
          pesertaId: peserta.id,
          siswaNama: siswa.nama,
          sisaWaktuDetik: currentSeconds,
          jumlahPelanggaran: violationCountRef.current,
          nomorAktif: currentIndexRef.current + 1,
          terjawab: answeredCount,
          totalSoal: soalList.length,
        });
      }
    }, 5000);

    return () => clearInterval(heartbeat);
  }, [hasStartedFullscreen, isDisqualified, peserta.id, router, siswa.nama, ujian.id, soalList.length]);

  // Answer saving handler with offline cache, retry queue, and optional debouncing
  const saveAnswer = async (
    soalId: string,
    jawabanPG?: string,
    jawabanEssay?: string,
    raguRagu?: boolean,
    debounceMs?: number
  ) => {
    // Immediate state update and offline backup
    setAnswers((prev) => {
      const updated = {
        ...prev,
        [soalId]: {
          jawabanPG: jawabanPG !== undefined ? jawabanPG : prev[soalId]?.jawabanPG,
          jawabanEssay: jawabanEssay !== undefined ? jawabanEssay : prev[soalId]?.jawabanEssay,
          raguRagu: raguRagu !== undefined ? raguRagu : prev[soalId]?.raguRagu || false,
        },
      };

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`smk_ans_${peserta.id}`, JSON.stringify(updated));
        } catch {
          // Local storage quota exceeded or disabled
        }
      }

      return updated;
    });

    const sendNetworkRequest = async () => {
      setSaveStatus("saving");
      try {
        const res = await fetch("/api/ujian/jawaban", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pesertaId: peserta.id,
            soalId,
            jawabanPG,
            jawabanEssay,
            raguRagu,
          }),
        });

        if (res.ok) {
          setSaveStatus("saved");
        } else {
          setSaveStatus("offline");
          pendingSyncQueue.current.push({ soalId, jawabanPG, jawabanEssay, raguRagu });
        }
      } catch {
        setSaveStatus("offline");
        pendingSyncQueue.current.push({ soalId, jawabanPG, jawabanEssay, raguRagu });
      }
    };

    if (debounceMs && debounceMs > 0) {
      setSaveStatus("saving");
      if (essayDebounceTimerRef.current) {
        clearTimeout(essayDebounceTimerRef.current);
      }
      essayDebounceTimerRef.current = setTimeout(() => {
        essayDebounceTimerRef.current = null;
        sendNetworkRequest();
      }, debounceMs);
    } else {
      if (essayDebounceTimerRef.current) {
        clearTimeout(essayDebounceTimerRef.current);
        essayDebounceTimerRef.current = null;
      }
      await sendNetworkRequest();
    }
  };

  // Online event listener to drain pending offline queue
  useEffect(() => {
    const handleOnline = async () => {
      if (pendingSyncQueue.current.length > 0) {
        setSaveStatus("saving");
        const queue = [...pendingSyncQueue.current];
        pendingSyncQueue.current = [];

        for (const item of queue) {
          try {
            await fetch("/api/ujian/jawaban", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                pesertaId: peserta.id,
                ...item,
              }),
            });
          } catch {
            pendingSyncQueue.current.push(item);
          }
        }

        if (pendingSyncQueue.current.length === 0) {
          setSaveStatus("saved");
        } else {
          setSaveStatus("offline");
        }
      }
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [peserta.id]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!hasStartedFullscreen || isDisqualified) return;

      const activeTag = (document.activeElement?.tagName || "").toUpperCase();
      const isInputFocused =
        activeTag === "INPUT" ||
        activeTag === "TEXTAREA" ||
        (document.activeElement as HTMLElement)?.isContentEditable;

      // Escape closes the submit modal
      if (e.key === "Escape") {
        setShowSubmitModal(false);
        return;
      }

      // If user is currently typing in essay textarea, don't trigger question navigation shortcuts
      if (isInputFocused) return;

      // Navigation: ArrowLeft / ArrowUp -> Previous
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setCurrentIndex((prev) => Math.max(0, prev - 1));
        return;
      }

      // Navigation: ArrowRight / ArrowDown -> Next
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setCurrentIndex((prev) => Math.min(soalList.length - 1, prev + 1));
        return;
      }

      // Toggle Ragu-ragu with 'R'
      if (e.key.toLowerCase() === "r" && currentSoal) {
        e.preventDefault();
        saveAnswer(currentSoal.id, undefined, undefined, !currentAnswer?.raguRagu);
        return;
      }

      // Option Selection: Keys A, B, C, D, E or 1, 2, 3, 4, 5 for Multiple Choice
      if (currentSoal && currentSoal.tipeSoal === "PILIHAN_GANDA" && currentSoal.opsi) {
        const key = e.key.toUpperCase();
        let targetOptionIndex = -1;

        if (["A", "B", "C", "D", "E"].includes(key)) {
          targetOptionIndex = ["A", "B", "C", "D", "E"].indexOf(key);
        } else if (["1", "2", "3", "4", "5"].includes(e.key)) {
          targetOptionIndex = parseInt(e.key, 10) - 1;
        }

        if (targetOptionIndex >= 0 && targetOptionIndex < currentSoal.opsi.length) {
          e.preventDefault();
          const selectedOption = currentSoal.opsi[targetOptionIndex];
          saveAnswer(currentSoal.id, selectedOption.originalKey, undefined, undefined);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasStartedFullscreen, isDisqualified, currentSoal, currentAnswer, soalList.length]);

  const handleEnterFullscreen = async () => {
    const success = await requestFullscreenElement(containerRef.current || document.documentElement);
    if (success) {
      setIsFullscreen(true);
      setHasStartedFullscreen(true);
    } else {
      alert("Browser menolak layar penuh. Harap izinkan fullscreen pada browser Anda.");
    }
  };

  // Calculated stats for kisi-kisi
  const totalAnswered = Object.values(answers).filter(
    (a) => (a.jawabanPG && a.jawabanPG.length > 0) || (a.jawabanEssay && a.jawabanEssay.trim().length > 0)
  ).length;
  const totalRagu = Object.values(answers).filter((a) => a.raguRagu).length;
  const totalUnanswered = soalList.length - totalAnswered;

  // 1. Initial Gate: Fullscreen Requirement Modal
  if (!hasStartedFullscreen) {
    return (
      <div
        ref={containerRef}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-white p-6"
      >
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center">
          <div className="w-16 h-16 bg-emerald-600/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
            <Maximize2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold mb-2">Konfirmasi Masuk Ruang Ujian SMK</h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            Ujian ini dilengkapi pengawasan ketat Anti-Cheat & Kamera AI. Anda wajib mengerjakan dalam mode{" "}
            <strong className="text-white font-semibold">Layar Penuh (Fullscreen)</strong>.
          </p>

          <div className="bg-slate-950/80 rounded-xl p-4 mb-6 text-left border border-slate-800 text-xs space-y-2">
            <div className="flex justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-400">Mata Pelajaran:</span>
              <span className="font-semibold text-white">{ujian.mataPelajaran}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-400">Peserta:</span>
              <span className="font-semibold text-white">{siswa.nama}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-400">Kelas:</span>
              <span className="font-semibold text-white">{siswa.kelas}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Toleransi Pelanggaran:</span>
              <span className="font-semibold text-amber-400">Maksimal {ujian.maxPelanggaran} Kali</span>
            </div>
          </div>

          <button
            onClick={handleEnterFullscreen}
            className="w-full py-3.5 px-6 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-600/30 active:scale-[0.98]"
          >
            <Maximize2 className="w-5 h-5" />
            Aktifkan Layar Penuh & Mulai Ujian
          </button>
        </div>
      </div>
    );
  }

  // 2. Disqualification Screen
  if (isDisqualified) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-red-950 text-white p-6 text-center">
        <div className="max-w-md bg-slate-900 border border-red-800 rounded-2xl p-8 shadow-2xl">
          <AlertOctagon className="w-16 h-16 text-red-500 mx-auto mb-4 animate-bounce" />
          <h1 className="text-2xl font-black text-red-500 mb-2">UJIAN DIDISKUALIFIKASI</h1>
          <p className="text-slate-300 text-sm mb-6">
            Anda telah melampaui batas maksimal toleransi kecurangan ({violationCount}/{ujian.maxPelanggaran}). Ujian Anda telah dihentikan secara otomatis dan dilaporkan ke Panitia Ujian SMK.
          </p>
          <div className="animate-spin w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full mx-auto" />
          <p className="text-xs text-slate-500 mt-4">Mengalihkan ke halaman hasil...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-40 bg-slate-100 flex flex-col select-none overflow-hidden font-sans"
    >
      {/* Violation Overlay when exit Fullscreen */}
      {!isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white">
          <ShieldAlert className="w-16 h-16 text-red-500 mb-4 animate-pulse" />
          <h2 className="text-2xl font-bold text-red-400 mb-2">PERINGATAN PELANGGARAN KERAS!</h2>
          <p className="text-slate-300 text-sm max-w-md mb-6 leading-relaxed">
            Anda keluar dari mode Layar Penuh (Fullscreen). Pelanggaran ini telah dicatat sistem anti-cheat.
            Pelanggaran: <strong className="text-red-400 font-bold">{violationCount} / {ujian.maxPelanggaran}</strong>
          </p>
          <button
            onClick={handleEnterFullscreen}
            className="py-3 px-8 rounded-xl font-bold bg-red-600 hover:bg-red-500 text-white shadow-xl shadow-red-600/40 active:scale-95 transition"
          >
            Kembali ke Layar Penuh
          </button>
        </div>
      )}

      {/* Teacher Warning Toast */}
      {teacherMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 max-w-lg w-full px-4 animate-bounce">
          <div className="bg-amber-500 text-slate-950 font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center justify-between border-2 border-amber-300">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 shrink-0" />
              <div className="text-xs">
                <span className="block font-black uppercase tracking-wider text-[10px]">Pesan Dari Pengawas:</span>
                <span>{teacherMessage}</span>
              </div>
            </div>
            <button
              onClick={() => setTeacherMessage(null)}
              className="text-xs bg-slate-950 text-white px-2.5 py-1 rounded-md font-semibold hover:bg-slate-800"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}

      {/* Violation Toast Notification */}
      {activeViolationNotice && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4">
          <div className="bg-red-600 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 shrink-0" />
              <span>{activeViolationNotice}</span>
            </div>
            <button
              onClick={() => setActiveViolationNotice(null)}
              className="text-xs underline hover:text-red-200 ml-2"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <header className="h-16 bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white flex items-center justify-between px-6 shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/95 p-0.5 flex items-center justify-center shrink-0 border border-white/20 shadow-sm">
            <img src="/logo.png" alt="Logo SMK" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight">{ujian.judul}</h1>
            <p className="text-xs text-emerald-200">
              {siswa.nama} ({siswa.kelas}) • {ujian.kodeUjian}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          {/* Autosave Status Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-black/20 border border-white/10">
            {saveStatus === "saving" && (
              <>
                <div className="w-2.5 h-2.5 rounded-full border-2 border-white/40 border-t-emerald-300 animate-spin" />
                <span className="text-emerald-200">Menyimpan...</span>
              </>
            )}
            {saveStatus === "saved" && (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-100">Jawaban Tersimpan</span>
              </>
            )}
            {saveStatus === "offline" && (
              <>
                <Wifi className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-200">Tersimpan Offline</span>
              </>
            )}
          </div>

          {/* Anti-cheat violation pill */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-black/30 border border-white/10">
            <ShieldAlert
              className={`w-4 h-4 ${violationCount > 0 ? "text-amber-400" : "text-emerald-400"}`}
            />
            <span className="text-emerald-100 hidden md:inline">Pelanggaran:</span>
            <span
              className={`${
                violationCount >= ujian.maxPelanggaran - 1
                  ? "text-red-400 font-extrabold"
                  : violationCount > 0
                  ? "text-amber-400"
                  : "text-emerald-300"
              }`}
            >
              {violationCount} / {ujian.maxPelanggaran}
            </span>
          </div>

          {/* Countdown Clock */}
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-mono font-bold text-base shadow-inner ${
              timeLeft < 300
                ? "bg-red-600 text-white animate-pulse"
                : "bg-emerald-950/70 text-white border border-emerald-400/30"
            }`}
          >
            <Clock className="w-4 h-4 text-emerald-300" />
            <span>{formatTime(timeLeft)}</span>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left / Center: Question Panel */}
        <main className="flex-1 flex flex-col bg-slate-50 overflow-y-auto p-4 sm:p-6 md:p-8">
          {currentSoal ? (
            <div className="max-w-4xl w-full mx-auto flex-1 flex flex-col justify-between">
              {/* Question Header & Body */}
              <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-md">
                      Soal No. {currentSoal.nomorUrut} dari {soalList.length}
                    </span>
                    <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-md">
                      {currentSoal.tipeSoal === "PILIHAN_GANDA" ? "Pilihan Ganda" : "Essay / Uraian"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">
                      Bobot: {currentSoal.bobot} Poin
                    </span>
                    <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      <Keyboard className="w-3 h-3" /> Shortcut Aktif
                    </span>
                  </div>
                </div>

                {/* Question Text */}
                <div className="text-slate-800 text-base md:text-lg leading-relaxed font-medium mb-6">
                  {currentSoal.pertanyaan}
                </div>

                {/* Multiple Choice Options */}
                {currentSoal.tipeSoal === "PILIHAN_GANDA" && (
                  <div className="space-y-3">
                    {currentSoal.opsi.map((opt) => {
                      const isSelected = currentAnswer?.jawabanPG === opt.originalKey;
                      return (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => saveAnswer(currentSoal.id, opt.originalKey, undefined, undefined)}
                          className={`w-full text-left p-4 rounded-xl border flex items-start gap-4 transition-all group ${
                            isSelected
                              ? "bg-emerald-50 border-emerald-600 shadow-sm ring-1 ring-emerald-600"
                              : "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                              isSelected
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-100 text-slate-700 group-hover:bg-slate-200"
                            }`}
                          >
                            {opt.label}
                          </div>
                          <span className="text-slate-800 text-sm md:text-base font-normal pt-1 flex-1">
                            {opt.text}
                          </span>
                          <span className="hidden group-hover:inline-block text-[10px] text-slate-400 border border-slate-200 rounded px-1.5 py-0.5 mt-1 font-mono">
                            Tekan [{opt.label}]
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Essay Textarea */}
                {currentSoal.tipeSoal === "ESSAY" && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Jawaban Anda:
                    </label>
                    <textarea
                      rows={8}
                      value={currentAnswer?.jawabanEssay || ""}
                      onChange={(e) =>
                        saveAnswer(currentSoal.id, undefined, e.target.value, undefined, 600)
                      }
                      onBlur={(e) =>
                        saveAnswer(currentSoal.id, undefined, e.target.value, undefined, 0)
                      }
                      placeholder="Ketikkan uraian jawaban Anda di sini secara lengkap dan jelas..."
                      className="w-full p-4 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-sm text-slate-800 outline-none leading-relaxed transition resize-y font-normal"
                    />
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Gunakan keyboard untuk mengetik uraian.</span>
                      <span>{currentAnswer?.jawabanEssay ? currentAnswer.jawabanEssay.length : 0} Karakter • Autosave Aktif</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Navigation Buttons */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 font-bold text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-2 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Sebelumnya</span>
                  <span className="hidden sm:inline text-[10px] text-slate-400 font-mono">[←]</span>
                </button>

                {/* Ragu-Ragu Checkbox Button */}
                <button
                  type="button"
                  onClick={() =>
                    saveAnswer(
                      currentSoal.id,
                      undefined,
                      undefined,
                      !currentAnswer?.raguRagu
                    )
                  }
                  className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 border transition ${
                    currentAnswer?.raguRagu
                      ? "bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20"
                      : "bg-white text-amber-700 border-amber-300 hover:bg-amber-50"
                  }`}
                >
                  <Flag className="w-4 h-4" />
                  <span>{currentAnswer?.raguRagu ? "Ragu-Ragu (Ditandai)" : "Tandai Ragu-Ragu"}</span>
                  <span className="hidden sm:inline text-[10px] opacity-80 font-mono">[R]</span>
                </button>

                {currentIndex < soalList.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((prev) => Math.min(soalList.length - 1, prev + 1))}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center gap-2 shadow-md shadow-emerald-600/20 transition"
                  >
                    <span>Selanjutnya</span>
                    <span className="hidden sm:inline text-[10px] text-emerald-200 font-mono">[→]</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(true)}
                    className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm flex items-center gap-2 shadow-md shadow-teal-600/20 transition"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Selesaikan Ujian
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500 text-sm">
              Tidak ada soal tersedia.
            </div>
          )}
        </main>

        {/* Right Sidebar: Webcam Face Proctor & Kisi-kisi Nomor Soal */}
        <aside className="w-80 bg-white border-l border-slate-200 flex flex-col p-5 shadow-sm overflow-y-auto shrink-0">
          {/* Webcam Live Proctoring Component */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Pengawasan AI
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                <Wifi className="w-3 h-3" /> Online
              </span>
            </div>
            <FaceProctor onViolation={handleViolation} isActive={hasStartedFullscreen} />
          </div>

          {/* Kisi-kisi Nomor Soal Grid */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Navigasi Soal
              </span>
              <span className="text-xs font-bold text-emerald-700">
                {totalAnswered} / {soalList.length} Dijawab
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2 mb-4">
              {soalList.map((s, idx) => {
                const ans = answers[s.id];
                const isAnswered =
                  (ans?.jawabanPG && ans.jawabanPG.length > 0) ||
                  (ans?.jawabanEssay && ans.jawabanEssay.trim().length > 0);
                const isRagu = ans?.raguRagu;
                const isCurrent = idx === currentIndex;

                let btnClass = "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200";
                if (isCurrent) {
                  btnClass = "ring-2 ring-emerald-600 border-emerald-600 font-extrabold";
                }
                if (isRagu) {
                  btnClass += " bg-amber-400 text-black border-amber-500";
                } else if (isAnswered) {
                  btnClass += " bg-emerald-600 text-white border-emerald-600";
                }

                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-10 rounded-lg text-xs font-bold flex flex-col items-center justify-center border transition relative ${btnClass}`}
                  >
                    <span>{s.nomorUrut}</span>
                    {isAnswered && s.tipeSoal === "PILIHAN_GANDA" && (
                      <span className="text-[9px] uppercase opacity-90 leading-none">
                        {ans?.jawabanPG}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] space-y-1.5 text-slate-600 mb-6">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-emerald-600" />
                <span>Sudah Dijawab ({totalAnswered})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-amber-400" />
                <span>Ragu-Ragu ({totalRagu})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-slate-200 border border-slate-300" />
                <span>Belum Dijawab ({totalUnanswered})</span>
              </div>
            </div>

            {/* Finish Exam Button */}
            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              className="w-full py-3 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition active:scale-95"
            >
              <Send className="w-4 h-4" />
              Kumpulkan Ujian
            </button>
          </div>
        </aside>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-center animate-in fade-in zoom-in-95">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <HelpCircle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Konfirmasi Selesai Ujian</h3>
            <p className="text-slate-500 text-xs mb-6">
              Apakah Anda yakin ingin menyelesaikan ujian ini? Jawaban yang sudah dikumpulkan tidak dapat diubah kembali.
            </p>

            <div className="bg-slate-50 rounded-xl p-4 mb-6 text-xs text-left space-y-2 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Soal Terjawab:</span>
                <span className="font-bold text-emerald-600">{totalAnswered} Soal</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Soal Ragu-ragu:</span>
                <span className="font-bold text-amber-600">{totalRagu} Soal</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Soal Belum Terjawab:</span>
                <span className="font-bold text-red-600">{totalUnanswered} Soal</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 font-bold text-sm text-slate-700 hover:bg-slate-50 transition"
              >
                Batal / Periksa Lagi
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleAutoSubmit}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-sm text-white shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition"
              >
                {isSubmitting ? "Mengirim..." : "Ya, Kumpulkan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
