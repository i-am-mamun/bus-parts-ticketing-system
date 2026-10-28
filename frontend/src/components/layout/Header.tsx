"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  LogOut,
  ChevronDown,
  Building2,
  Search,
  Settings,
  LayoutDashboard,
  FileText,
  ShieldCheck,
  Menu,
  CarFront,
  PlusCircle,
  Bus,
  Check,
  MapPin,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/cn";
import { api } from "@/lib/api";
import { Branch } from "@/lib/types";
import { useLanguage } from "@/lib/i18n";
import { CommandPalette } from "./CommandPalette";

export function Header() {
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [appName, setAppName] = useState<string>("Soudia Parts Ticketing");
  const [appTagline, setAppTagline] = useState<string>("Parts • Tickets • Fleet");
  const [companyLogo, setCompanyLogo] = useState<string>("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [branchSearch, setBranchSearch] = useState("");
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const desktopMenuRef = useRef<HTMLDivElement>(null);
  const branchMenuRef = useRef<HTMLDivElement>(null);
  const Logo = siteConfig.logoIcon;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedLogo = localStorage.getItem("bus_inventory_logo");
      if (storedLogo) setCompanyLogo(storedLogo);

      const storedName = localStorage.getItem("bus_inventory_app_name");
      if (storedName) setAppName(storedName);

      const storedTagline = localStorage.getItem("bus_inventory_app_tagline");
      if (storedTagline) setAppTagline(storedTagline);

      // Fetch public settings for initial logo & branding
      fetch("/api/v1/settings/public")
        .then((res) => res.json())
        .then((data) => {
          if (data?.company_logo !== undefined) {
            setCompanyLogo(data.company_logo || "");
            localStorage.setItem("bus_inventory_logo", data.company_logo || "");
          }
          if (data?.app_name) {
            setAppName(data.app_name);
            localStorage.setItem("bus_inventory_app_name", data.app_name);
          }
          if (data?.app_tagline) {
            setAppTagline(data.app_tagline);
            localStorage.setItem("bus_inventory_app_tagline", data.app_tagline);
          }
        })
        .catch(() => {});

      const handleLogoChange = (e: Event) => {
        const customEvt = e as CustomEvent<string>;
        setCompanyLogo(customEvt.detail || "");
      };

      const handleBrandChange = (e: Event) => {
        const customEvt = e as CustomEvent<{ app_name?: string; app_tagline?: string; company_logo?: string }>;
        if (customEvt.detail) {
          if (customEvt.detail.app_name !== undefined) {
            setAppName(customEvt.detail.app_name || "BUS Inventory");
          }
          if (customEvt.detail.app_tagline !== undefined) {
            setAppTagline(customEvt.detail.app_tagline || "Smart • Fleet • Inventory");
          }
          if (customEvt.detail.company_logo !== undefined) {
            setCompanyLogo(customEvt.detail.company_logo || "");
          }
        }
      };

      window.addEventListener("bus_inventory:logo_changed", handleLogoChange);
      window.addEventListener("bus_inventory:brand_changed", handleBrandChange);
      return () => {
        window.removeEventListener("bus_inventory:logo_changed", handleLogoChange);
        window.removeEventListener("bus_inventory:brand_changed", handleBrandChange);
      };
    }
  }, []);

  useEffect(() => {
    const handleOpenPalette = () => setPaletteOpen(true);
    window.addEventListener("omni:open-command-palette", handleOpenPalette);
    return () => {
      window.removeEventListener("omni:open-command-palette", handleOpenPalette);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadBranches = async () => {
      try {
        const data = await api.get<Branch[]>("/api/v1/branches");
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setBranches(data);

          const savedRaw = localStorage.getItem("bus_inventory_current_branch");
          if (savedRaw) {
            try {
              const parsed = JSON.parse(savedRaw);
              const matched = data.find((b) => b.id === parsed.id || b.name === parsed.name);
              if (matched) {
                setSelectedBranch(matched);
                return;
              }
            } catch {}
          }
          setSelectedBranch(data[0]);
          localStorage.setItem("bus_inventory_current_branch", JSON.stringify(data[0]));
        }
      } catch (err) {
        console.warn("Failed fetching branches, using fallback", err);
        if (isMounted) {
          const fallbacks: Branch[] = [
            { id: 1, name: "Dhaka Central Terminal & Depot", code: "DHK-01", city: "Dhaka", is_active: true, warehouse_count: 2 },
            { id: 2, name: "Chittagong Port Workshop", code: "CTG-01", city: "Chittagong", is_active: true, warehouse_count: 1 },
            { id: 3, name: "Sylhet Express Hub", code: "SYL-01", city: "Sylhet", is_active: true, warehouse_count: 1 },
            { id: 4, name: "Khulna Central Maintenance", code: "KHL-01", city: "Khulna", is_active: true, warehouse_count: 1 },
          ];
          setBranches(fallbacks);
          setSelectedBranch(fallbacks[0]);
        }
      }
    };

    loadBranches();

    const handleBranchesUpdated = () => loadBranches();
    window.addEventListener("bus_inventory:branches_updated", handleBranchesUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener("bus_inventory:branches_updated", handleBranchesUpdated);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const isInsideMobile = mobileMenuRef.current?.contains(target);
      const isInsideDesktop = desktopMenuRef.current?.contains(target);
      const isInsideBranch = branchMenuRef.current?.contains(target);
      if (!isInsideMobile && !isInsideDesktop) {
        setOpen(false);
      }
      if (!isInsideBranch) {
        setBranchDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectBranch = (b: Branch) => {
    setSelectedBranch(b);
    setBranchDropdownOpen(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("bus_inventory_current_branch", JSON.stringify(b));
      window.dispatchEvent(
        new CustomEvent("bus_inventory:branch_changed", {
          detail: b,
        })
      );
    }
  };

  const filteredBranches = branches.filter((b) => {
    if (!branchSearch.trim()) return true;
    const q = branchSearch.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      b.code.toLowerCase().includes(q) ||
      (b.city && b.city.toLowerCase().includes(q))
    );
  });

  const displayRole = user?.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : "Administrator";
  const displayName = user?.name || "Super Administrator";
  const userInitial = displayName.charAt(0).toUpperCase();

  return (
    <>
      <header className="relative flex h-16 shrink-0 items-center justify-between px-3 sm:px-4 md:px-6 z-30 select-none bg-transparent print:hidden">
        {/* Dual Side 3-Layer Ocean Wave Curves Background */}
        <div className="pointer-events-none absolute inset-0 w-full h-full z-0 overflow-hidden">
          {/* Top-Left 3-Layer Ocean Wave Curves (Behind Logo) */}
          <svg
            className="absolute left-0 top-0 h-full w-[340px] sm:w-[400px] md:w-[450px] lg:w-[480px]"
            viewBox="0 0 480 64"
            preserveAspectRatio="none"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="headerLeftL1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: "var(--theme-primary-200, #fecaca)" }} stopColor="var(--theme-primary-200, #fecaca)" stopOpacity="0.55" />
                <stop offset="100%" style={{ stopColor: "var(--theme-primary-300, #fca5a5)" }} stopColor="var(--theme-primary-300, #fca5a5)" stopOpacity="0.35" />
              </linearGradient>
              <linearGradient id="headerLeftL2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: "var(--theme-primary-400, #f87171)" }} stopColor="var(--theme-primary-400, #f87171)" stopOpacity="0.75" />
                <stop offset="100%" style={{ stopColor: "var(--theme-primary-500, #ef4444)" }} stopColor="var(--theme-primary-500, #ef4444)" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="headerLeftL3" x1="0%" y1="0%" x2="100%" y2="80%">
                <stop offset="0%" style={{ stopColor: "var(--theme-primary-600, #ec1e21)" }} stopColor="var(--theme-primary-600, #ec1e21)" />
                <stop offset="70%" style={{ stopColor: "var(--theme-primary-600, #ec1e21)" }} stopColor="var(--theme-primary-600, #ec1e21)" />
                <stop offset="100%" style={{ stopColor: "var(--theme-primary-700, #cb1518)" }} stopColor="var(--theme-primary-700, #cb1518)" />
              </linearGradient>
            </defs>
            <path
              d="M 0,0 L 480,0 C 400,12 320,58 220,62 C 120,64 50,64 0,64 Z"
              fill="url(#headerLeftL1)"
            />
            <path
              d="M 0,0 L 440,0 C 370,10 290,54 200,58 C 110,62 45,63 0,64 Z"
              fill="url(#headerLeftL2)"
            />
            <path
              d="M 0,0 L 400,0 C 330,8 260,50 175,54 C 95,58 35,62 0,64 Z"
              fill="url(#headerLeftL3)"
            />
          </svg>

          {/* Top-Right 3-Layer Soft Wave Curves */}
          <svg
            className="absolute right-0 top-0 h-full w-[260px] sm:w-[320px] md:w-[380px] lg:w-[420px]"
            viewBox="0 0 420 64"
            preserveAspectRatio="none"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="headerRightL1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: "var(--theme-primary-200, #fecaca)" }} stopColor="var(--theme-primary-200, #fecaca)" stopOpacity="0.45" />
                <stop offset="100%" style={{ stopColor: "var(--theme-primary-300, #fca5a5)" }} stopColor="var(--theme-primary-300, #fca5a5)" stopOpacity="0.3" />
              </linearGradient>
              <linearGradient id="headerRightL2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: "var(--theme-primary-400, #f87171)" }} stopColor="var(--theme-primary-400, #f87171)" stopOpacity="0.65" />
                <stop offset="100%" style={{ stopColor: "var(--theme-primary-500, #ef4444)" }} stopColor="var(--theme-primary-500, #ef4444)" stopOpacity="0.75" />
              </linearGradient>
              <linearGradient id="headerRightL3" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: "var(--theme-primary-500, #ef4444)" }} stopColor="var(--theme-primary-500, #ef4444)" stopOpacity="0.85" />
                <stop offset="100%" style={{ stopColor: "var(--theme-primary-600, #ec1e21)" }} stopColor="var(--theme-primary-600, #ec1e21)" stopOpacity="0.95" />
              </linearGradient>
            </defs>
            <path
              d="M 420,0 L 10,0 C 80,24 160,60 260,60 C 320,60 380,38 420,12 Z"
              fill="url(#headerRightL1)"
            />
            <path
              d="M 420,0 L 40,0 C 110,22 190,56 280,56 C 340,56 390,34 420,15 Z"
              fill="url(#headerRightL2)"
            />
            <path
              d="M 420,0 L 80,0 C 140,20 220,52 300,52 C 360,52 400,30 420,18 Z"
              fill="url(#headerRightL3)"
            />
          </svg>
        </div>

        {/* ── Mobile Layout (< lg) ── */}
        <div className="relative z-10 flex w-full items-center justify-between lg:hidden">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => window.dispatchEvent(new Event("bpos:toggle-sidebar"))}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary text-white hover:bg-brand-primary-hover shadow-xs transition active:scale-95 cursor-pointer shrink-0 border border-white/40"
              title="Open Navigation Menu"
            >
              <Menu size={16} className="stroke-[2.5]" />
            </button>
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl bg-white text-brand-primary border border-white/80 shadow-xs overflow-hidden p-0.5">
                {companyLogo ? (
                  <img src={companyLogo} alt="Logo" className="max-h-full max-w-full object-contain" />
                ) : (
                  <Logo size={18} />
                )}
              </div>
              <div className="flex flex-col text-left">
                <span className="font-bold text-white text-xs tracking-tight leading-tight truncate max-w-[160px]">{appName || siteConfig.name}</span>
                <span className="text-[9px] text-white/90 leading-tight truncate max-w-[160px]">{appTagline || "Smart • Fleet • Inventory"}</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile Language Switcher */}
            <div className="flex items-center rounded-full bg-white/95 border border-brand-border/70 p-0.5 shadow-xs">
              <button
                type="button"
                onClick={() => setLang("en")}
                className={cn(
                  "px-2 py-0.5 text-[10px] font-bold rounded-full transition-all cursor-pointer",
                  lang === "en" ? "bg-brand-primary text-white shadow-2xs" : "text-slate-600"
                )}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang("bn")}
                className={cn(
                  "px-2 py-0.5 text-[10px] font-bold rounded-full transition-all cursor-pointer",
                  lang === "bn" ? "bg-brand-primary text-white shadow-2xs" : "text-slate-600"
                )}
              >
                বাং
              </button>
            </div>

            <div className="relative" ref={mobileMenuRef}>
              <button
                onClick={() => setOpen((v) => !v)}
                className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-brand-primary shadow-xs border border-white/80 hover:ring-2 hover:ring-white transition cursor-pointer"
              >
                {userInitial}
              </button>

              {open && (
                <div className="absolute right-0 top-full z-50 mt-2 w-64 origin-top-right overflow-hidden rounded-xl border border-brand-border bg-white p-2.5 shadow-2xl animate-[scale-in_140ms_ease-out]">
                  <div className="flex items-center gap-2.5 rounded-lg bg-brand-50/80 border border-brand-border p-2.5 mb-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-xs font-bold text-white shadow-xs">
                      {userInitial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-xs font-bold text-slate-800">{displayName}</p>
                      <p className="truncate text-[10.5px] text-brand-primary font-medium">{user?.email || ""}</p>
                      <div className="mt-0.5">
                        <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[9px] font-bold text-brand-primary border border-brand-border shadow-2xs">
                          <ShieldCheck size={10} className="mr-1 text-emerald-600" />
                          {displayRole}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Active Depot Switcher */}
                  <div className="mb-2 p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                        <Building2 size={11} className="text-brand-primary" />
                        {lang === "en" ? "Active Depot" : "বর্তমান ডিপো"}
                      </span>
                      <span className="text-[9.5px] font-mono font-bold text-brand-primary bg-white px-1.5 py-0.2 rounded-xs border border-brand-border">
                        {selectedBranch?.code || "DHK-01"}
                      </span>
                    </div>
                    <select
                      value={selectedBranch?.id || ""}
                      onChange={(e) => {
                        const b = branches.find((item) => String(item.id) === e.target.value);
                        if (b) handleSelectBranch(b);
                      }}
                      className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-md p-1.5 outline-none focus:border-brand-primary cursor-pointer"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-0.5 text-xs">
                    <Link
                      href="/dashboard"
                      onClick={() => setOpen(false)}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 font-semibold text-slate-700 hover:bg-brand-50 hover:text-brand-primary transition"
                    >
                      <LayoutDashboard size={14} className="text-brand-primary" />
                      {lang === "en" ? "Dashboard" : "ড্যাশবোর্ড"}
                    </Link>
                    <Link
                      href="/tickets/new"
                      onClick={() => setOpen(false)}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 font-semibold text-slate-700 hover:bg-brand-50 hover:text-brand-primary transition"
                    >
                      <PlusCircle size={14} className="text-brand-primary" />
                      {lang === "en" ? "Raise New Ticket" : "নতুন টিকিট তৈরি"}
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setOpen(false)}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 font-semibold text-slate-700 hover:bg-brand-50 hover:text-brand-primary transition"
                    >
                      <Settings size={14} className="text-brand-primary" />
                      {lang === "en" ? "System Settings" : "সিস্টেম সেটিংস"}
                    </Link>
                    <Link
                      href="/reports"
                      onClick={() => setOpen(false)}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 font-semibold text-slate-700 hover:bg-brand-50 hover:text-brand-primary transition"
                    >
                      <FileText size={14} className="text-brand-primary" />
                      {lang === "en" ? "Reports & Analytics" : "রিপোর্ট ও বিশ্লেষণ"}
                    </Link>
                  </div>

                <div className="border-t border-slate-100 pt-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => logout()}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-600 hover:text-white cursor-pointer shadow-2xs active:scale-95"
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Desktop Layout (lg+) ── */}
      <div className="relative z-10 hidden w-full items-center justify-between gap-3 lg:flex">
          {/* Left: Brand Logo Block + Circle Toggle + Showroom Pill */}
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0 mr-2 group">
              <div className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-xl bg-white text-brand-primary border border-white/80 shadow-xs group-hover:scale-105 transition overflow-hidden p-0.5">
                {companyLogo ? (
                  <img src={companyLogo} alt="Logo" className="max-h-full max-w-full object-contain" />
                ) : (
                  <Logo size={20} />
                )}
              </div>
              <div className="flex flex-col min-w-0 text-left">
                <span className="font-bold text-white tracking-tight text-sm leading-tight drop-shadow-2xs truncate max-w-[200px] xl:max-w-[260px]">
                  {appName || siteConfig.name}
                </span>
                <span className="text-[10px] text-white/90 font-medium tracking-wide leading-tight truncate max-w-[200px] xl:max-w-[260px]">
                  {appTagline || "Smart • Fleet • Inventory"}
                </span>
              </div>
            </Link>

            <button
              onClick={() => window.dispatchEvent(new Event("bpos:toggle-sidebar"))}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary hover:bg-brand-primary-hover text-white shadow-xs transition active:scale-95 cursor-pointer shrink-0 border border-white/40"
              title="Toggle Sidebar"
            >
              <Menu size={16} className="stroke-[2.5]" />
            </button>

            {/* Operational Depot / Branch Dropdown Pill */}
            <div className="relative" ref={branchMenuRef}>
              <button
                type="button"
                onClick={() => setBranchDropdownOpen((prev) => !prev)}
                className={cn(
                  "flex items-center gap-2 rounded-full border border-brand-border/70 bg-white/95 px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-white hover:border-brand-border hover:shadow-md cursor-pointer",
                  branchDropdownOpen && "bg-white border-brand-primary ring-2 ring-brand-border/40"
                )}
                title="Select Active Operating Depot / Terminal"
              >
                <Building2 size={14} className="text-brand-primary shrink-0" />
                <span className="text-slate-800 font-bold max-w-[150px] xl:max-w-[200px] truncate">
                  {selectedBranch?.name || "Dhaka Central Terminal & Depot"}
                </span>
                <ChevronDown
                  size={13}
                  className={cn(
                    "text-slate-400 shrink-0 transition-transform duration-200",
                    branchDropdownOpen && "rotate-180 text-brand-primary"
                  )}
                />
              </button>

              {branchDropdownOpen && (
                <div className="absolute left-0 top-full z-50 mt-2 w-80 origin-top-left overflow-hidden rounded-xl border border-brand-border bg-white shadow-2xl animate-[scale-in_140ms_ease-out]">
                  {/* Dropdown Header */}
                  <div className="flex items-center justify-between border-b border-brand-border bg-brand-50/70 p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-primary text-white shadow-2xs">
                        <Building2 size={14} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Operational Depots &amp; Hubs</p>
                        <p className="text-[10px] text-slate-500">Switch current active depot</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[9.5px] font-bold text-brand-primary border border-brand-border shadow-2xs">
                      {branches.length} Depots
                    </span>
                  </div>

                  {/* Filter Search Input (if > 3 branches) */}
                  {branches.length > 3 && (
                    <div className="p-2 border-b border-slate-100 bg-slate-50/50">
                      <div className="relative">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={branchSearch}
                          onChange={(e) => setBranchSearch(e.target.value)}
                          placeholder="Filter depots by name or city..."
                          className="w-full rounded-md border border-slate-200 bg-white pl-7 pr-2.5 py-1 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-brand-primary"
                        />
                      </div>
                    </div>
                  )}

                  {/* Branches List */}
                  <div className="max-h-64 overflow-y-auto p-1.5 divide-y divide-slate-100">
                    {filteredBranches.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">
                        No depots match &ldquo;{branchSearch}&rdquo;
                      </div>
                    ) : (
                      filteredBranches.map((b) => {
                        const isSelected = selectedBranch?.id === b.id;
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => handleSelectBranch(b)}
                            className={cn(
                              "w-full flex items-center justify-between p-2.5 rounded-lg text-left transition cursor-pointer text-xs",
                              isSelected
                                ? "bg-brand-50/80 border border-brand-border/60 text-brand-primary font-bold shadow-2xs"
                                : "hover:bg-slate-50 text-slate-700"
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={cn(
                                  "h-2 w-2 rounded-full shrink-0",
                                  b.is_active ? "bg-emerald-500" : "bg-slate-300"
                                )}
                              />
                              <div className="min-w-0">
                                <p
                                  className={cn(
                                    "truncate font-bold leading-tight",
                                    isSelected ? "text-brand-primary" : "text-slate-800"
                                  )}
                                >
                                  {b.name}
                                </p>
                                <p className="text-[10px] text-slate-400 leading-tight mt-0.5 truncate">
                                  {b.city ? `${b.city} • ` : ""}Code: {b.code}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                              {isSelected ? (
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary text-white shadow-2xs">
                                  <Check size={11} className="stroke-[3]" />
                                </span>
                              ) : (
                                <span className="font-mono text-[9.5px] px-1.5 py-0.5 rounded-xs bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                                  {b.code}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Footer link to manage depots */}
                  <div className="border-t border-slate-100 bg-slate-50/70 p-2 flex items-center justify-between">
                    <span className="text-[10.5px] text-slate-500 font-medium">Terminal Manager</span>
                    <Link
                      href="/branches"
                      onClick={() => setBranchDropdownOpen(false)}
                      className="text-[10.5px] font-bold text-brand-primary hover:underline flex items-center gap-1"
                    >
                      <span>Manage All Depots</span>
                      <ArrowRight size={11} />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Center: Global Search Pill */}
          <div className="flex-1 max-w-xs xl:max-w-md mx-2">
            <button
              onClick={() => setPaletteOpen(true)}
              className="theme-search-pill w-full flex items-center gap-2.5 rounded-full px-4.5 py-2 text-xs text-slate-600 cursor-pointer group"
              title="Quick Search (Ctrl + K)"
            >
              <Search size={14} className="text-brand-primary shrink-0" />
              <span className="font-medium text-slate-400 truncate">
                {lang === "en"
                  ? "Search tickets, buses, gate passes... (Ctrl + K)"
                  : "টিকিট, বাস, গেট পাস অনুসন্ধান করুন... (Ctrl + K)"}
              </span>
            </button>
          </div>

          {/* Right: Language Switcher + Quick Action Button + User Profile Pill */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Language Switcher Pill */}
            <div className="flex items-center rounded-full bg-white/95 border border-brand-border/70 p-0.5 shadow-xs shrink-0">
              <button
                type="button"
                onClick={() => setLang("en")}
                className={cn(
                  "px-2.5 py-1 text-[11px] font-bold rounded-full transition-all cursor-pointer",
                  lang === "en"
                    ? "bg-brand-primary text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                )}
                title="Switch to English"
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang("bn")}
                className={cn(
                  "px-2.5 py-1 text-[11px] font-bold rounded-full transition-all cursor-pointer",
                  lang === "bn"
                    ? "bg-brand-primary text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                )}
                title="বাংলা ভাষায় পরিবর্তন করুন"
              >
                বাং
              </button>
            </div>

            <Link
              href="/tickets/new"
              className="flex items-center gap-2 rounded-full bg-brand-gradient px-4 py-2 text-xs font-bold text-white shadow-brand-button transition hover:brightness-105 active:scale-95 cursor-pointer shrink-0 border border-white/25"
              title={lang === "en" ? "Raise New Ticket" : "নতুন টিকিট তৈরি"}
            >
              <PlusCircle size={14} className="stroke-[2.5]" />
              <span>{lang === "en" ? "New Ticket" : "নতুন টিকিট"}</span>
            </Link>

            <div className="relative" ref={desktopMenuRef}>
              <button
                onClick={() => setOpen((v) => !v)}
                className={cn(
                  "flex items-center gap-2.5 rounded-full border border-brand-border/70 bg-white/95 pl-1.5 pr-3.5 py-1.5 shadow-xs transition hover:bg-white hover:border-brand-border hover:shadow-md cursor-pointer",
                  open && "bg-white border-brand-primary ring-2 ring-brand-border/40"
                )}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-primary text-xs font-bold text-white shadow-xs">
                  {userInitial}
                </div>
                <div className="text-left min-w-0 pr-0.5">
                  <p className="truncate text-xs font-bold text-slate-800 leading-tight">
                    {displayName}
                  </p>
                  <p className="truncate text-[10px] font-medium text-slate-400 leading-tight">
                    {displayRole}
                  </p>
                </div>
                <ChevronDown
                  size={13}
                  className={cn(
                    "text-slate-400 transition-transform shrink-0",
                    open && "rotate-180 text-brand-primary"
                  )}
                />
              </button>

              {open && (
                <div className="absolute right-0 top-full z-50 mt-2 w-64 origin-top-right overflow-hidden rounded-xl border border-brand-border bg-white p-2.5 shadow-2xl animate-[scale-in_140ms_ease-out]">
                  <div className="flex items-center gap-3 rounded-lg bg-brand-50/80 border border-brand-border p-3 mb-1.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-xs font-bold text-white shadow-xs">
                      {userInitial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-xs font-bold text-slate-800">{displayName}</p>
                      <p className="truncate text-[11px] text-brand-primary font-medium">{user?.email || ""}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[9.5px] font-bold text-brand-primary border border-brand-border shadow-2xs">
                          <ShieldCheck size={10} className="mr-1 text-emerald-600" />
                          {displayRole}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-2.5 py-1.5 text-[11px] font-medium border-b border-slate-100 mb-1">
                    <span className="flex items-center gap-1 text-slate-500">
                      <Building2 size={12} className="text-brand-primary" /> Branch:
                    </span>
                    <span className="font-semibold text-slate-800">Central Depot • Dhaka</span>
                  </div>

                  <div className="space-y-0.5">
                    <Link
                      href="/dashboard"
                      onClick={() => setOpen(false)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-brand-50 hover:text-brand-primary transition"
                    >
                      <LayoutDashboard size={14} className="text-brand-primary" />
                      {lang === "en" ? "Dashboard" : "ড্যাশবোর্ড"}
                    </Link>

                    <Link
                      href="/tickets/new"
                      onClick={() => setOpen(false)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-brand-50 hover:text-brand-primary transition"
                    >
                      <PlusCircle size={14} className="text-brand-primary" />
                      {lang === "en" ? "Raise New Ticket" : "নতুন টিকিট তৈরি"}
                    </Link>

                    <Link
                      href="/fleet"
                      onClick={() => setOpen(false)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-brand-50 hover:text-brand-primary transition"
                    >
                      <Bus size={14} className="text-brand-primary" />
                      {lang === "en" ? "Bus Fleet Registry" : "বাস বহর তালিকা"}
                    </Link>

                    <Link
                      href="/settings"
                      onClick={() => setOpen(false)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-brand-50 hover:text-brand-primary transition"
                    >
                      <Settings size={14} className="text-brand-primary" />
                      {lang === "en" ? "System Settings" : "সিস্টেম সেটিংস"}
                    </Link>

                    <Link
                      href="/reports"
                      onClick={() => setOpen(false)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-brand-50 hover:text-brand-primary transition"
                    >
                      <FileText size={14} className="text-brand-primary" />
                      {lang === "en" ? "Reports & Analytics" : "রিপোর্ট ও বিশ্লেষণ"}
                    </Link>
                  </div>

                  <div className="border-t border-slate-100 pt-2 mt-1.5">
                    <button
                      type="button"
                      onClick={() => logout()}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-600 hover:text-white cursor-pointer shadow-2xs active:scale-95"
                    >
                      <LogOut size={14} />
                      <span>{lang === "en" ? "Sign Out" : "লগআউট"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}
