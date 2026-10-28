"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Warehouse as WhIcon,
  PlusCircle,
  Search,
  Building2,
  MapPin,
  Layers,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Sparkles,
  Grid3X3,
  Boxes,
  Plus,
  Package,
  Sliders,
  ChevronRight,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import {
  Branch,
  Warehouse,
  LocationBin,
  WarehouseLocationsPayload,
} from "@/lib/types";
import {
  CustomButton,
  CustomInput,
  CustomCard,
  CustomModal,
  CustomSelect,
  ConfirmModal,
} from "@/components/custom";
import { toast } from "react-toastify";

function WarehousesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { lang } = useLanguage();

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState(searchParams.get("branch_id") || "");

  // Create / Edit Warehouse Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWh, setEditingWh] = useState<Warehouse | null>(null);
  const [branchId, setBranchId] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [location, setLocation] = useState("");
  const [warehouseType, setWarehouseType] = useState("Spares Store");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Manage Locations (Bins / Racks) Modal
  const [locationsModalOpen, setLocationsModalOpen] = useState(false);
  const [selectedWhForLoc, setSelectedWhForLoc] = useState<Warehouse | null>(null);
  const [locPayload, setLocPayload] = useState<WarehouseLocationsPayload | null>(null);
  const [loadingLocs, setLoadingLocs] = useState(false);
  const [activeLocTab, setActiveLocTab] = useState<"grid" | "bulk" | "single">("grid");

  // Bulk Generator State
  const [genRows, setGenRows] = useState(2);
  const [genCols, setGenCols] = useState(2);
  const [genRacks, setGenRacks] = useState(3);
  const [genBins, setGenBins] = useState(2);
  const [generating, setGenerating] = useState(false);

  // Single Bin State
  const [singleRow, setSingleRow] = useState("R01");
  const [singleCol, setSingleCol] = useState("C01");
  const [singleRack, setSingleRack] = useState("RK01");
  const [singleBin, setSingleBin] = useState("B01");
  const [singleName, setSingleName] = useState("");
  const [singleCapacity, setSingleCapacity] = useState("");
  const [savingSingleBin, setSavingSingleBin] = useState(false);

  // Delete Warehouse State
  const [deleteWhTarget, setDeleteWhTarget] = useState<Warehouse | null>(null);
  const [deletingWh, setDeletingWh] = useState(false);

  // Load initial data
  const loadData = async () => {
    try {
      setLoading(true);
      const [whRes, brRes] = await Promise.all([
        api.get<Warehouse[]>("/api/v1/warehouses"),
        api.get<any>("/api/v1/branches?page_size=100"),
      ]);
      setWarehouses(whRes || []);
      setBranches(Array.isArray(brRes) ? brRes : (brRes?.items || []));
    } catch (err: any) {
      console.error("Failed to load warehouses:", err);
      toast.error(err?.message || "Failed to load warehouses data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered warehouses
  const filteredWarehouses = useMemo(() => {
    return warehouses.filter((w) => {
      if (selectedBranchFilter && String(w.branch_id) !== selectedBranchFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = w.name?.toLowerCase().includes(q);
        const matchesCode = w.code?.toLowerCase().includes(q);
        const matchesBranch = w.branch_name?.toLowerCase().includes(q);
        const matchesLoc = w.location?.toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesBranch && !matchesLoc) return false;
      }
      return true;
    });
  }, [warehouses, selectedBranchFilter, searchQuery]);

  // Total Bins across all warehouses
  const totalConfiguredBins = useMemo(() => {
    return warehouses.reduce((acc, w) => acc + (w.total_bins || 0), 0);
  }, [warehouses]);

  // Open Create Modal
  const openAddModal = () => {
    setEditingWh(null);
    setBranchId(selectedBranchFilter || (branches[0]?.id ? String(branches[0].id) : ""));
    setName("");
    setCode("");
    setLocation("Main Depot");
    setWarehouseType("Spares Store");
    setIsActive(true);
    setModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (w: Warehouse) => {
    setEditingWh(w);
    setBranchId(String(w.branch_id));
    setName(w.name || "");
    setCode(w.code || "");
    setLocation(w.location || "Main Depot");
    setWarehouseType(w.warehouse_type || "Spares Store");
    setIsActive(w.is_active);
    setModalOpen(true);
  };

  // Submit Create / Edit
  const handleSubmitWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim() || !branchId) {
      toast.warning(lang === "bn" ? "সকল আবশ্যকীয় তথ্য পূরণ করুন।" : "Please fill in all required fields.");
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        branch_id: Number(branchId),
        name: name.trim(),
        code: code.trim().toUpperCase(),
        location: location.trim(),
        warehouse_type: warehouseType,
        is_location_based: true,
        is_active: isActive,
      };

      if (editingWh) {
        await api.put(`/api/v1/warehouses/${editingWh.id}`, payload);
        toast.success(lang === "bn" ? "ওয়্যারহাউজ সফলভাবে আপডেট করা হয়েছে!" : "Warehouse updated successfully!");
      } else {
        await api.post("/api/v1/warehouses", payload);
        toast.success(lang === "bn" ? "নতুন ওয়্যারহাউজ সফলভাবে যোগ করা হয়েছে!" : "Warehouse added successfully!");
      }

      setModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save warehouse");
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteWhTarget) return;
    try {
      setDeletingWh(true);
      await api.delete(`/api/v1/warehouses/${deleteWhTarget.id}`);
      toast.success(lang === "bn" ? "ওয়্যারহাউজ সফলভাবে মুছে ফেলা হয়েছে!" : "Warehouse deleted successfully!");
      setDeleteWhTarget(null);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete warehouse");
    } finally {
      setDeletingWh(false);
    }
  };

  // Open Locations Modal
  const openLocationsModal = async (w: Warehouse) => {
    setSelectedWhForLoc(w);
    setLocationsModalOpen(true);
    setActiveLocTab("grid");
    loadWarehouseLocations(w.id);
  };

  const loadWarehouseLocations = async (wid: number) => {
    try {
      setLoadingLocs(true);
      const res = await api.get<WarehouseLocationsPayload>(`/api/v1/warehouses/${wid}/locations`);
      setLocPayload(res);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load bins for warehouse");
    } finally {
      setLoadingLocs(false);
    }
  };

  // Bulk Generate Bins
  const handleBulkGenerate = async () => {
    if (!selectedWhForLoc) return;
    try {
      setGenerating(true);
      const res = await api.post<{ message: string; created_count: number }>(
        `/api/v1/warehouses/${selectedWhForLoc.id}/locations/generate`,
        {
          rows: genRows,
          cols: genCols,
          racks: genRacks,
          bins: genBins,
        }
      );
      toast.success(res.message || (lang === "bn" ? "স্টোরেজ বিন সফলভাবে জেনারেট হয়েছে!" : "Bins generated successfully!"));
      setActiveLocTab("grid");
      loadWarehouseLocations(selectedWhForLoc.id);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate bins");
    } finally {
      setGenerating(false);
    }
  };

  // Create Single Bin
  const handleCreateSingleBin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWhForLoc) return;
    try {
      setSavingSingleBin(true);
      await api.post(`/api/v1/warehouses/${selectedWhForLoc.id}/locations`, {
        row_code: singleRow.trim().toUpperCase(),
        col_code: singleCol.trim().toUpperCase(),
        rack_code: singleRack.trim().toUpperCase(),
        bin_code: singleBin.trim().toUpperCase(),
        name: singleName.trim() || undefined,
        max_capacity: singleCapacity ? Number(singleCapacity) : undefined,
        status: "ACTIVE",
      });
      toast.success(lang === "bn" ? "নতুন বিন যোগ করা হয়েছে!" : "Single bin created successfully!");
      setSingleName("");
      setActiveLocTab("grid");
      loadWarehouseLocations(selectedWhForLoc.id);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create single bin");
    } finally {
      setSavingSingleBin(false);
    }
  };

  // Delete Single Bin
  const handleDeleteBin = async (binId: number) => {
    if (!selectedWhForLoc) return;
    try {
      await api.delete(`/api/v1/warehouses/${selectedWhForLoc.id}/locations/${binId}`);
      toast.success(lang === "bn" ? "বিন মুছে ফেলা হয়েছে!" : "Bin deleted successfully!");
      loadWarehouseLocations(selectedWhForLoc.id);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete bin");
    }
  };

  const warehouseTypeOptions = [
    { value: "Central Spares Depot", label: lang === "bn" ? "সেন্ট্রাল স্পেয়ার্স ডিপো" : "Central Spares Depot" },
    { value: "Workshop Store", label: lang === "bn" ? "ওয়ার্কশপ মেইনটেন্যান্স স্টোর" : "Workshop Store" },
    { value: "Regional Store", label: lang === "bn" ? "আঞ্চলিক ডিপো স্টোর" : "Regional Store" },
    { value: "Terminal Store", label: lang === "bn" ? "টার্মিনাল স্পেয়ার স্টোর" : "Terminal Store" },
    { value: "Lubricants Bay", label: lang === "bn" ? "লুব্রিকেন্ট ও ফুয়েল স্টোর" : "Lubricants Bay" },
    { value: "Tyre Store", label: lang === "bn" ? "টায়ার ও রিম স্টোরেজ" : "Tyre Store" },
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* ── Top Header Banner ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-primary via-brand-dark to-red-800 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-md text-white border border-white/20">
                <WhIcon size={13} />
                {lang === "bn" ? "ডিপো স্পেয়ার স্টোর ও বিন" : "Depot Stores & Racks"}
              </span>
              <span className="text-xs text-white/70">
                • {lang === "bn" ? "পার্টস টিকেটিং লোকেশন" : "Ticketing Storage Hierarchy"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {lang === "bn" ? "ওয়্যারহাউজ ও স্টোরেজ বিন ব্যবস্থাপনা" : "Warehouses & Storage Bins Management"}
            </h1>
            <p className="mt-1 text-sm text-white/80 max-w-2xl">
              {lang === "bn"
                ? "ডিপোভিত্তিক স্পেয়ার পার্টস ওয়্যারহাউজ, র‍্যাক, শেলফ ও বিন লোকেশন পরিচালনা করুন। টিকেটের পার্টস কোন বিন থেকে গৃহীত বা সংরক্ষিত তা নির্দিষ্ট করুন।"
                : "Manage branch depot warehouses, storage racks, shelves, and location bins. Organize parts storage locations for fast ticket requisition and verification."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <CustomButton
              variant="outline"
              onClick={openAddModal}
              className="bg-white text-brand-dark hover:bg-slate-100 border-white text-xs font-bold shadow-md cursor-pointer"
            >
              <PlusCircle size={14} className="mr-1.5 text-brand-primary" />
              {lang === "bn" ? "নতুন ওয়্যারহাউজ যোগ" : "Add Warehouse"}
            </CustomButton>
          </div>
        </div>

        {/* Decorative background watermark */}
        <div className="pointer-events-none absolute right-4 bottom-2 opacity-10">
          <WhIcon size={180} />
        </div>
      </div>

      {/* ── KPI Quick Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <CustomCard className="p-4 border-l-4 border-l-brand-primary shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {lang === "bn" ? "মোট ওয়্যারহাউজ" : "Total Warehouses"}
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-slate-800">{warehouses.length}</span>
            <WhIcon size={18} className="text-brand-primary" />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {lang === "bn" ? "সকল ডিপোর অন্তর্ভুক্ত স্টোর" : "Across operational depots"}
          </p>
        </CustomCard>

        <CustomCard className="p-4 border-l-4 border-l-emerald-500 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {lang === "bn" ? "সক্রিয় স্টোরসমূহ" : "Active Stores"}
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-emerald-700">
              {warehouses.filter((w) => w.is_active).length}
            </span>
            <CheckCircle2 size={18} className="text-emerald-500" />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {lang === "bn" ? "বর্তমানে চালু ও ব্যবহারযোগ্য" : "Ready for ticketing issue"}
          </p>
        </CustomCard>

        <CustomCard className="p-4 border-l-4 border-l-sky-500 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {lang === "bn" ? "মোট স্টোরেজ বিন" : "Storage Bins"}
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-sky-700">{totalConfiguredBins}</span>
            <Grid3X3 size={18} className="text-sky-500" />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {lang === "bn" ? "র‍্যাক ও শেলফ সেল সংখ্যা" : "Configured rack & shelf slots"}
          </p>
        </CustomCard>

        <CustomCard className="p-4 border-l-4 border-l-amber-500 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {lang === "bn" ? "আওতাভুক্ত ডিপো" : "Covered Depots"}
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-amber-700">
              {new Set(warehouses.map((w) => w.branch_id)).size}
            </span>
            <Building2 size={18} className="text-amber-500" />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {lang === "bn" ? "ডিপোভিত্তিক স্টোর হাব" : "Depots with parts stores"}
          </p>
        </CustomCard>
      </div>

      {/* ── Filters & Search Row ── */}
      <CustomCard className="p-4 bg-white shadow-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === "bn" ? "স্টোরের নাম বা কোড দিয়ে খুঁজুন..." : "Search store name or code..."}
                className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-brand-primary outline-none transition"
              />
            </div>

            {/* Branch Filter Dropdown */}
            <select
              value={selectedBranchFilter}
              onChange={(e) => setSelectedBranchFilter(e.target.value)}
              className="w-full sm:w-56 py-2 px-3 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-brand-primary outline-none transition text-slate-700"
            >
              <option value="">{lang === "bn" ? "সকল ডিপো / টার্মিনাল" : "All Depots / Hubs"}</option>
              {branches.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <span className="text-xs font-bold text-slate-500">
              {lang === "bn" ? `মোট ${filteredWarehouses.length} টি ওয়্যারহাউজ` : `Total ${filteredWarehouses.length} Stores`}
            </span>
            <CustomButton
              variant="outline"
              size="sm"
              onClick={loadData}
              title={lang === "bn" ? "রিফ্রেশ" : "Refresh"}
              className="text-xs px-2.5 cursor-pointer"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            </CustomButton>
          </div>
        </div>
      </CustomCard>

      {/* ── Warehouses Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-400">
            <RefreshCw size={24} className="mx-auto animate-spin text-brand-primary mb-2" />
            {lang === "bn" ? "ওয়্যারহাউজ তালিকা লোড হচ্ছে..." : "Loading warehouses..."}
          </div>
        ) : filteredWarehouses.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400">
            <WhIcon size={40} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">
              {lang === "bn" ? "কোনো ওয়্যারহাউজ পাওয়া যায়নি" : "No warehouses found"}
            </p>
            <p className="text-xs text-slate-400">
              {lang === "bn" ? "নতুন ওয়্যারহাউজ যোগ করতে উপরের বাটনে চাপুন।" : "Try another filter or click 'Add Warehouse'."}
            </p>
          </div>
        ) : (
          filteredWarehouses.map((w) => (
            <CustomCard
              key={w.id}
              className="group p-5 hover:border-brand-primary/60 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-sm bg-brand-50 text-brand-primary border border-brand-border">
                        {w.code}
                      </span>
                      <h3 className="text-base font-bold text-slate-800 group-hover:text-brand-primary transition">
                        {w.name}
                      </h3>
                    </div>
                    {w.branch_name && (
                      <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1">
                        <Building2 size={12} className="text-slate-400" />
                        {w.branch_name}
                      </p>
                    )}
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      w.is_active
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {w.is_active ? (
                      <>
                        <CheckCircle2 size={10} className="text-emerald-500" />
                        {lang === "bn" ? "সক্রিয়" : "Active"}
                      </>
                    ) : (
                      <>
                        <XCircle size={10} className="text-slate-400" />
                        {lang === "bn" ? "নিষ্ক্রিয়" : "Inactive"}
                      </>
                    )}
                  </span>
                </div>

                {/* Details box */}
                <div className="space-y-2 text-xs text-slate-600 bg-slate-50/70 p-3 rounded-lg border border-slate-100 my-3">
                  <div className="flex items-center justify-between text-[11.5px]">
                    <span className="text-slate-400">{lang === "bn" ? "স্টোরের ধরন:" : "Store Type:"}</span>
                    <span className="font-semibold text-slate-700">{w.warehouse_type}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11.5px]">
                    <span className="text-slate-400">{lang === "bn" ? "গ্যারেজ অবস্থান:" : "Physical Bay:"}</span>
                    <span className="font-semibold text-slate-700">{w.location || "Main Yard"}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11.5px] pt-1 border-t border-slate-200/60">
                    <span className="text-slate-400">{lang === "bn" ? "নির্ধারিত বিন সংখ্যা:" : "Total Bins:"}</span>
                    <span className="inline-flex items-center gap-1 font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                      <Grid3X3 size={11} />
                      {w.total_bins || 0} {lang === "bn" ? "টি বিন" : "Bins"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2 gap-2 flex-wrap">
                <CustomButton
                  variant="outline"
                  size="sm"
                  onClick={() => openLocationsModal(w)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-primary border-brand-primary/30 hover:bg-brand-50 shadow-2xs cursor-pointer"
                >
                  <Grid3X3 size={13} />
                  <span>{lang === "bn" ? "স্টোরেজ বিন ও র‍্যাক" : "Manage Bins"}</span>
                </CustomButton>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(w)}
                    title={lang === "bn" ? "সম্পাদনা" : "Edit"}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition cursor-pointer"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteWhTarget(w)}
                    title={lang === "bn" ? "মুছুন" : "Delete"}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </CustomCard>
          ))
        )}
      </div>

      {/* ── Manage Storage Bins Interactive Modal / Drawer ── */}
      <CustomModal
        isOpen={locationsModalOpen}
        onClose={() => setLocationsModalOpen(false)}
        title={
          selectedWhForLoc
            ? (lang === "bn"
                ? `${selectedWhForLoc.name} (${selectedWhForLoc.code}) — স্টোরেজ বিন ও র‍্যাক`
                : `${selectedWhForLoc.name} (${selectedWhForLoc.code}) — Storage Bins & Racks`)
            : "Storage Bins"
        }
        size="xl"
      >
        <div className="space-y-4">
          {/* Subheader info bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">{selectedWhForLoc?.branch_name}</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500">{selectedWhForLoc?.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">
                {locPayload?.total_bins || 0} {lang === "bn" ? "টি কনফিগারকৃত বিন" : "Configured Bins"}
              </span>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-slate-200 gap-2">
            <button
              onClick={() => setActiveLocTab("grid")}
              className={`pb-2 px-3 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                activeLocTab === "grid"
                  ? "border-brand-primary text-brand-primary"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Grid3X3 size={13} />
              <span>{lang === "bn" ? "র‍্যাক ও বিন গ্রিড" : "Bins & Racks Grid"}</span>
              <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded-full text-[10px]">
                {locPayload?.total_bins || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveLocTab("bulk")}
              className={`pb-2 px-3 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                activeLocTab === "bulk"
                  ? "border-brand-primary text-brand-primary"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Sparkles size={13} />
              <span>{lang === "bn" ? "বাল্ক বিন জেনারেটর" : "Bulk Bin Generator"}</span>
            </button>

            <button
              onClick={() => setActiveLocTab("single")}
              className={`pb-2 px-3 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                activeLocTab === "single"
                  ? "border-brand-primary text-brand-primary"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Plus size={13} />
              <span>{lang === "bn" ? "একক বিন যোগ" : "Add Single Bin"}</span>
            </button>
          </div>

          {/* TAB 1: Visual Storage Grid & Hierarchy */}
          {activeLocTab === "grid" && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
              {loadingLocs ? (
                <div className="py-12 text-center text-slate-400">
                  <RefreshCw size={20} className="mx-auto animate-spin text-brand-primary mb-2" />
                  {lang === "bn" ? "স্টোরেজ বিন লোড হচ্ছে..." : "Loading storage bins..."}
                </div>
              ) : !locPayload || locPayload.locations.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Grid3X3 size={36} className="mx-auto text-slate-300" />
                  <p className="text-sm font-semibold text-slate-700">
                    {lang === "bn" ? "এই ওয়্যারহাউজে কোনো বিন নেই" : "No storage bins configured yet"}
                  </p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {lang === "bn"
                      ? "উপরে 'বাল্ক বিন জেনারেটর' ট্যাবে গিয়ে এক ক্লিকেই সম্পূর্ণ ওয়্যারহাউজের সব র‍্যাক ও বিন অটো-জেনারেট করে নিতে পারেন।"
                      : "Click 'Bulk Bin Generator' above to auto-generate rows, columns, racks, and bins in one click."}
                  </p>
                  <CustomButton
                    variant="primary"
                    size="sm"
                    onClick={() => setActiveLocTab("bulk")}
                    className="mt-2 text-xs"
                  >
                    <Sparkles size={13} className="mr-1.5" />
                    {lang === "bn" ? "বাল্ক জেনারেটরে যান" : "Go to Bulk Generator"}
                  </CustomButton>
                </div>
              ) : (
                locPayload.hierarchy.map((row) => (
                  <div key={row.row_code} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black bg-brand-primary text-white px-2.5 py-0.5 rounded">
                          ROW: {row.row_code}
                        </span>
                        <span className="text-xs font-bold text-slate-700">
                          {lang === "bn" ? `সারি ${row.row_code}` : `Aisle Row ${row.row_code}`}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {row.cols.map((col) => (
                        <div key={col.col_code} className="border border-slate-200 bg-white rounded-lg p-3 space-y-2.5 shadow-2xs">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                            <span className="text-slate-500 font-mono">COL: {col.col_code}</span>
                          </div>

                          <div className="space-y-2">
                            {col.racks.map((rack) => (
                              <div key={rack.rack_code} className="bg-slate-50/70 p-2 rounded-md border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                                  RACK {rack.rack_code}
                                </span>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                  {rack.bins.map((bin) => (
                                    <div
                                      key={bin.id}
                                      className="group/bin relative flex items-center justify-between p-2 rounded border border-slate-200 bg-white hover:border-brand-primary hover:shadow-xs transition text-xs"
                                    >
                                      <div>
                                        <p className="font-mono font-bold text-[11px] text-slate-900">{bin.bin_code}</p>
                                        <p className="font-mono text-[9px] text-slate-400 truncate max-w-[80px]" title={bin.full_code}>
                                          {bin.full_code}
                                        </p>
                                      </div>
                                      <button
                                        onClick={() => handleDeleteBin(bin.id)}
                                        title={lang === "bn" ? "বিন মুছুন" : "Delete Bin"}
                                        className="opacity-0 group-hover/bin:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: Bulk Storage Bin Generator */}
          {activeLocTab === "bulk" && (
            <div className="space-y-5 p-2">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-800 flex items-start gap-2.5">
                <Sparkles size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">
                    {lang === "bn" ? "বাল্ক অটোমেটিক বিন জেনারেশন" : "Bulk Storage Matrix Generator"}
                  </p>
                  <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                    {lang === "bn"
                      ? "সারি, কলাম, র‍্যাক ও বিনের সংখ্যা প্রদান করুন। সিস্টেম স্বয়ংক্রিয়ভাবে R01-C01-RK01-B01 প্যাটার্নে পুরো ওয়্যারহাউজের সব বিন রেজিস্ট্রি করে নিবে।"
                      : "Define rows, columns, racks, and bins count. System will automatically generate structured bins using the industry R01-C01-RK01-B01 code standard."}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === "bn" ? "সারি (Rows)" : "Rows Count"}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={genRows}
                    onChange={(e) => setGenRows(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-200 rounded-lg outline-none focus:border-brand-primary"
                  />
                  <span className="text-[10px] text-slate-400">e.g. R01, R02</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === "bn" ? "কলাম (Cols)" : "Columns Count"}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={genCols}
                    onChange={(e) => setGenCols(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-200 rounded-lg outline-none focus:border-brand-primary"
                  />
                  <span className="text-[10px] text-slate-400">e.g. C01, C02</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === "bn" ? "প্রতি কলামে র‍্যাক" : "Racks per Col"}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={genRacks}
                    onChange={(e) => setGenRacks(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-200 rounded-lg outline-none focus:border-brand-primary"
                  />
                  <span className="text-[10px] text-slate-400">e.g. RK01, RK02, RK03</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === "bn" ? "প্রতি র‍্যাকে বিন" : "Bins per Rack"}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={genBins}
                    onChange={(e) => setGenBins(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-200 rounded-lg outline-none focus:border-brand-primary"
                  />
                  <span className="text-[10px] text-slate-400">e.g. B01, B02</span>
                </div>
              </div>

              {/* Matrix Calculation Preview */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase">
                    {lang === "bn" ? "তৈরি হতে যাওয়া মোট বিন:" : "Total Bins To Generate:"}
                  </span>
                  <p className="text-xl font-black text-brand-primary mt-0.5">
                    {genRows * genCols * genRacks * genBins} {lang === "bn" ? "টি স্টোরেজ লোকেশন" : "Storage Locations"}
                  </p>
                  <p className="text-[11px] font-mono text-slate-400">
                    Pattern: R01-C01-RK01-B01 ... R{String(genRows).padStart(2, "0")}-C{String(genCols).padStart(2, "0")}-RK{String(genRacks).padStart(2, "0")}-B{String(genBins).padStart(2, "0")}
                  </p>
                </div>

                <CustomButton
                  variant="primary"
                  onClick={handleBulkGenerate}
                  disabled={generating}
                  className="font-bold text-xs shadow-md"
                >
                  <Sparkles size={14} className="mr-1.5" />
                  {generating ? (lang === "bn" ? "তৈরি হচ্ছে..." : "Generating...") : (lang === "bn" ? "জেনারেট করুন" : "Generate Bins")}
                </CustomButton>
              </div>
            </div>
          )}

          {/* TAB 3: Single Bin Creation */}
          {activeLocTab === "single" && (
            <form onSubmit={handleCreateSingleBin} className="space-y-4 p-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === "bn" ? "সারি কোড (Row)" : "Row Code"} *
                  </label>
                  <input
                    type="text"
                    required
                    value={singleRow}
                    onChange={(e) => setSingleRow(e.target.value.toUpperCase())}
                    placeholder="R01"
                    className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-200 rounded-lg outline-none focus:border-brand-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === "bn" ? "কলাম কোড (Col)" : "Column Code"} *
                  </label>
                  <input
                    type="text"
                    required
                    value={singleCol}
                    onChange={(e) => setSingleCol(e.target.value.toUpperCase())}
                    placeholder="C01"
                    className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-200 rounded-lg outline-none focus:border-brand-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === "bn" ? "র‍্যাক কোড (Rack)" : "Rack Code"} *
                  </label>
                  <input
                    type="text"
                    required
                    value={singleRack}
                    onChange={(e) => setSingleRack(e.target.value.toUpperCase())}
                    placeholder="RK01"
                    className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-200 rounded-lg outline-none focus:border-brand-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === "bn" ? "বিন কোড (Bin)" : "Bin Code"} *
                  </label>
                  <input
                    type="text"
                    required
                    value={singleBin}
                    onChange={(e) => setSingleBin(e.target.value.toUpperCase())}
                    placeholder="B01"
                    className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-200 rounded-lg outline-none focus:border-brand-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === "bn" ? "কাস্টম নাম / বিবরণ (ঐচ্ছিক)" : "Custom Bin Label"}
                  </label>
                  <input
                    type="text"
                    value={singleName}
                    onChange={(e) => setSingleName(e.target.value)}
                    placeholder="e.g. Upper Brake Shelf"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-brand-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === "bn" ? "ধারণক্ষমতা (ঐচ্ছিক)" : "Max Capacity"}
                  </label>
                  <input
                    type="number"
                    value={singleCapacity}
                    onChange={(e) => setSingleCapacity(e.target.value)}
                    placeholder="e.g. 50"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-brand-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <span className="font-mono text-xs font-bold text-slate-600">
                  Full Code: {`${singleRow.trim().toUpperCase()}-${singleCol.trim().toUpperCase()}-${singleRack.trim().toUpperCase()}-${singleBin.trim().toUpperCase()}`}
                </span>

                <CustomButton
                  variant="primary"
                  type="submit"
                  disabled={savingSingleBin}
                  className="font-bold text-xs"
                >
                  <Plus size={14} className="mr-1.5" />
                  {savingSingleBin ? (lang === "bn" ? "সংরক্ষণ হচ্ছে..." : "Saving...") : (lang === "bn" ? "বিন সেভ করুন" : "Save Bin")}
                </CustomButton>
              </div>
            </form>
          )}
        </div>
      </CustomModal>

      {/* ── Create / Edit Warehouse Modal ── */}
      <CustomModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editingWh
            ? (lang === "bn" ? "ওয়্যারহাউজ সম্পাদনা করুন" : "Edit Warehouse")
            : (lang === "bn" ? "নতুন ওয়্যারহাউজ যোগ করুন" : "Add New Warehouse")
        }
      >
        <form onSubmit={handleSubmitWarehouse} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {lang === "bn" ? "ডিপো / টার্মিনাল" : "Branch Depot"} *
            </label>
            <select
              required
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg outline-none focus:border-brand-primary bg-white text-slate-800"
            >
              <option value="">{lang === "bn" ? "ডিপো নির্বাচন করুন..." : "Select Depot..."}</option>
              {branches.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === "bn" ? "ওয়্যারহাউজের নাম" : "Warehouse Name"} *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sayedabad Central Spares Depot"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-brand-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === "bn" ? "ওয়্যারহাউজ কোড" : "Warehouse Code"} *
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="WH-DHK-01"
                className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-200 rounded-lg outline-none focus:border-brand-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === "bn" ? "স্টোরের ধরন" : "Store Type"}
              </label>
              <select
                value={warehouseType}
                onChange={(e) => setWarehouseType(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg outline-none focus:border-brand-primary bg-white text-slate-800"
              >
                {warehouseTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === "bn" ? "ইয়ার্ড / অবস্থান" : "Yard Bay Location"}
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Central Bay 1-4"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-brand-primary"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="whActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary cursor-pointer"
            />
            <label htmlFor="whActive" className="text-xs font-bold text-slate-700 cursor-pointer">
              {lang === "bn" ? "সক্রিয় স্টোর (Active Store for Ticketing Issue)" : "Active Store (Ready for Ticketing Issue)"}
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <CustomButton
              variant="outline"
              type="button"
              onClick={() => setModalOpen(false)}
              className="text-xs"
            >
              {lang === "bn" ? "বাতিল" : "Cancel"}
            </CustomButton>
            <CustomButton
              variant="primary"
              type="submit"
              disabled={submitting}
              className="text-xs font-bold"
            >
              {submitting
                ? (lang === "bn" ? "সংরক্ষণ হচ্ছে..." : "Saving...")
                : (lang === "bn" ? "সংরক্ষণ করুন" : "Save Warehouse")}
            </CustomButton>
          </div>
        </form>
      </CustomModal>

      {/* ── Confirm Delete Modal ── */}
      <ConfirmModal
        isOpen={!!deleteWhTarget}
        onClose={() => setDeleteWhTarget(null)}
        onConfirm={handleConfirmDelete}
        title={lang === "bn" ? "ওয়্যারহাউজ মুছে ফেলবেন?" : "Delete Warehouse?"}
        message={
          deleteWhTarget
            ? (lang === "bn"
                ? `আপনি কি নিশ্চিত যে '${deleteWhTarget.name}' মুছে ফেলতে চান? এর অন্তর্ভুক্ত সব স্টোরেজ বিনও মুছে যাবে।`
                : `Are you sure you want to delete '${deleteWhTarget.name}'? All configured location bins will also be removed.`)
            : ""
        }
        confirmText={deletingWh ? (lang === "bn" ? "মুছছে..." : "Deleting...") : (lang === "bn" ? "মুছে ফেলুন" : "Delete")}
        cancelText={lang === "bn" ? "বাতিল" : "Cancel"}
        variant="danger"
      />
    </div>
  );
}

export default function WarehousesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading warehouses...</div>}>
      <WarehousesContent />
    </Suspense>
  );
}
