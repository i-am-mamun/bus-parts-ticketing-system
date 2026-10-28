"use client";

import { useEffect, useState } from "react";
import { siteConfig } from "@/config/site";
import { Waves, Mail, Phone, MapPin } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const [appName, setAppName] = useState<string>("Soudia Parts Ticketing");
  const [companyLogo, setCompanyLogo] = useState<string>("");
  const Logo = siteConfig.logoIcon;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("bus_inventory_app_name");
      if (stored) setAppName(stored);
      const storedLogo = localStorage.getItem("bus_inventory_logo");
      if (storedLogo) setCompanyLogo(storedLogo);

      const handleBrandChange = (e: Event) => {
        const customEvt = e as CustomEvent<{ app_name?: string; company_logo?: string }>;
        if (customEvt.detail) {
          if (customEvt.detail.app_name !== undefined) setAppName(customEvt.detail.app_name || "BUS Inventory");
          if (customEvt.detail.company_logo !== undefined) setCompanyLogo(customEvt.detail.company_logo || "");
        }
      };

      window.addEventListener("bus_inventory:brand_changed", handleBrandChange);
      return () => {
        window.removeEventListener("bus_inventory:brand_changed", handleBrandChange);
      };
    }
  }, []);

  return (
    <footer className="relative shrink-0 w-full select-none z-20 bg-white/95 backdrop-blur-md rounded-tl-2xl border-t border-l border-brand-border/70 shadow-[0_-2px_10px_var(--theme-glow,rgba(236,30,33,0.08))] overflow-hidden">
      {/* ── Prominent Multi-Layer Wave Accent on Right Corner ── */}
      <div className="pointer-events-none absolute right-0 inset-y-0 w-72 sm:w-96 md:w-[480px] lg:w-[600px] xl:w-[720px] z-0 overflow-hidden">
        <svg
          className="w-full h-full"
          viewBox="0 0 720 48"
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="footerCornerL1" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" style={{ stopColor: "var(--theme-primary-200, #fecaca)" }} stopColor="var(--theme-primary-200, #fecaca)" stopOpacity="0.2" />
              <stop offset="40%" style={{ stopColor: "var(--theme-primary-300, #fca5a5)" }} stopColor="var(--theme-primary-300, #fca5a5)" stopOpacity="0.5" />
              <stop offset="100%" style={{ stopColor: "var(--theme-primary-400, #f87171)" }} stopColor="var(--theme-primary-400, #f87171)" stopOpacity="0.75" />
            </linearGradient>
            <linearGradient id="footerCornerL2" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" style={{ stopColor: "var(--theme-primary-400, #f87171)" }} stopColor="var(--theme-primary-400, #f87171)" stopOpacity="0.5" />
              <stop offset="50%" style={{ stopColor: "var(--theme-primary-500, #ef4444)" }} stopColor="var(--theme-primary-500, #ef4444)" stopOpacity="0.8" />
              <stop offset="100%" style={{ stopColor: "var(--theme-primary-600, #ec1e21)" }} stopColor="var(--theme-primary-600, #ec1e21)" stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id="footerCornerL3" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" style={{ stopColor: "var(--theme-primary-500, #ef4444)" }} stopColor="var(--theme-primary-500, #ef4444)" />
              <stop offset="50%" style={{ stopColor: "var(--theme-primary-600, #ec1e21)" }} stopColor="var(--theme-primary-600, #ec1e21)" />
              <stop offset="100%" style={{ stopColor: "var(--theme-primary-700, #cb1518)" }} stopColor="var(--theme-primary-700, #cb1518)" />
            </linearGradient>
          </defs>
          {/* Layer 1: Wide Translucent Base Wave */}
          <path
            d="M 0,48 C 160,48 300,14 480,4 C 570,-1 640,5 720,0 L 720,48 Z"
            fill="url(#footerCornerL1)"
          />
          {/* Layer 2: Sweeping Mid Wave */}
          <path
            d="M 120,48 C 260,48 400,18 540,8 C 610,3 670,7 720,3 L 720,48 Z"
            fill="url(#footerCornerL2)"
          />
          {/* Layer 3: Vibrant Signature Front Wave */}
          <path
            d="M 260,48 C 380,48 480,20 580,10 C 640,4 685,7 720,5 L 720,48 Z"
            fill="url(#footerCornerL3)"
          />
        </svg>
      </div>

      {/* ── Main Footer Single-Line Bar (No Wrapping) ── */}
      <div className="relative z-10 w-full px-3.5 sm:px-6 py-1.5 sm:py-2">
        <div className="mx-auto flex items-center justify-between gap-3 text-xs flex-nowrap min-w-0">
          {/* Left: Brand Icon + Name + Copyright */}
          <div className="flex items-center gap-2 shrink-0 min-w-0">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white shadow-2xs overflow-hidden">
              {companyLogo ? (
                <img src={companyLogo} alt="Logo" className="max-h-full max-w-full object-contain" />
              ) : (
                <Logo size={13} className="stroke-[2.5]" />
              )}
            </div>
            <span className="font-bold text-brand-primary text-xs sm:text-[13px] tracking-tight shrink-0">
              {appName || siteConfig.name}
            </span>
            <span className="text-slate-300 hidden sm:inline text-xs">|</span>
            <span className="text-slate-500 text-[11px] hidden sm:inline truncate font-normal">
              &copy; {currentYear} {appName || siteConfig.name}. All rights reserved.
            </span>
          </div>

          {/* Middle: Contact Info */}
          <div className="hidden xl:flex items-center gap-4 2xl:gap-6 text-slate-600 text-[11px] font-medium shrink min-w-0 truncate">
            <a
              href="mailto:maintenance@soudiabd.com"
              className="flex items-center gap-1.5 shrink-0 hover:text-brand-primary transition"
            >
              <Mail size={12} className="text-brand-primary shrink-0" />
              <span className="truncate">maintenance@soudiabd.com</span>
            </a>
            <a
              href="tel:+8801711000000"
              className="flex items-center gap-1.5 shrink-0 hover:text-brand-primary transition"
            >
              <Phone size={12} className="text-brand-primary shrink-0" />
              <span>+880 1711-000000</span>
            </a>
            <div className="hidden 2xl:flex items-center gap-1.5 shrink-0 hover:text-brand-primary transition">
              <MapPin size={12} className="text-brand-primary shrink-0" />
              <span>Dampara, Ctg &amp; Dhaka</span>
            </div>
          </div>

          {/* Right: Tagline + Status Waves */}
          <div className="flex items-center gap-2 shrink-0 ml-auto pr-1">
            <span className="italic text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] text-[10.5px] sm:text-[11px] font-semibold hidden sm:inline truncate">
              Every Part Tracked &bull; Every Ticket Verified
            </span>
            <span className="flex items-center text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
              <Waves size={14} className="stroke-[2.5] text-white" />
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
