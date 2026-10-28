"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  PlusCircle,
  Search,
  MapPin,
  Phone,
  CarFront,
  Edit2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Ticket,
  Warehouse as WhIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { Branch } from "@/lib/types";
import {
  CustomButton,
  CustomInput,
  CustomCard,
  CustomModal,
} from "@/components/custom";

export default function BranchesPage() {
  const { user } = useAuth();
  const { lang, t } = useLanguage();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Create / Edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadBranches = async () => {
    try {
      setLoading(true);
      const res = await api.get<any>("/api/v1/branches?page_size=100");
      setBranches(Array.isArray(res) ? res : (res?.items || []));
    } catch (err) {
      console.error("Failed to load branches:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  const openAddModal = () => {
    setEditingBranch(null);
    setName("");
    setCode("");
    setCity("");
    setAddress("");
    setPhone("");
    setIsActive(true);
    setModalOpen(true);
  };

  const openEditModal = (branch: Branch) => {
    setEditingBranch(branch);
    setName(branch.name);
    setCode(branch.code);
    setCity(branch.city || "");
    setAddress(branch.address || "");
    setPhone(branch.phone || "");
    setIsActive(branch.is_active);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      alert(lang === "bn" ? "ডিপোর নাম ও কোড বাধ্যতামূলক" : "Name and code are required");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        city: city.trim() || undefined,
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        is_active: isActive,
      };

      if (editingBranch) {
        await api.put(`/api/v1/branches/${editingBranch.id}`, payload);
      } else {
        await api.post("/api/v1/branches", payload);
      }

      setModalOpen(false);
      window.dispatchEvent(new Event("bus_inventory:branches_updated"));
      await loadBranches();
    } catch (err: any) {
      alert("❌ " + (err.message || "Failed to save depot"));
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = branches.filter((b) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      b.code.toLowerCase().includes(q) ||
      (b.city && b.city.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-primary via-brand-dark to-slate-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-md text-white border border-white/20">
                <Building2 size={13} />
                {lang === "bn" ? "সৌদিয়া টার্মিনাল ও ডিপো" : "Soudia Terminals & Workshops"}
              </span>
              <span className="text-xs text-white/70">
                • {lang === "bn" ? "ডিপো ও ওয়ার্কশপ তালিকা" : "Operational Depots & Hubs"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {lang === "bn" ? "ডিপো ও সার্ভিস হাবসমূহ" : "Operational Depots & Service Hubs"}
            </h1>
            <p className="mt-1 text-sm text-white/80 max-w-2xl">
              {lang === "bn"
                ? "টার্মিনাল লোকেশন, মেইনটেন্যান্স ওয়ার্কশপ, যোগাযোগ নম্বর ও বাস অ্যাসাইনমেন্ট পরিচালনা করুন।"
                : "Manage terminal locations, maintenance workshops, contact phone numbers, and active coach allocations across Bangladesh."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <CustomButton
              variant="outline"
              onClick={openAddModal}
              className="bg-white text-brand-dark hover:bg-slate-100 border-white text-xs font-bold"
            >
              <PlusCircle size={14} className="mr-1.5 text-brand-primary" />
              {lang === "bn" ? "নতুন ডিপো যোগ" : "Add Depot"}
            </CustomButton>
          </div>
        </div>

        {/* Decorative background watermark */}
        <div className="pointer-events-none absolute right-4 bottom-2 opacity-10">
          <Building2 size={180} />
        </div>
      </div>

      {/* Filter / Search Bar */}
      <CustomCard className="p-4 bg-white shadow-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === "bn" ? "নাম, কোড বা শহর দিয়ে খুঁজুন..." : "Search depot by name, code, or city..."}
              className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-brand-primary outline-none transition"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <span className="text-xs font-bold text-slate-500">
              {lang === "bn" ? `মোট ${filtered.length} টি ডিপো` : `Total ${filtered.length} Depots`}
            </span>
            <CustomButton
              variant="outline"
              size="sm"
              onClick={loadBranches}
              title={lang === "bn" ? "রিফ্রেশ" : "Refresh"}
              className="text-xs px-2.5"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            </CustomButton>
          </div>
        </div>
      </CustomCard>

      {/* Depots Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-400">
            <RefreshCw size={24} className="mx-auto animate-spin text-brand-primary mb-2" />
            {lang === "bn" ? "ডিপো তালিকা লোড হচ্ছে..." : "Loading depots..."}
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400">
            <Building2 size={40} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">
              {lang === "bn" ? "কোনো ডিপো পাওয়া যায়নি" : "No depots found"}
            </p>
            <p className="text-xs text-slate-400">
              {lang === "bn" ? "নতুন ডিপো যোগ করতে উপরের বাটনে চাপুন।" : "Try another search term or click 'Add Depot'."}
            </p>
          </div>
        ) : (
          filtered.map((b) => (
            <CustomCard
              key={b.id}
              className="group p-5 hover:border-brand-primary/60 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-sm bg-brand-50 text-brand-primary border border-brand-border">
                        {b.code}
                      </span>
                      <h3 className="text-base font-bold text-slate-800 group-hover:text-brand-primary transition">
                        {b.name}
                      </h3>
                    </div>
                    {b.city && (
                      <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1">
                        <MapPin size={12} className="text-slate-400" />
                        {b.city}
                      </p>
                    )}
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      b.is_active
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {b.is_active ? (
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

                <div className="space-y-2 text-xs text-slate-600 bg-slate-50/70 p-3 rounded-lg border border-slate-100 my-3">
                  <div className="flex items-start gap-2">
                    <MapPin size={13} className="text-slate-400 shrink-0 mt-0.5" />
                    <span className="text-[11.5px] leading-relaxed line-clamp-2">
                      {b.address || (lang === "bn" ? "ঠিকানা প্রদান করা হয়নি" : "Address not provided")}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone size={13} className="text-slate-400 shrink-0" />
                    <span className="font-mono text-[11.5px] font-semibold text-slate-700">
                      {b.phone || (lang === "bn" ? "ফোন নম্বর নেই" : "No hotline assigned")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2 gap-2 flex-wrap">
                <div className="flex items-center gap-3 text-xs">
                  <Link
                    href={`/fleet?branch_id=${b.id}`}
                    className="inline-flex items-center gap-1.5 font-bold text-slate-700 hover:text-brand-primary transition"
                  >
                    <CarFront size={13} className="text-brand-primary" />
                    <span>
                      {lang === "bn" ? `${b.bus_count || 0} টি বাস` : `${b.bus_count || 0} Coaches`}
                    </span>
                  </Link>

                  <span className="text-slate-300">•</span>

                  <Link
                    href={`/warehouses?branch_id=${b.id}`}
                    className="inline-flex items-center gap-1.5 font-bold text-slate-700 hover:text-brand-primary transition"
                  >
                    <WhIcon size={13} className="text-brand-primary" />
                    <span>
                      {lang === "bn" ? `${b.warehouse_count || 0} টি স্টোর` : `${b.warehouse_count || 0} Stores`}
                    </span>
                  </Link>
                </div>

                <CustomButton
                  variant="outline"
                  size="sm"
                  onClick={() => openEditModal(b)}
                  className="text-xs px-2.5 h-8"
                >
                  <Edit2 size={12} className="mr-1" />
                  {lang === "bn" ? "সম্পাদনা" : "Edit"}
                </CustomButton>
              </div>
            </CustomCard>
          ))
        )}
      </div>

      {/* Create / Edit Modal */}
      <CustomModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editingBranch
            ? (lang === "bn" ? "ডিপোর তথ্য পরিবর্তন" : "Edit Operational Depot")
            : (lang === "bn" ? "নতুন ডিপো যোগ করুন" : "Add New Depot")
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <CustomInput
            label={lang === "bn" ? "ডিপো বা ওয়ার্কশপের নাম *" : "Depot Name *"}
            placeholder="e.g. Dhaka Central Terminal & Depot"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <CustomInput
              label={lang === "bn" ? "ডিপো কোড *" : "Depot Code *"}
              placeholder="e.g. DHK-01"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
            />
            <CustomInput
              label={lang === "bn" ? "শহর" : "City"}
              placeholder="e.g. Dhaka, Chittagong"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>

          <CustomInput
            label={lang === "bn" ? "ওয়ার্কশপের ঠিকানা" : "Workshop Address"}
            placeholder="e.g. Gabtoli Bus Terminal, Mirpur Road, Dhaka"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          <CustomInput
            label={lang === "bn" ? "যোগাযোগের ফোন নম্বর" : "Contact Hotline Phone"}
            placeholder="e.g. +880 1711-234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="branchActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded-xs border-slate-300 text-brand-primary focus:ring-brand-primary"
            />
            <label htmlFor="branchActive" className="text-xs font-semibold text-slate-700 cursor-pointer">
              {lang === "bn" ? "চালু ও সক্রিয় ডিপো" : "Active Operational Depot"}
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <CustomButton
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(false)}
            >
              {lang === "bn" ? "বাতিল" : "Cancel"}
            </CustomButton>
            <CustomButton
              type="submit"
              variant="primary"
              size="sm"
              disabled={submitting}
            >
              {submitting
                ? (lang === "bn" ? "সংরক্ষণ হচ্ছে..." : "Saving...")
                : editingBranch
                ? (lang === "bn" ? "আপডেট করুন" : "Update Depot")
                : (lang === "bn" ? "ডিপো তৈরি করুন" : "Create Depot")}
            </CustomButton>
          </div>
        </form>
      </CustomModal>
    </div>
  );
}
