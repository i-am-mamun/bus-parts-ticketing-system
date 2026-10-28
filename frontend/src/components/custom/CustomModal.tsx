"use client";

import { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { CustomButton } from "./CustomButton";

export type ModalThemeColor =
  | "primary"
  | "teal"
  | "orange"
  | "indigo"
  | "emerald"
  | "amber"
  | "rose"
  | "purple"
  | "blue";

export interface CustomModalProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl" | "7xl" | "full";
  maxWidth?: string;
  className?: string;
  darkMode?: boolean;
  themeColor?: ModalThemeColor;
  noScroll?: boolean;
}

const sizeClasses: Record<string, string> = {
  sm: "max-w-md",       // ~448px
  md: "max-w-xl",       // ~576px
  lg: "max-w-2xl",      // ~672px
  xl: "max-w-4xl",      // ~896px
  "2xl": "max-w-5xl",   // ~1024px
  "3xl": "max-w-6xl",   // ~1152px
  "4xl": "max-w-7xl",   // ~1280px
  "5xl": "max-w-[88vw]",
  "6xl": "max-w-[90vw]",
  "7xl": "max-w-[92vw]",
  full: "max-w-[96vw]",
};

export function CustomModal({
  open,
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  size = "xl",
  maxWidth,
  className,
  darkMode,
  themeColor = "primary",
  noScroll = false,
}: CustomModalProps) {
  const isModalOpen = open ?? isOpen ?? false;
  if (!isModalOpen) return null;

  // Auto-detect dark mode if not explicitly passed
  const isDark =
    darkMode ??
    (typeof window !== "undefined" &&
      (document.documentElement.classList.contains("dark") ||
        localStorage.getItem("bpos_dark_mode") === "true"));

  const headerTitleColor =
    themeColor === "primary"
      ? isDark ? "text-brand-light" : "text-brand-dark"
      : themeColor === "teal"
      ? isDark ? "text-brand-primary/60" : "text-[#00796b]"
      : isDark ? "text-slate-100" : "text-gray-600";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 sm:p-6 animate-[fade-in_150ms_ease-out] select-none overflow-hidden"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "w-full rounded-lg shadow-2xl animate-[scale-in_180ms_ease-out] flex flex-col max-h-[92vh] overflow-hidden transition-all",
          maxWidth ?? sizeClasses[size] ?? "max-w-4xl",
          isDark ? "dark bg-slate-900 border border-slate-800 text-slate-100" : "bg-white border border-slate-200 text-gray-600",
          className
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "flex items-center justify-between border-b px-5 sm:px-6 py-3.5 shrink-0 gap-4 transition-colors",
            isDark
              ? "border-slate-800 bg-slate-900/90"
              : themeColor === "primary"
              ? "border-brand-border bg-brand-50/60"
              : themeColor === "teal"
              ? "border-brand-border bg-gradient-to-r from-brand-50/80 via-white to-brand-50/50"
              : "border-slate-200 bg-slate-50/80"
          )}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {icon && (
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-sm",
                  isDark
                    ? "bg-slate-800 text-brand-primary border border-brand-border"
                    : "bg-brand-50 text-brand-primary border border-brand-border"
                )}
              >
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h2 className={cn("text-sm sm:text-base font-bold tracking-tight truncate", headerTitleColor)}>
                {title}
              </h2>
              {subtitle && (
                <p className={cn("text-[11px] font-medium mt-0.5 truncate leading-tight", isDark ? "text-slate-400" : "text-slate-500")}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Red Danger Close Button */}
          <CustomButton
            variant="danger"
            size="xs"
            onClick={onClose}
            className={cn(
              "h-7 w-7 !p-0 rounded-sm flex items-center justify-center border transition cursor-pointer shadow-2xs shrink-0",
              isDark
                ? "border-rose-900/60 bg-rose-950/50 text-rose-400 hover:bg-rose-600 hover:text-white"
                : "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white"
            )}
            aria-label="Close modal"
          >
            <X size={15} />
          </CustomButton>
        </div>

        {/* Modal Body */}
        <div
          className={cn(
            "p-5 sm:p-6 transition-all",
            noScroll ? "overflow-hidden" : "overflow-y-auto overflow-x-hidden custom-scrollbar max-h-[calc(92vh-100px)]"
          )}
        >
          {children}
        </div>

        {/* Modal Footer */}
        {footer && (
          <div
            className={cn(
              "px-5 sm:px-6 py-3 border-t shrink-0 transition-colors",
              isDark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"
            )}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
