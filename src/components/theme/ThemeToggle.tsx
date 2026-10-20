"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`w-9 h-9 rounded-lg border border-border bg-card flex items-center justify-center ${className}`} />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Ganti Mode Gelap/Terang"
      title={resolvedTheme === "dark" ? "Beralih ke Mode Terang" : "Beralih ke Mode Gelap"}
      className={`relative inline-flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary ${className}`}
    >
      {resolvedTheme === "dark" ? (
        <Sun className="w-4 h-4 text-amber-400 transition-transform duration-200 rotate-0 scale-100" />
      ) : (
        <Moon className="w-4 h-4 text-zinc-700 transition-transform duration-200 rotate-0 scale-100" />
      )}
    </button>
  );
}
