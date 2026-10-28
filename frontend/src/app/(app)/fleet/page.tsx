"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CarFront,
  PlusCircle,
  Search,
  Filter,
  Building2,
  History,
  Ticket,
  Eye,
  CheckCircle2,
  Wrench,
  AlertTriangle,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { hasPermission } from "@/lib/permissions";
import { Bus, Branch } from "@/lib/types";
import {
  CustomButton,
  CustomInput,
  CustomSelect,
  CustomCard,
  CustomModal,
  CustomStatCard,
} from "@/components/custom";

export default function FleetPage() {
  const { user } = useAuth();
  const { lang, t } = useLanguage();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");

  // Add Bus Modal
  const [addModal, setAddModal] = useState(false);
  const [busNo, setBusNo] = useState("");
  const [name, setName] = useState("");
  const [makeModel, setMakeModel] = useState("");
  const [route, setRoute] = useState("");
  const [branchId, setBranchId] = useState("");
  const [odometerKm, setOdometerKm] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [busRes, branchRes] = await Promise.all([
        api.get<any>("/api/v1/fleet/buses?page_size=100"),
        api.get<any>("/api/v1/branches?page_size=100"),
      ]);
      setBuses(busRes.items || []);
      setBranches(branchRes.items || []);
    } catch (err) {
      console.error("Failed to load fleet data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateBus = async () => {
    if (!busNo.trim()) {
      alert(lang === "bn" ? "বাসের রেজিস্ট্রেশন নম্বর আবশ্যক" : "Registration number is required");
      return;
    }

    try {
      setSubmitting(true);
      await api.post("/api/v1/fleet/buses", {
        bus_no: busNo.trim(),
        name: name.trim() || undefined,
        make_model: makeModel.trim() || undefined,
        route: route.trim() || undefined,
        branch_id: branchId ? Number(branchId) : undefined,
        odometer_km: odometerKm ? Number(odometerKm) : 0,
        status,
      });
      setAddModal(false);
      setBusNo("");
      setName("");
      setMakeModel("");
      setRoute("");
      setBranchId("");
      setOdometerKm("");
      setStatus("ACTIVE");
      await loadData();
    } catch (err: any) {
      alert("❌ " + (err.message || "Failed to create bus"));
    } finally {
      setSubmitting(false);
    }
  };

  const filteredBuses = buses.filter((b) => {
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const matchNo = b.bus_no.toLowerCase().includes(q);
      const matchRoute = b.route?.toLowerCase().includes(q);
      const matchName = b.name?.toLowerCase().includes(q);
      if (!matchNo && !matchRoute && !matchName) return false;
    }
    if (statusFilter && b.status !== statusFilter) return false;
    if (branchFilter && String(b.branch_id) !== branchFilter) return false;
    return true;
  });

  const canCreate = hasPermission(user, "fleet.create");

  return (
    <div className="space-y-6">
      {/* ── Top Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-brand-border/60 pb-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <CarFront className="text-brand-primary" size={22} />
            <span>{lang === "bn" ? "সৌদিয়া বাস বহর ও যানবাহন তালিকা" : "Bus Fleet Registry"}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {lang === "bn"
              ? "কোচ তালিকা, বর্তমান রুট, কিমি রিডিং ও গ্যারেজ মেইনটেন্যান্স অবস্থা"
              : "Fleet coach registry, active routes, mileage odometer and maintenance status"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/fleet/history">
            <CustomButton variant="outline" size="sm" leftIcon={<History size={14} />}>
              {lang === "bn" ? "পার্টস ব্যবহারের লগবুক" : "Parts Log Book"}
            </CustomButton>
          </Link>
          {canCreate && (
            <CustomButton
              variant="primary"
              size="sm"
              leftIcon={<PlusCircle size={15} />}
              onClick={() => setAddModal(true)}
              className="rounded-full shadow-brand-button"
            >
              {lang === "bn" ? "নতুন বাস যোগ করুন" : "Add New Bus"}
            </CustomButton>
          )}
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <CustomStatCard
          label={lang === "bn" ? "মোট বাস বহর" : "Total Fleet Buses"}
          subtitle={lang === "bn" ? "নিবন্ধিত সকল বাস" : "All registered coaches"}
          value={String(buses.length)}
          icon={CarFront}
          tone="primary"
        />
        <CustomStatCard
          label={lang === "bn" ? "হাইওয়েতে সচল" : "Active on Highway"}
          subtitle={lang === "bn" ? "রুটে চলাচলরত" : "Currently on route"}
          value={String(buses.filter((b) => b.status === "ACTIVE").length)}
          icon={CheckCircle2}
          tone="green"
        />
        <CustomStatCard
          label={lang === "bn" ? "গ্যারেজে মেরামত" : "In Garage Service"}
          subtitle={lang === "bn" ? "কাজ চলছে" : "Under maintenance"}
          value={String(buses.filter((b) => b.status === "IN_GARAGE").length)}
          icon={Wrench}
          tone="blue"
        />
        <CustomStatCard
          label={lang === "bn" ? "অচল বাস বহর" : "Off-Road Coaches"}
          subtitle={lang === "bn" ? "স্পেয়ার পার্টস উৎস" : "Spare donor coaches"}
          value={String(buses.filter((b) => b.status === "OFF_ROAD").length)}
          icon={AlertTriangle}
          tone="amber"
        />
      </div>

      {/* ── Filters ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
        <CustomInput
          placeholder={
            lang === "bn"
              ? "বাসের রেজিস্ট্রেশন নং, রুট, কোচের নাম দিয়ে খুঁজুন..."
              : "Search bus registration no, route, coach name..."
          }
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search size={14} className="text-slate-400" />}
        />
        <CustomSelect
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: "", label: lang === "bn" ? "সকল অবস্থা" : "All Status" },
            { value: "ACTIVE", label: lang === "bn" ? "সচল (রুটে চলমান)" : "Active (On Route)" },
            { value: "IN_GARAGE", label: lang === "bn" ? "গ্যারেজে (মেরামত চলছে)" : "In Garage (Maintenance)" },
            { value: "OFF_ROAD", label: lang === "bn" ? "অচল (স্পেয়ার পার্টস হিসেবে)" : "Off-Road (Spare Donor)" },
          ]}
        />
        <CustomSelect
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          options={[
            { value: "", label: lang === "bn" ? "সকল ডিপো" : "All Depots" },
            ...branches.map((b) => ({ value: String(b.id), label: b.name })),
          ]}
        />
      </div>

      {/* ── Bus Cards Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBuses.map((bus) => (
          <div
            key={bus.id}
            className="p-4 rounded-xl border border-slate-200 bg-white hover:border-brand-primary/80 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-sm font-bold text-slate-800">
                  {bus.bus_no}
                </span>
                <span
                  className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full ${
                    bus.status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : bus.status === "IN_GARAGE"
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}
                >
                  {bus.status === "ACTIVE"
                    ? (lang === "bn" ? "সচল" : "ACTIVE")
                    : bus.status === "IN_GARAGE"
                    ? (lang === "bn" ? "গ্যারেজে" : "IN GARAGE")
                    : (lang === "bn" ? "অচল" : "OFF-ROAD")}
                </span>
              </div>

              <p className="text-xs font-semibold text-slate-700">
                {bus.name || (lang === "bn" ? "সৌদিয়া স্ট্যান্ডার্ড কোচ" : "Soudia Standard Coach")}
              </p>
              <p className="text-[11px] text-slate-400">
                {bus.make_model || (lang === "bn" ? "মডেল নির্ধারিত নেই" : "Model not specified")}
              </p>

              <div className="mt-3 space-y-1.5 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">{lang === "bn" ? "রুট" : "Route"}:</span>
                  <span className="font-bold text-slate-800">{bus.route || "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">{lang === "bn" ? "ডিপো" : "Depot"}:</span>
                  <span className="font-semibold text-slate-700">{bus.branch_name || "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">{lang === "bn" ? "ওডোমিটার" : "Odometer"}:</span>
                  <span className="font-mono font-bold text-brand-primary">
                    {bus.odometer_km?.toLocaleString()} {lang === "bn" ? "কিমি" : "KM"}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <Link
                href={`/fleet/history?bus_id=${bus.id}`}
                className="text-xs font-bold text-slate-600 hover:text-brand-primary flex items-center gap-1"
              >
                <History size={13} />
                <span>{lang === "bn" ? "পার্টস লগ" : "Parts Log Book"}</span>
              </Link>
              <Link href={`/tickets?bus_id=${bus.id}`}>
                <CustomButton size="xs" variant="outline">
                  {lang === "bn" ? "টিকিট দেখুন" : "View Tickets"}
                </CustomButton>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* ── Add Bus Modal ── */}
      <CustomModal
        open={addModal}
        onClose={() => setAddModal(false)}
        title={lang === "bn" ? "বহরে নতুন বাস যুক্ত করুন" : "Add New Bus to Fleet"}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <CustomButton variant="outline" size="sm" onClick={() => setAddModal(false)}>
              {lang === "bn" ? "বাতিল" : "Cancel"}
            </CustomButton>
            <CustomButton
              variant="primary"
              size="sm"
              loading={submitting}
              onClick={handleCreateBus}
            >
              {lang === "bn" ? "বাস যুক্ত করুন" : "Add Coach to Fleet"}
            </CustomButton>
          </div>
        }
      >
        <div className="space-y-3">
          <CustomInput
            label={lang === "bn" ? "বাস রেজিস্ট্রেশন নং *" : "Registration No (Bus No) *"}
            placeholder="e.g. DHK-METRO-BA-15-2023"
            value={busNo}
            onChange={(e) => setBusNo(e.target.value)}
            required
          />
          <CustomInput
            label={lang === "bn" ? "কোচের নাম বা পরিচিতি" : "Coach Name or Title"}
            placeholder="e.g. Soudia RM2 Scania (Coach 103)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <CustomInput
            label={lang === "bn" ? "মেক ও মডেল" : "Make & Model"}
            placeholder="e.g. Hino RM2 AC Coach"
            value={makeModel}
            onChange={(e) => setMakeModel(e.target.value)}
          />
          <CustomInput
            label={lang === "bn" ? "ডিফল্ট রুট" : "Default Route"}
            placeholder="e.g. Dhaka - Chittagong"
            value={route}
            onChange={(e) => setRoute(e.target.value)}
          />
          <CustomSelect
            label={lang === "bn" ? "অপারেটিং ডিপো" : "Operating Depot"}
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            options={[
              { value: "", label: lang === "bn" ? "ডিপো নির্বাচন করুন" : "Select Depot" },
              ...branches.map((b) => ({ value: String(b.id), label: b.name })),
            ]}
          />
          <CustomInput
            label={lang === "bn" ? "বর্তমান ওডোমিটার (কিমি)" : "Current Odometer (KM)"}
            type="number"
            value={odometerKm}
            onChange={(e) => setOdometerKm(e.target.value)}
          />
          <CustomSelect
            label={lang === "bn" ? "প্রাথমিক অবস্থা" : "Initial Status"}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: "ACTIVE", label: lang === "bn" ? "সচল" : "Active" },
              { value: "IN_GARAGE", label: lang === "bn" ? "গ্যারেজে মেরামত" : "In Garage" },
              { value: "OFF_ROAD", label: lang === "bn" ? "অচল" : "Off-Road" },
            ]}
          />
        </div>
      </CustomModal>
    </div>
  );
}
