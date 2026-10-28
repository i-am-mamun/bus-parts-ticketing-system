"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Ticket as TicketIcon,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRightLeft,
  Wrench,
  ClipboardCheck,
  ShieldAlert,
  Printer,
  FileText,
  Camera,
  Upload,
  Plus,
  ArrowLeft,
  XCircle,
  Building2,
  Calendar,
  DollarSign,
  CarFront,
  Sparkles,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { formatBDT, formatDateTime, formatDate } from "@/lib/format";
import { hasPermission } from "@/lib/permissions";
import { Ticket, TicketAttachment } from "@/lib/types";
import {
  CustomButton,
  CustomCard,
  CustomBadge,
  CustomModal,
  CustomTextarea,
  CustomInput,
} from "@/components/custom";

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const ticketId = resolvedParams.id;
  const router = useRouter();
  const { user } = useAuth();
  const { lang } = useLanguage();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [verifyModal, setVerifyModal] = useState(false);
  const [approveModal, setApproveModal] = useState(false);
  const [finalApproveModal, setFinalApproveModal] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [overrideModal, setOverrideModal] = useState(false);
  const [costModal, setCostModal] = useState(false);
  const [garageOutModal, setGarageOutModal] = useState(false);
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);

  // Action forms
  const [comment, setComment] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [garageOutNote, setGarageOutNote] = useState("");
  const [laborCost, setLaborCost] = useState<string>("0");
  const [otherCost, setOtherCost] = useState<string>("0");
  const [partPrices, setPartPrices] = useState<Record<number, number>>({});
  const [submittingAction, setSubmittingAction] = useState(false);

  const loadTicket = async () => {
    try {
      setLoading(true);
      const res = await api.get<Ticket>(`/api/v1/tickets/${ticketId}`);
      setTicket(res);
      setLaborCost(String(res.labor_cost || 0));
      setOtherCost(String(res.other_cost || 0));
      const prices: Record<number, number> = {};
      res.items?.forEach((i) => {
        prices[i.id] = i.unit_price || 0;
      });
      setPartPrices(prices);
    } catch (err: any) {
      console.error("Failed to load ticket:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTicket();
  }, [ticketId]);

  const handleStepAction = async (endpoint: string, body: any = {}) => {
    try {
      setSubmittingAction(true);
      await api.post(`/api/v1/tickets/${ticketId}/${endpoint}`, body);
      setVerifyModal(false);
      setApproveModal(false);
      setFinalApproveModal(false);
      setRejectModal(false);
      setOverrideModal(false);
      setGarageOutModal(false);
      setComment("");
      setRejectReason("");
      setOverrideReason("");
      await loadTicket();
    } catch (err: any) {
      alert("❌ " + (err.message || (lang === "bn" ? "অ্যাকশন ব্যর্থ হয়েছে" : "Action failed")));
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleSaveCosts = async () => {
    try {
      setSubmittingAction(true);
      await api.put(`/api/v1/tickets/${ticketId}/cost`, {
        labor_cost: Number(laborCost) || 0,
        other_cost: Number(otherCost) || 0,
        unit_prices: partPrices,
      });
      setCostModal(false);
      await loadTicket();
    } catch (err: any) {
      alert("❌ " + (err.message || (lang === "bn" ? "খরচ সংরক্ষণ ব্যর্থ হয়েছে" : "Failed saving costs")));
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleToggleChecklist = async (itemId: number, currentChecked: boolean) => {
    try {
      await api.put(`/api/v1/tickets/${ticketId}/checklist/${itemId}`, {
        checked: !currentChecked,
      });
      await loadTicket();
    } catch (err: any) {
      alert("❌ " + (err.message || (lang === "bn" ? "চেকলিস্ট আপডেট ব্যর্থ হয়েছে" : "Failed updating checklist item")));
    }
  };

  const getStatusLabel = (status: string) => {
    if (lang === "bn") {
      switch (status) {
        case "DRAFT": return "খসড়া";
        case "SUBMITTED": return "দাখিলকৃত (যাচাই বাকি)";
        case "VERIFIED": return "যাচাইকৃত (অনুমোদন বাকি)";
        case "APPROVED": return "অনুমোদিত (ফাইনাল বাকি)";
        case "FINAL_APPROVED": return "চূড়ান্ত অনুমোদিত";
        case "IN_PROGRESS": return "কাজ চলছে";
        case "COMPLETED": return "মেরামত সম্পন্ন";
        case "GARAGE_OUT": return "গাড়ি রিলিজ (গেটপাস সম্পন্ন)";
        case "CLOSED": return "সম্পন্ন";
        case "REJECTED": return "বাতিলকৃত";
        default: return status;
      }
    }
    switch (status) {
      case "DRAFT": return "Draft";
      case "SUBMITTED": return "Submitted (Pending Step 1)";
      case "VERIFIED": return "Verified (Pending Step 2)";
      case "APPROVED": return "Approved (Pending Step 3)";
      case "FINAL_APPROVED": return "Final Approved";
      case "IN_PROGRESS": return "Work In Progress";
      case "COMPLETED": return "Work Completed";
      case "GARAGE_OUT": return "Garage Out (Gate Pass Issued)";
      case "CLOSED": return "Closed";
      case "REJECTED": return "Rejected";
      default: return status.replace(/_/g, " ");
    }
  };

  const getTypeLabel = (type: string) => {
    if (lang === "bn") {
      switch (type) {
        case "PART_REQUISITION": return "পার্টস রিকুইজিশন";
        case "PART_REPLACEMENT": return "পার্টস প্রতিস্থাপন";
        case "PART_TRANSFER": return "বাস ট্রান্সফার";
        case "VEHICLE_RELEASE": return "গাড়ি রিলিজ (ফর্ম ১৮০৪)";
        default: return type;
      }
    }
    switch (type) {
      case "PART_REQUISITION": return "Part Requisition";
      case "PART_REPLACEMENT": return "Part Replacement";
      case "PART_TRANSFER": return "Bus-to-Bus Transfer";
      case "VEHICLE_RELEASE": return "Vehicle Release (Form 1804)";
      default: return type.replace(/_/g, " ");
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-border border-t-brand-primary mx-auto mb-3" />
        <p className="text-xs font-semibold">
          {lang === "bn" ? "টিকিটের তথ্য লোড হচ্ছে..." : "Loading ticket details & approvals..."}
        </p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="py-24 text-center text-slate-500">
        <p className="text-sm font-bold">{lang === "bn" ? "টিকিট পাওয়া যায়নি" : "Ticket not found"}</p>
        <Link href="/tickets" className="text-xs text-brand-primary hover:underline mt-2 inline-block">
          {lang === "bn" ? "টিকিট তালিকায় ফিরে যান" : "Back to Tickets"}
        </Link>
      </div>
    );
  }

  const can = ticket.can || {
    edit: false,
    submit: false,
    delete: false,
    verify: false,
    approve: false,
    final_approve: false,
    reject: false,
    override: false,
    reopen: false,
    cancel: false,
    start: false,
    complete: false,
    garage_out: false,
    close: false,
    cost: false,
    checklist: false,
    attach: false,
    comment: false,
  };

  const canSeeCost = hasPermission(user, "tickets.cost");
  const step1 = ticket.approvals?.find((a) => a.step === 1);
  const step2 = ticket.approvals?.find((a) => a.step === 2);
  const step3 = ticket.approvals?.find((a) => a.step === 3);

  return (
    <div id="printable-slip" className="printable-document space-y-6 pb-16">
      {/* ── Top Header & Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-brand-border/60 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/tickets"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition shrink-0 print:hidden no-print"
            title={lang === "bn" ? "টিকিট তালিকায় ফিরুন" : "Back to Tickets"}
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-lg sm:text-xl font-bold text-brand-primary">
                {ticket.ticket_no}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                {getTypeLabel(ticket.type)}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  ticket.status === "GARAGE_OUT" || ticket.status === "COMPLETED"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-300"
                    : ticket.status === "REJECTED"
                    ? "bg-rose-50 text-rose-700 border border-rose-300"
                    : ticket.status === "IN_PROGRESS"
                    ? "bg-blue-50 text-blue-700 border border-blue-300"
                    : "bg-amber-50 text-amber-800 border border-amber-300"
                }`}
              >
                {getStatusLabel(ticket.status)}
              </span>
              {ticket.is_premature && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                  {lang === "bn" ? "অকাল নষ্ট সতর্কতা!" : "Premature Wear Alert!"}
                </span>
              )}
            </div>
            <h1 className="text-sm sm:text-base font-bold text-slate-800 mt-1">{ticket.title}</h1>
          </div>
        </div>

        {/* Print / Documents Download Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition cursor-pointer print:hidden no-print"
          >
            <Printer size={14} className="text-brand-primary" />
            <span>{lang === "bn" ? "অফিসিয়াল স্লিপ প্রিন্ট" : "Print Official Slip"}</span>
          </button>
          {ticket.gate_pass_no && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-emerald-300 bg-emerald-50 text-xs font-bold text-emerald-800">
              <ClipboardCheck size={14} />
              {lang === "bn" ? `গেটপাস নং #${ticket.gate_pass_no}` : `Gate Pass #${ticket.gate_pass_no}`}
            </span>
          )}
        </div>
      </div>

      {/* ── 3-Step Verification Visual Tracker (The Core Approval Pipeline) ── */}
      <div className="rounded-2xl border border-brand-border bg-white p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-brand-light pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-primary text-white shadow-2xs">
              <Sparkles size={14} />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-800">
                {lang === "bn" ? "৩-ধাপ ভেরিফিকেশন ও অনুমোদন পাইপলাইন" : "3-Step Verification & Approval Pipeline"}
              </h2>
              <p className="text-[11px] text-slate-400">
                {lang === "bn"
                  ? "স্টোর ইনচার্জ ভেরিফিকেশন ➔ ডিপো ম্যানেজার অনুমোদন ➔ অ্যাডমিন ফাইনাল অ্যাপ্রুভাল"
                  : "Store Incharge Verification ➔ Depot Manager Approval ➔ Executive Final Approval"}
              </p>
            </div>
          </div>

          {can.override && (
            <CustomButton
              variant="outline"
              size="xs"
              onClick={() => setOverrideModal(true)}
              className="text-rose-600 border-rose-200 hover:bg-rose-50 font-bold"
            >
              <ShieldAlert size={13} className="mr-1" />
              {lang === "bn" ? "জরুরি অ্যাডমিন ওভাররাইড" : "Emergency Admin Override"}
            </CustomButton>
          )}
        </div>

        {/* 3 Steps Pipeline Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 relative">
          {/* ── Step 1: Store / Garage Incharge ── */}
          <div
            className={`p-3.5 sm:p-4 rounded-xl border flex flex-col justify-between transition-all overflow-hidden ${
              step1?.status === "DONE"
                ? "bg-emerald-50/60 border-emerald-300"
                : step1?.status === "REJECTED"
                ? "bg-rose-50/60 border-rose-300"
                : ticket.status === "SUBMITTED"
                ? "bg-amber-50/70 border-amber-400 ring-2 ring-amber-200"
                : "bg-slate-50/60 border-slate-200"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {lang === "bn" ? "ধাপ ১" : "Step 1"}
                </span>
                {step1?.status === "DONE" ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                    <CheckCircle2 size={13} /> {lang === "bn" ? "যাচাইকৃত" : "Verified"}
                  </span>
                ) : ticket.status === "SUBMITTED" ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700">
                    <Clock size={13} className="animate-spin" /> {lang === "bn" ? "অপেক্ষমান" : "Pending"}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">{lang === "bn" ? "অপেক্ষায়" : "Waiting"}</span>
                )}
              </div>
              <h3 className="text-xs font-bold text-slate-800">
                {lang === "bn" ? "স্টোর ইনচার্জ" : "Store Incharge"}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {lang === "bn" ? "শারীরিক পরীক্ষা ও ছবি যাচাইকরণ" : "Physical inspection & photo verification"}
              </p>

              {step1?.status === "DONE" && (
                <div className="mt-3 p-2 bg-white rounded border border-emerald-200 text-[11px] text-slate-700 space-y-0.5">
                  <p className="font-semibold text-emerald-800">
                    {lang === "bn" ? `স্বাক্ষর: ${step1.user_name}` : `Signed: ${step1.user_name}`}
                  </p>
                  <p className="text-[10px] text-slate-400">{formatDateTime(step1.acted_at)}</p>
                  {step1.comment && <p className="italic text-slate-600 mt-1">&ldquo;{step1.comment}&rdquo;</p>}
                </div>
              )}
            </div>

            {(can.verify || (ticket.status === "SUBMITTED" && can.reject)) && (
              <div className="mt-4 pt-2 border-t border-amber-200/80 flex items-center gap-2">
                {can.verify && (
                  <CustomButton
                    size="xs"
                    variant="primary"
                    onClick={() => setVerifyModal(true)}
                    className="flex-1 text-xs font-bold py-1.5 justify-center shadow-xs"
                  >
                    {lang === "bn" ? "যাচাই করুন" : "Verify Now"}
                  </CustomButton>
                )}
                {can.reject && (
                  <CustomButton
                    size="xs"
                    variant="outline"
                    onClick={() => setRejectModal(true)}
                    className="shrink-0 text-xs font-bold py-1.5 px-3 text-rose-600 border border-rose-300 hover:bg-rose-50 hover:border-rose-400 rounded-lg transition"
                  >
                    <XCircle size={12} className="mr-1 text-rose-500" />
                    {lang === "bn" ? "বাতিল" : "Reject"}
                  </CustomButton>
                )}
              </div>
            )}
          </div>

          {/* ── Step 2: Operations / Depot Manager ── */}
          <div
            className={`p-3.5 sm:p-4 rounded-xl border flex flex-col justify-between transition-all overflow-hidden ${
              step2?.status === "DONE"
                ? "bg-emerald-50/60 border-emerald-300"
                : step2?.status === "REJECTED"
                ? "bg-rose-50/60 border-rose-300"
                : ticket.status === "VERIFIED"
                ? "bg-amber-50/70 border-amber-400 ring-2 ring-amber-200"
                : "bg-slate-50/60 border-slate-200"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {lang === "bn" ? "ধাপ ২" : "Step 2"}
                </span>
                {step2?.status === "DONE" ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                    <CheckCircle2 size={13} /> {lang === "bn" ? "অনুমোদিত" : "Approved"}
                  </span>
                ) : ticket.status === "VERIFIED" ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700">
                    <Clock size={13} className="animate-spin" /> {lang === "bn" ? "অপেক্ষমান" : "Pending"}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">{lang === "bn" ? "অপেক্ষায়" : "Waiting"}</span>
                )}
              </div>
              <h3 className="text-xs font-bold text-slate-800">
                {lang === "bn" ? "ডিপো ম্যানেজার" : "Depot Operations Manager"}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {lang === "bn" ? "ম্যানেজার অনুমোদন ও বাজেট ছাড়" : "Manager approval & budget clearance"}
              </p>

              {step2?.status === "DONE" && (
                <div className="mt-3 p-2 bg-white rounded border border-emerald-200 text-[11px] text-slate-700 space-y-0.5">
                  <p className="font-semibold text-emerald-800">
                    {lang === "bn" ? `স্বাক্ষর: ${step2.user_name}` : `Signed: ${step2.user_name}`}
                  </p>
                  <p className="text-[10px] text-slate-400">{formatDateTime(step2.acted_at)}</p>
                  {step2.comment && <p className="italic text-slate-600 mt-1">&ldquo;{step2.comment}&rdquo;</p>}
                </div>
              )}
            </div>

            {(can.approve || (ticket.status === "VERIFIED" && can.reject)) && (
              <div className="mt-4 pt-2 border-t border-amber-200/80 flex items-center gap-2">
                {can.approve && (
                  <CustomButton
                    size="xs"
                    variant="primary"
                    onClick={() => setApproveModal(true)}
                    className="flex-1 text-xs font-bold py-1.5 justify-center shadow-xs"
                  >
                    {lang === "bn" ? "অনুমোদন দিন" : "Approve"}
                  </CustomButton>
                )}
                {can.reject && (
                  <CustomButton
                    size="xs"
                    variant="outline"
                    onClick={() => setRejectModal(true)}
                    className="shrink-0 text-xs font-bold py-1.5 px-3 text-rose-600 border border-rose-300 hover:bg-rose-50 hover:border-rose-400 rounded-lg transition"
                  >
                    <XCircle size={12} className="mr-1 text-rose-500" />
                    {lang === "bn" ? "বাতিল" : "Reject"}
                  </CustomButton>
                )}
              </div>
            )}
          </div>

          {/* ── Step 3: Executive Admin Final Approval ── */}
          <div
            className={`p-3.5 sm:p-4 rounded-xl border flex flex-col justify-between transition-all overflow-hidden ${
              step3?.status === "DONE"
                ? "bg-emerald-50/60 border-emerald-300"
                : step3?.status === "REJECTED"
                ? "bg-rose-50/60 border-rose-300"
                : ticket.status === "APPROVED"
                ? "bg-amber-50/70 border-amber-400 ring-2 ring-amber-200"
                : "bg-slate-50/60 border-slate-200"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {lang === "bn" ? "ধাপ ৩" : "Step 3"}
                </span>
                {step3?.status === "DONE" ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                    <CheckCircle2 size={13} /> {lang === "bn" ? "চূড়ান্ত অনুমোদিত" : "Final Approved"}
                  </span>
                ) : ticket.status === "APPROVED" ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700">
                    <Clock size={13} className="animate-spin" /> {lang === "bn" ? "অপেক্ষমান" : "Pending"}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">{lang === "bn" ? "অপেক্ষায়" : "Waiting"}</span>
                )}
              </div>
              <h3 className="text-xs font-bold text-slate-800">
                {lang === "bn" ? "নির্বাহী প্রশাসক" : "Executive Administrator"}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {lang === "bn" ? "চূড়ান্ত অনুমোদন ও কাজ শুরুর অনুমতি" : "Final authorization & garage work release"}
              </p>

              {step3?.status === "DONE" && (
                <div className="mt-3 p-2 bg-white rounded border border-emerald-200 text-[11px] text-slate-700 space-y-0.5">
                  <p className="font-semibold text-emerald-800">
                    {lang === "bn" ? `স্বাক্ষর: ${step3.user_name}` : `Signed: ${step3.user_name}`}
                  </p>
                  <p className="text-[10px] text-slate-400">{formatDateTime(step3.acted_at)}</p>
                  {step3.comment && <p className="italic text-slate-600 mt-1">&ldquo;{step3.comment}&rdquo;</p>}
                </div>
              )}
            </div>

            {(can.final_approve || (ticket.status === "APPROVED" && can.reject)) && (
              <div className="mt-4 pt-2 border-t border-amber-200/80 flex items-center gap-2">
                {can.final_approve && (
                  <CustomButton
                    size="xs"
                    variant="primary"
                    onClick={() => setFinalApproveModal(true)}
                    className="flex-1 text-xs font-bold py-1.5 justify-center shadow-xs"
                  >
                    {lang === "bn" ? "চূড়ান্ত অনুমোদন" : "Final Approve"}
                  </CustomButton>
                )}
                {can.reject && (
                  <CustomButton
                    size="xs"
                    variant="outline"
                    onClick={() => setRejectModal(true)}
                    className="shrink-0 text-xs font-bold py-1.5 px-3 text-rose-600 border border-rose-300 hover:bg-rose-50 hover:border-rose-400 rounded-lg transition"
                  >
                    <XCircle size={12} className="mr-1 text-rose-500" />
                    {lang === "bn" ? "বাতিল" : "Reject"}
                  </CustomButton>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action bar for Work in Progress / Complete / Garage Out */}
        <div className="flex items-center justify-between flex-wrap gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            {can.submit && (
              <CustomButton
                size="sm"
                variant="primary"
                onClick={() => handleStepAction("submit")}
                className="font-bold shadow-brand-button"
              >
                {lang === "bn" ? "ভেরিফিকেশনের জন্য জমা দিন" : "Submit for 3-Step Verification"}
              </CustomButton>
            )}
            {can.start && (
              <CustomButton
                size="sm"
                variant="primary"
                onClick={() => handleStepAction("start")}
                className="font-bold"
              >
                <Wrench size={14} className="mr-1.5" />
                {lang === "bn" ? "গ্যারেজে কাজ শুরু করুন" : "Start Garage Work"}
              </CustomButton>
            )}
            {can.complete && (
              <CustomButton
                size="sm"
                variant="primary"
                onClick={() => handleStepAction("complete")}
                className="font-bold bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle2 size={14} className="mr-1.5" />
                {lang === "bn" ? "মেরামত সম্পন্ন করুন" : "Complete Maintenance"}
              </CustomButton>
            )}
            {can.garage_out && (
              <CustomButton
                size="sm"
                variant="primary"
                onClick={() => setGarageOutModal(true)}
                className="font-bold bg-purple-600 hover:bg-purple-700 shadow-md"
              >
                <ClipboardCheck size={14} className="mr-1.5" />
                {lang === "bn" ? "গাড়ি রিলিজ ও গেটপাস প্রদান" : "Garage Out & Issue Gate Pass"}
              </CustomButton>
            )}
            {can.close && (
              <CustomButton
                size="sm"
                variant="outline"
                onClick={() => handleStepAction("close")}
              >
                {lang === "bn" ? "টিকিট সমাপ্ত করুন" : "Close Ticket"}
              </CustomButton>
            )}
          </div>

          {can.cost && (
            <CustomButton
              size="sm"
              variant="outline"
              onClick={() => setCostModal(true)}
              className="text-xs font-bold text-slate-700"
            >
              <DollarSign size={14} className="mr-1 text-emerald-600" />
              {lang === "bn" ? "পার্টসের মূল্য ও খরচ নির্ধারণ" : "Enter / Edit Part Costs & Invoice"}
            </CustomButton>
          )}
        </div>
      </div>

      {/* ── Problem Photos Gallery (Direct Garage Camera Uploads) ── */}
      <CustomCard
        title={
          <div className="flex items-center gap-2">
            <Camera size={18} className="text-brand-primary" />
            <span>{lang === "bn" ? "সমস্যার ছবিসমূহ ও সংযুক্তি" : "Defect Photos & Attachments"}</span>
            <span className="text-xs text-slate-400 font-normal">
              ({ticket.attachments?.length || 0} {lang === "bn" ? "টি ছবি" : "files"})
            </span>
          </div>
        }
        subtitle={
          lang === "bn"
            ? "নষ্ট হওয়া পার্টসের ছবি (মোবাইল ক্যামেরা থেকে সরাসরি আপলোড করা)"
            : "Defective parts photos captured directly from garage mobile cameras"
        }
      >
        {ticket.attachments?.length === 0 ? (
          <div className="py-8 text-center text-slate-400">
            <Camera size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-xs">{lang === "bn" ? "কোনো ছবি সংযুক্ত করা হয়নি" : "No photos attached"}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {ticket.attachments?.map((a) => (
              <div
                key={a.id}
                onClick={() => a.is_image && setImageModalUrl(a.url)}
                className="group relative rounded-xl border border-slate-200 overflow-hidden bg-slate-50 cursor-pointer shadow-2xs hover:shadow-md transition-all"
              >
                {a.is_image ? (
                  <img
                    src={a.url}
                    alt={a.name}
                    className="h-28 w-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="h-28 w-full flex flex-col items-center justify-center p-2 text-center text-slate-600">
                    <FileText size={24} className="text-brand-primary mb-1" />
                    <span className="text-[10px] font-bold truncate max-w-full">{a.name}</span>
                  </div>
                )}
                <div className="p-1.5 bg-white text-[10px] text-slate-600 truncate border-t border-slate-100 flex items-center justify-between">
                  <span className="truncate">{a.name}</span>
                  <ExternalLink size={10} className="text-slate-400 shrink-0 ml-1" />
                </div>
              </div>
            ))}
          </div>
        )}
      </CustomCard>

      {/* ── Details & Bus-to-Bus Transfer Card ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vehicle Information */}
        <CustomCard
          title={lang === "bn" ? "কোচের তথ্য" : "Coach & Vehicle Information"}
          icon={CarFront}
        >
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">{lang === "bn" ? "বাস নম্বর:" : "Coach Number:"}</span>
              <span className="font-bold text-slate-800">{ticket.bus?.bus_no || "—"}</span>
            </div>
            {ticket.to_bus && (
              <div className="flex justify-between py-1 border-b border-slate-100 bg-emerald-50/70 p-2 rounded">
                <span className="font-bold text-emerald-800">
                  {lang === "bn" ? "গন্তব্য বাস (বাস বি):" : "Destination Bus (Bus B):"}
                </span>
                <span className="font-bold text-emerald-800">{ticket.to_bus.bus_no}</span>
              </div>
            )}
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">{lang === "bn" ? "রুট:" : "Route:"}</span>
              <span className="font-semibold text-slate-700">{ticket.route || ticket.bus?.route || "—"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">{lang === "bn" ? "বর্তমান ওডোমিটার:" : "Current Odometer:"}</span>
              <span className="font-mono font-bold text-slate-700">
                {ticket.odometer_km?.toLocaleString() || ticket.bus?.odometer_km?.toLocaleString() || "—"} KM
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">{lang === "bn" ? "অপারেটিং ডিপো:" : "Operating Depot:"}</span>
              <span className="font-semibold text-slate-700">{ticket.branch?.name || "Central Depot"}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">{lang === "bn" ? "চালকের নাম:" : "Driver Name:"}</span>
              <span className="font-semibold text-slate-700">{ticket.driver_name || "—"}</span>
            </div>
          </div>
        </CustomCard>

        {/* Reason / Premature Failure Breakdown */}
        <CustomCard
          title={lang === "bn" ? "কারণ ও অকাল নষ্ট বিশ্লেষণ" : "Reason & Failure Analysis"}
          icon={AlertTriangle}
        >
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">{lang === "bn" ? "কারণের বিভাগ:" : "Reason Category:"}</span>
              <span className="font-bold text-brand-primary">
                {ticket.reason_category?.replace(/_/g, " ") || (lang === "bn" ? "নিয়মিত রক্ষণাবেক্ষণ" : "Standard Maintenance")}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">{lang === "bn" ? "সময়ের পূর্বেই নষ্ট:" : "Premature Wear Detected:"}</span>
              <span className="font-bold text-slate-800">
                {lang === "bn"
                  ? ticket.is_premature ? "⚠️ হ্যাঁ (সময়ের পূর্বেই বিনষ্ট)" : "না (স্বাভাবিক মেয়াদ)"
                  : ticket.is_premature ? "⚠️ Yes (Premature Failure)" : "No (Normal Wear)"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block mb-1">
                {lang === "bn" ? "বিস্তারিত কারণ ও ব্যাখ্যা:" : "Reason & Failure Explanation:"}
              </span>
              <p className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 italic">
                {ticket.reason_text || (lang === "bn" ? "কোনো বিশেষ কারণ উল্লেখ করা হয়নি" : "No detailed notes provided.")}
              </p>
            </div>
          </div>
        </CustomCard>
      </div>

      {/* ── Form 1804 Release Checklist (If Vehicle Release ticket) ── */}
      {ticket.type === "VEHICLE_RELEASE" && (
        <CustomCard
          title={
            <div className="flex items-center gap-2">
              <ClipboardCheck size={18} className="text-purple-600" />
              <span>
                {lang === "bn"
                  ? "ফর্ম ১৮০৪: প্রস্থান-পূর্ব নিরাপত্তা চেকলিস্ট"
                  : "Form 1804: Pre-Departure Safety Checklist"}
              </span>
            </div>
          }
          subtitle={
            lang === "bn"
              ? "গ্যারেজ থেকে বের হওয়ার পূর্বে প্রতিটি কারিগরি পয়েন্ট যাচাই করুন"
              : "Verify all mechanical safety checkpoints before issuing garage release"
          }
        >
          <div className="divide-y divide-slate-100">
            {ticket.checklist?.map((item) => (
              <label
                key={item.id}
                className="flex items-center justify-between py-2.5 px-3 hover:bg-slate-50 cursor-pointer rounded-md transition"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    disabled={!can.checklist}
                    onChange={() => handleToggleChecklist(item.id, item.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary cursor-pointer"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      {lang === "bn" && item.label_bn ? item.label_bn : item.label}
                    </p>
                    {lang !== "bn" && item.label_bn && (
                      <p className="text-[11px] text-slate-400">{item.label_bn}</p>
                    )}
                  </div>
                </div>
                {item.checked && (
                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {lang === "bn"
                      ? `যাচাইকারী: ${item.checked_by || "স্টোরকিপার"}`
                      : `Checked by ${item.checked_by || "Storekeeper"}`}
                  </span>
                )}
              </label>
            ))}
          </div>
        </CustomCard>
      )}

      {/* ── Spare Parts Required Table ── */}
      <CustomCard
        title={lang === "bn" ? "প্রয়োজনীয় পার্টসের তালিকা" : "Required Spare Parts Line Items"}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-brand-light text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">{lang === "bn" ? "পার্টসের নাম" : "Part Name"}</th>
                <th className="py-2.5 px-3">{lang === "bn" ? "পার্ট নং" : "Part No"}</th>
                <th className="py-2.5 px-3">{lang === "bn" ? "পরিমাণ" : "Qty"}</th>
                <th className="py-2.5 px-3">{lang === "bn" ? "পূর্ববর্তী পরিবর্তন" : "Last Replaced (KM)"}</th>
                <th className="py-2.5 px-3">{lang === "bn" ? "ব্যবহৃত কিমি" : "Used KM"}</th>
                {canSeeCost && (
                  <th className="py-2.5 px-3 text-right">{lang === "bn" ? "একক দর" : "Unit Price"}</th>
                )}
                {canSeeCost && (
                  <th className="py-2.5 px-3 text-right">{lang === "bn" ? "মোট টাকা" : "Line Total"}</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ticket.items?.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 text-slate-400">{idx + 1}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-800">
                    {item.part_name}
                    {item.is_premature && (
                      <span className="ml-2 text-[9.5px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                        {lang === "bn" ? "অকাল নষ্ট!" : "Premature!"}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-500">{item.part_no || "—"}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-700">
                    {item.qty} {item.unit}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {item.last_replaced_on ? (
                      <span>
                        {item.last_replaced_on} ({item.last_replaced_km?.toLocaleString()} km)
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    {item.used_km ? (
                      <span className="font-semibold text-slate-800">
                        {item.used_km.toLocaleString()} km
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  {canSeeCost && (
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {formatBDT(item.unit_price)}
                    </td>
                  )}
                  {canSeeCost && (
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                      {formatBDT(item.line_total)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            {canSeeCost && (
              <tfoot className="bg-slate-50/70 border-t border-slate-200 font-bold text-xs">
                <tr>
                  <td colSpan={6} className="py-2 px-3 text-right text-slate-600">
                    {lang === "bn" ? "পার্টসের উপমোট:" : "Parts Subtotal:"}
                  </td>
                  <td colSpan={2} className="py-2 px-3 text-right font-mono text-slate-800">
                    {formatBDT(ticket.items_total)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={6} className="py-1 px-3 text-right text-slate-600 font-normal">
                    {lang === "bn" ? "ওয়ার্কশপ মজুরি:" : "Labor & Workshop Cost:"}
                  </td>
                  <td colSpan={2} className="py-1 px-3 text-right font-mono text-slate-700 font-normal">
                    {formatBDT(ticket.labor_cost)}
                  </td>
                </tr>
                {ticket.other_cost ? (
                  <tr>
                    <td colSpan={6} className="py-1 px-3 text-right text-slate-600 font-normal">
                      {lang === "bn" ? "অন্যান্য খরচ:" : "Other Charges:"}
                    </td>
                    <td colSpan={2} className="py-1 px-3 text-right font-mono text-slate-700 font-normal">
                      {formatBDT(ticket.other_cost)}
                    </td>
                  </tr>
                ) : null}
                <tr className="border-t border-slate-300 text-sm text-brand-primary">
                  <td colSpan={6} className="py-2.5 px-3 text-right font-bold">
                    {lang === "bn" ? "সর্বমোট খরচ:" : "Grand Total Cost:"}
                  </td>
                  <td colSpan={2} className="py-2.5 px-3 text-right font-mono font-bold">
                    {formatBDT(ticket.total)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </CustomCard>

      {/* ── Audit Timeline & Events ── */}
      <CustomCard
        title={lang === "bn" ? "অডিট লগ ও ভেরিফিকেশন ইতিহাস" : "Audit Trail & Verification History"}
      >
        <div className="space-y-3">
          {ticket.events?.map((ev, idx) => (
            <div key={ev.id} className="flex items-start gap-3 text-xs">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 font-bold text-[10px]">
                {idx + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">{ev.event.replace(/_/g, " ")}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {formatDateTime(ev.created_at)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">{ev.detail || "No details"}</p>
                {ev.user_name && (
                  <p className="text-[10px] text-brand-primary font-semibold">
                    {lang === "bn" ? `ব্যবহারকারী: ${ev.user_name}` : `User: ${ev.user_name}`}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CustomCard>

      {/* ── Modals: Verify / Approve / Final / Reject / Override / Costs ── */}
      {/* Verify Modal */}
      <CustomModal
        open={verifyModal}
        onClose={() => setVerifyModal(false)}
        title={
          lang === "bn"
            ? "ধাপ ১: স্টোর ইনচার্জ ভেরিফিকেশন"
            : "Step 1: Store Incharge Verification"
        }
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <CustomButton variant="outline" size="sm" onClick={() => setVerifyModal(false)}>
              {lang === "bn" ? "বাতিল" : "Cancel"}
            </CustomButton>
            <CustomButton
              variant="primary"
              size="sm"
              loading={submittingAction}
              onClick={() => handleStepAction("verify", { comment })}
            >
              {lang === "bn" ? "ভেরিফিকেশন নিশ্চিত করুন" : "Confirm Step 1 Verification"}
            </CustomButton>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            {lang === "bn"
              ? "আপনি নিশ্চিত করছেন যে পার্টস ও সমস্যার ছবি শারীরিকভাবে পরীক্ষা করা হয়েছে।"
              : "Confirm that physical spare parts and defective photos have been inspected."}
          </p>
          <CustomTextarea
            label={lang === "bn" ? "ভেরিফিকেশন মন্তব্য" : "Verification Notes"}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={
              lang === "bn"
                ? "যেমন: পার্টস পরীক্ষা করে ত্রুটি নিশ্চিত করা হয়েছে।"
                : "e.g. Physical parts and defect photos inspected. Approved."
            }
          />
        </div>
      </CustomModal>

      {/* Approve Modal */}
      <CustomModal
        open={approveModal}
        onClose={() => setApproveModal(false)}
        title={
          lang === "bn"
            ? "ধাপ ২: ডিপো ম্যানেজার অনুমোদন"
            : "Step 2: Depot Manager Approval"
        }
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <CustomButton variant="outline" size="sm" onClick={() => setApproveModal(false)}>
              {lang === "bn" ? "বাতিল" : "Cancel"}
            </CustomButton>
            <CustomButton
              variant="primary"
              size="sm"
              loading={submittingAction}
              onClick={() => handleStepAction("approve", { comment })}
            >
              {lang === "bn" ? "অনুমোদন নিশ্চিত করুন" : "Confirm Step 2 Approval"}
            </CustomButton>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            {lang === "bn"
              ? "ডিপো ম্যানেজার হিসেবে এই টিকিটের কাজ ও বাজেটের অনুমোদন প্রদান করুন।"
              : "Authorize workshop maintenance scope and allocated budget."}
          </p>
          <CustomTextarea
            label={lang === "bn" ? "অনুমোদন মন্তব্য" : "Approval Comments"}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={
              lang === "bn"
                ? "যেমন: বাজেট অনুমোদিত, কাজ শুরু করা যেতে পারে।"
                : "e.g. Budget approved for replacement."
            }
          />
        </div>
      </CustomModal>

      {/* Final Approve Modal */}
      <CustomModal
        open={finalApproveModal}
        onClose={() => setFinalApproveModal(false)}
        title={
          lang === "bn"
            ? "ধাপ ৩: নির্বাহী প্রশাসক চূড়ান্ত অনুমোদন"
            : "Step 3: Executive Administrator Final Approval"
        }
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <CustomButton variant="outline" size="sm" onClick={() => setFinalApproveModal(false)}>
              {lang === "bn" ? "বাতিল" : "Cancel"}
            </CustomButton>
            <CustomButton
              variant="primary"
              size="sm"
              loading={submittingAction}
              onClick={() => handleStepAction("final-approve", { comment })}
            >
              {lang === "bn" ? "চূড়ান্ত অনুমোদন নিশ্চিত করুন" : "Confirm Step 3 Final Approval"}
            </CustomButton>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            {lang === "bn"
              ? "চূড়ান্ত অনুমোদন প্রদান করলে মেকানিকরা গ্যারেজে এই বাসের কাজ শুরু করতে পারবে।"
              : "Granting final sign-off allows mechanics to draw parts and commence repair work."}
          </p>
          <CustomTextarea
            label={lang === "bn" ? "চূড়ান্ত মন্তব্য" : "Final Approval Notes"}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={
              lang === "bn"
                ? "যেমন: চূড়ান্ত অনুমোদন দেওয়া হলো।"
                : "e.g. Final authorization granted."
            }
          />
        </div>
      </CustomModal>

      {/* Reject Modal */}
      <CustomModal
        open={rejectModal}
        onClose={() => setRejectModal(false)}
        title={lang === "bn" ? "টিকিট বাতিল করুন" : "Reject Ticket"}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <CustomButton variant="outline" size="sm" onClick={() => setRejectModal(false)}>
              {lang === "bn" ? "বন্ধ" : "Cancel"}
            </CustomButton>
            <CustomButton
              variant="danger"
              size="sm"
              loading={submittingAction}
              onClick={() => handleStepAction("reject", { reason: rejectReason })}
            >
              {lang === "bn" ? "বাতিল নিশ্চিত করুন" : "Confirm Rejection"}
            </CustomButton>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-rose-700 font-semibold">
            {lang === "bn"
              ? "বাতিল করার কারণ উল্লেখ করা বাধ্যতামূলক। আবেদনকারী এই কারণ দেখতে পাবেন।"
              : "Specifying the rejection rationale is mandatory and will be visible to the requester."}
          </p>
          <CustomTextarea
            label={lang === "bn" ? "বাতিল করার কারণ *" : "Reason for Rejection *"}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder={
              lang === "bn"
                ? "টিকিটটি কেন বাতিল করা হলো তা ব্যাখ্যা করুন..."
                : "Write why this ticket cannot be approved..."
            }
            required
          />
        </div>
      </CustomModal>

      {/* Emergency Override Modal */}
      <CustomModal
        open={overrideModal}
        onClose={() => setOverrideModal(false)}
        title={lang === "bn" ? "জরুরি অ্যাডমিন ওভাররাইড" : "Emergency Admin Override"}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <CustomButton variant="outline" size="sm" onClick={() => setOverrideModal(false)}>
              {lang === "bn" ? "বাতিল" : "Cancel"}
            </CustomButton>
            <CustomButton
              variant="danger"
              size="sm"
              loading={submittingAction}
              onClick={() => handleStepAction("override", { reason: overrideReason })}
            >
              {lang === "bn" ? "ওভাররাইড প্রয়োগ করুন" : "Apply Emergency Override"}
            </CustomButton>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            {lang === "bn"
              ? "জরুরি পরিস্থিতিতে সরাসরি বাকি ধাপগুলো বাইপাস করে ফাইনাল অনুমোদন দেওয়া হচ্ছে। কারণ বিস্তারিত লিখুন।"
              : "Bypasses remaining approval stages for highway breakdowns or emergencies. Logged in audit trail."}
          </p>
          <CustomTextarea
            label={lang === "bn" ? "জরুরি ওভাররাইডের কারণ *" : "Override Justification Reason *"}
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            placeholder={
              lang === "bn"
                ? "যেমন: হাইওয়েতে ভিআইপি কোচের আকস্মিক ত্রুটি — তাৎক্ষণিক রিপ্লেসমেন্ট আবশ্যক।"
                : "e.g. VIP express breakdown on highway — immediate replacement authorized."
            }
            required
          />
        </div>
      </CustomModal>

      {/* Garage Out Modal */}
      <CustomModal
        open={garageOutModal}
        onClose={() => setGarageOutModal(false)}
        title={lang === "bn" ? "গাড়ি রিলিজ ও গেটপাস প্রদান" : "Garage Out & Issue Gate Pass"}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <CustomButton variant="outline" size="sm" onClick={() => setGarageOutModal(false)}>
              {lang === "bn" ? "বাতিল" : "Cancel"}
            </CustomButton>
            <CustomButton
              variant="primary"
              size="sm"
              loading={submittingAction}
              onClick={() => handleStepAction("garage-out", { note: garageOutNote })}
            >
              {lang === "bn" ? "গেটপাস ইস্যু ও রিলিজ করুন" : "Issue Gate Pass & Release"}
            </CustomButton>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            {lang === "bn"
              ? "গাড়িটি গ্যারেজ থেকে বের হওয়ার জন্য অনুমোদিত হবে এবং অফিসিয়াল গেটপাস ইস্যু হবে।"
              : "Coach will be flagged ready for road operation and an official Gate Pass serial will be minted."}
          </p>
          <CustomInput
            label={lang === "bn" ? "গেটপাস সংক্রান্ত মন্তব্য" : "Gate Pass Remarks"}
            placeholder={
              lang === "bn"
                ? "যেমন: সকল চেকলিস্ট সম্পন্ন। হাইওয়ে চলার উপযোগী।"
                : "e.g. All checks cleared. Ready for highway."
            }
            value={garageOutNote}
            onChange={(e) => setGarageOutNote(e.target.value)}
          />
        </div>
      </CustomModal>

      {/* Cost Entry Modal */}
      <CustomModal
        open={costModal}
        onClose={() => setCostModal(false)}
        title={
          lang === "bn"
            ? "পার্টসের একক দর ও ওয়ার্কশপ মজুরি নির্ধারণ"
            : "Enter Part Unit Prices & Labor Charges"
        }
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <CustomButton variant="outline" size="sm" onClick={() => setCostModal(false)}>
              {lang === "bn" ? "বাতিল" : "Cancel"}
            </CustomButton>
            <CustomButton
              variant="primary"
              size="sm"
              loading={submittingAction}
              onClick={handleSaveCosts}
            >
              {lang === "bn" ? "খরচ সংরক্ষণ করুন" : "Save Costs & Invoice"}
            </CustomButton>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            {lang === "bn"
              ? "ইনভেন্টরি সিস্টেম ব্যতিরেকে প্রতিটি পার্টসের বিলিং দর ও মজুরি হাতে বসাতে হবে।"
              : "Enter purchasing unit cost and labor charges to update ticket maintenance ledger."}
          </p>
          <div className="space-y-2">
            {ticket.items?.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 p-2 bg-slate-50 rounded border border-slate-200 text-xs"
              >
                <span className="font-bold text-slate-800 flex-1">
                  {item.part_name} ({item.qty} {item.unit})
                </span>
                <div className="w-36">
                  <CustomInput
                    type="number"
                    placeholder="Unit Price ৳"
                    value={partPrices[item.id] !== undefined ? String(partPrices[item.id]) : ""}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setPartPrices((prev) => ({ ...prev, [item.id]: val }));
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <CustomInput
              label={lang === "bn" ? "ওয়ার্কশপ মজুরি ৳" : "Workshop Labor Charge ৳"}
              type="number"
              value={laborCost}
              onChange={(e) => setLaborCost(e.target.value)}
            />
            <CustomInput
              label={lang === "bn" ? "অন্যান্য আনুষঙ্গিক খরচ ৳" : "Other Miscellaneous Cost ৳"}
              type="number"
              value={otherCost}
              onChange={(e) => setOtherCost(e.target.value)}
            />
          </div>
        </div>
      </CustomModal>

      {/* Image Preview Modal */}
      {imageModalUrl && (
        <div
          onClick={() => setImageModalUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs cursor-pointer"
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <img
              src={imageModalUrl}
              alt="Enlarged"
              className="max-w-full max-h-[85vh] rounded-lg object-contain shadow-2xl"
            />
            <button
              onClick={() => setImageModalUrl(null)}
              className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/60 text-white flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
