"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import {
  Truck,
  PlusCircle,
  Search,
  Building2,
  MapPin,
  Phone,
  Mail,
  User as UserIcon,
  Star,
  Tag,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  PackageCheck,
  AlertCircle,
  Plus,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { Supplier, PageResponse } from "@/lib/types";
import {
  CustomButton,
  CustomInput,
  CustomCard,
  CustomModal,
  ConfirmModal,
} from "@/components/custom";
import { toast } from "react-toastify";

const PRESET_CATEGORIES = [
  "Engine",
  "Braking",
  "Suspension",
  "Electrical",
  "Tyres",
  "Lubricants",
  "Transmission",
  "AC & Cooling",
  "Body & Glass",
];

function SuppliersContent() {
  const { user } = useAuth();
  const { lang } = useLanguage();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Create / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [customCategory, setCustomCategory] = useState("");
  const [rating, setRating] = useState(5.0);
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load suppliers
  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const res = await api.get<PageResponse<Supplier>>("/api/v1/suppliers?page_size=200");
      setSuppliers(res?.items || []);
    } catch (err: any) {
      console.error("Failed to load suppliers:", err);
      toast.error(err?.message || (lang === "bn" ? "ভেন্ডর লোড করতে ব্যর্থ হয়েছে" : "Failed to load suppliers"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingSupplier(null);
    setName("");
    setContactPerson("");
    setPhone("");
    setEmail("");
    setAddress("");
    setCategories([]);
    setCustomCategory("");
    setRating(5.0);
    setNotes("");
    setIsActive(true);
    setModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (sup: Supplier) => {
    setEditingSupplier(sup);
    setName(sup.name || "");
    setContactPerson(sup.contact_person || "");
    setPhone(sup.phone || "");
    setEmail(sup.email || "");
    setAddress(sup.address || "");
    const cats = sup.supplied_categories
      ? sup.supplied_categories.split(",").map((c) => c.trim()).filter(Boolean)
      : [];
    setCategories(cats);
    setCustomCategory("");
    setRating(sup.rating || 5.0);
    setNotes(sup.notes || "");
    setIsActive(sup.is_active);
    setModalOpen(true);
  };

  const toggleCategory = (cat: string) => {
    if (categories.includes(cat)) {
      setCategories(categories.filter((c) => c !== cat));
    } else {
      setCategories([...categories, cat]);
    }
  };

  const handleAddCustomCategory = () => {
    const trimmed = customCategory.trim();
    if (trimmed && !categories.includes(trimmed)) {
      setCategories([...categories, trimmed]);
      setCustomCategory("");
    }
  };

  // Save Supplier
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.warning(lang === "bn" ? "ভেন্ডরের নাম আবশ্যক" : "Supplier name is required");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: name.trim(),
        contact_person: contactPerson.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        supplied_categories: categories.join(", ") || null,
        rating: Number(rating) || 5.0,
        notes: notes.trim() || null,
        is_active: isActive,
      };

      if (editingSupplier) {
        await api.put(`/api/v1/suppliers/${editingSupplier.id}`, payload);
        toast.success(lang === "bn" ? "ভেন্ডরের তথ্য সফলভাবে আপডেট হয়েছে" : "Supplier updated successfully");
      } else {
        await api.post("/api/v1/suppliers", payload);
        toast.success(lang === "bn" ? "নতুন ভেন্ডর সফলভাবে যুক্ত হয়েছে" : "New supplier added successfully");
      }

      setModalOpen(false);
      await loadSuppliers();
    } catch (err: any) {
      console.error("Save supplier failed:", err);
      toast.error(err?.message || (lang === "bn" ? "সংরক্ষণ করতে ব্যর্থ হয়েছে" : "Failed to save supplier"));
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Supplier
  const handleDeleteSupplier = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await api.delete(`/api/v1/suppliers/${deleteTarget.id}`);
      toast.success(lang === "bn" ? "ভেন্ডর মুছে ফেলা হয়েছে" : "Supplier deleted successfully");
      setDeleteTarget(null);
      await loadSuppliers();
    } catch (err: any) {
      console.error("Delete supplier failed:", err);
      toast.error(err?.message || (lang === "bn" ? "ভেন্ডর মুছতে ব্যর্থ হয়েছে" : "Failed to delete supplier"));
    } finally {
      setDeleting(false);
    }
  };

  // Filtered Suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      // Status filter
      if (statusFilter === "active" && !s.is_active) return false;
      if (statusFilter === "inactive" && s.is_active) return false;

      // Category filter
      if (selectedCategory !== "all") {
        if (!s.supplied_categories || !s.supplied_categories.toLowerCase().includes(selectedCategory.toLowerCase())) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesContact = s.contact_person?.toLowerCase().includes(q);
        const matchesPhone = s.phone?.toLowerCase().includes(q);
        const matchesEmail = s.email?.toLowerCase().includes(q);
        const matchesAddress = s.address?.toLowerCase().includes(q);
        const matchesCat = s.supplied_categories?.toLowerCase().includes(q);
        if (!matchesName && !matchesContact && !matchesPhone && !matchesEmail && !matchesAddress && !matchesCat) {
          return false;
        }
      }

      return true;
    });
  }, [suppliers, searchQuery, selectedCategory, statusFilter]);

  // Unique categories in database
  const allCategories = useMemo(() => {
    const set = new Set<string>();
    PRESET_CATEGORIES.forEach((c) => set.add(c));
    suppliers.forEach((s) => {
      if (s.supplied_categories) {
        s.supplied_categories.split(",").forEach((cat) => {
          const t = cat.trim();
          if (t) set.add(t);
        });
      }
    });
    return Array.from(set);
  }, [suppliers]);

  // Quick KPIs
  const totalCount = suppliers.length;
  const activeCount = suppliers.filter((s) => s.is_active).length;
  const topRatedCount = suppliers.filter((s) => (s.rating || 0) >= 4.8).length;
  const categoriesCount = allCategories.length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 border-b border-rose-900/40 px-6 py-8 text-white shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(236,30,33,0.15),transparent_70%)] pointer-events-none" />
        
        <div className="relative max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#ec1e21] to-rose-500 flex items-center justify-center shadow-lg shadow-rose-950/50 ring-2 ring-white/20">
              <Truck className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {lang === "bn" ? "পার্টস ভেন্ডর ও সাপ্লায়ার্স" : "Parts Vendors & Suppliers"}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {lang === "bn" ? `মোট ${totalCount} টি নথিভুক্ত` : `${totalCount} Registered`}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-1">
                {lang === "bn" ? "পার্টস সরবরাহকারী ডিরেক্টরি" : "Parts Suppliers & Vendors Directory"}
              </h1>
              <p className="text-sm text-slate-300 max-w-2xl mt-0.5">
                {lang === "bn"
                  ? "বাসের জেনুইন স্পেয়ার পার্টস ভেন্ডর, ওয়ারেন্টি সেবা প্রদানকারী ও অনুমোদিত সরবরাহকারী ব্যবস্থাপনা।"
                  : "Directory of authorized bus spare parts suppliers, warranty providers, and procurement vendors."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <CustomButton
              variant="outline"
              size="sm"
              onClick={loadSuppliers}
              disabled={loading}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              {lang === "bn" ? "রিফ্রেশ" : "Refresh"}
            </CustomButton>

            <CustomButton
              variant="primary"
              size="sm"
              onClick={handleOpenCreate}
              className="bg-[#ec1e21] hover:bg-rose-600 text-white shadow-lg shadow-rose-900/40 ring-1 ring-white/30"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              {lang === "bn" ? "নতুন ভেন্ডর যুক্ত করুন" : "Add New Supplier"}
            </CustomButton>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <CustomCard className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {lang === "bn" ? "মোট সরবরাহকারী" : "Total Suppliers"}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {totalCount}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-[#ec1e21] flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              {lang === "bn" ? "নথিভুক্ত পার্টস ভেন্ডর" : "Registered parts vendors"}
            </div>
          </CustomCard>

          <CustomCard className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {lang === "bn" ? "সক্রিয় পার্টনার" : "Active Partners"}
                </p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {activeCount}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
              {lang === "bn" ? "বর্তমান সরবরাহ সচল রয়েছে" : "Currently active vendors"}
            </div>
          </CustomCard>

          <CustomCard className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {lang === "bn" ? "শীর্ষ রেটেড ভেন্ডর" : "Top Rated"}
                </p>
                <p className="text-2xl font-bold text-amber-500 mt-1">
                  {topRatedCount}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center">
                <Star className="w-5 h-5 fill-amber-500" />
              </div>
            </div>
            <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              {lang === "bn" ? "৪.৮+ স্টার গ্রাহক রেটিং" : "4.8+ Star rating"}
            </div>
          </CustomCard>

          <CustomCard className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {lang === "bn" ? "পার্টস ক্যাটাগরি" : "Parts Categories"}
                </p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                  {categoriesCount}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
                <Tag className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
              {lang === "bn" ? "ইঞ্জিন, ব্রেক, টায়ার ইত্যাদি" : "Engine, brakes, tyres etc"}
            </div>
          </CustomCard>
        </div>

        {/* Filter Bar & Search */}
        <CustomCard className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  lang === "bn"
                    ? "ভেন্ডরের নাম, ফোন, ক্যাটাগরি বা ঠিকানা দিয়ে খুঁজুন..."
                    : "Search by vendor name, phone, category or address..."
                }
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ec1e21]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-1">
                {lang === "bn" ? "অবস্থা:" : "Status:"}
              </span>
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === "all"
                    ? "bg-[#ec1e21] text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                {lang === "bn" ? "সব" : "All"} ({suppliers.length})
              </button>
              <button
                onClick={() => setStatusFilter("active")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === "active"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                {lang === "bn" ? "সক্রিয়" : "Active"} ({activeCount})
              </button>
              <button
                onClick={() => setStatusFilter("inactive")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === "inactive"
                    ? "bg-slate-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                {lang === "bn" ? "নিষ্ক্রিয়" : "Inactive"} ({totalCount - activeCount})
              </button>
            </div>
          </div>

          {/* Category Chips Scroll */}
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
              {lang === "bn" ? "ক্যাটাগরি:" : "Category:"}
            </span>
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap transition-colors ${
                selectedCategory === "all"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-medium"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              {lang === "bn" ? "সকল ক্যাটাগরি" : "All Categories"}
            </button>
            {allCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat === selectedCategory ? "all" : cat)}
                className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap transition-colors ${
                  selectedCategory.toLowerCase() === cat.toLowerCase()
                    ? "bg-[#ec1e21] text-white font-medium shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </CustomCard>

        {/* Suppliers Grid */}
        {loading ? (
          <div className="py-20 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#ec1e21]" />
            <p className="mt-3 text-sm text-slate-500">
              {lang === "bn" ? "ভেন্ডর লোড হচ্ছে..." : "Loading suppliers..."}
            </p>
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <CustomCard className="py-16 px-4 text-center bg-white dark:bg-slate-900 border-dashed border-2 border-slate-200 dark:border-slate-800">
            <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/40 text-[#ec1e21] flex items-center justify-center mx-auto mb-4">
              <Truck className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {lang === "bn" ? "কোন সরবরাহকারী পাওয়া যায়নি" : "No suppliers found"}
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
              {searchQuery || selectedCategory !== "all" || statusFilter !== "all"
                ? lang === "bn"
                  ? "আপনার অনুসন্ধানের সাথে মেলে এমন কোনো ভেন্ডর নেই। ফিল্টার রিসেট করে আবার চেষ্টা করুন।"
                  : "No suppliers match your active filter. Try resetting search parameters."
                : lang === "bn"
                ? "এখনো কোনো সরবরাহকারী নথিভুক্ত করা হয়নি। নতুন ভেন্ডর যুক্ত করতে উপরের বাটনে ক্লিক করুন।"
                : "No suppliers have been registered yet. Click the button above to add one."}
            </p>
            <div className="mt-5 flex justify-center gap-3">
              {(searchQuery || selectedCategory !== "all" || statusFilter !== "all") && (
                <CustomButton
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                    setStatusFilter("all");
                  }}
                >
                  {lang === "bn" ? "ফিল্টার রিসেট করুন" : "Reset Filters"}
                </CustomButton>
              )}
              <CustomButton
                variant="primary"
                size="sm"
                onClick={handleOpenCreate}
                className="bg-[#ec1e21] hover:bg-rose-600 text-white"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                {lang === "bn" ? "ভেন্ডর যুক্ত করুন" : "Add Supplier"}
              </CustomButton>
            </div>
          </CustomCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSuppliers.map((sup) => {
              const categoriesList = sup.supplied_categories
                ? sup.supplied_categories.split(",").map((c) => c.trim()).filter(Boolean)
                : [];

              return (
                <CustomCard
                  key={sup.id}
                  className="flex flex-col justify-between p-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:shadow-md hover:border-rose-300 dark:hover:border-rose-900 transition-all group"
                >
                  <div>
                    {/* Header: Title & Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900 dark:text-white truncate group-hover:text-[#ec1e21] transition-colors">
                            {sup.name}
                          </h3>
                        </div>
                        {/* Rating Stars */}
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="flex items-center text-amber-500">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3.5 h-3.5 ${
                                  (sup.rating || 5) >= s
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-slate-300 dark:text-slate-700"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {Number(sup.rating || 5).toFixed(1)}
                          </span>
                        </div>
                      </div>

                      {/* Active Status Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                          sup.is_active
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        {sup.is_active ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {lang === "bn" ? "সক্রিয়" : "Active"}
                          </>
                        ) : (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            {lang === "bn" ? "নিষ্ক্রিয়" : "Inactive"}
                          </>
                        )}
                      </span>
                    </div>

                    {/* Category Tags */}
                    {categoriesList.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {categoriesList.map((cat, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-100 dark:border-rose-900/40"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Contact Details */}
                    <div className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                      {sup.contact_person && (
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {sup.contact_person}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ({lang === "bn" ? "দায়িত্বপ্রাপ্ত" : "Focal"})
                          </span>
                        </div>
                      )}

                      {sup.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <a
                            href={`tel:${sup.phone}`}
                            className="hover:text-[#ec1e21] hover:underline font-mono"
                          >
                            {sup.phone}
                          </a>
                        </div>
                      )}

                      {sup.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <a
                            href={`mailto:${sup.email}`}
                            className="hover:text-[#ec1e21] hover:underline truncate"
                          >
                            {sup.email}
                          </a>
                        </div>
                      )}

                      {sup.address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2 text-slate-500 dark:text-slate-400">
                            {sup.address}
                          </span>
                        </div>
                      )}

                      {sup.notes && (
                        <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-md text-[11px] text-slate-600 dark:text-slate-400 italic">
                          &ldquo;{sup.notes}&rdquo;
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {sup.phone && (
                        <a
                          href={`tel:${sup.phone}`}
                          title={lang === "bn" ? "কল করুন" : "Call"}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#ec1e21] hover:bg-rose-50 transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {sup.email && (
                        <a
                          href={`mailto:${sup.email}`}
                          title={lang === "bn" ? "ইমেইল পাঠান" : "Email"}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#ec1e21] hover:bg-rose-50 transition-colors"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(sup)}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                        {lang === "bn" ? "সম্পাদনা" : "Edit"}
                      </button>

                      <button
                        onClick={() => setDeleteTarget(sup)}
                        className="p-1 text-xs font-medium rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        title={lang === "bn" ? "মুছে ফেলুন" : "Delete"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </CustomCard>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Supplier Modal */}
      <CustomModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editingSupplier
            ? lang === "bn"
              ? "সরবরাহকারী তথ্য সম্পাদনা"
              : "Edit Supplier Details"
            : lang === "bn"
            ? "নতুন পার্টস সরবরাহকারী যুক্ত করুন"
            : "Add New Parts Supplier"
        }
        className="max-w-2xl"
      >
        <form onSubmit={handleSaveSupplier} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {lang === "bn" ? "ভেন্ডর / প্রতিষ্ঠানের নাম" : "Supplier / Vendor Name"} *
              </label>
              <CustomInput
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Hino Genuine Spares (Navana)"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {lang === "bn" ? "যোগাযোগকারী ব্যক্তি (Focal Person)" : "Contact Person"}
              </label>
              <CustomInput
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Engr. Tanvir Ahmed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {lang === "bn" ? "ফোন নম্বর" : "Phone Number"}
              </label>
              <CustomInput
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+880 1711-xxxxxx"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {lang === "bn" ? "ইমেইল এড্রেস" : "Email Address"}
              </label>
              <CustomInput
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="parts@vendor.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {lang === "bn" ? "অফিস / গুদাম ঠিকানা" : "Address / Location"}
            </label>
            <CustomInput
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 12/A Tejgaon I/A, Dhaka-1208"
            />
          </div>

          {/* Supplied Categories Multi-select */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {lang === "bn" ? "সরবরাহকৃত পার্টস ক্যাটাগরি" : "Supplied Parts Categories"}
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {PRESET_CATEGORIES.map((cat) => {
                const selected = categories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      selected
                        ? "bg-[#ec1e21] text-white shadow-sm ring-1 ring-rose-400"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                    }`}
                  >
                    {selected ? "✓ " : "+ "}
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Custom category input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCustomCategory();
                  }
                }}
                placeholder={lang === "bn" ? "অন্য কোনো ক্যাটাগরি লিখুন..." : "Add other category..."}
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={handleAddCustomCategory}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 rounded-lg"
              >
                {lang === "bn" ? "যোগ করুন" : "Add"}
              </button>
            </div>

            {categories.length > 0 && (
              <div className="mt-2 text-xs text-slate-500">
                {lang === "bn" ? "নির্বাচিত ক্যাটাগরি:" : "Selected:"} {categories.join(", ")}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {lang === "bn" ? "ভেন্ডর রেটিং (১ থেকে ৫)" : "Vendor Rating (1 to 5)"}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="0.1"
                  value={rating}
                  onChange={(e) => setRating(parseFloat(e.target.value))}
                  className="w-full accent-[#ec1e21]"
                />
                <div className="flex items-center gap-1 font-bold text-amber-500 shrink-0">
                  <Star className="w-4 h-4 fill-amber-500" />
                  <span>{rating.toFixed(1)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center pt-5">
              <label className="relative flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#ec1e21]"></div>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {lang === "bn" ? "ভেন্ডর বর্তমানে সক্রিয়" : "Active Vendor"}
                </span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {lang === "bn" ? "নোটস / চুক্তি বিবরণ" : "Notes / Agreement Details"}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                lang === "bn"
                  ? "ওয়ারেন্টি শর্ত, পেমেন্ট ট্রার্মস বা বিশেষ মন্তব্য..."
                  : "Warranty terms, credit limit, special terms..."
              }
              className="w-full p-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
            <CustomButton
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
              disabled={submitting}
            >
              {lang === "bn" ? "বাতিল" : "Cancel"}
            </CustomButton>
            <CustomButton
              type="submit"
              variant="primary"
              disabled={submitting}
              className="bg-[#ec1e21] hover:bg-rose-600 text-white"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  {lang === "bn" ? "সংরক্ষণ হচ্ছে..." : "Saving..."}
                </>
              ) : editingSupplier ? (
                lang === "bn" ? "আপডেট করুন" : "Update"
              ) : (
                lang === "bn" ? "সংরক্ষণ করুন" : "Save Supplier"
              )}
            </CustomButton>
          </div>
        </form>
      </CustomModal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteSupplier}
        title={lang === "bn" ? "সরবরাহকারী মুছে ফেলার নিশ্চিতকরণ" : "Confirm Supplier Deletion"}
        message={
          lang === "bn"
            ? `আপনি কি নিশ্চিতভাবে "${deleteTarget?.name}" সরবরাহকারী তালিকা থেকে মুছে ফেলতে চান?`
            : `Are you sure you want to delete supplier "${deleteTarget?.name}" from the directory?`
        }
        confirmText={lang === "bn" ? "মুছে ফেলুন" : "Delete"}
        cancelText={lang === "bn" ? "বাতিল" : "Cancel"}
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}

export default function SuppliersPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ec1e21]" />
        </div>
      }
    >
      <SuppliersContent />
    </Suspense>
  );
}
