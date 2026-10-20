"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContextType {
  toast: {
    success: (title: string, description?: string) => void;
    error: (title: string, description?: string) => void;
    info: (title: string, description?: string) => void;
    warning: (title: string, description?: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, title: string, description?: string) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = { id, type, title, description };
      setToasts((prev) => [...prev, newToast]);

      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast]
  );

  const toast = {
    success: (title: string, description?: string) =>
      addToast("success", title, description),
    error: (title: string, description?: string) =>
      addToast("error", title, description),
    info: (title: string, description?: string) =>
      addToast("info", title, description),
    warning: (title: string, description?: string) =>
      addToast("warning", title, description),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none p-2 sm:p-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-xl transition-all duration-200 animate-in slide-in-from-bottom-3",
              t.type === "success" &&
                "bg-card text-card-foreground border-emerald-500/30 dark:border-emerald-500/20",
              t.type === "error" &&
                "bg-card text-card-foreground border-destructive/40 dark:border-destructive/30",
              t.type === "warning" &&
                "bg-card text-card-foreground border-amber-500/30 dark:border-amber-500/20",
              t.type === "info" &&
                "bg-card text-card-foreground border-border"
            )}
          >
            <div className="shrink-0 mt-0.5">
              {t.type === "success" && (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              )}
              {t.type === "error" && (
                <AlertCircle className="w-5 h-5 text-destructive" />
              )}
              {t.type === "warning" && (
                <AlertCircle className="w-5 h-5 text-amber-500" />
              )}
              {t.type === "info" && (
                <Info className="w-5 h-5 text-primary" />
              )}
            </div>
            <div className="flex-1">
              <h5 className="text-xs font-semibold leading-tight">{t.title}</h5>
              {t.description && (
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                  {t.description}
                </p>
              )}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 text-muted-foreground hover:text-foreground rounded p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
