"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";

export type Language = "en" | "bn";

export interface TranslationObject {
  en: string;
  bn: string;
}

const STORAGE_KEY = "soudia_language";

export const DICTIONARY: Record<string, { en: string; bn: string }> = {
  // Navigation & Headers
  dashboard: { en: "Dashboard", bn: "ড্যাশবোর্ড" },
  tickets: { en: "Tickets Management", bn: "টিকিট ব্যবস্থাপনা" },
  all_tickets: { en: "All Tickets", bn: "সকল টিকিট" },
  pending_my_approval: { en: "Pending My Approval", bn: "আমার অনুমোদনের অপেক্ষায়" },
  raise_new_ticket: { en: "Raise New Ticket", bn: "নতুন টিকিট তৈরি" },
  new_ticket: { en: "New Ticket", bn: "নতুন টিকিট" },
  part_request: { en: "Part Request (Indent)", bn: "নতুন পার্টস রিকুইজিশন" },
  part_replacement: { en: "Part Replacement (Photo)", bn: "পার্টস প্রতিস্থাপন (ছবিসহ)" },
  bus_transfer: { en: "Bus-to-Bus Transfer", bn: "বাস থেকে বাসে ট্রান্সফার" },
  work_sheet: { en: "Work Sheet", bn: "ওয়ার্ক শিট" },
  vehicle_release: { en: "Vehicle Release & Gate Pass", bn: "গাড়ি রিলিজ ও গেট পাস" },
  fleet_registry: { en: "Bus Fleet Registry", bn: "বাস বহর তালিকা" },
  all_buses: { en: "All Coaches & Buses", bn: "সকল বাস তালিকা" },
  parts_history: { en: "Parts History & Log Book", bn: "পার্টস ব্যবহারের ইতিহাস" },
  depots_hubs: { en: "Depots & Hubs", bn: "ডিপো ও টার্মিনাল" },
  reports: { en: "Reports & Analytics", bn: "রিপোর্ট ও বিশ্লেষণ" },
  ticket_reports: { en: "Ticket Status & Costs", bn: "টিকিট ও খরচ রিপোর্ট" },
  premature_alerts: { en: "Premature Wear Alerts", bn: "অকাল নষ্ট পার্টস সতর্কতা" },
  security_rbac: { en: "Security & RBAC", bn: "নিরাপত্তা ও পারমিশন" },
  roles_matrix: { en: "Roles & Permission Matrix", bn: "রোল ও পারমিশন ম্যাট্রিক্স" },
  staff_accounts: { en: "Staff Accounts", bn: "কর্মী অ্যাকাউন্টস" },
  system_settings: { en: "System Settings", bn: "সিস্টেম সেটিংস" },

  // Dashboard Stats & KPI
  total_tickets: { en: "Total Tickets", bn: "সর্বমোট টিকিট" },
  pending_approvals: { en: "Pending Approvals", bn: "অনুমোদনের অপেক্ষায়" },
  in_progress: { en: "In Progress", bn: "গ্যারেজে কাজ চলছে" },
  garage_out_done: { en: "Garage Out & Done", bn: "রিলিজ ও সম্পূর্ণ" },
  buses_in_garage: { en: "Buses In Garage", bn: "গ্যারেজে মোট বাস" },
  premature_failures: { en: "Premature Alerts", bn: "অকাল নষ্ট পার্টস" },
  review_alerts: { en: "Review Alerts", bn: "সতর্কতা দেখুন" },

  // Ticket Statuses
  DRAFT: { en: "Draft", bn: "খসড়া" },
  SUBMITTED: { en: "Submitted (Stage 1 Pending)", bn: "দাখিলকৃত (ধাপ ১ বাকি)" },
  VERIFIED_STAGE_1: { en: "Verified (Stage 2 Pending)", bn: "যাচাইকৃত (ধাপ ২ বাকি)" },
  VERIFIED: { en: "Verified (Stage 2 Pending)", bn: "যাচাইকৃত (ধাপ ২ বাকি)" },
  APPROVED_STAGE_2: { en: "Approved (Stage 3 Pending)", bn: "অনুমোদিত (ধাপ ৩ বাকি)" },
  APPROVED: { en: "Approved (Stage 3 Pending)", bn: "অনুমোদিত (ধাপ ৩ বাকি)" },
  FINAL_APPROVED: { en: "Final Approved", bn: "চূড়ান্ত অনুমোদিত" },
  COMPLETED: { en: "Work Completed", bn: "কাজ সম্পন্ন" },
  GARAGE_OUT: { en: "Garage Out", bn: "গ্যারেজ আউট" },
  CLOSED: { en: "Closed", bn: "বন্ধ" },
  REJECTED: { en: "Rejected", bn: "বাতিল" },
  CANCELLED: { en: "Cancelled", bn: "স্থগিত" },

  // Actions & Buttons
  verify: { en: "Verify (Step 1)", bn: "যাচাই করুন (ধাপ ১)" },
  approve: { en: "Approve (Step 2)", bn: "অনুমোদন করুন (ধাপ ২)" },
  final_approve: { en: "Final Approve (Step 3)", bn: "চূড়ান্ত অনুমোদন (ধাপ ৩)" },
  reject: { en: "Reject", bn: "বাতিল করুন" },
  emergency_override: { en: "Emergency Override", bn: "জরুরি ওভাররাইড" },
  start_work: { en: "Start Workshop Work", bn: "মেরামত শুরু করুন" },
  complete_work: { en: "Complete Maintenance", bn: "কাজ সমাপ্ত ঘোষণা" },
  issue_gate_pass: { en: "Issue Gate Pass & Garage Out", bn: "গেট পাস ইস্যু ও রিলিজ" },
  save: { en: "Save Changes", bn: "সংরক্ষণ করুন" },
  cancel: { en: "Cancel", bn: "বাতিল" },
  filter: { en: "Filter", bn: "ফিল্টার" },
  reset: { en: "Reset", bn: "রিসেট" },
  search: { en: "Search...", bn: "অনুসন্ধান করুন..." },
  view_all: { en: "View All", bn: "সবগুলো দেখুন" },
  print: { en: "Print Report", bn: "প্রিন্ট রিপোর্ট" },
  sign_out: { en: "Sign Out", bn: "লগআউট" },
  edit: { en: "Edit", bn: "পরিবর্তন" },
  delete: { en: "Delete", bn: "মুছে ফেলুন" },
  close: { en: "Close", bn: "বন্ধ করুন" },

  // Common Labels
  ticket_no: { en: "Ticket No", bn: "টিকিট নম্বর" },
  coach_bus: { en: "Coach Number", bn: "বাস নম্বর" },
  requested_by: { en: "Requested By", bn: "আবেদনকারী" },
  current_step: { en: "Current Step", bn: "বর্তমান ধাপ" },
  actions: { en: "Actions", bn: "অ্যাকশন" },
  status: { en: "Status", bn: "অবস্থা" },
  priority: { en: "Priority", bn: "অগ্রাধিকার" },
  part_name: { en: "Part Name", bn: "পার্টসের নাম" },
  qty: { en: "Qty", bn: "পরিমাণ" },
  odometer: { en: "Odometer (KM)", bn: "ওডোমিটার (কিমি)" },
  date: { en: "Date", bn: "তারিখ" },
  depot: { en: "Depot", bn: "ডিপো" },
  active_depot: { en: "Active Depot", bn: "বর্তমান ডিপো" },
  role: { en: "Role", bn: "রোল" },
  photos: { en: "Photos", bn: "ছবি" },
  notes: { en: "Notes", bn: "মন্তব্য" },
  reason: { en: "Reason", bn: "কারণ" },
  gate_pass: { en: "Gate Pass", bn: "গেট পাস" },
};

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (keyOrObj: string | TranslationObject, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "bn",
  setLang: () => {},
  toggleLang: () => {},
  t: () => "",
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("bn");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
      if (saved === "en" || saved === "bn") {
        setLangState(saved);
      }
      setMounted(true);

      const handleExternalChange = (e: Event) => {
        const customEvt = e as CustomEvent<Language>;
        if (customEvt.detail === "en" || customEvt.detail === "bn") {
          setLangState(customEvt.detail);
        }
      };
      window.addEventListener("soudia:language_changed", handleExternalChange);
      return () => {
        window.removeEventListener("soudia:language_changed", handleExternalChange);
      };
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, newLang);
      window.dispatchEvent(new CustomEvent("soudia:language_changed", { detail: newLang }));
    }
  };

  const toggleLang = () => {
    const nextLang: Language = lang === "en" ? "bn" : "en";
    setLang(nextLang);
  };

  const t = (keyOrObj: string | TranslationObject, fallback?: string): string => {
    if (typeof keyOrObj === "object" && keyOrObj !== null) {
      return keyOrObj[lang] || keyOrObj.en || fallback || "";
    }

    if (typeof keyOrObj === "string") {
      const entry = DICTIONARY[keyOrObj];
      if (entry) {
        return entry[lang] || entry.en;
      }
      return fallback || keyOrObj;
    }

    return fallback || "";
  };

  const value = useMemo(
    () => ({
      lang,
      setLang,
      toggleLang,
      t,
    }),
    [lang]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
