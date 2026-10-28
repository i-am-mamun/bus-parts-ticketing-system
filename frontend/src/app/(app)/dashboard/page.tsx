"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Ticket,
  Clock,
  AlertTriangle,
  CheckCircle2,
  CarFront,
  ArrowRight,
  PlusCircle,
  Wrench,
  ArrowRightLeft,
  ClipboardCheck,
  ShieldAlert,
  Calendar,
  Building2,
  Search,
  Eye,
  Check,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { formatBDT, formatDate } from "@/lib/format";
import { hasPermission } from "@/lib/permissions";
import {
  CustomButton,
  CustomCard,
  CustomStatCard,
  CustomBadge,
  CustomModal,
  CustomTextarea,
} from "@/components/custom";

interface SummaryData {
  counts: {
    total: number;
    open: number;
    draft: number;
    pending_approval: number;
    pending_me: number;
    approved_waiting: number;
    in_progress: number;
    completed: number;
    garage_out: number;
    closed: number;
    rejected: number;
    premature: number;
    buses_in_garage: number;
  };
  by_status: Record<string, number>;
  by_type: Record<string, number>;
  pending_me: any[];
  recent: any[];
  daily: { date: string; count: number }[];
  top_buses: { bus_no: string; tickets: number; cost: number | null }[];
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { lang, t } = useLanguage();
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [quickActionModal, setQuickActionModal] = useState<{
    open: boolean;
    ticketId: number | null;
    action: "verify" | "approve" | "final-approve" | null;
    ticketNo: string;
    step: number;
  }>({
    open: false,
    ticketId: null,
    action: null,
    ticketNo: "",
    step: 1,
  });
  const [actionComment, setActionComment] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get<SummaryData>("/api/v1/tickets/summary");
      setData(res);
    } catch (err) {
      console.error("Failed to load dashboard summary:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleQuickApprove = async () => {
    if (!quickActionModal.ticketId || !quickActionModal.action) return;
    try {
      setSubmittingAction(true);
      await api.post(`/api/v1/tickets/${quickActionModal.ticketId}/${quickActionModal.action}`, {
        comment: actionComment.trim() || undefined,
      });
      setQuickActionModal({ open: false, ticketId: null, action: null, ticketNo: "", step: 1 });
      setActionComment("");
      await loadData();
    } catch (err: any) {
      alert("❌ " + (err.message || "Failed to process approval"));
    } finally {
      setSubmittingAction(false);
    }
  };

  const counts = data?.counts || {
    total: 0,
    open: 0,
    draft: 0,
    pending_approval: 0,
    pending_me: 0,
    approved_waiting: 0,
    in_progress: 0,
    completed: 0,
    garage_out: 0,
    closed: 0,
    rejected: 0,
    premature: 0,
    buses_in_garage: 0,
  };

  const canSeeCost = hasPermission(user, "tickets.cost");

  return (
    <div className="space-y-6">
      {/* ── Top Header & Greeting ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-brand-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
              {lang === "bn"
                ? "সৌদিয়া পার্টস টিকেটিং ও বহর পরিচালনা"
                : "Soudia Parts Ticketing & Fleet Operations"}
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-50 text-brand-primary border border-brand-border">
              <Sparkles size={11} /> {lang === "bn" ? "৩-ধাপ ভেরিফিকেশন" : "3-Step Verification"}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {lang === "bn"
              ? "সৌদিয়া পরিবহন — পার্টস রিকুইজিশন, রিপ্লেসমেন্ট ও বাস-টু-বাস ট্রান্সফার ট্র্যাকিং ড্যাশবোর্ড"
              : "Soudia Coach Service — Fleet Parts Requisition, Replacement & Bus Transfer Management"}
          </p>
        </div>

        {/* Quick Create CTA Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
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
          <Link href="/tickets?filter=pending_me">
            <CustomButton
              variant="outline"
              size="sm"
              leftIcon={<Clock size={15} />}
              className="rounded-full bg-white"
            >
              {lang === "bn" ? `অনুমোদনের অপেক্ষায় (${counts.pending_me})` : `My Approvals (${counts.pending_me})`}
            </CustomButton>
          </Link>
        </div>
      </div>

      {/* ── Premature Alert Banner (if any) ── */}
      {counts.premature > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white shadow-2xs">
              <AlertTriangle size={18} />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-amber-900">
                {lang === "bn"
                  ? `${counts.premature} টি পার্টস স্বাভাবিক মেয়াদের আগেই নষ্ট হয়েছে (অকাল নষ্ট পার্টস)`
                  : `${counts.premature} parts worn out before standard lifespan (Premature Wear Alerts)`}
              </p>
              <p className="text-[11px] text-amber-800">
                {lang === "bn"
                  ? "এই পার্টসগুলো প্রত্যাশিত কিমি বা দিনের আগেই পরিবর্তন চাওয়া হয়েছে। কারণ ও ছবি পরীক্ষা করুন।"
                  : "These parts required replacement ahead of expected KM or lifespan. Please review root causes and photos."}
              </p>
            </div>
          </div>
          <Link
            href="/tickets?filter=premature"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 bg-white border border-amber-300 px-3 py-1.5 rounded-md hover:bg-amber-100 transition shrink-0"
          >
            <span>{lang === "bn" ? "সতর্কতা দেখুন" : "Review Alerts"}</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      )}

      {/* ── KPI Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <CustomStatCard
          label={lang === "bn" ? "সর্বমোট টিকিট" : "Total Tickets"}
          subtitle={lang === "bn" ? "সকল টিকিট" : "All ticket entries"}
          value={String(counts.total)}
          icon={Ticket}
          tone="primary"
        />
        <CustomStatCard
          label={lang === "bn" ? "অনুমোদনের অপেক্ষায়" : "Pending Approvals"}
          subtitle={lang === "bn" ? "স্বাক্ষর বাকি" : "Awaiting sign-off"}
          value={String(counts.pending_approval)}
          icon={Clock}
          tone="amber"
        />
        <CustomStatCard
          label={lang === "bn" ? "চলমান কাজ" : "In Progress"}
          subtitle={lang === "bn" ? "মেরামত চলছে" : "In workshop repair"}
          value={String(counts.in_progress)}
          icon={Wrench}
          tone="blue"
        />
        <CustomStatCard
          label={lang === "bn" ? "সম্পন্ন ও রিলিজকৃত" : "Garage Out & Done"}
          subtitle={lang === "bn" ? "গেট পাস সম্পন্ন" : "Gate pass cleared"}
          value={String(counts.garage_out + counts.completed)}
          icon={CheckCircle2}
          tone="green"
        />
        <CustomStatCard
          label={lang === "bn" ? "গ্যারেজে মোট বাস" : "Buses In Garage"}
          subtitle={lang === "bn" ? "বর্তমানে উপস্থিত" : "Currently docked"}
          value={String(counts.buses_in_garage)}
          icon={CarFront}
          tone="violet"
        />
        <CustomStatCard
          label={lang === "bn" ? "অকাল নষ্ট পার্টস" : "Premature Alerts"}
          subtitle={lang === "bn" ? "তদন্ত প্রয়োজন" : "Needs inspection"}
          value={String(counts.premature)}
          icon={AlertTriangle}
          tone="red"
        />
      </div>

      {/* ── Action Grid: Quick Ticket Type Creation ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            title: lang === "bn" ? "নতুন পার্টস রিকুইজিশন" : "Part Request",
            type: "PART_REQUEST",
            icon: Ticket,
            desc: lang === "bn" ? "ডিজিটাল ইনডেন্ট স্লিপ তৈরি" : "Digital Indent Slip",
            color: "text-blue-600 bg-blue-50 border-blue-200",
          },
          {
            title: lang === "bn" ? "পার্টস প্রতিস্থাপন" : "Part Replacement",
            type: "PART_REPLACEMENT",
            icon: Wrench,
            desc: lang === "bn" ? "সমস্যার ছবি ও কারণ বাধ্যতামূলক" : "Defect photos & root cause mandatory",
            color: "text-amber-600 bg-amber-50 border-amber-200",
          },
          {
            title: lang === "bn" ? "বাস থেকে বাসে ট্রান্সফার" : "Bus Transfer",
            type: "PART_TRANSFER",
            icon: ArrowRightLeft,
            desc: lang === "bn" ? "অচল বাস থেকে পার্টস নিয়ে ব্যবহার" : "Re-use working parts from off-road bus",
            color: "text-emerald-600 bg-emerald-50 border-emerald-200",
          },
          {
            title: lang === "bn" ? "গাড়ি রিলিজ ও গেট পাস" : "Vehicle Release",
            type: "VEHICLE_RELEASE",
            icon: ClipboardCheck,
            desc: lang === "bn" ? "ফর্ম ১৮০৪ চেকলিস্ট ও গেট পাস" : "Form 1804 checklist & Gate Pass",
            color: "text-purple-600 bg-purple-50 border-purple-200",
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.type}
              href={`/tickets/new?type=${item.type}`}
              className="group p-3.5 sm:p-4 rounded-xl border border-brand-border/70 bg-white hover:border-brand-primary hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg border ${item.color}`}>
                  <Icon size={18} />
                </div>
                <PlusCircle size={15} className="text-slate-300 group-hover:text-brand-primary transition-colors" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-800 leading-tight group-hover:text-brand-primary transition-colors">
                  {item.title}
                </p>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                  {item.desc}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Pending My Approval Inbox (Prominent Section) ── */}
      <CustomCard
        title={
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-brand-primary" />
            <span>{lang === "bn" ? "আমার অনুমোদনের অপেক্ষায়" : "Pending My Approval"}</span>
          </div>
        }
        subtitle={
          lang === "bn"
            ? "৩-ধাপ ভেরিফিকেশনে আপনার স্বাক্ষরের অপেক্ষায় থাকা টিকিটসমূহ"
            : "Tickets awaiting your verification signature in 3-step workflow"
        }
        actions={
          <Link
            href="/tickets?filter=pending_me"
            className="text-xs font-bold text-brand-primary hover:underline flex items-center gap-1"
          >
            <span>{lang === "bn" ? `সবগুলো দেখুন (${counts.pending_me})` : `View All (${counts.pending_me})`}</span>
            <ArrowRight size={13} />
          </Link>
        }
      >
        {counts.pending_me === 0 ? (
          <div className="py-8 text-center text-slate-400">
            <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2 opacity-80" />
            <p className="text-xs font-semibold text-slate-600">
              {lang === "bn" ? "সবকিছু অনুমোদিত!" : "All Caught Up!"}
            </p>
            <p className="text-[11px] text-slate-400">
              {lang === "bn"
                ? "এই মুহূর্তে আপনার অনুমোদনের অপেক্ষায় কোনো টিকিট নেই।"
                : "No tickets are waiting for your approval right now."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-brand-light text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">{lang === "bn" ? "টিকিট নম্বর" : "Ticket No"}</th>
                  <th className="py-2.5 px-3">{lang === "bn" ? "ধরন" : "Type"}</th>
                  <th className="py-2.5 px-3">{lang === "bn" ? "বাস নম্বর" : "Coach Number"}</th>
                  <th className="py-2.5 px-3">{lang === "bn" ? "আবেদনকারী" : "Requested By"}</th>
                  <th className="py-2.5 px-3">{lang === "bn" ? "বর্তমান ধাপ" : "Current Step"}</th>
                  <th className="py-2.5 px-3">{lang === "bn" ? "অকাল নষ্ট?" : "Premature?"}</th>
                  <th className="py-2.5 px-3 text-right">{lang === "bn" ? "অ্যাকশন" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.pending_me.map((t) => {
                  const step = t.pending_step || 1;
                  const stepAction =
                    step === 1 ? "verify" : step === 2 ? "approve" : "final-approve";
                  const stepLabel =
                    step === 1
                      ? (lang === "bn" ? "যাচাই করুন (ধাপ ১)" : "Verify (Step 1)")
                      : step === 2
                      ? (lang === "bn" ? "অনুমোদন করুন (ধাপ ২)" : "Approve (Step 2)")
                      : (lang === "bn" ? "চূড়ান্ত অনুমোদন (ধাপ ৩)" : "Final Approve (Step 3)");

                  return (
                    <tr key={t.id} className="hover:bg-brand-50/30 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-brand-primary">
                        <Link href={`/tickets/${t.id}`} className="hover:underline">
                          {t.ticket_no}
                        </Link>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-700">
                          {t.type.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {t.bus ? (
                          <div>
                            <span className="font-bold text-slate-800">{t.bus.bus_no}</span>
                            <span className="block text-[10px] text-slate-400 truncate max-w-[140px]">
                              {t.bus.route || "No route"}
                            </span>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {t.created_by_name || "Staff"}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                          {lang === "bn" ? `ধাপ ${step} বাকি` : `Step ${step} Pending`}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {t.is_premature ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            {lang === "bn" ? "অকাল নষ্ট!" : "Early Wear!"}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">
                            {lang === "bn" ? "স্বাভাবিক" : "Normal"}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link href={`/tickets/${t.id}`}>
                            <CustomButton size="xs" variant="outline" className="px-2 py-1 text-[11px]">
                              <Eye size={12} className="mr-1" /> {lang === "bn" ? "দেখুন" : "View"}
                            </CustomButton>
                          </Link>
                          <CustomButton
                            size="xs"
                            variant="primary"
                            onClick={() =>
                              setQuickActionModal({
                                open: true,
                                ticketId: t.id,
                                action: stepAction,
                                ticketNo: t.ticket_no,
                                step,
                              })
                            }
                            className="px-2.5 py-1 text-[11px]"
                          >
                            <Check size={12} className="mr-1" /> {stepLabel}
                          </CustomButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CustomCard>

      {/* ── Charts & Breakdown Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Ticket Trends Line Chart */}
        <CustomCard
          title={lang === "bn" ? "দৈনিক টিকিট কার্যক্রম (গত ১৪ দিন)" : "Daily Activity (Last 14 Days)"}
          subtitle={lang === "bn" ? "গত দুই সপ্তাহের টিকিট তৈরির ট্রেন্ড" : "Ticket volume trend over the last 14 days"}
          icon={Calendar}
        >
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.daily || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => d.slice(5)}
                  tick={{ fontSize: 10, fill: "#64748b" }}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} />
                <Tooltip
                  formatter={(val: any) => [val, lang === "bn" ? "টিকিট সংখ্যা" : "Tickets"]}
                  labelFormatter={(lbl) => `${lang === "bn" ? "তারিখ" : "Date"}: ${lbl}`}
                  contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "11px" }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#ec1e21"
                  strokeWidth={2.5}
                  dot={{ fill: "#ec1e21", r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CustomCard>

        {/* Top Active Buses by Maintenance & Cost */}
        <CustomCard
          title={lang === "bn" ? "শীর্ষ কোচসমূহ (মেরামত ও খরচ)" : "Top Fleet Coaches (Repair & Cost)"}
          subtitle={lang === "bn" ? "সর্বাধিক পার্টস ও মেরামত খরচ হওয়া বাসসমূহ" : "Coaches with highest maintenance tickets & cost"}
          icon={CarFront}
        >
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.top_buses || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="bus_no" tick={{ fontSize: 9, fill: "#64748b" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} />
                <Tooltip
                  formatter={(val: any, name: any) => [
                    name === "cost" ? formatBDT(val) : val,
                    name === "cost" ? (lang === "bn" ? "মোট খরচ" : "Total Cost") : (lang === "bn" ? "টিকিট সংখ্যা" : "Tickets"),
                  ]}
                  contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "11px" }}
                />
                <Bar dataKey="tickets" fill="#2563eb" radius={[4, 4, 0, 0]} name="Tickets" />
                {canSeeCost && (
                  <Bar dataKey="cost" fill="#059669" radius={[4, 4, 0, 0]} name="cost" />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CustomCard>
      </div>

      {/* ── Recent Tickets Table ── */}
      <CustomCard
        title={lang === "bn" ? "সাম্প্রতিক টিকিটসমূহ" : "Recent System Tickets"}
        subtitle={lang === "bn" ? "সর্বশেষ তৈরি হওয়া টিকিটসমূহ ও বর্তমান অবস্থান" : "Recently created tickets and current status"}
        actions={
          <Link
            href="/tickets"
            className="text-xs font-bold text-brand-primary hover:underline flex items-center gap-1"
          >
            <span>{lang === "bn" ? "সকল টিকিট" : "All Tickets"}</span>
            <ArrowRight size={13} />
          </Link>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-brand-light text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">{lang === "bn" ? "টিকিট নম্বর" : "Ticket No"}</th>
                <th className="py-2.5 px-3">{lang === "bn" ? "ধরন" : "Type"}</th>
                <th className="py-2.5 px-3">{lang === "bn" ? "বিবরণ" : "Title"}</th>
                <th className="py-2.5 px-3">{lang === "bn" ? "বাস নম্বর" : "Bus"}</th>
                <th className="py-2.5 px-3">{lang === "bn" ? "অবস্থা" : "Status"}</th>
                <th className="py-2.5 px-3">{lang === "bn" ? "তারিখ" : "Created"}</th>
                {canSeeCost && <th className="py-2.5 px-3 text-right">{lang === "bn" ? "খরচ" : "Cost"}</th>}
                <th className="py-2.5 px-3 text-right">{lang === "bn" ? "অ্যাকশন" : "Action"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.recent?.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-bold text-brand-primary">
                    <Link href={`/tickets/${t.id}`} className="hover:underline">
                      {t.ticket_no}
                    </Link>
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-700">
                    {t.type.replace(/_/g, " ")}
                  </td>
                  <td className="py-2.5 px-3 text-slate-800 font-medium max-w-[200px] truncate">
                    {t.title}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-700">
                    {t.bus?.bus_no || "—"}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9.5px] font-bold ${
                        t.status === "GARAGE_OUT" || t.status === "COMPLETED"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : t.status === "IN_PROGRESS"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : t.status === "REJECTED"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {t.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">{formatDate(t.created_at)}</td>
                  {canSeeCost && (
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">
                      {t.total !== null ? formatBDT(t.total) : "—"}
                    </td>
                  )}
                  <td className="py-2.5 px-3 text-right">
                    <Link href={`/tickets/${t.id}`}>
                      <CustomButton size="xs" variant="outline" className="px-2 py-1 text-[11px]">
                        {lang === "bn" ? "দেখুন" : "Open"}
                      </CustomButton>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CustomCard>

      {/* ── Quick Verification/Approval Modal ── */}
      <CustomModal
        open={quickActionModal.open}
        onClose={() => setQuickActionModal({ open: false, ticketId: null, action: null, ticketNo: "", step: 1 })}
        title={
          lang === "bn"
            ? `টিকিট অনুমোদন: ${quickActionModal.ticketNo}`
            : `Sign-off Ticket: ${quickActionModal.ticketNo}`
        }
        subtitle={
          lang === "bn"
            ? `ধাপ ${quickActionModal.step} ভেরিফিকেশন সাইন-অফ`
            : `Step ${quickActionModal.step} Verification Sign-off`
        }
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <CustomButton
              variant="outline"
              size="sm"
              onClick={() => setQuickActionModal({ open: false, ticketId: null, action: null, ticketNo: "", step: 1 })}
            >
              {lang === "bn" ? "বাতিল" : "Cancel"}
            </CustomButton>
            <CustomButton
              variant="primary"
              size="sm"
              loading={submittingAction}
              onClick={handleQuickApprove}
            >
              {lang === "bn" ? "অনুমোদন নিশ্চিত করুন" : "Confirm Signature"}
            </CustomButton>
          </div>
        }
      >
        <div className="space-y-3 py-1">
          <p className="text-xs text-slate-600">
            {lang === "bn" ? (
              <>
                আপনি <strong>{quickActionModal.ticketNo}</strong> টিকিটের{" "}
                <strong>ধাপ {quickActionModal.step}</strong> অনুমোদন করতে যাচ্ছেন। কোনো মন্তব্য থাকলে নিচে লিখুন:
              </>
            ) : (
              <>
                You are about to sign off <strong>Step {quickActionModal.step}</strong> for ticket{" "}
                <strong>{quickActionModal.ticketNo}</strong>. Enter any remarks below:
              </>
            )}
          </p>
          <CustomTextarea
            label={lang === "bn" ? "ভেরিফিকেশন মন্তব্য (ঐচ্ছিক)" : "Verification Remarks (Optional)"}
            placeholder={
              lang === "bn"
                ? "যেমন: পার্টস ও ডিফেক্ট ছবি পরীক্ষা করা হয়েছে। অনুমোদিত।"
                : "e.g. Physical parts and defect photos inspected. Approved."
            }
            value={actionComment}
            onChange={(e) => setActionComment(e.target.value)}
            rows={3}
          />
        </div>
      </CustomModal>
    </div>
  );
}
