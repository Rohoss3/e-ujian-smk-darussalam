"use client";

import React, { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  Search,
} from "lucide-react";
import { Input } from "./input";
import { Button } from "./button";
import { EmptyState } from "./empty-state";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  searchKey?: keyof T | ((item: T) => string);
  filterSlot?: React.ReactNode;
  actionSlot?: React.ReactNode;
  pageSize?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchPlaceholder = "Cari data...",
  searchKey,
  filterSlot,
  actionSlot,
  pageSize = 10,
  emptyTitle = "Data tidak ditemukan",
  emptyDescription = "Tidak ada rekaman data yang sesuai dengan kriteria pencarian atau filter Anda.",
  className = "",
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce search input by 200ms for smooth typing on large datasets
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 200);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Filtered Data
  const filteredData = useMemo(() => {
    if (!debouncedSearchTerm.trim()) return data;
    const term = debouncedSearchTerm.toLowerCase();

    return data.filter((item) => {
      if (typeof searchKey === "function") {
        return searchKey(item).toLowerCase().includes(term);
      }
      if (searchKey) {
        return String(item[searchKey] || "").toLowerCase().includes(term);
      }
      // default: search across all string values
      return Object.values(item).some((val) =>
        String(val || "").toLowerCase().includes(term)
      );
    });
  }, [data, debouncedSearchTerm, searchKey]);

  // Sorted Data
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal === bVal) return 0;
      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }

      const strA = String(aVal).toLowerCase();
      const strB = String(bVal).toLowerCase();
      return sortDirection === "asc"
        ? strA.localeCompare(strB)
        : strB.localeCompare(strA);
    });
  }, [filteredData, sortKey, sortDirection]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortKey(null);
        setSortDirection("asc");
      }
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {filterSlot}
          {actionSlot}
        </div>
      </div>

      {/* Table Content */}
      <div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "px-4 py-3.5",
                      col.sortable && "cursor-pointer hover:text-foreground select-none",
                      col.className
                    )}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{col.header}</span>
                      {col.sortable && (
                        <ArrowUpDown className="h-3.5 w-3.5 opacity-60" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedData.length > 0 ? (
                paginatedData.map((item, rowIdx) => (
                  <tr
                    key={item.id || rowIdx}
                    className="hover:bg-muted/40 transition-colors duration-150"
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn("px-4 py-3.5 text-foreground", col.className)}
                      >
                        {col.render ? col.render(item) : item[col.key]}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="p-8">
                    <EmptyState
                      title={emptyTitle}
                      description={emptyDescription}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {sortedData.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border bg-card text-xs text-muted-foreground">
            <div>
              Menampilkan{" "}
              <span className="font-semibold text-foreground">
                {(currentPage - 1) * pageSize + 1}
              </span>{" "}
              sampai{" "}
              <span className="font-semibold text-foreground">
                {Math.min(currentPage * pageSize, sortedData.length)}
              </span>{" "}
              dari{" "}
              <span className="font-semibold text-foreground">
                {sortedData.length}
              </span>{" "}
              data
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                aria-label="Halaman Pertama"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label="Halaman Sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-3 py-1 font-medium text-foreground">
                Hal {currentPage} dari {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                aria-label="Halaman Berikutnya"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                aria-label="Halaman Terakhir"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
