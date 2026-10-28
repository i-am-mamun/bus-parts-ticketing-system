"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Ticket,
  PlusCircle,
  Search,
  Filter,
  Clock,
  Wrench,
  ArrowRightLeft,
  ClipboardCheck,
  AlertTriangle,
  Camera,
  Eye,
  CheckCircle2,
  Calendar,
  X,
  FileText,
  RotateCcw,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { formatBDT, formatDate } from "@/lib/format";
import { hasPermission } from "@/lib/permissions";
import {
  CustomButton,
  CustomInput,
  CustomSelect,
  CustomCard,
  CustomTabs,
  CustomBadge,
} from "@/components/custom";

function TicketsContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { lang, t } = useLanguage();

  const initialFilter = searchParams.get("filter") || "all";
  const initialType = searchParams.get("type") || "";

  const [activeTab, setActiveTab] = useState<string>(initialFilter);
  const [ticketType, setTicketType] = useState<string>(initialType);
  const [priority, setPriority] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [busFilter, setBusFilter] = useState<string>("");
  const [buses, setBuses] = useState<{ id: number; bus_no: string }[]>([]);

  const [tickets, setTickets] = useState<any[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [loading, setLoading] = useState<boolean>(true);

  // Load Buses for filter dropdown
  useEffect(() => {
    api
      .get<{ items: { id: number; bus_no: string }[] }>("/api/v1/fleet/buses?page_size=100")
      .then((res) => setBuses(res.items || []))
      .catch(() => {});
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("page_size", String(pageSize));

      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (ticketType) params.set("type", ticketType);
      if (priority) params.set("priority", priority);
      if (busFilter) params.set("bus_id", busFilter);

      // Handle Tab filtering
      if (activeTab === "pending_me") {
        params.set("pending_me", "true");
      } else if (activeTab === "in_progress") {
        params.set("status", "IN_PROGRESS");
      } else if (activeTab === "completed") {
        params.set("status", "COMPLETED");
      } else if (activeTab === "garage_out") {
        params.set("status", "GARAGE_OUT,CLOSED");
      } else if (activeTab === "rejected") {
        params.set("status", "REJECTED,CANCELLED");
      } else if (activeTab === "premature") {
        // Handled via summary or premature flag
      }

      const res = await api.get<any>(`/api/v1/tickets?${params.toString()}`);
      let list = res.items || [];
      if (activeTab === "premature") {
        list = list.filter((t: any) => t.is_premature);
      }
      setTickets(list);
      setTotal(res.total || 0);
    } catch (err) {
      console.error("Failed fetching tickets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [activeTab, ticketType, priority, busFilter, page, pageSize]);

  const canSeeCost = hasPermission(user, "tickets.cost");

  const tabs = [
    { id: "all", label: lang === "bn" ? "সকল টিকিট" : "All Tickets" },
    { id: "pending_me", label: lang === "bn" ? "অনুমোদনের অপেক্ষায়" : "Pending My Approval", badge: lang === "bn" ? "ইনবক্স" : "Inbox" },
    { id: "in_progress", label: lang === "bn" ? "চলমান" : "In Progress" },
    { id: "completed", label: lang === "bn" ? "সম্পূর্ণ" : "Completed" },
    { id: "garage_out", label: lang === "bn" ? "রিলিজকৃত" : "Garage Out" },
    { id: "premature", label: lang === "bn" ? "অকাল নষ্ট সতর্কতা" : "Premature Alerts" },
    { id: "rejected", label: lang === "bn" ? "বাতিল" : "Rejected" },
  ];

  return (
    <div className="space-y-4">
      {/* ── Top Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-brand-border/60 pb-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Ticket className="text-brand-primary" size={22} />
            <span>{lang === "bn" ? "পার্টস টিকিট রেজিস্ট্রি ও অনুমোদন" : "Tickets Registry & Verification"}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {lang === "bn"
              ? "সৌদিয়া পরিবহন — পার্টস রিকুইজিশন, রিপ্লেসমেন্ট ও বাস-টু-বাস ট্রান্সফার তালিকা"
              : "Soudia Coach Service — Fleet Parts Requisition, Replacement & Bus Transfer Registry"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/tickets/new">
            <CustomButton
              variant="primary"
              size="sm"
              leftIcon={<PlusCircle size={15} />}
              className="rounded-full shadow-brand-button"
            >
              {lang === "bn" ? "নতুন টিকিট তৈরি" : "Raise New Ticket"}
            </CustomButton>
          </Link>
        </div>
      </div>

      {/* ── Tabs Navigation ── */}
      <CustomTabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={(tabId) => {
          setActiveTab(tabId);
          setPage(1);
        }}
        variant="pills"
        themeColor="primary"
      />

      {/* ── Filters Bar ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 p-3 rounded-xl bg-slate-50/80 border border-slate-200">
        <div className="relative">
          <CustomInput
            placeholder={lang === "bn" ? "টিকিট নং, টাইটেল, কর্মী দিয়ে খুঁজুন..." : "Search ticket no, title, creator..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchTickets()}
            leftIcon={<Search size={14} className="text-slate-400" />}
            rounded="sm"
            className="text-xs py-1.5"
          />
        </div>

        <div>
          <CustomSelect
            value={ticketType}
            onChange={(e) => {
              setTicketType(e.target.value);
              setPage(1);
            }}
            options={[
              { value: "", label: lang === "bn" ? "সকল টিকিট ধরন" : "All Ticket Types" },
              { value: "PART_REQUEST", label: lang === "bn" ? "পার্টস রিকুইজিশন (ইনডেন্ট)" : "Part Request (Indent)" },
              { value: "PART_REPLACEMENT", label: lang === "bn" ? "পার্টস প্রতিস্থাপন (ছবিসহ)" : "Part Replacement (Photo)" },
              { value: "PART_TRANSFER", label: lang === "bn" ? "বাস থেকে বাসে ট্রান্সফার" : "Bus-to-Bus Transfer" },
              { value: "WORK_SHEET", label: lang === "bn" ? "ওয়ার্ক শিট (মেরামত)" : "Work Sheet (Repair)" },
              { value: "VEHICLE_RELEASE", label: lang === "bn" ? "গাড়ি রিলিজ (ফর্ম ১৮০৪)" : "Vehicle Release (Form 1804)" },
            ]}
            className="text-xs py-1.5"
          />
        </div>

        <div>
          <CustomSelect
            value={busFilter}
            onChange={(e) => {
              setBusFilter(e.target.value);
              setPage(1);
            }}
            options={[
              { value: "", label: lang === "bn" ? "সকল বাস" : "All Buses" },
              ...buses.map((b) => ({ value: String(b.id), label: b.bus_no })),
            ]}
            className="text-xs py-1.5"
          />
        </div>

        <div>
          <CustomSelect
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              setPage(1);
            }}
            options={[
              { value: "", label: lang === "bn" ? "সকল অগ্রাধিকার" : "All Priorities" },
              { value: "NORMAL", label: lang === "bn" ? "সাধারণ অগ্রাধিকার" : "Normal Priority" },
              { value: "URGENT", label: lang === "bn" ? "জরুরি অগ্রাধিকার" : "Urgent Priority" },
              { value: "EMERGENCY", label: lang === "bn" ? "অতি জরুরি" : "Emergency Priority" },
            ]}
            className="text-xs py-1.5"
          />
        </div>

        <div className="flex items-center gap-2">
          <CustomButton
            variant="outline"
            size="sm"
            onClick={fetchTickets}
            className="w-full text-xs font-semibold"
          >
            {lang === "bn" ? "ফিল্টার" : "Filter"}
          </CustomButton>
          {(searchQuery || ticketType || priority || busFilter) && (
            <button
              onClick={() => {
                setSearchQuery("");
                setTicketType("");
                setPriority("");
                setBusFilter("");
                setPage(1);
              }}
              className="p-2 text-slate-400 hover:text-rose-600 transition"
              title={lang === "bn" ? "ফিল্টার মুছুন" : "Reset Filters"}
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── Tickets Table ── */}
      <CustomCard>
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-border border-t-brand-primary mx-auto mb-2" />
            <p className="text-xs">{lang === "bn" ? "টিকিট লোড হচ্ছে..." : "Loading tickets..."}</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <Ticket size={36} className="mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">
              {lang === "bn" ? "কোনো টিকিট পাওয়া যায়নি" : "No tickets found"}
            </p>
            <p className="text-xs text-slate-400">
              {lang === "bn"
                ? "এই ফিল্টারে কোনো রেকর্ড নেই। ফিল্টার পরিবর্তন করে দেখুন।"
                : "No ticket records match current filters. Try adjusting filter criteria."}
            </p>
            <Link href="/tickets/new" className="inline-block mt-2">
              <CustomButton size="sm" variant="primary">
                {lang === "bn" ? "নতুন টিকিট তৈরি করুন" : "Raise New Ticket"}
              </CustomButton>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-brand-light text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3">{lang === "bn" ? "টিকিট নং" : "Ticket No"}</th>
                  <th className="py-3 px-3">{lang === "bn" ? "ধরন" : "Type"}</th>
                  <th className="py-3 px-3">{lang === "bn" ? "বিবরণ ও পার্টস" : "Title & Parts"}</th>
                  <th className="py-3 px-3">{lang === "bn" ? "বাস নম্বর" : "Coach Number"}</th>
                  <th className="py-3 px-3">{lang === "bn" ? "৩-ধাপ অবস্থা" : "3-Step Status"}</th>
                  <th className="py-3 px-3">{lang === "bn" ? "অগ্রাধিকার" : "Priority"}</th>
                  <th className="py-3 px-3">{lang === "bn" ? "ছবি" : "Images"}</th>
                  {canSeeCost && <th className="py-3 px-3 text-right">{lang === "bn" ? "খরচ" : "Amount"}</th>}
                  <th className="py-3 px-3 text-right">{lang === "bn" ? "অ্যাকশন" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((t) => {
                  const step = t.pending_step;
                  const isDone = t.status === "COMPLETED" || t.status === "GARAGE_OUT" || t.status === "CLOSED";

                  return (
                    <tr key={t.id} className="hover:bg-brand-50/25 transition-colors">
                      {/* Ticket No */}
                      <td className="py-3 px-3 font-mono font-bold text-brand-primary">
                        <Link href={`/tickets/${t.id}`} className="hover:underline">
                          {t.ticket_no}
                        </Link>
                        <span className="block text-[10px] text-slate-400 font-normal">
                          {formatDate(t.created_at)}
                        </span>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.type === "PART_REPLACEMENT"
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : t.type === "PART_TRANSFER"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : t.type === "VEHICLE_RELEASE"
                              ? "bg-purple-50 text-purple-800 border border-purple-200"
                              : "bg-blue-50 text-blue-800 border border-blue-200"
                          }`}
                        >
                          {t.type.replace(/_/g, " ")}
                        </span>
                      </td>

                      {/* Title & Parts summary */}
                      <td className="py-3 px-3 max-w-[240px]">
                        <p className="font-bold text-slate-800 truncate">{t.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-slate-500">
                            {lang === "bn" ? `${t.items_count} টি পার্টস আইটেম` : `${t.items_count} part line(s)`}
                          </span>
                          {t.is_premature && (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              {lang === "bn" ? "অকাল নষ্ট!" : "Early Wear!"}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Bus */}
                      <td className="py-3 px-3">
                        {t.bus ? (
                          <div>
                            <span className="font-bold text-slate-800">{t.bus.bus_no}</span>
                            {t.to_bus && (
                              <span className="block text-[10px] font-semibold text-emerald-700">
                                ➔ {lang === "bn" ? "প্রাপক বাস" : "To"}: {t.to_bus.bus_no}
                              </span>
                            )}
                            <span className="block text-[10px] text-slate-400 truncate max-w-[130px]">
                              {t.bus.route || (lang === "bn" ? "রুট নির্ধারিত নেই" : "No route assigned")}
                            </span>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>

                      {/* 3-Step Verification Status */}
                      <td className="py-3 px-3">
                        {isDone ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                            <CheckCircle2 size={11} />
                            {t.status === "GARAGE_OUT"
                              ? (lang === "bn" ? "গ্যারেজ আউট" : "Garage Out")
                              : (lang === "bn" ? "সম্পূর্ণ" : "Completed")}
                          </span>
                        ) : t.status === "REJECTED" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-300">
                            {lang === "bn" ? "বাতিল" : "Rejected"}
                          </span>
                        ) : t.status === "IN_PROGRESS" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-300">
                            <Wrench size={11} /> {lang === "bn" ? "কাজ চলছে" : "In Progress"}
                          </span>
                        ) : step ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                            {lang === "bn" ? `ধাপ ${step} বাকি` : `Step ${step} Pending`}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            {t.status}
                          </span>
                        )}
                      </td>

                      {/* Priority */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase ${
                            t.priority === "EMERGENCY"
                              ? "bg-rose-100 text-rose-800 border border-rose-300"
                              : t.priority === "URGENT"
                              ? "bg-orange-100 text-orange-800 border border-orange-300"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {t.priority === "EMERGENCY"
                            ? (lang === "bn" ? "অতি জরুরি" : "Emergency")
                            : t.priority === "URGENT"
                            ? (lang === "bn" ? "জরুরি" : "Urgent")
                            : (lang === "bn" ? "সাধারণ" : "Normal")}
                        </span>
                      </td>

                      {/* Photos Count */}
                      <td className="py-3 px-3">
                        {t.images_count > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-primary">
                            <Camera size={13} /> {t.images_count}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-[11px]">0</span>
                        )}
                      </td>

                      {/* Cost */}
                      {canSeeCost && (
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                          {t.total !== null ? formatBDT(t.total) : "—"}
                        </td>
                      )}

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <Link href={`/tickets/${t.id}`}>
                          <CustomButton size="xs" variant="outline" className="px-2.5 py-1 text-[11px]">
                            <Eye size={12} className="mr-1" /> {lang === "bn" ? "দেখুন" : "View"}
                          </CustomButton>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CustomCard>
    </div>
  );
}

export default function TicketsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading tickets registry...</div>}>
      <TicketsContent />
    </Suspense>
  );
}
