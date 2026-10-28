"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
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
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { formatBDT, formatDate } from "@/lib/format";
import { hasPermission } from "@/lib/permissions";
import { TicketSummary, Ticket as TicketType, Bus, Page } from "@/lib/types";
import {
  CustomButton,
  CustomCard,
  CustomBadge,
  CustomTabs,
  CustomSelect,
} from "@/components/custom";

function ReportsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { lang, t } = useLanguage();

  const getActiveTabFromUrl = () => {
    const tabParam = searchParams.get("tab");
    const typeParam = searchParams.get("type");
    if (tabParam === "premature" || typeParam === "premature") return "premature";
    if (tabParam === "buses" || typeParam === "buses") return "buses";
    return "overview";
  };

  const [activeTab, setActiveTab] = useState<string>(getActiveTabFromUrl());
  const [summary, setSummary] = useState<TicketSummary | null>(null);
  const [prematureTickets, setPrematureTickets] = useState<TicketType[]>([]);
  const [allTickets, setAllTickets] = useState<TicketType[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateFilter, setDateFilter] = useState("all");
  const [selectedBus, setSelectedBus] = useState("");

  // Synchronize activeTab whenever searchParams changes (e.g. sidebar navigation)
  useEffect(() => {
    setActiveTab(getActiveTabFromUrl());
  }, [searchParams]);

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

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    const params = new URLSearchParams(searchParams.toString());
    if (tabId === "overview") {
      params.delete("tab");
    } else {
      params.set("tab", tabId);
    }
    params.delete("type");
    const qs = params.toString();
    router.replace(qs ? `/reports?${qs}` : "/reports", { scroll: false });
  };

  // Filtered tickets based on selected bus and date filter
  const filteredTickets = useMemo(() => {
    return allTickets.filter((t) => {
      // Coach filter
      if (selectedBus) {
        const busMatch =
          t.bus_id === Number(selectedBus) ||
          t.to_bus_id === Number(selectedBus) ||
          t.bus?.id === Number(selectedBus) ||
          t.to_bus?.id === Number(selectedBus);
        if (!busMatch) return false;
      }
      // Date filter
      if (dateFilter !== "all" && t.created_at) {
        const ticketDate = new Date(t.created_at);
        const now = new Date();
        const diffDays = (now.getTime() - ticketDate.getTime()) / (1000 * 3600 * 24);
        if (dateFilter === "7d" && diffDays > 7) return false;
        if (dateFilter === "30d" && diffDays > 30) return false;
        if (dateFilter === "90d" && diffDays > 90) return false;
      }
      return true;
    });
  }, [allTickets, selectedBus, dateFilter]);

  const filteredPremature = useMemo(() => {
    return prematureTickets.filter((t) => {
      if (selectedBus) {
        const busMatch =
          t.bus_id === Number(selectedBus) ||
          t.to_bus_id === Number(selectedBus) ||
          t.bus?.id === Number(selectedBus) ||
          t.to_bus?.id === Number(selectedBus);
        if (!busMatch) return false;
      }
      if (dateFilter !== "all" && t.created_at) {
        const ticketDate = new Date(t.created_at);
        const now = new Date();
        const diffDays = (now.getTime() - ticketDate.getTime()) / (1000 * 3600 * 24);
        if (dateFilter === "7d" && diffDays > 7) return false;
        if (dateFilter === "30d" && diffDays > 30) return false;
        if (dateFilter === "90d" && diffDays > 90) return false;
      }
      return true;
    });
  }, [prematureTickets, selectedBus, dateFilter]);

  // Cost calculations based on filtered set
  const totalCost = useMemo(() => {
    return filteredTickets.reduce((acc, t) => acc + (t.total_cost || t.total || 0), 0);
  }, [filteredTickets]);

  const totalPartsCost = useMemo(() => {
    return filteredTickets.reduce((acc, t) => acc + (t.parts_cost || 0), 0);
  }, [filteredTickets]);

  const totalLaborCost = useMemo(() => {
    return filteredTickets.reduce((acc, t) => acc + (t.labor_cost || 0), 0);
  }, [filteredTickets]);

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

  // Sub-category tabs specification
  const reportTabs = [
    {
      id: "overview",
      label: lang === "bn" ? "টিকিট ও খরচ অ্যানালিটিক্স" : "Ticket Status & Costs",
      icon: FileText,
      badge: `${filteredTickets.length}`,
    },
    {
      id: "premature",
      label: lang === "bn" ? "অকাল নষ্ট পার্টস সতর্কতা" : "Premature Wear Alerts",
      icon: AlertTriangle,
      badge: `${filteredPremature.length}`,
      isAlert: true,
    },
    {
      id: "buses",
      label: lang === "bn" ? "কোচভিত্তিক খরচ র‍্যাঙ্কিং" : "Coach Spend Ranking",
      icon: CarFront,
      badge: `${summary?.top_buses?.length || 0}`,
    },
  ];

  const activeReportTitle =
    activeTab === "premature"
      ? (lang === "bn" ? "অকাল নষ্ট পার্টস ও ওয়ারেন্টি ক্লেইম রেজিস্ট্রি" : "Premature Parts Failure & Warranty Claim Registry")
      : activeTab === "buses"
      ? (lang === "bn" ? "কোচভিত্তিক মেরামত খরচ ও ফ্রিকোয়েন্সি র‍্যাঙ্কিং রিপোর্ট" : "Fleet Coaches Maintenance Spend & Frequency Ranking Report")
      : (lang === "bn" ? "টিকেটিং, বহর খরচ ও পার্টস অডিট রিপোর্ট" : "Ticketing, Fleet Maintenance & Cost Audit Report");

  const selectedBusObj = buses.find((b) => String(b.id) === selectedBus);

  return (
    <div id="printable-report" className="printable-report space-y-6 pb-12">
      {/* ── Screen-Only Header Banner ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-primary via-brand-dark to-red-800 p-6 sm:p-8 text-white shadow-xl print:hidden no-print">
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
              className="bg-white text-brand-dark hover:bg-slate-100 border-white text-xs font-bold shadow-md cursor-pointer"
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

      {/* ── Official Print-Only Header (Appears on A4 Print) ── */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-lg bg-red-600 text-white flex items-center justify-center font-black text-xl shadow-xs">
              S
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight leading-tight">
                সৌদিয়া পরিবহন (প্রাঃ) লিঃ • SOUDIA COACH SERVICE (PVT.) LTD.
              </h1>
              <p className="text-[11px] font-semibold text-slate-600">
                হেড অফিস: ১৫৮, বঙ্গবন্ধু জাতীয় স্টেডিয়াম মার্কেট, ঢাকা-১০০০ | হেল্পলাইন: 01819-000001
              </p>
              <p className="text-xs font-bold text-red-700 mt-1 uppercase tracking-wide">
                {activeReportTitle}
              </p>
            </div>
          </div>

          <div className="text-right text-[11px] text-slate-600 font-mono space-y-0.5">
            <p className="font-bold text-slate-900">OFFICIAL AUDIT REPORT</p>
            <p>
              {lang === "bn" ? "মুদ্রণের সময়: " : "Printed: "}
              {new Date().toLocaleDateString("en-GB")} {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
            <p>
              {lang === "bn" ? "নিরীক্ষক: " : "Auditor: "}
              {user?.name || "Administrator"} ({user?.role || "Staff"})
            </p>
          </div>
        </div>

        {/* Scope bar in print header */}
        <div className="mt-3 pt-2 border-t border-slate-300 flex items-center justify-between text-[10.5px] text-slate-700">
          <span>
            <strong>{lang === "bn" ? "বহর আওতা: " : "Scope: "}</strong>
            {selectedBusObj ? `Coach Bus #${selectedBusObj.bus_no}` : (lang === "bn" ? "সকল চালু কোচ বাস" : "All Operational Coaches")}
          </span>
          <span>
            <strong>{lang === "bn" ? "সময়কাল: " : "Period: "}</strong>
            {dateFilter === "7d"
              ? (lang === "bn" ? "গত ৭ দিন" : "Last 7 Days")
              : dateFilter === "30d"
              ? (lang === "bn" ? "গত ৩০ দিন" : "Last 30 Days")
              : dateFilter === "90d"
              ? (lang === "bn" ? "গত ৯০ দিন" : "Last 90 Days")
              : (lang === "bn" ? "সকল ঐতিহাসিক রেকর্ড" : "All Historical Records")}
          </span>
          <span>
            <strong>{lang === "bn" ? "মডিউল: " : "Module: "}</strong>
            {lang === "bn" ? "পার্টস টিকেটিং ও ওয়ার্কশপ অপারেশনস" : "Parts Ticketing & Workshop Operations"}
          </span>
        </div>
      </div>

      {/* ── Screen-Only Sub-Category Tabs & Filters Row ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2 print:hidden no-print">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin">
          {reportTabs.map((rt) => {
            const Icon = rt.icon;
            const isSelected = activeTab === rt.id;
            return (
              <button
                key={rt.id}
                onClick={() => handleTabChange(rt.id)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  isSelected
                    ? rt.isAlert
                      ? "bg-rose-600 text-white shadow-sm ring-2 ring-rose-300"
                      : "bg-brand-primary text-white shadow-sm ring-2 ring-brand-primary/30"
                    : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
                }`}
              >
                <Icon size={14} className={isSelected ? "text-white" : rt.isAlert ? "text-rose-600" : "text-brand-primary"} />
                <span>{rt.label}</span>
                <span
                  className={`inline-flex items-center justify-center px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isSelected
                      ? "bg-white/25 text-white"
                      : rt.isAlert
                      ? "bg-rose-100 text-rose-700"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {rt.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Quick Date and Bus Filters */}
        <div className="flex items-center gap-2">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-primary font-medium"
          >
            <option value="all">{lang === "bn" ? "সব সময়" : "All Time"}</option>
            <option value="7d">{lang === "bn" ? "গত ৭ দিন" : "Last 7 Days"}</option>
            <option value="30d">{lang === "bn" ? "গত ৩০ দিন" : "Last 30 Days"}</option>
            <option value="90d">{lang === "bn" ? "গত ৯০ দিন" : "Last 90 Days"}</option>
          </select>

          <select
            value={selectedBus}
            onChange={(e) => setSelectedBus(e.target.value)}
            className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-primary font-medium"
          >
            <option value="">{lang === "bn" ? "সকল কোচ বাস" : "All Coaches"}</option>
            {buses.map((b) => (
              <option key={b.id} value={String(b.id)}>
                {b.bus_no}
              </option>
            ))}
          </select>

          {(dateFilter !== "all" || selectedBus) && (
            <button
              onClick={() => {
                setDateFilter("all");
                setSelectedBus("");
              }}
              className="p-1.5 text-slate-400 hover:text-rose-600 transition"
              title="Reset Filters"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 break-inside-avoid">
        <CustomCard className="p-4 border-l-4 border-l-brand-primary print:border print:border-slate-300">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {lang === "bn" ? "সর্বমোট তৈরি টিকিট" : "Total Tickets Raised"}
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-slate-800">{filteredTickets.length}</span>
            <Ticket size={20} className="text-brand-primary/60 print:hidden" />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {lang === "bn"
              ? `${summary?.counts.open || 0} টি বর্তমানে প্রক্রিয়াধীন`
              : `${summary?.counts.open || 0} currently active/open`}
          </p>
        </CustomCard>

        <CustomCard className="p-4 border-l-4 border-l-emerald-500 print:border print:border-slate-300">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {lang === "bn" ? "অনুমোদিত টিকিট" : "Fully Approved"}
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-emerald-700">
              {(summary?.counts.approved_waiting || 0) + (summary?.counts.completed || 0) + (summary?.counts.garage_out || 0) + (summary?.counts.closed || 0)}
            </span>
            <CheckCircle2 size={20} className="text-emerald-500 print:hidden" />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {lang === "bn" ? "৩-ধাপ ভেরিফিকেশন সম্পন্ন" : "Passed 3-Step verification pipeline"}
          </p>
        </CustomCard>

        <CustomCard className="p-4 border-l-4 border-l-rose-500 print:border print:border-slate-300">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {lang === "bn" ? "অকাল নষ্ট সতর্কতা" : "Premature Wear Alerts"}
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-rose-700">{filteredPremature.length}</span>
            <AlertTriangle size={20} className="text-rose-500 print:hidden" />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {lang === "bn" ? "প্রত্যাশিত কিমি শেষ হওয়ার আগেই নষ্ট" : "Failed before expected KM lifespan"}
          </p>
        </CustomCard>

        <CustomCard className="p-4 border-l-4 border-l-amber-500 print:border print:border-slate-300">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {lang === "bn" ? "গ্যারেজে মোট বাস" : "Buses In Garage"}
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-amber-700">{summary?.counts.buses_in_garage || 0}</span>
            <Wrench size={20} className="text-amber-500 print:hidden" />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {lang === "bn" ? "ওয়ার্কশপে বর্তমানে মেরামত চলছে" : "Undergoing active workshop repair"}
          </p>
        </CustomCard>
      </div>

      {/* ── Cost Highlights (Financial Audit) ── */}
      {canSeeCost && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 break-inside-avoid">
          <CustomCard className="p-4 bg-white border border-slate-200 border-l-4 border-l-brand-primary shadow-xs print:border print:border-slate-300">
            <span className="text-xs text-slate-500 font-semibold uppercase">
              {lang === "bn" ? "সর্বমোট মেরামত খরচ" : "Total Recorded Spend"}
            </span>
            <p className="text-2xl font-black mt-1 text-slate-900">৳ {totalCost.toLocaleString()}</p>
            <p className="text-[11px] text-slate-400 mt-1">
              {lang === "bn" ? "পার্টস ও লেবার মোট খরচ" : "Parts + labor maintenance spend"}
            </p>
          </CustomCard>

          <CustomCard className="p-4 bg-white border border-slate-200 border-l-4 border-l-blue-500 shadow-xs print:border print:border-slate-300">
            <span className="text-xs text-slate-500 font-semibold uppercase">
              {lang === "bn" ? "মোট পার্টসের খরচ" : "Total Parts Cost"}
            </span>
            <p className="text-2xl font-black mt-1 text-slate-900">৳ {totalPartsCost.toLocaleString()}</p>
            <p className="text-[11px] text-slate-400 mt-1">
              {lang === "bn" ? "স্পেয়ার পার্টস, লুব্রিকেন্ট ও যন্ত্রাংশ" : "Spares, lubricants & replacement items"}
            </p>
          </CustomCard>

          <CustomCard className="p-4 bg-white border border-slate-200 border-l-4 border-l-amber-500 shadow-xs print:border print:border-slate-300">
            <span className="text-xs text-slate-500 font-semibold uppercase">
              {lang === "bn" ? "মোট ওয়ার্কশপ মজুরি" : "Total Workshop Labor"}
            </span>
            <p className="text-2xl font-black mt-1 text-slate-900">৳ {totalLaborCost.toLocaleString()}</p>
            <p className="text-[11px] text-slate-400 mt-1">
              {lang === "bn" ? "মিস্ত্রি ও ওয়ার্কশপ সার্ভিস বিল" : "Technician and workshop service fees"}
            </p>
          </CustomCard>
        </div>
      )}

      {/* ── Tab 1: Overview Breakdown ── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 break-inside-avoid">
            {/* Ticket Breakdown by Type */}
            <CustomCard className="p-5 print:border print:border-slate-300">
              <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                <Ticket size={16} className="text-brand-primary print:hidden" />
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
                        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden print:border print:border-slate-300">
                          <div
                            className="h-full rounded-full bg-brand-primary"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CustomCard>

            {/* Ticket Breakdown by Status */}
            <CustomCard className="p-5 print:border print:border-slate-300">
              <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                <Clock size={16} className="text-brand-primary print:hidden" />
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
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs print:border-slate-300"
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

          {/* Master Tickets Log Table (Displays in Print & Screen) */}
          <div className="break-inside-avoid">
            <CustomCard className="overflow-hidden shadow-xs print:border print:border-slate-300">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <FileText size={16} className="text-brand-primary print:hidden" />
                  <span>{lang === "bn" ? "টিকেটের মাস্টার তালিকা ও খরচের হিসাব" : "Tickets Master Audit Log"}</span>
                </h3>
                <span className="text-xs text-slate-500 font-semibold font-mono">
                  {filteredTickets.length} {lang === "bn" ? "টি টিকিট" : "records"}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100 text-[10.5px] font-bold text-slate-700 uppercase tracking-wider">
                      <th className="py-2.5 px-3">{lang === "bn" ? "টিকিট নং" : "Ticket #"}</th>
                      <th className="py-2.5 px-3">{lang === "bn" ? "তারিখ" : "Date"}</th>
                      <th className="py-2.5 px-3">{lang === "bn" ? "ধরন" : "Type"}</th>
                      <th className="py-2.5 px-3">{lang === "bn" ? "কোচ নং" : "Coach #"}</th>
                      <th className="py-2.5 px-3">{lang === "bn" ? "বিবরণ ও পার্টস" : "Title & Parts"}</th>
                      <th className="py-2.5 px-3">{lang === "bn" ? "অবস্থা" : "Status"}</th>
                      {canSeeCost && <th className="py-2.5 px-3 text-right">{lang === "bn" ? "খরচ (৳)" : "Cost (BDT)"}</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTickets.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          {lang === "bn" ? "কোনো টিকিট রেকর্ড পাওয়া যায়নি" : "No ticket records found"}
                        </td>
                      </tr>
                    ) : (
                      filteredTickets.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-mono font-bold text-brand-primary whitespace-nowrap">
                            <Link href={`/tickets/${t.id}`} className="hover:underline">
                              {t.ticket_no}
                            </Link>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                            {formatDate(t.created_at)}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap font-medium text-slate-700">
                            {typeLabels[t.type]?.[lang === "bn" ? "bn" : "en"] || t.type}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap font-bold text-slate-800">
                            {t.bus?.bus_no || (t.bus_id ? `Bus #${t.bus_id}` : "—")}
                          </td>
                          <td className="py-2.5 px-3 max-w-[220px] truncate print:max-w-none print:whitespace-normal text-slate-700">
                            {t.title}
                            {t.is_premature && (
                              <span className="ml-1 text-[9px] font-bold text-rose-600 bg-rose-50 px-1 py-0.2 rounded border border-rose-200">
                                {lang === "bn" ? "অকাল নষ্ট" : "Premature"}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                              {statusLabels[t.status]?.[lang === "bn" ? "bn" : "en"] || t.status}
                            </span>
                          </td>
                          {canSeeCost && (
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                              {t.total_cost !== null && t.total_cost !== undefined
                                ? `৳ ${Number(t.total_cost).toLocaleString()}`
                                : t.total !== null && t.total !== undefined
                                ? `৳ ${Number(t.total).toLocaleString()}`
                                : "—"}
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CustomCard>
          </div>
        </div>
      )}

      {/* ── Tab 2: Premature Wear Registry ── */}
      {activeTab === "premature" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <AlertTriangle size={18} className="text-rose-600 print:hidden" />
                {lang === "bn"
                  ? "অকাল নষ্ট পার্টস ও ওয়ারেন্টি রেজিস্ট্রি"
                  : "Premature Parts Failure & Warranty Registry"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {lang === "bn"
                  ? "স্বাভাবিক মেয়াদের আগেই নষ্ট হওয়া পার্টসসমূহ (প্রত্যাশিত কিমি বা দিনের আগেই)। কারণ উল্লেখ বাধ্যতামূলক।"
                  : "Parts that broke or required replacement before the standard expected lifespan (Life KM or Days). Requires root cause justification."}
              </p>
            </div>
          </div>

          <CustomCard className="overflow-hidden shadow-xs print:border print:border-slate-300">
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
                    <th className="py-3 px-4 print:hidden no-print">{lang === "bn" ? "অ্যাকশন" : "Action"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredPremature.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-500 print:hidden" />
                        {lang === "bn"
                          ? "কোনো অকাল নষ্ট পার্টসের রেকর্ড নেই! সকল পার্টস স্বাভাবিক মেয়াদ অতিক্রম করেছে।"
                          : "No premature wear defects reported! All parts have exceeded expected lifespan."}
                      </td>
                    </tr>
                  ) : (
                    filteredPremature.map((t) => {
                      const prematureItem = t.items?.find((i) => i.is_premature_wear) || t.items?.[0];
                      return (
                        <tr key={t.id} className="hover:bg-rose-50/30 transition">
                          <td className="py-3 px-4 font-mono font-bold text-brand-primary whitespace-nowrap">
                            <Link href={`/tickets/${t.id}`} className="hover:underline">
                              {t.ticket_no}
                            </Link>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
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
                          <td className="py-3 px-4 max-w-xs print:max-w-none text-slate-700 leading-relaxed">
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
                          <td className="py-3 px-4 whitespace-nowrap print:hidden no-print">
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

      {/* ── Tab 3: Top Fleet Buses by Spend ── */}
      {activeTab === "buses" && (
        <div className="space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <CarFront size={18} className="text-brand-primary print:hidden" />
              {lang === "bn"
                ? "কোচভিত্তিক মেরামত খরচ ও ফ্রিকোয়েন্সি র‍্যাঙ্কিং"
                : "Fleet Coaches Maintenance Spend & Frequency Ranking"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {lang === "bn"
                ? "সর্বাধিক পার্টস ও গ্যারেজ মেইনটেন্যান্স খরচ হওয়া বাসের তালিকা।"
                : "Ranked list of buses requiring the highest frequency of parts replacement and workshop maintenance."}
            </p>
          </div>

          <CustomCard className="overflow-hidden shadow-xs print:border print:border-slate-300">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    <th className="py-3 px-4">{lang === "bn" ? "র‍্যাংক" : "Rank"}</th>
                    <th className="py-3 px-4">{lang === "bn" ? "বাস নম্বর" : "Bus Coach No"}</th>
                    <th className="py-3 px-4">{lang === "bn" ? "টিকিট সংখ্যা" : "Ticket Count"}</th>
                    {canSeeCost && <th className="py-3 px-4">{lang === "bn" ? "মোট মেরামত খরচ" : "Total Maintenance Spend"}</th>}
                    <th className="py-3 px-4 print:hidden no-print">{lang === "bn" ? "অ্যাকশন" : "Action"}</th>
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
                            <CarFront size={14} className="text-brand-primary print:hidden" />
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
                        <td className="py-3 px-4 print:hidden no-print">
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

      {/* ── Official 3-Tier Sign-off & Audit Signature Footer (Appears on A4 Print) ── */}
      <div className="hidden print:block pt-8 mt-8 border-t-2 border-slate-900 break-inside-avoid">
        <div className="grid grid-cols-3 gap-8 text-center text-xs text-slate-800">
          <div className="space-y-12">
            <p className="font-bold text-slate-600 uppercase text-[10px] tracking-wider">
              {lang === "bn" ? "প্রস্তুতকারক স্বাক্ষর" : "Prepared By"}
            </p>
            <div className="border-t border-slate-400 pt-1.5 font-bold">
              <p>{user?.name || "Store / Accounts Officer"}</p>
              <p className="text-[10px] text-slate-500 font-normal">{user?.role || "Staff"}</p>
            </div>
          </div>

          <div className="space-y-12">
            <p className="font-bold text-slate-600 uppercase text-[10px] tracking-wider">
              {lang === "bn" ? "যাচাই ও নিরীক্ষক" : "Audited & Verified By"}
            </p>
            <div className="border-t border-slate-400 pt-1.5 font-bold">
              <p>Depot Operations Manager</p>
              <p className="text-[10px] text-slate-500 font-normal">Terminal & Workshop Division</p>
            </div>
          </div>

          <div className="space-y-12">
            <p className="font-bold text-slate-600 uppercase text-[10px] tracking-wider">
              {lang === "bn" ? "অনুমোদনকারী কর্মকর্তা" : "Authorized Approval"}
            </p>
            <div className="border-t border-slate-400 pt-1.5 font-bold">
              <p>Executive Director / General Manager</p>
              <p className="text-[10px] text-slate-500 font-normal">Soudia Coach Service Ltd.</p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-2 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span>Soudia Parts Ticketing System • Official Audit Document</span>
          <span>CONFIDENTIAL • FOR OFFICIAL SOUDIA USE ONLY</span>
          <span>
            {lang === "bn" ? "তারিখ: " : "Date: "}
            {new Date().toLocaleDateString("en-GB")}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading reports and analytics...</div>}>
      <ReportsContent />
    </Suspense>
  );
}
