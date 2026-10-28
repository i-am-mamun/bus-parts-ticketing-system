"use client";

import { useFormik } from "formik";
import * as Yup from "yup";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { User, Lock, Eye, EyeOff, CarFront, Globe } from "lucide-react";
import { CustomInput, CustomButton } from "@/components/custom";
import { siteConfig } from "@/config/site";

const loginSchema = Yup.object({
  username: Yup.string().required("Username or email is required"),
  password: Yup.string().required("Password is required"),
});

export default function LoginPage() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [appName, setAppName] = useState<string>("Soudia Parts Ticketing");
  const [companyLogo, setCompanyLogo] = useState<string>("");
  const [lang, setLang] = useState<"en" | "bn">("en");
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedLang = (localStorage.getItem("soudia_language") as "en" | "bn") || "en";
      setLang(storedLang);

      const storedName = localStorage.getItem("bus_inventory_app_name");
      if (storedName) setAppName(storedName);
      const storedLogo = localStorage.getItem("bus_inventory_logo");
      if (storedLogo) setCompanyLogo(storedLogo);

      fetch("/api/v1/settings/public")
        .then((res) => res.json())
        .then((data) => {
          if (data?.app_name) setAppName(data.app_name);
          if (data?.company_logo) setCompanyLogo(data.company_logo);
        })
        .catch(() => {});
    }
  }, []);

  const handleLangToggle = (selected: "en" | "bn") => {
    setLang(selected);
    if (typeof window !== "undefined") {
      localStorage.setItem("soudia_language", selected);
      window.dispatchEvent(new CustomEvent("soudia:language_changed", { detail: selected }));
    }
  };

  const formik = useFormik({
    initialValues: { username: "admin", password: "Admin@12345" },
    validationSchema: loginSchema,
    onSubmit: async (values, { setSubmitting }) => {
      setError(null);
      try {
        await login(values.username, values.password);
      } catch (err: any) {
        setError(
          lang === "bn"
            ? "লগইন ব্যর্থ হয়েছে। ব্যবহারকারীর নাম ও পাসওয়ার্ড যাচাই করুন।"
            : (err.message || "Login failed. Please check credentials.")
        );
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#1e0708] via-[#881315] to-[#ec1e21] px-4 py-8">
      {/* Center White Radial Spotlight Glow */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.18)_0%,transparent_70%)]"
        aria-hidden
      />

      {/* Decorative Wave Curves */}
      <svg
        className="pointer-events-none absolute left-0 top-0 h-full w-1/2 opacity-25"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <g stroke="rgba(255,255,255,0.35)" strokeWidth="1" fill="rgba(255,255,255,0.6)">
          <line x1="8%" y1="20%" x2="18%" y2="35%" />
          <line x1="18%" y1="35%" x2="12%" y2="55%" />
          <line x1="12%" y1="55%" x2="22%" y2="72%" />
          <circle cx="8%" cy="20%" r="3.5" />
          <circle cx="18%" cy="35%" r="4.5" />
          <circle cx="12%" cy="55%" r="5" />
          <circle cx="22%" cy="72%" r="4" />
        </g>
      </svg>

      {/* Main Login Card */}
      <div className="relative z-10 flex flex-col items-center max-w-[420px] w-full">
        {/* Language Switcher on Top of Card */}
        <div className="w-full flex items-center justify-end mb-2.5">
          <div className="inline-flex items-center rounded-full bg-black/30 backdrop-blur-md p-1 border border-white/20 text-xs">
            <button
              type="button"
              onClick={() => handleLangToggle("en")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                lang === "en" ? "bg-white text-brand-dark shadow-xs" : "text-white/80 hover:text-white"
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => handleLangToggle("bn")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                lang === "bn" ? "bg-white text-brand-dark shadow-xs" : "text-white/80 hover:text-white"
              }`}
            >
              বাং
            </button>
          </div>
        </div>

        <form
          onSubmit={formik.handleSubmit}
          className="relative w-full rounded-2xl border border-red-200/80 bg-white/95 backdrop-blur-2xl pt-7 sm:pt-8 px-7 sm:px-8 pb-6 shadow-2xl space-y-4"
        >
          {/* Logo & Header */}
          <div className="flex flex-col items-center text-center pb-1">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white border border-brand-border/60 text-brand-primary shadow-xs mb-2.5 p-1 overflow-hidden">
              {companyLogo ? (
                <img src={companyLogo} alt="Logo" className="max-h-full max-w-full object-contain" />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-lg bg-brand-primary text-white">
                  <CarFront size={28} />
                </div>
              )}
            </div>
            <h1 className="text-lg font-extrabold tracking-tight text-slate-800">
              {appName || siteConfig.name}
            </h1>
            <h2 className="mt-1 text-xs font-semibold text-brand-primary">
              {lang === "bn" ? "ড্যাশবোর্ডে প্রবেশ করুন" : "Sign In to Fleet Ticketing"}
            </h2>
          </div>

          <div className="space-y-3.5">
            <CustomInput
              label={lang === "bn" ? "ব্যবহারকারীর নাম বা ইমেইল" : "Username or Email"}
              name="username"
              type="text"
              rounded="md"
              value={formik.values.username}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.username ? formik.errors.username : undefined}
              placeholder="admin"
              leftIcon={<User size={15} />}
            />

            <CustomInput
              label={lang === "bn" ? "পাসওয়ার্ড" : "Password"}
              name="password"
              type={showPassword ? "text" : "password"}
              rounded="md"
              value={formik.values.password}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.password ? formik.errors.password : undefined}
              placeholder="••••••••"
              leftIcon={<Lock size={15} />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="flex items-center justify-center h-full p-1 text-slate-400 hover:text-slate-600 transition focus:outline-none cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />

            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-600 text-center">
                {error}
              </div>
            )}

            <CustomButton
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={formik.isSubmitting}
              className="mt-2 text-sm font-bold rounded-lg py-3 shadow-brand-button"
            >
              {formik.isSubmitting
                ? (lang === "bn" ? "যাচাই করা হচ্ছে..." : "Authenticating...")
                : (lang === "bn" ? "লগইন করুন" : "Sign In")}
            </CustomButton>

            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {lang === "bn" ? "ডেমো অ্যাকাউন্টসমূহ" : "Quick Demo Accounts"}
                </span>
                <span className="text-[10px] text-brand-primary font-semibold">
                  {lang === "bn" ? "ক্লিক করে পূরণ করুন" : "Click to Fill"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  {
                    label: lang === "bn" ? "অ্যাডমিন" : "Admin",
                    u: "admin",
                    p: "Admin@12345",
                    role: lang === "bn" ? "সুপারইউজার" : "Superuser",
                  },
                  {
                    label: lang === "bn" ? "ম্যানেজার" : "Manager",
                    u: "manager",
                    p: "Demo@12345",
                    role: lang === "bn" ? "অপারেশনস" : "Operations",
                  },
                  {
                    label: lang === "bn" ? "স্টোর" : "Store",
                    u: "storekeeper",
                    p: "Demo@12345",
                    role: lang === "bn" ? "পার্টস" : "Parts",
                  },
                  {
                    label: lang === "bn" ? "টেক" : "Tech",
                    u: "technician",
                    p: "Demo@12345",
                    role: lang === "bn" ? "ওয়ার্কশপ" : "Workshop",
                  },
                  {
                    label: lang === "bn" ? "হিসাব" : "Accounts",
                    u: "accountant",
                    p: "Demo@12345",
                    role: lang === "bn" ? "লেজার" : "Ledger",
                  },
                  {
                    label: lang === "bn" ? "সেলস" : "Sales",
                    u: "sales",
                    p: "Demo@12345",
                    role: lang === "bn" ? "বিলিং" : "Billing",
                  },
                ].map((demo) => {
                  const isSelected = formik.values.username === demo.u;
                  return (
                    <button
                      key={demo.u}
                      type="button"
                      onClick={() => {
                        formik.setFieldValue("username", demo.u);
                        formik.setFieldValue("password", demo.p);
                        setError(null);
                      }}
                      className={`px-2 py-1.5 rounded-lg text-left transition-all cursor-pointer border ${
                        isSelected
                          ? "bg-rose-50 border-brand-primary text-brand-dark shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <div className="text-[11px] font-bold leading-tight">{demo.label}</div>
                      <div className="text-[9px] text-slate-500 truncate leading-tight">{demo.role}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-2 mt-2 border-t border-slate-100 text-center">
            <p className="text-xs font-semibold text-slate-500 tracking-wide">
              © {appName || siteConfig.name} {currentYear}. {lang === "bn" ? "সর্বস্বত্ব সংরক্ষিত।" : "All rights reserved."}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
