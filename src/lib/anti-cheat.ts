import { JenisPelanggaran } from "@/types";

export interface AntiCheatOptions {
  onViolation: (type: JenisPelanggaran, description: string) => void;
  maxViolations?: number;
  enableAudioAlert?: boolean;
}

export class AntiCheatEngine {
  private options: AntiCheatOptions;
  private violationCount = 0;
  private isDestroyed = false;
  private audioCtx: AudioContext | null = null;
  private devToolsCheckInterval: NodeJS.Timeout | null = null;

  constructor(options: AntiCheatOptions) {
    this.options = {
      maxViolations: 3,
      enableAudioAlert: true,
      ...options,
    };
  }

  public init() {
    if (typeof window === "undefined") return;

    this.bindKeyboardInterceptors();
    this.bindMouseAndSelectionInterceptors();
    this.bindVisibilityAndFocusInterceptors();
    this.bindFullscreenInterceptors();
    this.bindDevToolsDetection();
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.devToolsCheckInterval) {
      clearInterval(this.devToolsCheckInterval);
    }
  }

  public playAlertSound() {
    if (!this.options.enableAudioAlert || typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!this.audioCtx) {
        this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(880, this.audioCtx.currentTime); // 880 Hz alarm
      osc.frequency.exponentialRampToValueAtTime(440, this.audioCtx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.3);
    } catch {
      // AudioContext might be blocked until user interacts
    }
  }

  public reportViolation(type: JenisPelanggaran, description: string) {
    if (this.isDestroyed) return;
    this.violationCount++;
    this.playAlertSound();
    this.options.onViolation(type, description);
  }

  private bindKeyboardInterceptors() {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (this.isDestroyed) return;

      // 1. Block DevTools Shortcuts (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C)
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && ["I", "i", "J", "j", "C", "c"].includes(e.key))
      ) {
        e.preventDefault();
        e.stopPropagation();
        this.reportViolation("DEVTOOLS", "Membuka perangkat pengembang / DevTools terdeteksi");
        return;
      }

      // 2. Block View Source (Ctrl+U)
      if (e.ctrlKey && (e.key === "u" || e.key === "U")) {
        e.preventDefault();
        e.stopPropagation();
        this.reportViolation("SHORTCUT_TERLARANG", "Mencoba melihat sumber kode halaman (Ctrl+U)");
        return;
      }

      // 3. Block Copy/Paste/Cut/Select All
      if (e.ctrlKey && ["c", "v", "x", "a"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        e.stopPropagation();
        this.reportViolation("SHORTCUT_TERLARANG", `Kombinasi tombol pintas terlarang (Ctrl+${e.key.toUpperCase()})`);
        return;
      }

      // 4. Block Print & Save (Ctrl+P, Ctrl+S)
      if (e.ctrlKey && ["p", "s"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        e.stopPropagation();
        this.reportViolation("SHORTCUT_TERLARANG", `Mencoba mencetak atau menyimpan dokumen (Ctrl+${e.key.toUpperCase()})`);
        return;
      }

      // 5. Intercept PrintScreen / Windows Snipping
      if (e.key === "PrintScreen" || e.code === "PrintScreen" || e.keyCode === 44) {
        // Obscure UI instantly so captured screenshot is pitch black
        const overlay = document.createElement("div");
        overlay.style.position = "fixed";
        overlay.style.top = "0";
        overlay.style.left = "0";
        overlay.style.width = "100vw";
        overlay.style.height = "100vh";
        overlay.style.backgroundColor = "black";
        overlay.style.zIndex = "999999";
        document.body.appendChild(overlay);

        setTimeout(() => {
          if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
          }
        }, 1000);

        this.reportViolation("SHORTCUT_TERLARANG", "Upaya tangkapan layar (PrintScreen / Snipping) terdeteksi!");
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
  }

  private bindMouseAndSelectionInterceptors() {
    // Block context menu (Right click)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      this.reportViolation("SHORTCUT_TERLARANG", "Klik kanan dinonaktifkan selama ujian berlangsung");
    };

    // Block copy & paste event directly
    const handleCopyPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      this.reportViolation("SHORTCUT_TERLARANG", "Menyalin atau menempelkan teks dilarang!");
    };

    // Block text selection
    const handleSelectStart = (e: Event) => {
      const target = e.target as HTMLElement;
      // Allow typing in textareas or inputs
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        return;
      }
      e.preventDefault();
    };

    document.addEventListener("contextmenu", handleContextMenu, true);
    document.addEventListener("copy", handleCopyPaste, true);
    document.addEventListener("cut", handleCopyPaste, true);
    document.addEventListener("paste", handleCopyPaste, true);
    document.addEventListener("selectstart", handleSelectStart, true);
  }

  private bindVisibilityAndFocusInterceptors() {
    let isHidden = false;

    const handleVisibilityChange = () => {
      if (this.isDestroyed) return;
      if (document.hidden) {
        isHidden = true;
        this.reportViolation("PINDAH_TAB", "Meninggalkan tab ujian / beralih aplikasi");
      }
    };

    const handleWindowBlur = () => {
      if (this.isDestroyed) return;
      // Give a tiny buffer to avoid spurious clicks
      setTimeout(() => {
        if (!document.hasFocus() && !isHidden) {
          this.reportViolation("PINDAH_TAB", "Fokus browser terlepas / membuka jendela lain");
        }
      }, 300);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
  }

  private bindFullscreenInterceptors() {
    const handleFullscreenChange = () => {
      if (this.isDestroyed) return;
      const isFullscreen = !!(
        document.fullscreenElement ||
        (document as unknown as { webkitFullscreenElement: Element }).webkitFullscreenElement ||
        (document as unknown as { mozFullScreenElement: Element }).mozFullScreenElement
      );

      if (!isFullscreen) {
        this.reportViolation("KELUAR_FULLSCREEN", "Keluar dari mode layar penuh (Fullscreen)");
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
  }

  private bindDevToolsDetection() {
    // Check threshold difference between outer and inner screen dimensions
    const checkDevTools = () => {
      if (this.isDestroyed) return;
      const threshold = 160;
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;

      if (widthThreshold || heightThreshold) {
        this.reportViolation("DEVTOOLS", "Panel inspeksi browser (DevTools) terdeteksi terbuka!");
      }
    };

    this.devToolsCheckInterval = setInterval(checkDevTools, 2000);
  }
}

export async function requestFullscreenElement(element: HTMLElement = document.documentElement) {
  try {
    if (element.requestFullscreen) {
      await element.requestFullscreen();
    } else if ((element as unknown as { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen) {
      await (element as unknown as { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen();
    }
    return true;
  } catch {
    return false;
  }
}

export function captureVideoFrameBase64(videoElement: HTMLVideoElement): string | null {
  try {
    if (!videoElement || videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
      return null;
    }
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.6);
  } catch {
    return null;
  }
}
