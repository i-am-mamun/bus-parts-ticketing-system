"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  History,
  CarFront,
  Search,
  Filter,
  ArrowRightLeft,
  Wrench,
  CheckCircle2,
  Ticket,
  Building2,
  Calendar,
  Gauge,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  PlusCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { Bus, PartHistoryItem, Page } from "@/lib/types";
import {
  CustomButton,
  CustomInput,
  CustomSelect,
  CustomCard,
  CustomStatCard,
  CustomBadge,
} from "@/components/custom";

export default function FleetHistoryPage() {
  const { user } = useAuth();
  const { lang, t } = useLanguage();
  const [historyItems, setHistoryItems] = useState<PartHistoryItem[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // Filters
  const [searchPart, setSearchPart] = useState("");
  const [selectedBusId, setSelectedBusId] = useState("");
  const [selectedAction, setSelectedAction] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("page_size", String(pageSize));
      if (searchPart.trim()) params.set("part_name", searchPart.trim());
      if (selectedBusId) params.set("bus_id", selectedBusId);
      if (selectedAction) params.set("action", selectedAction);

      const [resHistory, resBuses] = await Promise.all([
        api.get<Page<PartHistoryItem>>(`/api/v1/fleet/history?${params.toString()}`),
        buses.length === 0 ? api.get<{ items: Bus[] }>("/api/v1/fleet/buses?page_size=100") : Promise.resolve(null),
      ]);

      setHistoryItems(resHistory.items || []);
      setTotalCount(resHistory.total || 0);
      if (resBuses) {
        setBuses(resBuses.items || []);
      }
    } catch (err) {
      console.error("Failed to load parts history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, selectedBusId, selectedAction]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const handleResetFilters = () => {
    setSearchPart("");
    setSelectedBusId("");
    setSelectedAction("");
    setPage(1);
  };

  // Summary counts from items
  const stats = useMemo(() => {
    let installed = 0;
    let replaced = 0;
    let transferOut = 0;
    let transferIn = 0;

    historyItems.forEach((h) => {
      if (h.action === "INSTALLED") installed++;
      else if (h.action === "REPLACED") replaced++;
      else if (h.action === "TRANSFERRED_OUT") transferOut++;
      else if (h.action === "TRANSFERRED_IN") transferIn++;
    });

    return { installed, replaced, transferOut, transferIn };
  }, [historyItems]);

  const renderActionBadge = (action: string, counterpartBus?: string | null) => {
    switch (action) {
      case "INSTALLED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={12} className="text-emerald-600" />
            {lang === "bn" ? "নতুন লাগানো" : "Installed"}
          </span>
        );
      case "REPLACED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <Wrench size={12} className="text-rose-600" />
            {lang === "bn" ? "নষ্ট বদল" : "Replaced"}
          </span>
        );
      case "TRANSFERRED_OUT":
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <ArrowUpRight size={12} className="text-blue-600" />
            {lang === "bn"
              ? `অন্য বাসে পাঠানো ${counterpartBus ? `➔ ${counterpartBus}` : ""}`
              : `Transferred Out ${counterpartBus ? `➔ ${counterpartBus}` : ""}`}
          </span>
        );
      case "TRANSFERRED_IN":
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <ArrowDownLeft size={12} className="text-purple-600" />
            {lang === "bn"
              ? `অন্য বাস হতে আনা ${counterpartBus ? `⬅ ${counterpartBus}` : ""}`
              : `Transferred In ${counterpartBus ? `⬅ ${counterpartBus}` : ""}`}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700">
            {action}
          </span>
        );
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-primary via-brand-dark to-slate-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-md text-white border border-white/20">
                <History size={13} />
                {lang === "bn" ? "সৌদিয়া বহর লগবুক" : "Soudia Fleet Log Book"}
              </span>
              <span className="text-xs text-white/70">
                • {lang === "bn" ? "বাস পার্টস ব্যবহারের ইতিহাস ও ট্র্যাকিং" : "Bus Parts History & Tracking"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {lang === "bn" ? "পার্টসের ইতিহাস ও ট্রান্সফার লগবুক" : "Parts History & Transfer Log Book"}
            </h1>
            <p className="mt-1 text-sm text-white/80 max-w-2xl">
              {lang === "bn"
                ? "পার্টস ব্যবহারের লাইফ সাইকেল, পূর্বের ইনস্টলেশন তারিখ, ওডোমিটার কিমি, অকাল নষ্টের কারণ ও বাস-টু-বাস ট্রান্সফার ট্র্যাকিং।"
                : "Track part lifecycle, previous installation dates, odometer mileage, replacement causes, and mutual bus-to-bus transfers across Soudia coach fleet."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link href="/tickets/new">
              <CustomButton variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/30 text-xs">
                <PlusCircle size={14} className="mr-1.5" />
                {lang === "bn" ? "নতুন টিকিট তৈরি" : "Raise Ticket"}
              </CustomButton>
            </Link>
            <Link href="/fleet">
              <CustomButton variant="outline" className="bg-white text-brand-dark hover:bg-slate-100 border-white text-xs font-bold">
                <CarFront size={14} className="mr-1.5 text-brand-primary" />
                {lang === "bn" ? "বাস বহর তালিকা" : "Bus Fleet Registry"}
              </CustomButton>
            </Link>
          </div>
        </div>

        {/* Decorative background watermark */}
        <div className="pointer-events-none absolute right-4 bottom-2 opacity-10">
          <History size={180} />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <CustomCard className="p-4 border-l-4 border-l-brand-primary">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {lang === "bn" ? "সর্বমোট লগ এন্ট্রি" : "Total Log Entries"}
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-slate-800">{totalCount}</span>
            <History size={18} className="text-brand-primary/60" />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {lang === "bn" ? "নথিভুক্ত মেইনটেন্যান্স কার্যক্রম" : "Recorded fleet maintenance events"}
          </p>
        </CustomCard>

        <CustomCard className="p-4 border-l-4 border-l-emerald-500">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {lang === "bn" ? "নতুন লাগানো" : "New Installed"}
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-emerald-700">{stats.installed}</span>
            <CheckCircle2 size={18} className="text-emerald-500" />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {lang === "bn" ? "কোচে নতুন পার্টস সংযোজন" : "Fresh parts fitted on coaches"}
          </p>
        </CustomCard>

        <CustomCard className="p-4 border-l-4 border-l-rose-500">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {lang === "bn" ? "নষ্ট পার্টস বদল" : "Defect Replaced"}
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-rose-700">{stats.replaced}</span>
            <Wrench size={18} className="text-rose-500" />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {lang === "bn" ? "ক্ষতিগ্রস্ত পার্টস অপসারণ" : "Worn or damaged parts removed"}
          </p>
        </CustomCard>

        <CustomCard className="p-4 border-l-4 border-l-blue-500">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {lang === "bn" ? "পার্টস ট্রান্সফার" : "Transfers"}
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-blue-700">{stats.transferOut + stats.transferIn}</span>
            <ArrowRightLeft size={18} className="text-blue-500" />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {lang === "bn" ? "বাস থেকে বাসে পার্টস অদলবদল" : "Bus-to-bus mutual component swaps"}
          </p>
        </CustomCard>
      </div>

      {/* Filters Toolbar */}
      <CustomCard className="p-4 bg-white shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="flex flex-1 flex-col sm:flex-row items-center gap-3">
            {/* Search Part */}
            <div className="relative w-full sm:w-64">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchPart}
                onChange={(e) => setSearchPart(e.target.value)}
                placeholder={lang === "bn" ? "পার্টসের নাম দিয়ে খুঁজুন..." : "Search part name..."}
                className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-brand-primary outline-none transition"
              />
            </div>

            {/* Bus Filter */}
            <div className="w-full sm:w-48">
              <select
                value={selectedBusId}
                onChange={(e) => {
                  setSelectedBusId(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-brand-primary outline-none transition cursor-pointer"
              >
                <option value="">{lang === "bn" ? "সকল বাস" : "All Buses"}</option>
                {buses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bus_no} {b.name ? `• ${b.name}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Filter */}
            <div className="w-full sm:w-44">
              <select
                value={selectedAction}
                onChange={(e) => {
                  setSelectedAction(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-brand-primary outline-none transition cursor-pointer"
              >
                <option value="">{lang === "bn" ? "সকল ধরন" : "All Actions"}</option>
                <option value="INSTALLED">{lang === "bn" ? "নতুন লাগানো" : "Installed"}</option>
                <option value="REPLACED">{lang === "bn" ? "নষ্ট বদল" : "Replaced"}</option>
                <option value="TRANSFERRED_OUT">{lang === "bn" ? "অন্য বাসে পাঠানো" : "Transferred Out"}</option>
                <option value="TRANSFERRED_IN">{lang === "bn" ? "অন্য বাস থেকে আনা" : "Transferred In"}</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end lg:self-center">
            <CustomButton type="submit" variant="primary" size="sm" className="text-xs">
              <Search size={13} className="mr-1.5" />
              {lang === "bn" ? "ফিল্টার" : "Filter"}
            </CustomButton>
            {(searchPart || selectedBusId || selectedAction) && (
              <CustomButton
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs text-slate-500"
              >
                {lang === "bn" ? "রিসেট" : "Reset"}
              </CustomButton>
            )}
            <CustomButton
              type="button"
              variant="outline"
              size="sm"
              onClick={loadData}
              title={lang === "bn" ? "রিফ্রেশ" : "Refresh"}
              className="text-xs px-2.5"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            </CustomButton>
          </div>
        </form>
      </CustomCard>

      {/* History Table */}
      <CustomCard className="overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">{lang === "bn" ? "তারিখ" : "Date"}</th>
                <th className="py-3 px-4">{lang === "bn" ? "বাস নম্বর" : "Coach Number"}</th>
                <th className="py-3 px-4">{lang === "bn" ? "পার্টসের নাম" : "Part Name"}</th>
                <th className="py-3 px-4">{lang === "bn" ? "অ্যাকশন" : "Action"}</th>
                <th className="py-3 px-4 text-center">{lang === "bn" ? "সংখ্যা" : "Qty"}</th>
                <th className="py-3 px-4">{lang === "bn" ? "ওডোমিটার (কিমি)" : "Odometer (KM)"}</th>
                <th className="py-3 px-4">{lang === "bn" ? "ট্রান্সফার বাস" : "Counterpart Bus"}</th>
                <th className="py-3 px-4">{lang === "bn" ? "রেফারেন্স" : "Ticket Link"}</th>
                <th className="py-3 px-4">{lang === "bn" ? "মন্তব্য" : "Notes"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw size={24} className="mx-auto animate-spin text-brand-primary mb-2" />
                    {lang === "bn" ? "পার্টস লগবুক লোড হচ্ছে..." : "Loading parts log book..."}
                  </td>
                </tr>
              ) : historyItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <History size={36} className="mx-auto mb-2 text-slate-300" />
                    {lang === "bn" ? "কোনো পার্টস হিস্ট্রি রেকর্ড পাওয়া যায়নি।" : "No parts history records found."}
                  </td>
                </tr>
              ) : (
                historyItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-400" />
                        <span>{item.on_date || "—"}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        href={`/fleet`}
                        className="font-bold text-slate-800 hover:text-brand-primary flex items-center gap-1.5"
                      >
                        <CarFront size={14} className="text-brand-primary shrink-0" />
                        <span>{item.bus_no}</span>
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {item.part_name}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {renderActionBadge(item.action, item.counterpart_bus_no)}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-700">
                      {item.qty}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">
                      {item.odometer_km !== null && item.odometer_km !== undefined ? (
                        <span className="flex items-center gap-1">
                          <Gauge size={12} className="text-slate-400" />
                          {item.odometer_km.toLocaleString()} {lang === "bn" ? "কিমি" : "KM"}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {item.counterpart_bus_no ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          <CarFront size={12} className="text-brand-primary" />
                          {item.counterpart_bus_no}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {item.ticket_id ? (
                        <Link
                          href={`/tickets/${item.ticket_id}`}
                          className="inline-flex items-center gap-1 font-mono text-[11.5px] font-bold text-brand-primary hover:underline bg-brand-50 px-2 py-0.5 rounded-md border border-brand-border"
                        >
                          <Ticket size={11} />
                          {lang === "bn" ? `টিকিট #${item.ticket_id}` : `Ticket #${item.ticket_id}`}
                        </Link>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-600 text-[11.5px]">
                      {item.note || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 p-4 text-xs text-slate-500">
          <div>
            {lang === "bn" ? (
              <>মোট <span className="font-bold text-slate-700">{totalCount}</span> টির মধ্যে <span className="font-bold text-slate-700">{historyItems.length}</span> টি দেখানো হচ্ছে</>
            ) : (
              <>Showing <span className="font-bold text-slate-700">{historyItems.length}</span> of <span className="font-bold text-slate-700">{totalCount}</span> entries</>
            )}
          </div>
          <div className="flex items-center gap-2">
            <CustomButton
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="text-xs"
            >
              {lang === "bn" ? "পূর্ববর্তী" : "Previous"}
            </CustomButton>
            <span className="text-xs font-semibold px-2">
              {lang === "bn" ? `পৃষ্ঠা ${page} এর ${totalPages}` : `Page ${page} of ${totalPages}`}
            </span>
            <CustomButton
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="text-xs"
            >
              {lang === "bn" ? "পরবর্তী" : "Next"}
            </CustomButton>
          </div>
        </div>
      </CustomCard>
    </div>
  );
}
