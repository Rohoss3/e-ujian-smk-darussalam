"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { SessionUser } from "@/types";
import { cn } from "@/lib/utils";

interface AppShellProps {
  user: SessionUser;
  children: React.ReactNode;
}

export function AppShell({ user, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read saved sidebar state
    const saved = localStorage.getItem("smk_sidebar_collapsed");
    if (saved) setCollapsed(saved === "true");
    setMounted(true);
  }, []);

  const handleSetCollapsed = (val: boolean) => {
    setCollapsed(val);
    localStorage.setItem("smk_sidebar_collapsed", String(val));
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Collapsible Sidebar */}
      <Sidebar
        user={user}
        collapsed={collapsed}
        setCollapsed={handleSetCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Content Area */}
      <div
        className={cn(
          "flex-1 flex flex-col transition-all duration-200",
          collapsed ? "lg:pl-16" : "lg:pl-64"
        )}
      >
        {/* Top bar with Breadcrumbs & User Profile */}
        <Header
          user={user}
          collapsed={collapsed}
          onOpenMobile={() => setMobileOpen(true)}
        />

        {/* Page Content Container */}
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
