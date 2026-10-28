"use client";

import { useEffect, useState, useRef } from "react";
import {
  Settings,
  Building2,
  Image as ImageIcon,
  Upload,
  Save,
  CheckCircle2,
  ShieldCheck,
  FileText,
  DollarSign,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import {
  CustomButton,
  CustomInput,
  CustomCard,
} from "@/components/custom";

export default function SettingsPage() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  // Settings fields
  const [appName, setAppName] = useState("Soudia Parts Ticketing");
  const [appTagline, setAppTagline] = useState("3-Step Verification • Fleet Maintenance • Gate Pass");
  const [companyName, setCompanyName] = useState("Soudia Coach Service Ltd.");
  const [companyTagline, setCompanyTagline] = useState("Safe, Comfortable & Punctual Coach Transport");
  const [companyAddress, setCompanyAddress] = useState("Dampara Central Workshop, Chittagong & Gabtoli Depot, Dhaka");
  const [companyPhone, setCompanyPhone] = useState("+880 1711-000000 / 01819-000000");
  const [companyEmail, setCompanyEmail] = useState("maintenance@soudiabd.com");
  const [currencySymbol, setCurrencySymbol] = useState("৳");
  const [companyLogo, setCompanyLogo] = useState("");

  // Ticketing policies
  const [requireReplacementPhotos, setRequireReplacementPhotos] = useState(true);
  const [requireTransferMutualLog, setRequireTransferMutualLog] = useState(true);
  const [form1804RequiredForRelease, setForm1804RequiredForRelease] = useState(true);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await api.get<Record<string, any>>("/api/v1/settings");
      if (data) {
        if (data.app_name) setAppName(data.app_name);
        if (data.app_tagline) setAppTagline(data.app_tagline);
        if (data.company_name) setCompanyName(data.company_name);
        if (data.company_tagline) setCompanyTagline(data.company_tagline);
        if (data.company_address) setCompanyAddress(data.company_address);
        if (data.company_phone) setCompanyPhone(data.company_phone);
        if (data.company_email) setCompanyEmail(data.company_email);
        if (data.currency_symbol) setCurrencySymbol(data.currency_symbol);
        if (data.company_logo) setCompanyLogo(data.company_logo);
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLogoUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await api.postFormData<{ url: string }>("/api/v1/settings/logo", formData);
      if (res?.url) {
        setCompanyLogo(res.url);
        localStorage.setItem("bus_inventory_logo", res.url);
        window.dispatchEvent(new CustomEvent("bus_inventory:logo_changed", { detail: res.url }));
        alert(
          lang === "bn"
            ? "✅ কোম্পানির লোগো সফলভাবে আপলোড করা হয়েছে!"
            : "✅ Company logo uploaded and updated successfully!"
        );
      }
    } catch (err: any) {
      alert("❌ " + (err.message || (lang === "bn" ? "লোগো আপলোড ব্যর্থ হয়েছে" : "Failed to upload logo")));
    } finally {
      setLogoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        app_name: appName.trim(),
        app_tagline: appTagline.trim(),
        company_name: companyName.trim(),
        company_tagline: companyTagline.trim(),
        company_address: companyAddress.trim(),
        company_phone: companyPhone.trim(),
        company_email: companyEmail.trim(),
        currency_symbol: currencySymbol.trim(),
        company_logo: companyLogo,
      };

      await api.put("/api/v1/settings", payload);

      // Notify header and cache locally
      localStorage.setItem("bus_inventory_app_name", appName.trim());
      localStorage.setItem("bus_inventory_app_tagline", appTagline.trim());
      window.dispatchEvent(
        new CustomEvent("bus_inventory:brand_changed", {
          detail: {
            app_name: appName.trim(),
            app_tagline: appTagline.trim(),
            company_logo: companyLogo,
          },
        })
      );

      alert(
        lang === "bn"
          ? "✅ সিস্টেমের ব্র্যান্ডিং ও সেটিংস সফলভাবে সংরক্ষিত হয়েছে!"
          : "✅ System branding & parameters saved successfully!"
      );
    } catch (err: any) {
      alert("❌ " + (err.message || (lang === "bn" ? "সেটিংস সংরক্ষণ ব্যর্থ হয়েছে" : "Failed to save settings")));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-primary via-brand-dark to-slate-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-md text-white border border-white/20">
                <Settings size={13} />
                {lang === "bn" ? "সিস্টেম কনফিগারেশন" : "Global Configuration"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {lang === "bn" ? "কোম্পানি ব্র্যান্ডিং ও সিস্টেম সেটিংস" : "Company Branding & System Parameters"}
            </h1>
            <p className="mt-1 text-sm text-white/80 max-w-2xl">
              {lang === "bn"
                ? "সৌদিয়া ব্র্যান্ডের পরিচিতি, অ্যাপের শিরোনাম, যোগাযোগের নম্বর, লোগো এবং টিকিটিং যাচাইকরণের নিয়মাবলী পরিচালনা করুন।"
                : "Configure Soudia brand identity, application header titles, contact phone numbers, logo asset, and ticketing verification rules."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <CustomButton
              variant="outline"
              onClick={handleSaveSettings}
              disabled={saving}
              className="bg-white text-brand-dark hover:bg-slate-100 border-white text-xs font-bold"
            >
              <Save size={14} className="mr-1.5 text-brand-primary" />
              {saving
                ? (lang === "bn" ? "সংরক্ষণ হচ্ছে..." : "Saving...")
                : (lang === "bn" ? "সেটিংস সংরক্ষণ করুন" : "Save Settings")}
            </CustomButton>
          </div>
        </div>

        {/* Decorative background watermark */}
        <div className="pointer-events-none absolute right-4 bottom-2 opacity-10">
          <Settings size={180} />
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Logo & Visual Brand Asset */}
          <div className="space-y-6">
            <CustomCard className="p-5">
              <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                <ImageIcon size={16} className="text-brand-primary" />
                {lang === "bn" ? "কোম্পানির অফিসিয়াল লোগো" : "Company Logo Asset"}
              </h3>

              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition">
                {companyLogo ? (
                  <div className="relative group mb-3">
                    <img
                      src={companyLogo}
                      alt="Company Logo"
                      className="max-h-24 max-w-full object-contain rounded-lg p-2 bg-white shadow-xs border border-slate-200"
                    />
                  </div>
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-50 border border-brand-border text-brand-primary mb-3">
                    <Building2 size={36} />
                  </div>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoUpload}
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                />

                <CustomButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={logoUploading}
                  className="text-xs"
                >
                  <Upload size={13} className="mr-1.5" />
                  {logoUploading
                    ? (lang === "bn" ? "আপলোড হচ্ছে..." : "Uploading...")
                    : (lang === "bn" ? "নতুন লোগো আপলোড করুন" : "Upload New Logo")}
                </CustomButton>
                <p className="text-[10.5px] text-slate-400 mt-2 text-center">
                  {lang === "bn"
                    ? "PNG, JPG, WEBP অথবা SVG (পরামর্শ: ২৫০×৮০ পিক্সেল)"
                    : "PNG, JPG, WEBP or SVG (Recommended 250×80px)"}
                </p>
              </div>
            </CustomCard>

            <CustomCard className="p-5">
              <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                <Sparkles size={16} className="text-brand-primary" />
                {lang === "bn" ? "বর্তমান থিম ও ডিজাইন" : "Active Theme & UI"}
              </h3>
              <div className="p-3 rounded-lg bg-brand-50/60 border border-brand-border">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-4 w-4 rounded-full bg-brand-primary ring-2 ring-brand-primary/30" />
                  <div>
                    <p className="text-xs font-bold text-brand-dark">Ocean Wave Crimson (#ec1e21)</p>
                    <p className="text-[10.5px] text-slate-500">
                      {lang === "bn" ? "সৌদিয়া কোচের অফিসিয়াল সিগনেচার রঙ" : "Official Soudia Coach signature livery"}
                    </p>
                  </div>
                </div>
              </div>
            </CustomCard>
          </div>

          {/* Right 2 Columns: Application Details & Policies */}
          <div className="lg:col-span-2 space-y-6">
            {/* System Title & Identity */}
            <CustomCard className="p-5">
              <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                <Building2 size={16} className="text-brand-primary" />
                {lang === "bn" ? "অ্যাপ্লিকেশনের শিরোনাম ও কোম্পানির তথ্য" : "Application Title & Company Profile"}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CustomInput
                  label={lang === "bn" ? "সিস্টেমের নাম *" : "App Header Name *"}
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="e.g. Soudia Parts Ticketing"
                  required
                />

                <CustomInput
                  label={lang === "bn" ? "অ্যাপ ট্যাগলাইন" : "App Tagline"}
                  value={appTagline}
                  onChange={(e) => setAppTagline(e.target.value)}
                  placeholder="e.g. 3-Step Verification • Fleet Maintenance"
                />

                <CustomInput
                  label={lang === "bn" ? "নিবন্ধিত কোম্পানির নাম" : "Company Registered Name"}
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Soudia Coach Service Ltd."
                />

                <CustomInput
                  label={lang === "bn" ? "মুদ্রার প্রতীক" : "Currency Symbol"}
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  placeholder="e.g. ৳"
                />
              </div>

              <div className="mt-4 space-y-4">
                <CustomInput
                  label={lang === "bn" ? "ওয়ার্কশপ ও কেন্দ্রীয় কার্যালয়ের ঠিকানা" : "Workshop & Head Office Address"}
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  placeholder="e.g. Dampara Central Workshop, Chittagong & Gabtoli Depot, Dhaka"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <CustomInput
                    label={lang === "bn" ? "অফিসিয়াল হটলাইন ফোন নম্বর" : "Official Maintenance Hotline"}
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    placeholder="e.g. +880 1711-000000"
                  />

                  <CustomInput
                    label={lang === "bn" ? "অফিসিয়াল ইমেইল" : "Official Contact Email"}
                    type="email"
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    placeholder="e.g. maintenance@soudiabd.com"
                  />
                </div>
              </div>
            </CustomCard>

            {/* Ticketing & Verification Rules */}
            <CustomCard className="p-5">
              <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                <ShieldCheck size={16} className="text-brand-primary" />
                {lang === "bn" ? "ভেরিফিকেশন পাইপলাইন ও গেটপাস নীতি" : "Verification Pipeline & Gate Pass Policy"}
              </h3>

              <div className="space-y-3.5">
                <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50 select-none">
                  <input
                    type="checkbox"
                    checked={requireReplacementPhotos}
                    onChange={(e) => setRequireReplacementPhotos(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded-xs border-slate-300 text-brand-primary focus:ring-brand-primary"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      {lang === "bn"
                        ? "পার্টস প্রতিস্থাপনে ত্রুটির ছবি সংযুক্তকরণ বাধ্যতামূলক"
                        : "Mandatory Defect Photo Upload for Part Replacements"}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {lang === "bn"
                        ? "স্টোর ইনচার্জের ভেরিফিকেশনের পূর্বে টেকনিশিয়ানদের অবশ্যই মোবাইল ক্যামেরা থেকে নষ্ট পার্টসের ছবি আপলোড করতে হবে।"
                        : "Technicians must upload camera photos of damaged or cracked parts before submitting for Store Incharge verification."}
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50 select-none">
                  <input
                    type="checkbox"
                    checked={requireTransferMutualLog}
                    onChange={(e) => setRequireTransferMutualLog(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded-xs border-slate-300 text-brand-primary focus:ring-brand-primary"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      {lang === "bn"
                        ? "পারস্পরিক বাস-টু-বাস পার্টস স্থানান্তর লগিং"
                        : "Mutual Bus-to-Bus Parts Transfer Logging"}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {lang === "bn"
                        ? "অচল বাস থেকে সচল বাসে পার্টস স্থানান্তরের সময় সিস্টেম স্বয়ংক্রিয়ভাবে উভয় বাসের লগবুকে তথ্য লিপিবদ্ধ করবে।"
                        : "When transferring parts from an off-road Bus A to an active Bus B, the system simultaneously updates both coaches' historical log books."}
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50 select-none">
                  <input
                    type="checkbox"
                    checked={form1804RequiredForRelease}
                    onChange={(e) => setForm1804RequiredForRelease(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded-xs border-slate-300 text-brand-primary focus:ring-brand-primary"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      {lang === "bn"
                        ? "গাড়ি রিলিজ ও গেটপাসের জন্য ফর্ম ১৮০৪ চেকলিস্ট বাধ্যতামূলক"
                        : "Form 1804 Checklist Mandatory for Gate Pass & Garage Out"}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {lang === "bn"
                        ? "গেটপাস ইস্যু করার পূর্বে সকল নিরাপত্তা চেকলিস্ট (ব্রেক টেস্ট, এয়ার প্রেশার, হুইল অ্যালাইনমেন্ট ইত্যাদি) যাচাই করা বাধ্যতামূলক।"
                        : "All safety checklist items (Brake test, Air pressure, Wheel alignment, Road test, Old parts returned) must be verified before Gate Pass issuance."}
                    </p>
                  </div>
                </label>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-end">
                <CustomButton
                  type="submit"
                  variant="primary"
                  disabled={saving}
                  className="text-xs font-bold shadow-brand-button"
                >
                  <Save size={14} className="mr-1.5" />
                  {saving
                    ? (lang === "bn" ? "সংরক্ষণ হচ্ছে..." : "Saving...")
                    : (lang === "bn" ? "সেটিংস সংরক্ষণ করুন" : "Save Settings")}
                </CustomButton>
              </div>
            </CustomCard>
          </div>
        </div>
      </form>
    </div>
  );
}
