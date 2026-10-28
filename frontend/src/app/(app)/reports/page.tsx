"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BarChart3,
  FileText,
  AlertTriangle,
  Printer,
  Download,
  Filter,
  CarFront,
  Ticket,
  CheckCircle2,
  Clock,
  Wrench,
  ArrowRightLeft,
  DollarSign,
  TrendingUp,
  Calendar,
  Building2,
  RefreshCw,
  Eye,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { hasPermission } from "@/lib/permissions";
import { TicketSummary, Ticket as TicketType, Bus, Page } from "@/lib/types";
import {
  CustomButton,
  CustomCard,
  CustomBadge,
  CustomTabs,
} from "@/components/custom";

export default function ReportsPage() {
  const { user } = useAuth();
  const { lang, t } = useLanguage();
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type");

  const [activeTab, setActiveTab] = useState(initialType === "premature" ? "premature" : "overview");
  const [summary, setSummary] = useState<TicketSummary | null>(null);
  const [prematureTickets, setPrematureTickets] = useState<TicketType[]>([]);
  const [allTickets, setAllTickets] = useState<TicketType[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateFilter, setDateFilter] = useState("all");
  const [selectedBus, setSelectedBus] = useState("");

  const canSeeCost = hasPermission(user, "tickets.cost");

  const loadReportData = async () => {
    try {
      setLoading(true);
      const [resSummary, resPremature, resTickets, resBuses] = await Promise.all([
        api.get<TicketSummary>("/api/v1/tickets/summary"),
        api.get<Page<TicketType>>("/api/v1/tickets?is_premature=true&page_size=50"),
        api.get<Page<TicketType>>("/api/v1/tickets?page_size=100"),
        api.get<{ items: Bus[] }>("/api/v1/fleet/buses?page_size=100"),
      ]);

      setSummary(resSummary);
      setPrematureTickets(resPremature.items || []);
      setAllTickets(resTickets.items || []);
      setBuses(resBuses.items || []);
    } catch (err) {
      console.error("Failed to load reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  // Cost calculations
  const totalCost = useMemo(() => {
    return allTickets.reduce((acc, t) => acc + (t.total_cost || 0), 0);
  }, [allTickets]);

  const totalPartsCost = useMemo(() => {
    return allTickets.reduce((acc, t) => acc + (t.parts_cost || 0), 0);
  }, [allTickets]);

  const totalLaborCost = useMemo(() => {
    return allTickets.reduce((acc, t) => acc + (t.labor_cost || 0), 0);
  }, [allTickets]);

  const typeLabels: Record<string, { en: string; bn: string }> = {
    PART_REQUEST: { en: "Part Requisition", bn: "পার্টস রিকুইজিশন" },
    PART_REPLACEMENT: { en: "Part Replacement", bn: "পার্টস প্রতিস্থাপন" },
    PART_TRANSFER: { en: "Bus Transfer", bn: "বাস ট্রান্সফার" },
    WORK_SHEET: { en: "Work Sheet", bn: "ওয়ার্ক শিট" },
    VEHICLE_RELEASE: { en: "Vehicle Release", bn: "গাড়ি রিলিজ" },
  };

  const statusLabels: Record<string, { en: string; bn: string; color: string }> = {
    DRAFT: { en: "Draft", bn: "খসড়া", color: "bg-slate-100 text-slate-700" },
    SUBMITTED: { en: "Submitted (Pending S1)", bn: "দাখিলকৃত (ধাপ ১)", color: "bg-amber-100 text-amber-800" },
    VERIFIED_STAGE_1: { en: "Verified (Pending S2)", bn: "যাচাইকৃত (ধাপ ২)", color: "bg-sky-100 text-sky-800" },
    APPROVED_STAGE_2: { en: "Approved (Pending S3)", bn: "অনুমোদিত (ধাপ ৩)", color: "bg-indigo-100 text-indigo-800" },
    FINAL_APPROVED: { en: "Final Approved", bn: "চূড়ান্ত অনুমোদিত", color: "bg-emerald-100 text-emerald-800" },
    IN_PROGRESS: { en: "In Progress", bn: "কাজ চলছে", color: "bg-blue-100 text-blue-800" },
    COMPLETED: { en: "Work Completed", bn: "কাজ সম্পন্ন", color: "bg-teal-100 text-teal-800" },
    GARAGE_OUT: { en: "Garage Out", bn: "গ্যারেজ আউট", color: "bg-green-100 text-green-800" },
    CLOSED: { en: "Closed", bn: "বন্ধ", color: "bg-slate-200 text-slate-700" },
    REJECTED: { en: "Rejected", bn: "বাতিল", color: "bg-rose-100 text-rose-800" },
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner - Screen Only */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-primary via-brand-dark to-slate-900 p-6 sm:p-8 text-white shadow-xl print:hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-md text-white border border-white/20">
                <BarChart3 size={13} />
                {lang === "bn" ? "সৌদিয়া এক্সিকিউটিভ রিপোর্ট" : "Soudia Executive Reports"}
              </span>
              <span className="text-xs text-white/70">
                • {lang === "bn" ? "বিশ্লেষণ ও রিপোর্টস" : "Analytics & Reports"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {lang === "bn" ? "টিকেটিং, বহর খরচ ও অকাল নষ্টের রিপোর্ট" : "Ticketing, Fleet Cost & Premature Wear Reports"}
            </h1>
            <p className="mt-1 text-sm text-white/80 max-w-2xl">
              {lang === "bn"
                ? "পার্টস ব্যবহারের গতি, ওয়ারেন্টি ও সময়ের আগে পার্টস নষ্টের কারণ এবং ডিপোভিত্তিক মেরামত খরচ নিরীক্ষা করুন।"
                : "Audit parts ticketing velocity, track warranty and premature failure causes, and analyze fleet maintenance costs across all operational depots."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <CustomButton
              variant="outline"
              onClick={handlePrint}
              className="bg-white text-brand-dark hover:bg-slate-100 border-white text-xs font-bold"
            >
              <Printer size={14} className="mr-1.5 text-brand-primary" />
              {lang === "bn" ? "রিপোর্ট প্রিন্ট করুন" : "Print Report"}
            </CustomButton>
          </div>
        </div>

        {/* Decorative background watermark */}
        <div className="pointer-events-none absolute right-4 bottom-2 opacity-10">
          <BarChart3 size={180} />
        </div>
      </div>

      {/* Print-Only Header */}
      <div className="hidden print:block mb-6 border-b border-slate-300 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              {lang === "bn" ? "সৌদিয়া পার্টস টিকেটিং সিস্টেম" : "Soudia Parts Ticketing System"}
            </h1>
            <p className="text-sm font-semibold text-slate-600">
              {lang === "bn"
                ? "সৌদিয়া পরিবহন — বহর মেইনটেন্যান্স ও পার্টস টিকেটিং রিপোর্ট"
                : "Soudia Coach Service • Fleet Maintenance & Parts Ticketing Report"}
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>Generated: {new Date().toLocaleDateString("en-GB")} {new Date().toLocaleTimeString()}</p>
            <p>Generated by: {user?.name || "Administrator"}</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <CustomCard className="p-4 border-l-4 border-l-brand-primary">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {lang === "bn" ? "সর্বমোট তৈরি টিকিট" : "Total Tickets Raised"}
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-slate-800">{summary?.counts.total || 0}</span>
            <Ticket size={20} className="text-brand-primary/60" />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {lang === "bn"
              ? `${summary?.counts.open || 0} টি বর্তমানে প্রক্রিয়াধীন`
              : `${summary?.counts.open || 0} currently active/open`}
          </p>
        </CustomCard>

        <CustomCard className="p-4 border-l-4 border-l-emerald-500">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {lang === "bn" ? "অনুমোদিত টিকিট" : "Fully Approved"}
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-emerald-700">
              {(summary?.counts.approved_waiting || 0) + (summary?.counts.completed || 0) + (summary?.counts.garage_out || 0) + (summary?.counts.closed || 0)}
            </span>
            <CheckCircle2 size={20} className="text-emerald-500" />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {lang === "bn" ? "৩-ধাপ ভেরিফিকেশন সম্পন্ন" : "Passed 3-Step verification pipeline"}
          </p>
        </CustomCard>

        <CustomCard className="p-4 border-l-4 border-l-rose-500">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {lang === "bn" ? "অকাল নষ্ট সতর্কতা" : "Premature Wear Alerts"}
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-rose-700">{summary?.counts.premature || prematureTickets.length}</span>
            <AlertTriangle size={20} className="text-rose-500" />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {lang === "bn" ? "প্রত্যাশিত কিমি শেষ হওয়ার আগেই নষ্ট" : "Failed before expected KM lifespan"}
          </p>
        </CustomCard>

        <CustomCard className="p-4 border-l-4 border-l-amber-500">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {lang === "bn" ? "গ্যারেজে মোট বাস" : "Buses In Garage"}
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-amber-700">{summary?.counts.buses_in_garage || 0}</span>
            <Wrench size={20} className="text-amber-500" />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {lang === "bn" ? "ওয়ার্কশপে বর্তমানে মেরামত চলছে" : "Undergoing active workshop repair"}
          </p>
        </CustomCard>
      </div>

      {/* Cost Highlights (if user has tickets.cost permission) */}
      {canSeeCost && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CustomCard className="p-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
            <span className="text-xs text-slate-400 font-semibold uppercase">
              {lang === "bn" ? "সর্বমোট মেরামত খরচ" : "Total Recorded Spend"}
            </span>
            <p className="text-2xl font-black mt-1 text-emerald-400">৳ {totalCost.toLocaleString()}</p>
            <p className="text-[11px] text-slate-400 mt-1">
              {lang === "bn" ? "পার্টস ও লেবার মোট খরচ" : "Parts + labor maintenance spend"}
            </p>
          </CustomCard>

          <CustomCard className="p-4 bg-white border border-slate-200">
            <span className="text-xs text-slate-500 font-semibold uppercase">
              {lang === "bn" ? "মোট পার্টসের খরচ" : "Total Parts Cost"}
            </span>
            <p className="text-2xl font-black mt-1 text-slate-800">৳ {totalPartsCost.toLocaleString()}</p>
            <p className="text-[11px] text-slate-400 mt-1">
              {lang === "bn" ? "স্পেয়ার পার্টস, লুব্রিকেন্ট ও যন্ত্রাংশ" : "Spares, lubricants & replacement items"}
            </p>
          </CustomCard>

          <CustomCard className="p-4 bg-white border border-slate-200">
            <span className="text-xs text-slate-500 font-semibold uppercase">
              {lang === "bn" ? "মোট ওয়ার্কশপ মজুরি" : "Total Workshop Labor"}
            </span>
            <p className="text-2xl font-black mt-1 text-slate-800">৳ {totalLaborCost.toLocaleString()}</p>
            <p className="text-[11px] text-slate-400 mt-1">
              {lang === "bn" ? "মিস্ত্রি ও ওয়ার্কশপ সার্ভিস বিল" : "Technician and workshop service fees"}
            </p>
          </CustomCard>
        </div>
      )}

      {/* Tabs - Screen Only */}
      <div className="flex items-center gap-2 border-b border-slate-200 print:hidden">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeTab === "overview"
              ? "border-brand-primary text-brand-primary"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          {lang === "bn" ? "টিকেটিং অ্যানালিটিক্স ও সারসংক্ষেপ" : "Ticketing Analytics & Breakdown"}
        </button>

        <button
          onClick={() => setActiveTab("premature")}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === "premature"
              ? "border-rose-600 text-rose-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <AlertTriangle size={13} className="text-rose-500" />
          {lang === "bn"
            ? `অকাল নষ্ট পার্টস সতর্কতা (${prematureTickets.length})`
            : `Premature Wear Registry (${prematureTickets.length})`}
        </button>

        <button
          onClick={() => setActiveTab("buses")}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeTab === "buses"
              ? "border-brand-primary text-brand-primary"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          {lang === "bn" ? "কোচভিত্তিক খরচ র্যাংকিং" : "Top Fleet Buses by Spend"}
        </button>
      </div>

      {/* Tab 1: Overview Breakdown */}
      {(activeTab === "overview" || typeof window !== "undefined") && (
        <div className={`space-y-6 ${activeTab !== "overview" ? "print:block hidden" : ""}`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ticket Breakdown by Type */}
            <CustomCard className="p-5">
              <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                <Ticket size={16} className="text-brand-primary" />
                {lang === "bn" ? "ধরন অনুযায়ী টিকিট বণ্টন" : "Tickets Distribution by Type"}
              </h3>

              <div className="space-y-3">
                {summary?.by_type &&
                  Object.entries(summary.by_type).map(([typeKey, count]) => {
                    const info = typeLabels[typeKey] || { en: typeKey, bn: typeKey };
                    const total = summary.counts.total || 1;
                    const pct = Math.round((Number(count) / total) * 100);

                    return (
                      <div key={typeKey} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700">
                            {lang === "bn" ? info.bn : info.en}
                          </span>
                          <span className="font-bold text-slate-900">
                            {String(count)} <span className="text-[11px] text-slate-400">({pct}%)</span>
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-brand-primary transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CustomCard>

            {/* Ticket Breakdown by Status */}
            <CustomCard className="p-5">
              <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                <Clock size={16} className="text-brand-primary" />
                {lang === "bn" ? "বর্তমান পাইপলাইন অবস্থা" : "Workflow Pipeline Status"}
              </h3>

              <div className="space-y-2.5">
                {summary?.by_status &&
                  Object.entries(summary.by_status).map(([statusKey, count]) => {
                    const st = statusLabels[statusKey] || {
                      en: statusKey,
                      bn: statusKey,
                      color: "bg-slate-100 text-slate-700",
                    };
                    return (
                      <div
                        key={statusKey}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                      >
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${st.color}`}>
                          {lang === "bn" ? st.bn : st.en}
                        </span>
                        <span className="font-bold text-slate-800 text-sm">{String(count)}</span>
                      </div>
                    );
                  })}
              </div>
            </CustomCard>
          </div>
        </div>
      )}

      {/* Tab 2: Premature Wear Registry */}
      {(activeTab === "premature" || typeof window !== "undefined") && (
        <div className={`space-y-4 ${activeTab !== "premature" ? "print:block hidden" : ""}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <AlertTriangle size={18} className="text-rose-600" />
                {lang === "bn"
                  ? "অকাল নষ্ট পার্টস ও ওয়ারেন্টি রেজিস্ট্রি"
                  : "Premature Parts Failure & Warranty Registry"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {lang === "bn"
                  ? "স্বাভাবিক মেয়াদের আগেই নষ্ট হওয়া পার্টসসমূহ (প্রত্যাশিত কিমি / দিনের আগেই)। কারণ উল্লেখ বাধ্যতামূলক।"
                  : "Parts that broke or required replacement before the standard expected lifespan (Life KM / Days). Requires root cause justification."}
              </p>
            </div>
          </div>

          <CustomCard className="overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-rose-50/50 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    <th className="py-3 px-4">{lang === "bn" ? "টিকিট নং" : "Ticket #"}</th>
                    <th className="py-3 px-4">{lang === "bn" ? "বাস নম্বর" : "Coach Bus"}</th>
                    <th className="py-3 px-4">{lang === "bn" ? "নষ্ট পার্টসের নাম" : "Defective Part"}</th>
                    <th className="py-3 px-4">{lang === "bn" ? "পূর্বে লাগানোর তারিখ" : "Prev Install Date"}</th>
                    <th className="py-3 px-4">{lang === "bn" ? "চলেছে (কিমি)" : "KM Run"}</th>
                    <th className="py-3 px-4">{lang === "bn" ? "নষ্টের কারণ ও ব্যাখ্যা" : "Failure Reason"}</th>
                    <th className="py-3 px-4">{lang === "bn" ? "ছবি" : "Photos"}</th>
                    <th className="py-3 px-4">{lang === "bn" ? "অ্যাকশন" : "Action"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {prematureTickets.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-500" />
                        {lang === "bn"
                          ? "কোনো অকাল নষ্ট পার্টসের রেকর্ড নেই! সকল পার্টস স্বাভাবিক মেয়াদ অতিক্রম করেছে।"
                          : "No premature wear defects reported! All parts have exceeded expected lifespan."}
                      </td>
                    </tr>
                  ) : (
                    prematureTickets.map((t) => {
                      const prematureItem = t.items?.find((i) => i.is_premature_wear) || t.items?.[0];
                      return (
                        <tr key={t.id} className="hover:bg-rose-50/30 transition">
                          <td className="py-3 px-4 font-mono font-bold text-brand-primary whitespace-nowrap">
                            <Link href={`/tickets/${t.id}`} className="hover:underline">
                              {t.ticket_no}
                            </Link>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-800">{t.bus?.bus_no || `Bus #${t.bus_id}`}</span>
                            {t.bus?.name && <p className="text-[10px] text-slate-400">{t.bus.name}</p>}
                          </td>
                          <td className="py-3 px-4 font-bold text-rose-700">
                            {prematureItem?.part_name || t.title}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                            {prematureItem?.last_installed_date || "—"}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">
                            {prematureItem?.actual_km_run !== undefined && prematureItem.actual_km_run !== null
                              ? `${prematureItem.actual_km_run.toLocaleString()} ${lang === "bn" ? "কিমি" : "KM"}`
                              : t.odometer_km
                              ? `${t.odometer_km.toLocaleString()} ${lang === "bn" ? "কিমি" : "KM"}`
                              : "—"}
                          </td>
                          <td className="py-3 px-4 max-w-xs text-slate-700 leading-relaxed">
                            <span className="font-semibold text-rose-600">
                              {prematureItem?.premature_reason || (lang === "bn" ? "সময়ের আগেই নষ্ট" : "Worn prematurely")}
                            </span>
                            {prematureItem?.premature_note && (
                              <p className="text-[11px] text-slate-500 mt-0.5">{prematureItem.premature_note}</p>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {t.attachments && t.attachments.length > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                📷 {t.attachments.length} {lang === "bn" ? "টি ছবি" : "Photos"}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">
                                {lang === "bn" ? "ছবি নেই" : "No photo"}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <Link
                              href={`/tickets/${t.id}`}
                              className="inline-flex items-center gap-1 font-bold text-brand-primary hover:underline"
                            >
                              <Eye size={12} />
                              {lang === "bn" ? "টিকিট দেখুন" : "View Ticket"}
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CustomCard>
        </div>
      )}

      {/* Tab 3: Top Fleet Buses by Spend */}
      {(activeTab === "buses" || typeof window !== "undefined") && (
        <div className={`space-y-4 ${activeTab !== "buses" ? "print:block hidden" : ""}`}>
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <CarFront size={18} className="text-brand-primary" />
              {lang === "bn"
                ? "কোচভিত্তিক মেরামত খরচ ও ফ্রিকোয়েন্সি র্যাংকিং"
                : "Fleet Coaches Maintenance Spend & Frequency Ranking"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {lang === "bn"
                ? "সর্বাধিক পার্টস ও গ্যারেজ মেইনটেন্যান্স খরচ হওয়া বাসের তালিকা।"
                : "Ranked list of buses requiring the highest frequency of parts replacement and workshop maintenance."}
            </p>
          </div>

          <CustomCard className="overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    <th className="py-3 px-4">{lang === "bn" ? "র্যাংক" : "Rank"}</th>
                    <th className="py-3 px-4">{lang === "bn" ? "বাস নম্বর" : "Bus Coach No"}</th>
                    <th className="py-3 px-4">{lang === "bn" ? "টিকিট সংখ্যা" : "Ticket Count"}</th>
                    {canSeeCost && <th className="py-3 px-4">{lang === "bn" ? "মোট মেরামত খরচ" : "Total Maintenance Spend"}</th>}
                    <th className="py-3 px-4">{lang === "bn" ? "অ্যাকশন" : "Action"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {summary?.top_buses && summary.top_buses.length > 0 ? (
                    summary.top_buses.map((tb: { bus_no: string; tickets: number; cost?: number | null }, idx: number) => (
                      <tr key={tb.bus_no} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 font-black text-slate-400">
                          #{idx + 1}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <CarFront size={14} className="text-brand-primary" />
                            <span>{tb.bus_no}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {tb.tickets} {lang === "bn" ? "টি টিকিট" : "Tickets"}
                        </td>
                        {canSeeCost && (
                          <td className="py-3 px-4 font-mono font-bold text-emerald-700 text-sm">
                            {tb.cost !== null && tb.cost !== undefined ? `৳ ${Number(tb.cost).toLocaleString()}` : "—"}
                          </td>
                        )}
                        <td className="py-3 px-4">
                          <Link
                            href={`/tickets?bus_no=${tb.bus_no}`}
                            className="inline-flex items-center gap-1 text-xs font-bold text-brand-primary hover:underline"
                          >
                            <Ticket size={12} />
                            {lang === "bn" ? "টিকিট দেখুন" : "View Tickets"}
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        {lang === "bn" ? "কোনো ডেটা পাওয়া যায়নি" : "No coach maintenance data available"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CustomCard>
        </div>
      )}
    </div>
  );
}
