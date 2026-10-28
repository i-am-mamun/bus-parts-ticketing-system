"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, Check, X, Plus, Lock } from "lucide-react";
import { cn } from "@/lib/cn";

export interface SearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: React.ReactNode;
  disabled?: boolean;
}

export interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  label?: string;
  required?: boolean;
  isClearable?: boolean;
  onAddClick?: () => void;
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
  disabledHint?: string;
  themeColor?: "primary" | "teal" | "orange" | "indigo" | "emerald" | "amber" | "rose" | "purple";
}

const THEME_MAP: Record<string, { focus: string; addBtn: string; optionHover: string; optionSelected: string; checkIcon: string }> = {
  primary: {
    focus: "focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20",
    addBtn: "border-brand-border bg-brand-50 text-brand-primary hover:bg-brand-primary hover:text-white shadow-2xs",
    optionHover: "hover:bg-brand-50 hover:text-brand-primary",
    optionSelected: "bg-brand-100 text-brand-dark font-bold",
    checkIcon: "text-brand-primary",
  },
  teal: {
    focus: "focus:border-brand-primary focus:ring-brand-border",
    addBtn: "border-brand-border bg-brand-50 text-brand-primary hover:bg-brand-primary hover:text-white shadow-2xs",
    optionHover: "hover:bg-brand-50 hover:text-brand-dark",
    optionSelected: "bg-brand-50 text-brand-dark font-bold",
    checkIcon: "text-brand-primary",
  },
  orange: {
    focus: "focus:border-orange-500 focus:ring-orange-500/20",
    addBtn: "border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white shadow-2xs",
    optionHover: "hover:bg-orange-50 hover:text-orange-700",
    optionSelected: "bg-orange-50 text-orange-800 font-bold",
    checkIcon: "text-orange-600",
  },
  emerald: {
    focus: "focus:border-emerald-500 focus:ring-emerald-500",
    addBtn: "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 shadow-2xs",
    optionHover: "hover:bg-emerald-50 hover:text-emerald-700",
    optionSelected: "bg-emerald-50 text-emerald-700 font-semibold",
    checkIcon: "text-emerald-600",
  },
  indigo: {
    focus: "focus:border-indigo-500 focus:ring-indigo-500/20",
    addBtn: "border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white shadow-2xs",
    optionHover: "hover:bg-indigo-50 hover:text-indigo-700",
    optionSelected: "bg-indigo-50 text-indigo-800 font-bold",
    checkIcon: "text-indigo-600",
  },
  amber: {
    focus: "focus:border-amber-500 focus:ring-amber-500",
    addBtn: "border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100 shadow-2xs",
    optionHover: "hover:bg-amber-50 hover:text-amber-700",
    optionSelected: "bg-amber-50 text-amber-700 font-semibold",
    checkIcon: "text-amber-600",
  },
};

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select Option...",
  searchPlaceholder = "Search...",
  label,
  required = false,
  isClearable = true,
  onAddClick,
  className,
  buttonClassName,
  disabled = false,
  disabledHint,
  themeColor = "primary",
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
  }>({
    left: 0,
    width: 0,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(search.toLowerCase()) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(search.toLowerCase()))
  );

  const updatePosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      if (rect.width > 0) {
        const spaceBelow = window.innerHeight - rect.bottom;
        const openUpwards = spaceBelow < 240 && rect.top > 240;

        if (openUpwards) {
          setCoords({
            bottom: window.innerHeight - rect.top + 4,
            left: rect.left,
            width: rect.width,
          });
        } else {
          setCoords({
            top: rect.bottom + 4,
            left: rect.left,
            width: rect.width,
          });
        }
      }
    }
  }, []);

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => {
      updatePosition();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
    if (!isOpen) {
      setSearch("");
    }
  }, [isOpen]);

  const themeStyles = THEME_MAP[themeColor] || THEME_MAP.teal;

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      {label && (
        <label className="mb-1.5 block text-xs font-semibold capitalize text-brand-dark">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div className="flex items-center gap-1.5 w-full">
        <button
          ref={buttonRef}
          type="button"
          disabled={disabled}
          onClick={handleToggle}
          title={disabled ? disabledHint || "Selection is locked" : undefined}
          className={cn(
            "flex flex-1 min-w-0 h-9 items-center justify-between rounded-sm border px-2.5 text-xs font-medium transition focus:outline-none focus:ring-1 shadow-2xs",
            themeStyles.focus,
            disabled
              ? "cursor-not-allowed bg-slate-100/90 text-slate-400 border-slate-300 border-dashed shadow-none select-none"
              : "border-brand-border bg-white text-gray-700 cursor-pointer hover:border-brand-primary",
            !selectedOption && !disabled && "text-slate-400",
            buttonClassName
          )}
        >
          <span className={cn("truncate flex items-center gap-1.5 text-left flex-1 min-w-0 mr-1", disabled && "italic text-slate-500")}>
            {disabled ? (
              <>
                <Lock className="h-3.5 w-3.5 shrink-0 text-amber-600/70" />
                <span className="truncate">{disabledHint || placeholder}</span>
              </>
            ) : selectedOption ? (
              <div className="flex items-center justify-between w-full min-w-0 pr-1">
                <span className="truncate">{selectedOption.label}</span>
                {selectedOption.badge && (
                  <span className="shrink-0 ml-1.5">{selectedOption.badge}</span>
                )}
              </div>
            ) : (
              <span className="truncate">{placeholder}</span>
            )}
          </span>

          <div className="flex items-center gap-1 shrink-0">
            {isClearable && value && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                }}
                className="p-0.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer transition"
                title="Clear selection"
              >
                <X className="h-3 w-3" />
              </span>
            )}
            {disabled ? (
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-sm bg-slate-200/80 text-slate-500 shrink-0">
                Locked
              </span>
            ) : (
              <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-brand-primary transition-transform", isOpen && "rotate-180")} />
            )}
          </div>
        </button>

        {onAddClick && (
          <button
            type="button"
            disabled={disabled}
            onClick={(e) => {
              if (disabled) {
                e.preventDefault();
                e.stopPropagation();
                return;
              }
              onAddClick();
            }}
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border transition cursor-pointer",
              disabled
                ? "cursor-not-allowed bg-slate-100 text-slate-300 border-slate-200 opacity-40 pointer-events-none shadow-none"
                : themeStyles.addBtn
            )}
            title={disabled ? disabledHint || "Selection is currently locked" : "Add New"}
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen &&
        coords.width > 0 &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              ...(coords.top !== undefined ? { top: `${coords.top}px` } : {}),
              ...(coords.bottom !== undefined ? { bottom: `${coords.bottom}px` } : {}),
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 99999,
            }}
            className="rounded-sm border border-brand-border bg-white p-1.5 shadow-xl animate-in fade-in-50 zoom-in-95 duration-100"
          >
            <div className="relative mb-1.5 flex items-center border-b border-slate-100 pb-1.5">
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-transparent pl-8 pr-7 py-1 text-xs text-gray-700 placeholder-slate-400 focus:outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="max-h-56 overflow-y-auto space-y-0.5">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-3 text-center text-xs text-slate-400">
                  <span>No results found</span>
                </div>
              ) : (
                filteredOptions.map((opt, idx) => {
                  const isSelected = opt.value === value;
                  const isOptDisabled = opt.disabled;
                  return (
                    <button
                      key={`${opt.value}-${idx}`}
                      type="button"
                      disabled={isOptDisabled}
                      onClick={() => {
                        if (isOptDisabled) return;
                        onChange(opt.value);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-sm px-2.5 py-1.5 text-left text-xs font-medium transition",
                        isOptDisabled
                          ? "opacity-55 cursor-not-allowed bg-slate-50/80 text-slate-400"
                          : cn("cursor-pointer", themeStyles.optionHover, isSelected ? themeStyles.optionSelected : "text-gray-700")
                      )}
                    >
                      <div className="truncate pr-2 flex-1 min-w-0">
                        <div className="truncate">{opt.label}</div>
                        {opt.sublabel && (
                          <div className="text-[10px] text-slate-400 font-normal truncate">{opt.sublabel}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {opt.badge && <div>{opt.badge}</div>}
                        {isSelected && <Check className={cn("h-3.5 w-3.5 shrink-0", themeStyles.checkIcon)} />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {onAddClick && (
              <div className="pt-1 mt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onAddClick();
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-brand-primary bg-brand-50 hover:bg-brand-100 rounded-sm transition cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{search.trim() ? `Add "${search.trim()}"` : "Add New Option"}</span>
                </button>
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
