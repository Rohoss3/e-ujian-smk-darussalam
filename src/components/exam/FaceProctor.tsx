"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Camera, AlertTriangle, CheckCircle, ShieldAlert, UserCheck, Users, EyeOff } from "lucide-react";
import { JenisPelanggaran } from "@/types";
import { captureVideoFrameBase64 } from "@/lib/anti-cheat";

interface FaceProctorProps {
  onViolation: (type: JenisPelanggaran, description: string, snapshotBase64?: string) => void;
  isActive: boolean;
}

export function FaceProctor({ onViolation, isActive }: FaceProctorProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [streamReady, setStreamReady] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [faceStatus, setFaceStatus] = useState<"OK" | "NO_FACE" | "MULTI_FACE" | "LOOKING_AWAY">("OK");
  const [statusMessage, setStatusMessage] = useState("Kamera aktif & pengawasan AI berjalan");
  const [detectedFacesCount, setDetectedFacesCount] = useState<number>(1);

  // Tracking state to prevent false positives (require 3-4 consecutive frames of absence/multiple faces)
  const missingFramesRef = useRef(0);
  const multiFaceFramesRef = useRef(0);
  const awayFramesRef = useRef(0);
  const lastViolationTimeRef = useRef(0);

  // Initialize webcam stream
  useEffect(() => {
    let mediaStream: MediaStream | null = null;

    async function initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user",
          },
          audio: false,
        });
        mediaStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setStreamReady(true);
        }
      } catch (err) {
        console.error("Camera access error:", err);
        setPermissionError(
          "Izin akses kamera (webcam) ditolak. Ujian SMK mewajibkan pengawasan webcam aktif!"
        );
      }
    }

    if (isActive) {
      initCamera();
    }

    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isActive]);

  const triggerViolation = useCallback(
    (type: JenisPelanggaran, msg: string) => {
      const now = Date.now();
      // Throttle violation reports so it doesn't spam more than once every 5 seconds
      if (now - lastViolationTimeRef.current < 5000) return;
      lastViolationTimeRef.current = now;

      let snapshot: string | undefined;
      if (videoRef.current) {
        snapshot = captureVideoFrameBase64(videoRef.current) || undefined;
      }
      onViolation(type, msg, snapshot);
    },
    [onViolation]
  );

  // Computer Vision Face Detection Loop
  useEffect(() => {
    if (!streamReady || !isActive) return;

    let animationFrameId: number;
    let intervalId: NodeJS.Timeout;

    // Check if browser has native FaceDetector
    const hasNativeDetector = typeof window !== "undefined" && "FaceDetector" in window;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let nativeDetector: any = null;
    if (hasNativeDetector) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        nativeDetector = new (window as any).FaceDetector({ maxDetectedFaces: 5, fastMode: true });
      } catch {
        nativeDetector = null;
      }
    }

    const analyzeFrame = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      const w = 160;
      const h = 120;
      canvas.width = w;
      canvas.height = h;

      ctx.drawImage(video, 0, 0, w, h);

      if (nativeDetector) {
        try {
          const faces = await nativeDetector.detect(video);
          setDetectedFacesCount(faces.length);

          if (faces.length === 0) {
            missingFramesRef.current++;
            if (missingFramesRef.current > 3) {
              setFaceStatus("NO_FACE");
              setStatusMessage("Wajah tidak terdeteksi! Harap selalu menghadap ke kamera.");
              triggerViolation("TIDAK_ADA_WAJAH", "Wajah peserta menghilang dari tangkapan kamera webcam.");
            }
          } else if (faces.length > 1) {
            multiFaceFramesRef.current++;
            if (multiFaceFramesRef.current > 2) {
              setFaceStatus("MULTI_FACE");
              setStatusMessage(`Peringatan: Terdeteksi ${faces.length} orang di depan kamera!`);
              triggerViolation(
                "BANYAK_WAJAH",
                `Terdeteksi lebih dari satu orang (${faces.length} wajah) pada kamera ujian.`
              );
            }
          } else {
            // Exactly 1 face
            missingFramesRef.current = 0;
            multiFaceFramesRef.current = 0;

            // Check if face is centered
            const box = faces[0].boundingBox;
            const centerX = box.x + box.width / 2;
            const videoWidth = video.videoWidth || 640;

            if (centerX < videoWidth * 0.15 || centerX > videoWidth * 0.85) {
              awayFramesRef.current++;
              if (awayFramesRef.current > 4) {
                setFaceStatus("LOOKING_AWAY");
                setStatusMessage("Posisi kepala menoleh keluar area ujian!");
                triggerViolation("MENOLEH_CURIGA", "Peserta terdeteksi menoleh ke samping / mencurigakan.");
              }
            } else {
              awayFramesRef.current = 0;
              setFaceStatus("OK");
              setStatusMessage("Wajah terverifikasi & terpusat");
            }
          }
          return;
        } catch {
          // Fallback to optical analyzer below
        }
      }

      // Optical Skin-Tone & Centroid Flow Fallback Analyzer
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      let skinPixels = 0;
      let sumX = 0;
      let sumY = 0;

      for (let y = 0; y < h; y += 2) {
        for (let x = 0; x < w; x += 2) {
          const idx = (y * w + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          // Standard Normalized Skin Chrominance Filter
          const total = r + g + b;
          if (total > 50) {
            const rn = r / total;
            const gn = g / total;
            if (rn > 0.36 && rn < 0.55 && gn > 0.28 && gn < 0.38) {
              skinPixels++;
              sumX += x;
              sumY += y;
            }
          }
        }
      }

      const totalSampled = (w * h) / 4;
      const skinRatio = skinPixels / totalSampled;

      if (skinRatio < 0.04) {
        missingFramesRef.current++;
        if (missingFramesRef.current > 3) {
          setFaceStatus("NO_FACE");
          setStatusMessage("Wajah tidak terdeteksi! Harap selalu menghadap layar.");
          triggerViolation("TIDAK_ADA_WAJAH", "Wajah peserta tidak terdeteksi di depan webcam.");
        }
      } else if (skinRatio > 0.65) {
        multiFaceFramesRef.current++;
        if (multiFaceFramesRef.current > 3) {
          setFaceStatus("MULTI_FACE");
          setStatusMessage("Terdeteksi gangguan kamera atau objek mencurigakan!");
          triggerViolation("BANYAK_WAJAH", "Kamera terhalang objek atau terdapat bayangan orang lain.");
        }
      } else {
        missingFramesRef.current = 0;
        multiFaceFramesRef.current = 0;

        const avgX = sumX / skinPixels;
        // Check if head is severely tilted/turned to edge
        if (avgX < w * 0.2 || avgX > w * 0.8) {
          awayFramesRef.current++;
          if (awayFramesRef.current > 4) {
            setFaceStatus("LOOKING_AWAY");
            setStatusMessage("Perhatian: Harap tegak menghadap monitor!");
            triggerViolation("MENOLEH_CURIGA", "Peserta menoleh keluar monitor secara berulang.");
          }
        } else {
          awayFramesRef.current = 0;
          setFaceStatus("OK");
          setStatusMessage("Wajah terdeteksi normal");
        }
      }
    };

    intervalId = setInterval(analyzeFrame, 1000);

    return () => {
      clearInterval(intervalId);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [streamReady, isActive, triggerViolation]);

  return (
    <div className="relative bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-md flex flex-col items-center">
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Video Preview */}
      <div className="relative w-full aspect-[4/3] bg-black flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          muted
          playsInline
          className="w-full h-full object-cover transform -scale-x-100"
        />

        {!streamReady && !permissionError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 text-slate-300 p-4 text-center">
            <Camera className="w-8 h-8 animate-pulse text-blue-400 mb-2" />
            <p className="text-xs font-medium">Memulai kamera pengawas...</p>
          </div>
        )}

        {permissionError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/90 text-red-200 p-3 text-center">
            <ShieldAlert className="w-8 h-8 text-red-400 mb-2" />
            <p className="text-xs font-semibold leading-tight">{permissionError}</p>
          </div>
        )}

        {/* Live Proctoring Status Badge Overlay */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md bg-black/60 text-white border border-white/10">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>AI Proctoring</span>
          </div>

          {faceStatus === "OK" && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-600/90 text-white backdrop-blur-sm">
              <UserCheck className="w-3 h-3" /> 1 Wajah
            </span>
          )}
          {faceStatus === "NO_FACE" && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-black animate-bounce">
              <EyeOff className="w-3 h-3" /> Wajah Hilang!
            </span>
          )}
          {faceStatus === "MULTI_FACE" && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-600 text-white animate-bounce">
              <Users className="w-3 h-3" /> {detectedFacesCount > 1 ? `${detectedFacesCount} Orang!` : "Mencurigakan!"}
            </span>
          )}
          {faceStatus === "LOOKING_AWAY" && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-600 text-white">
              <AlertTriangle className="w-3 h-3" /> Menoleh!
            </span>
          )}
        </div>
      </div>

      {/* Status Footer */}
      <div
        className={`w-full px-3 py-2 text-xs flex items-center gap-2 border-t ${
          faceStatus === "OK"
            ? "bg-slate-800 text-emerald-400 border-slate-700"
            : faceStatus === "NO_FACE" || faceStatus === "LOOKING_AWAY"
            ? "bg-amber-950/80 text-amber-300 border-amber-800"
            : "bg-red-950/80 text-red-300 border-red-800"
        }`}
      >
        {faceStatus === "OK" ? (
          <CheckCircle className="w-3.5 h-3.5 shrink-0" />
        ) : (
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 animate-pulse" />
        )}
        <span className="truncate font-medium">{statusMessage}</span>
      </div>
    </div>
  );
}
