"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Ticket,
  Camera,
  Upload,
  Plus,
  Trash2,
  AlertTriangle,
  ArrowRightLeft,
  Wrench,
  ClipboardCheck,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Info,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { Warehouse } from "@/lib/types";
import {
  CustomButton,
  CustomInput,
  CustomSelect,
  CustomTextarea,
  CustomCard,
} from "@/components/custom";

interface PartCatalogOption {
  id: number;
  name: string;
  name_bn?: string;
  category?: string;
  unit: string;
  life_km?: number;
  life_days?: number;
}

interface BusOption {
  id: number;
  bus_no: string;
  route?: string;
  odometer_km: number;
  status: string;
  branch_id?: number;
}

interface PartLine {
  id: string;
  part_name: string;
  part_no: string;
  bin_code?: string;
  qty: number;
  unit: string;
  unit_price: number;
  remarks: string;
  last_replaced_on?: string | null;
  last_replaced_km?: number | null;
  used_km?: number | null;
  expected_life_km?: number | null;
  is_premature?: boolean;
}

function NewTicketContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang, t } = useLanguage();
  const initialType = searchParams.get("type") || "PART_REQUEST";

  const [type, setType] = useState<string>(initialType);
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [priority, setPriority] = useState<string>("NORMAL");

  const [buses, setBuses] = useState<BusOption[]>([]);
  const [catalog, setCatalog] = useState<PartCatalogOption[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");
  const [selectedBusId, setSelectedBusId] = useState<string>("");
  const [selectedToBusId, setSelectedToBusId] = useState<string>("");
  const [route, setRoute] = useState<string>("");
  const [driverName, setDriverName] = useState<string>("");
  const [odometerKm, setOdometerKm] = useState<string>("");
  const [neededBy, setNeededBy] = useState<string>("");

  // Premature / Reason fields
  const [reasonCategory, setReasonCategory] = useState<string>("");
  const [reasonText, setReasonText] = useState<string>("");
  const [isPrematureOverall, setIsPrematureOverall] = useState<boolean>(false);

  // Part lines
  const [items, setItems] = useState<PartLine[]>([
    {
      id: "line-1",
      part_name: "",
      part_no: "",
      bin_code: "",
      qty: 1,
      unit: "pcs",
      unit_price: 0,
      remarks: "",
    },
  ]);

  // Uploaded files preview
  const [files, setFiles] = useState<{ file: File; preview: string; isImage: boolean }[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load Buses, Part Catalog & Warehouses
  useEffect(() => {
    api
      .get<{ items: BusOption[] }>("/api/v1/fleet/buses?page_size=100")
      .then((res) => setBuses(res.items || []))
      .catch(() => {});

    api
      .get<PartCatalogOption[]>("/api/v1/fleet/parts-catalog")
      .then((res) => setCatalog(res || []))
      .catch(() => {});

    api
      .get<Warehouse[]>("/api/v1/warehouses")
      .then((res) => setWarehouses(res || []))
      .catch(() => {});
  }, []);

  // When bus is selected, auto-fill route, odometer, and relevant warehouse
  const handleBusSelect = (busIdStr: string) => {
    setSelectedBusId(busIdStr);
    const matched = buses.find((b) => String(b.id) === busIdStr);
    if (matched) {
      if (matched.route) setRoute(matched.route);
      if (matched.odometer_km) setOdometerKm(String(matched.odometer_km));
      if (matched.branch_id && warehouses.length > 0) {
        const whInBranch = warehouses.find((w) => w.branch_id === matched.branch_id);
        if (whInBranch) {
          setSelectedWarehouseId(String(whInBranch.id));
        }
      }
    }
  };

  // Check premature life when a part is typed or selected in replacement mode
  const checkPartLife = async (partName: string, index: number) => {
    if (!partName.trim() || !selectedBusId || type !== "PART_REPLACEMENT") return;

    try {
      const res = await api.get<any>(
        `/api/v1/tickets/part-life?bus_id=${selectedBusId}&part=${encodeURIComponent(partName)}&odometer_km=${odometerKm || ""}`
      );
      setItems((prev) => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          last_replaced_on: res.last_replaced_on,
          last_replaced_km: res.last_replaced_km,
          used_km: res.used_km,
          expected_life_km: res.expected_life_km,
          is_premature: res.is_premature,
        };
        const hasPremature = next.some((i) => i.is_premature);
        setIsPrematureOverall(hasPremature);
        return next;
      });
    } catch {}
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `line-${Date.now()}`,
        part_name: "",
        part_no: "",
        qty: 1,
        unit: "pcs",
        unit_price: 0,
        remarks: "",
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const newFiles: { file: File; preview: string; isImage: boolean }[] = [];
    Array.from(e.target.files).forEach((file) => {
      const isImg = file.type.startsWith("image/");
      const preview = isImg ? URL.createObjectURL(file) : "";
      newFiles.push({ file, preview, isImage: isImg });
    });
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => {
      const item = prev[index];
      if (item.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (submitNow: boolean = true) => {
    setErrorMsg(null);

    // Validation
    if (!title.trim()) {
      setErrorMsg("অনুগ্রহ করে টিকিটের শিরোনাম লিখুন (Ticket title is required).");
      return;
    }
    if (!selectedBusId) {
      setErrorMsg("বাস নির্বাচন করুন (Please select a bus).");
      return;
    }
    if (type === "PART_TRANSFER") {
      if (!selectedToBusId) {
        setErrorMsg("গন্তব্য বাস নির্বাচন করুন (Please select target bus).");
        return;
      }
      if (selectedBusId === selectedToBusId) {
        setErrorMsg("উৎস এবং গন্তব্য বাস একই হতে পারে না (Source and target bus cannot be same).");
        return;
      }
      if (!reasonCategory) {
        setErrorMsg("বাস ট্রান্সফারের কারণ নির্বাচন করুন (Please select transfer reason).");
        return;
      }
    }

    if (type === "PART_REPLACEMENT") {
      const hasPhoto = files.some((f) => f.isImage);
      if (!hasPhoto && submitNow) {
        setErrorMsg(
          "পার্টস নষ্টের ছবি সংযুক্ত করা বাধ্যতামূলক! (Problem photo is mandatory for replacement)."
        );
        return;
      }
      if (!reasonCategory) {
        setErrorMsg("পার্টস কেন বদলানো হচ্ছে তার কারণ নির্বাচন করুন (Please select reason).");
        return;
      }
      if (isPrematureOverall && !reasonText.trim()) {
        setErrorMsg(
          "পার্টসটি সময়ের আগেই নষ্ট হয়েছে! কারণ বিস্তারিত লিখুন (Please explain premature wear reason)."
        );
        return;
      }
    }

    const cleanedItems = items
      .filter((i) => i.part_name.trim().length > 0)
      .map((i) => ({
        part_name: i.part_name.trim(),
        part_no: i.part_no.trim() || undefined,
        bin_code: i.bin_code?.trim() || undefined,
        warehouse_id: selectedWarehouseId ? Number(selectedWarehouseId) : undefined,
        qty: Number(i.qty) || 1,
        unit: i.unit.trim() || "pcs",
        unit_price: Number(i.unit_price) || 0,
        remarks: i.remarks.trim() || undefined,
      }));

    if (type !== "VEHICLE_RELEASE" && cleanedItems.length === 0) {
      setErrorMsg("কমপক্ষে একটি পার্টসের নাম লিখুন (At least one part is required).");
      return;
    }

    try {
      setSubmitting(true);

      // 1. Create Ticket
      const payload = {
        type,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        bus_id: Number(selectedBusId),
        to_bus_id: selectedToBusId ? Number(selectedToBusId) : undefined,
        warehouse_id: selectedWarehouseId ? Number(selectedWarehouseId) : undefined,
        route: route.trim() || undefined,
        driver_name: driverName.trim() || undefined,
        odometer_km: odometerKm ? Number(odometerKm) : undefined,
        needed_by: neededBy || undefined,
        reason_category: reasonCategory || undefined,
        reason_text: reasonText.trim() || undefined,
        items: cleanedItems,
      };

      const ticket = await api.post<any>("/api/v1/tickets", payload);

      // 2. Upload attachments if any
      if (files.length > 0) {
        const formData = new FormData();
        files.forEach((f) => {
          formData.append("files", f.file);
        });
        formData.append("kind", type === "PART_REPLACEMENT" ? "PROBLEM" : "DOCUMENT");
        await api.post(`/api/v1/tickets/${ticket.id}/attachments`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      // 3. Submit directly into 3-step verification workflow
      if (submitNow) {
        await api.post(`/api/v1/tickets/${ticket.id}/submit`);
      }

      router.push(`/tickets/${ticket.id}`);
    } catch (err: any) {
      setErrorMsg(err.message || "টিকিট তৈরিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
        <div className="flex items-center gap-3">
          <Link
            href="/tickets"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              {lang === "bn" ? "নতুন পার্টস টিকিট তৈরি করুন" : "Raise New Parts Ticket"}
            </h1>
            <p className="text-xs text-slate-500">
              {lang === "bn"
                ? "৩-ধাপ ভেরিফিকেশন ও ডিজিটাল ট্র্যাকিং সিস্টেমে নতুন টিকিট সাবমিট করুন"
                : "Submit a new ticket with 3-step verification and audit tracking"}
            </p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── 1. Ticket Type Selector ── */}
      <CustomCard title={lang === "bn" ? "১. টিকিটের ধরন নির্বাচন" : "1. Select Ticket Type"}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            {
              id: "PART_REQUEST",
              title: lang === "bn" ? "পার্টস রিকুইজিশন" : "Part Request",
              sub: lang === "bn" ? "ডিজিটাল ইনডেন্ট স্লিপ" : "Digital Indent Slip",
              icon: Ticket,
              color: "text-blue-600",
            },
            {
              id: "PART_REPLACEMENT",
              title: lang === "bn" ? "পার্টস প্রতিস্থাপন" : "Part Replacement",
              sub: lang === "bn" ? "ছবি ও কারণ বাধ্যতামূলক" : "Defect photos & reason mandatory",
              icon: Wrench,
              color: "text-amber-600",
            },
            {
              id: "PART_TRANSFER",
              title: lang === "bn" ? "বাস থেকে বাসে ট্রান্সফার" : "Bus Transfer",
              sub: lang === "bn" ? "অচল বাস থেকে পার্টস ব্যবহার" : "Re-use working parts from off-road bus",
              icon: ArrowRightLeft,
              color: "text-emerald-600",
            },
            {
              id: "VEHICLE_RELEASE",
              title: lang === "bn" ? "গাড়ি রিলিজ ও গেট পাস" : "Vehicle Release",
              sub: lang === "bn" ? "ফর্ম ১৮০৪ ও গেট পাস" : "Form 1804 & Gate Pass",
              icon: ClipboardCheck,
              color: "text-purple-600",
            },
          ].map((t) => {
            const Icon = t.icon;
            const isSelected = type === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setType(t.id);
                  if (t.id === "PART_REPLACEMENT" && !title) {
                    setTitle(lang === "bn" ? "পার্টস প্রতিস্থাপন রিকুইজিশন" : "Part Replacement Request");
                  } else if (t.id === "PART_TRANSFER" && !title) {
                    setTitle(lang === "bn" ? "বাস থেকে বাসে পার্টস ট্রান্সফার" : "Bus-to-Bus Parts Transfer");
                  } else if (t.id === "VEHICLE_RELEASE" && !title) {
                    setTitle(lang === "bn" ? "গাড়ি রিলিজ ক্লিয়ারেন্স ও গেট পাস" : "Vehicle Release Clearance & Gate Pass");
                  }
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? "bg-brand-50/70 border-brand-primary shadow-xs ring-2 ring-brand-border/40"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className={`flex h-7 w-7 items-center justify-center rounded-md mb-2 ${t.color} bg-white border border-slate-100 shadow-2xs`}>
                  <Icon size={16} />
                </div>
                <p className="text-xs font-bold text-slate-800 leading-tight">{t.title}</p>
                <p className="text-[10.5px] text-slate-500 font-medium leading-tight mt-0.5">{t.sub}</p>
              </button>
            );
          })}
        </div>
      </CustomCard>

      {/* ── 2. Primary Information ── */}
      <CustomCard title={lang === "bn" ? "২. বাস ও প্রাথমিক তথ্য" : "2. Bus & Basic Information"}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <CustomInput
              label={lang === "bn" ? "টিকিট শিরোনাম *" : "Ticket Title *"}
              placeholder={lang === "bn" ? "যেমন: সামনের ব্রেক শু ও ড্রাম ওভারহল" : "e.g. Front Brake Shoe & Drum Overhaul"}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <CustomSelect
              label={
                type === "PART_TRANSFER"
                  ? (lang === "bn" ? "উৎস বাস (Bus A - যেখান থেকে নেওয়া হবে) *" : "Source Bus (Bus A - Taking from) *")
                  : (lang === "bn" ? "বাস নম্বর *" : "Coach Number *")
              }
              value={selectedBusId}
              onChange={(e) => handleBusSelect(e.target.value)}
              options={[
                { value: "", label: lang === "bn" ? "বাস নির্বাচন করুন" : "Select Coach" },
                ...buses.map((b) => ({
                  value: String(b.id),
                  label: `${b.bus_no} ${b.route ? `(${b.route})` : ""} - ${b.status}`,
                })),
              ]}
              required
            />
          </div>

          {type === "PART_TRANSFER" ? (
            <div>
              <CustomSelect
                label={lang === "bn" ? "গন্তব্য বাস (Bus B - যেখানে লাগানো হবে) *" : "Destination Bus (Bus B - Installing into) *"}
                value={selectedToBusId}
                onChange={(e) => setSelectedToBusId(e.target.value)}
                options={[
                  { value: "", label: lang === "bn" ? "গন্তব্য বাস নির্বাচন করুন" : "Select Target Bus" },
                  ...buses
                    .filter((b) => String(b.id) !== selectedBusId)
                    .map((b) => ({
                      value: String(b.id),
                      label: `${b.bus_no} ${b.route ? `(${b.route})` : ""}`,
                    })),
                ]}
                required
              />
            </div>
          ) : (
            <div>
              <CustomInput
                label={lang === "bn" ? "ওডোমিটার (বর্তমান কিমি)" : "Odometer (Current Mileage KM)"}
                placeholder="e.g. 154200"
                type="number"
                value={odometerKm}
                onChange={(e) => setOdometerKm(e.target.value)}
              />
            </div>
          )}

          <div>
            <CustomInput
              label={lang === "bn" ? "নির্ধারিত রুট" : "Assigned Route"}
              placeholder="e.g. Dhaka - Chittagong"
              value={route}
              onChange={(e) => setRoute(e.target.value)}
            />
          </div>

          <div>
            <CustomInput
              label={lang === "bn" ? "চালকের নাম" : "Driver Name"}
              placeholder="e.g. Md. Babul Mia"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
            />
          </div>

          <div>
            <CustomSelect
              label={lang === "bn" ? "অগ্রাধিকার স্তর" : "Priority Level"}
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              options={[
                { value: "NORMAL", label: lang === "bn" ? "সাধারণ অগ্রাধিকার" : "Normal Priority" },
                { value: "URGENT", label: lang === "bn" ? "জরুরি অগ্রাধিকার" : "Urgent Priority" },
                { value: "EMERGENCY", label: lang === "bn" ? "অতি জরুরি অগ্রাধিকার" : "Emergency Priority" },
              ]}
            />
          </div>

          <div>
            <CustomInput
              label={lang === "bn" ? "প্রয়োজনীয় তারিখ" : "Needed By Date"}
              type="date"
              value={neededBy}
              onChange={(e) => setNeededBy(e.target.value)}
            />
          </div>

          <div className="sm:col-span-2">
            <CustomSelect
              label={lang === "bn" ? "ইস্যুকারী ওয়্যারহাউজ / স্পেয়ার্স স্টোর" : "Issuing Warehouse / Store"}
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              options={[
                { value: "", label: lang === "bn" ? "ওয়্যারহাউজ বা স্টোর নির্বাচন করুন (ঐচ্ছিক)" : "Select Warehouse or Store (Optional)" },
                ...warehouses.map((w) => ({
                  value: String(w.id),
                  label: `${w.name} (${w.code}) ${w.branch_name ? `— ${w.branch_name}` : ""}`,
                })),
              ]}
            />
          </div>

          <div className="sm:col-span-2">
            <CustomTextarea
              label={lang === "bn" ? "সমস্যার বিস্তারিত বিবরণ" : "Detailed Problem Description"}
              placeholder={
                lang === "bn"
                  ? "ত্রুটির বিস্তারিত তথ্য, ড্রাইভারের অভিযোগ বা ওয়ার্কশপ ডায়াগনস্টিক নোট লিখুন..."
                  : "Write defect notes, driver complaints, or specific workshop diagnostics..."
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
        </div>
      </CustomCard>

      {/* ── 3. Premature Wear & Reason (Shown for Replacement & Transfer) ── */}
      {(type === "PART_REPLACEMENT" || type === "PART_TRANSFER") && (
        <CustomCard
          title={
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-600" />
              <span>{lang === "bn" ? "৩. পার্টস পরিবর্তনের কারণ ও লাইফ স্প্যান" : "3. Why Is This Part Changed?"}</span>
            </div>
          }
          subtitle={
            lang === "bn"
              ? "তাড়াতাড়ি পার্টস কেন বদলাতে হচ্ছে বা অন্য বাস থেকে কেন নেওয়া হচ্ছে"
              : "Reason why part needs replacement or is transferred from another bus"
          }
        >
          <div className="space-y-4">
            {isPrematureOverall && (
              <div className="p-3 rounded-lg border border-rose-300 bg-rose-50 text-rose-800 text-xs flex items-start gap-2.5">
                <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">
                    {lang === "bn"
                      ? "সতর্কতা: পার্টসটি স্বাভাবিক মেয়াদের আগেই নষ্ট হয়েছে! (Premature Wear Detected)"
                      : "Warning: Part worn out before expected lifespan (Premature Wear Detected)"}
                  </p>
                  <p className="text-[11px] text-rose-700 mt-0.5">
                    {lang === "bn"
                      ? "সিস্টেম রেকর্ড অনুযায়ী এই পার্টসটি প্রত্যাশিত কিমি বা দিনের আগে অকার্যকর হয়েছে। কেন এটি হয়েছে তার কারণ উল্লেখ করা বাধ্যতামূলক।"
                      : "System records indicate this part failed before expected KM or days. Failure justification is mandatory."}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <CustomSelect
                  label={lang === "bn" ? "প্রধান কারণ *" : "Reason Category *"}
                  value={reasonCategory}
                  onChange={(e) => setReasonCategory(e.target.value)}
                  options={[
                    { value: "", label: lang === "bn" ? "কারণ নির্বাচন করুন" : "Select Reason Category" },
                    { value: "POOR_QUALITY", label: lang === "bn" ? "খারাপ পার্টস কোয়ালিটি" : "Poor Part Quality" },
                    { value: "DRIVING", label: lang === "bn" ? "চালকের অসাবধানতা ও বেপরোয়া ড্রাইভ" : "Aggressive Driving" },
                    { value: "ACCIDENT", label: lang === "bn" ? "সড়ক দুর্ঘটনা ও ক্ষতি" : "Accident Damage" },
                    { value: "ROAD_CONDITION", label: lang === "bn" ? "পাহাড়ি বা ভাঙাচোরা সড়ক" : "Severe Road Condition" },
                    { value: "WRONG_INSTALL", label: lang === "bn" ? "পূর্বে ভুল ফিটিং বা ইনস্টলেশন" : "Wrong Installation" },
                    { value: "WEAR_TEAR", label: lang === "bn" ? "স্বাভাবিক মেয়াদ শেষ" : "Natural High Mileage Wear" },
                    { value: "BUS_OFF_ROAD", label: lang === "bn" ? "উৎস বাস অচল আছে" : "Source Bus Off-Road" },
                    { value: "OTHER", label: lang === "bn" ? "অন্যান্য কারণ" : "Other Reasons" },
                  ]}
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <CustomTextarea
                  label={lang === "bn" ? "বিস্তারিত কারণ ও তদন্ত নোট *" : "Detailed Reason & Investigation Notes *"}
                  placeholder={
                    lang === "bn"
                      ? "যেমন: পাহাড়ি রাস্তায় ব্রেক অতিরিক্ত ব্যবহারের কারণে পুড়ে গেছে; অথবা সাপ্লায়ারের লটের ত্রুটি ছিল..."
                      : "e.g. Hill braking caused pad burning; or supplier batch was defective; or Coach is parked for engine overhaul..."
                  }
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </div>
        </CustomCard>
      )}

      {/* ── 4. Problem Photo Upload (WhatsApp Replacement) ── */}
      <CustomCard
        title={
          <div className="flex items-center gap-2">
            <Camera size={18} className="text-brand-primary" />
            <span>{lang === "bn" ? "৪. সমস্যার ছবি ও ফাইল সংযুক্তি" : "4. Problem Photos & Attachments"}</span>
          </div>
        }
        subtitle={
          lang === "bn"
            ? "হোয়াটসঅ্যাপ বাদ দিয়ে সিস্টেমে সরাসরি ক্যামেরা বা ফাইল থেকে ছবি আপলোড করুন"
            : "Upload defect photos directly into the system instead of WhatsApp"
        }
      >
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Upload trigger buttons */}
          <div className="flex items-center gap-3">
            <CustomButton
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Camera size={16} />}
              onClick={() => fileInputRef.current?.click()}
              className="bg-white border-dashed border-2 border-brand-primary text-brand-primary font-bold hover:bg-brand-50"
            >
              {lang === "bn" ? "ক্যামেরা ছবি তুলুন বা ফাইল নির্বাচন করুন" : "Take Photo or Upload Image"}
            </CustomButton>
            <span className="text-xs text-slate-400">
              {lang === "bn"
                ? "(JPG, PNG, WebP — একাধিক ছবি নির্বাচন করা যাবে)"
                : "(JPG, PNG, WebP — multiple photos allowed)"}
            </span>
          </div>

          {/* Files Previews Grid */}
          {files.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {files.map((item, idx) => (
                <div
                  key={idx}
                  className="relative group rounded-xl border border-slate-200 bg-slate-50 overflow-hidden shadow-2xs"
                >
                  {item.isImage ? (
                    <img
                      src={item.preview}
                      alt="Defect"
                      className="h-28 w-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="h-28 w-full flex flex-col items-center justify-center p-2 text-center text-slate-500">
                      <span className="text-xs font-bold truncate max-w-full">{item.file.name}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(idx)}
                    className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md hover:bg-rose-700 transition"
                  >
                    <X size={13} />
                  </button>
                  <div className="p-1.5 bg-white/95 text-[10px] text-slate-600 truncate border-t border-slate-100">
                    {item.file.name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CustomCard>

      {/* ── 5. Part Line Items ── */}
      {type !== "VEHICLE_RELEASE" && (
        <CustomCard
          title={lang === "bn" ? "৫. প্রয়োজনীয় পার্টসের তালিকা" : "5. Spare Parts Required"}
          subtitle={
            lang === "bn"
              ? "যে পার্টসগুলো চাওয়া হচ্ছে বা পরিবর্তন করা হবে"
              : "List of parts requested or being replaced"
          }
          actions={
            <CustomButton
              type="button"
              variant="outline"
              size="xs"
              leftIcon={<Plus size={13} />}
              onClick={handleAddItem}
            >
              {lang === "bn" ? "নতুন পার্টস যোগ" : "Add Part Line"}
            </CustomButton>
          }
        >
          <div className="space-y-3">
            {items.map((line, index) => (
              <div
                key={line.id}
                className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5 relative"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    {lang === "bn" ? `আইটেম #${index + 1}` : `Line #${index + 1}`}
                  </span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="text-slate-400 hover:text-rose-600 transition"
                      title={lang === "bn" ? "লাইন মুছুন" : "Remove Line"}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {lang === "bn" ? "পার্টসের নাম *" : "Part Name *"}
                    </label>
                    <input
                      type="text"
                      list={`catalog-list-${index}`}
                      placeholder={lang === "bn" ? "যেমন: ফ্রন্ট ব্রেক শু সেট" : "e.g. Front Brake Shoe Set"}
                      value={line.part_name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setItems((prev) => {
                          const next = [...prev];
                          next[index].part_name = val;
                          return next;
                        });
                        checkPartLife(val, index);
                      }}
                      className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-md p-2 outline-none focus:border-brand-primary"
                    />
                    <datalist id={`catalog-list-${index}`}>
                      {catalog.map((c) => (
                        <option key={c.id} value={c.name}>
                          {lang === "bn" && c.name_bn ? `${c.name_bn} (${c.category})` : `${c.name} (${c.category})`}
                        </option>
                      ))}
                    </datalist>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {lang === "bn" ? "পার্ট নং (ঐচ্ছিক)" : "Part No"}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. BRK-502"
                      value={line.part_no}
                      onChange={(e) => {
                        const val = e.target.value;
                        setItems((prev) => {
                          const next = [...prev];
                          next[index].part_no = val;
                          return next;
                        });
                      }}
                      className="w-full text-xs text-slate-800 bg-white border border-slate-200 rounded-md p-2 outline-none focus:border-brand-primary"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {lang === "bn" ? "স্টোরেজ বিন / র্যাক" : "Bin / Rack"}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. R01-C01-RK01"
                      value={line.bin_code || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setItems((prev) => {
                          const next = [...prev];
                          next[index].bin_code = val;
                          return next;
                        });
                      }}
                      className="w-full text-xs text-slate-800 bg-white border border-slate-200 rounded-md p-2 outline-none focus:border-brand-primary"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {lang === "bn" ? "পরিমাণ *" : "Quantity *"}
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      value={line.qty}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 1;
                        setItems((prev) => {
                          const next = [...prev];
                          next[index].qty = val;
                          return next;
                        });
                      }}
                      className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-md p-2 outline-none focus:border-brand-primary"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {lang === "bn" ? "একক" : "Unit"}
                    </label>
                    <select
                      value={line.unit}
                      onChange={(e) => {
                        const val = e.target.value;
                        setItems((prev) => {
                          const next = [...prev];
                          next[index].unit = val;
                          return next;
                        });
                      }}
                      className="w-full text-xs text-slate-800 bg-white border border-slate-200 rounded-md p-2 outline-none focus:border-brand-primary"
                    >
                      <option value="pcs">{lang === "bn" ? "পিস" : "pcs"}</option>
                      <option value="set">{lang === "bn" ? "সেট" : "set"}</option>
                      <option value="ltr">{lang === "bn" ? "লিটার" : "ltr"}</option>
                      <option value="kg">{lang === "bn" ? "কেজি" : "kg"}</option>
                      <option value="pair">{lang === "bn" ? "জোড়া" : "pair"}</option>
                    </select>
                  </div>
                </div>

                {/* Live Lifetime Feedback Badge */}
                {line.last_replaced_on && (
                  <div className="text-[11px] font-medium text-slate-600 bg-white p-2 rounded border border-slate-200 flex items-center justify-between">
                    <span>
                      {lang === "bn" ? "সর্বশেষ বদল" : "Last replaced"}: <strong>{line.last_replaced_on}</strong> ({line.last_replaced_km?.toLocaleString()} {lang === "bn" ? "কিমিতে" : "KM"})
                    </span>
                    <span>
                      {lang === "bn" ? "ব্যবহৃত হয়েছে" : "Used"}: <strong>{line.used_km?.toLocaleString()} {lang === "bn" ? "কিমি" : "KM"}</strong>{" "}
                      ({lang === "bn" ? "প্রত্যাশিত" : "Expected"}: {line.expected_life_km?.toLocaleString() || "—"} {lang === "bn" ? "কিমি" : "KM"})
                    </span>
                    {line.is_premature && (
                      <span className="text-rose-600 font-bold">
                        {lang === "bn" ? "⚠️ সময়ের আগেই নষ্ট!" : "⚠️ Premature wear detected!"}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CustomCard>
      )}

      {/* ── Submit Buttons ── */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Link href="/tickets">
          <CustomButton variant="outline" size="md">
            {lang === "bn" ? "বাতিল" : "Cancel"}
          </CustomButton>
        </Link>
        <CustomButton
          variant="secondary"
          size="md"
          loading={submitting}
          onClick={() => handleSubmit(false)}
        >
          {lang === "bn" ? "খসড়া সংরক্ষণ" : "Save as Draft"}
        </CustomButton>
        <CustomButton
          variant="primary"
          size="md"
          loading={submitting}
          onClick={() => handleSubmit(true)}
          className="shadow-brand-button px-6 font-bold"
        >
          {lang === "bn" ? "৩-ধাপ ভেরিফিকেশনের জন্য সাবমিট" : "Submit for 3-Step Verification"}
        </CustomButton>
      </div>
    </div>
  );
}

export default function NewTicketPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading new ticket form...</div>}>
      <NewTicketContent />
    </Suspense>
  );
}
