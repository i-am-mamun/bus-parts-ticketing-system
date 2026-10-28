"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  CarFront,
  Users,
  Building2,
  BarChart3,
  Settings,
  PlusCircle,
  X,
  ArrowRight,
  ShieldCheck,
  Wrench,
  Clock,
  ArrowRightLeft,
  ClipboardCheck,
  Ticket,
  History,
  AlertTriangle,
  Warehouse as WhIcon,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/lib/i18n";

interface CommandItem {
  id: string;
  titleEn: string;
  titleBn: string;
  subtitleEn: string;
  subtitleBn: string;
  categoryEn: string;
  categoryBn: string;
  icon: any;
  href: string;
  keywords?: string[];
}

const COMMANDS: CommandItem[] = [
  // Quick Actions
  {
    id: "new-ticket",
    titleEn: "Raise New Ticket",
    titleBn: "নতুন টিকিট তৈরি করুন",
    subtitleEn: "Create part request, replacement or transfer ticket",
    subtitleBn: "পার্টস রিকুইজিশন, রিপ্লেসমেন্ট বা বাস ট্রান্সফার টিকিট",
    categoryEn: "Quick Actions",
    categoryBn: "দ্রুত অ্যাকশন",
    icon: PlusCircle,
    href: "/tickets/new",
    keywords: ["ticket", "create", "new", "requisition", "issue", "রিকুইজিশন", "টিকিট"],
  },
  {
    id: "new-replacement",
    titleEn: "Part Replacement Request",
    titleBn: "পার্টস প্রতিস্থাপন আবেদন",
    subtitleEn: "Log damaged part with mobile camera photos",
    subtitleBn: "ক্যামেরা ছবিসহ ক্ষতিগ্রস্ত পার্টস পরিবর্তন টিকিট",
    categoryEn: "Quick Actions",
    categoryBn: "দ্রুত অ্যাকশন",
    icon: Wrench,
    href: "/tickets/new?type=PART_REPLACEMENT",
    keywords: ["replace", "broken", "photo", "damaged", "repair", "ছবি", "নষ্ট"],
  },
  {
    id: "new-transfer",
    titleEn: "Bus-to-Bus Parts Transfer",
    titleBn: "বাস-টু-বাস পার্টস স্থানান্তর",
    subtitleEn: "Transfer usable parts from Bus A (off-road) to Bus B",
    subtitleBn: "অচল বাস থেকে সচল বাসে কার্যকরী পার্টস স্থানান্তর",
    categoryEn: "Quick Actions",
    categoryBn: "দ্রুত অ্যাকশন",
    icon: ArrowRightLeft,
    href: "/tickets/new?type=PART_TRANSFER",
    keywords: ["transfer", "swap", "borrow", "cannibalize", "স্থানান্তর"],
  },
  {
    id: "new-release",
    titleEn: "Vehicle Release Checklist",
    titleBn: "গাড়ি রিলিজ ও চেকলিস্ট",
    subtitleEn: "Complete Form 1804 and issue gate pass",
    subtitleBn: "ফর্ম ১৮০৪ পূরণ এবং অফিসিয়াল গেটপাস প্রদান",
    categoryEn: "Quick Actions",
    categoryBn: "দ্রুত অ্যাকশন",
    icon: ClipboardCheck,
    href: "/tickets/new?type=VEHICLE_RELEASE",
    keywords: ["release", "gate pass", "fitness", "1804", "গেটপাস"],
  },

  // Ticketing & Approvals
  {
    id: "all-tickets",
    titleEn: "All Tickets Registry",
    titleBn: "সকল টিকিট রেজিস্ট্রি",
    subtitleEn: "Browse pending, approved, in-progress and closed tickets",
    subtitleBn: "পেন্ডিং, অনুমোদিত, চলমান ও সম্পন্ন সকল টিকিট",
    categoryEn: "Ticketing & Approvals",
    categoryBn: "টিকিট ও অনুমোদন",
    icon: Ticket,
    href: "/tickets",
    keywords: ["tickets", "registry", "list", "তালিকা"],
  },
  {
    id: "pending-approvals",
    titleEn: "Pending My Approval",
    titleBn: "আমার অনুমোদনের অপেক্ষায়",
    subtitleEn: "Review 3-Step verification pipeline pending actions",
    subtitleBn: "৩-ধাপ ভেরিফিকেশনে আপনার স্বাক্ষরের অপেক্ষায় থাকা টিকিট",
    categoryEn: "Ticketing & Approvals",
    categoryBn: "টিকিট ও অনুমোদন",
    icon: Clock,
    href: "/tickets?filter=pending_me",
    keywords: ["approval", "verify", "sign", "incharge", "অনুমোদন"],
  },

  // Fleet & Parts Log
  {
    id: "fleet-buses",
    titleEn: "Bus Fleet Registry",
    titleBn: "সৌদিয়া বাস বহর",
    subtitleEn: "Active coaches, routes, registration and chassis",
    subtitleBn: "সচল কোচ, রুট, রেজিস্ট্রেশন ও চেসিস তথ্য",
    categoryEn: "Fleet & Parts Log",
    categoryBn: "বাস বহর ও পার্টস লগ",
    icon: CarFront,
    href: "/fleet",
    keywords: ["bus", "fleet", "coach", "scania", "hino", "বাস"],
  },
  {
    id: "parts-history",
    titleEn: "Parts Lifecycle Log Book",
    titleBn: "পার্টসের জীবনচক্র লগবুক",
    subtitleEn: "Lifecycle, installation dates, mileage & bus transfers",
    subtitleBn: "ইনস্টলেশন তারিখ, রানিং কিমি ও পারস্পরিক ট্রান্সফার ইতিহাস",
    categoryEn: "Fleet & Parts Log",
    categoryBn: "বাস বহর ও পার্টস লগ",
    icon: History,
    href: "/fleet/history",
    keywords: ["history", "lifespan", "install", "mileage", "ইতিহাস"],
  },
  {
    id: "depots",
    titleEn: "Depots & Hubs",
    titleBn: "ডিপো ও ওয়ার্কশপসমূহ",
    subtitleEn: "Manage operational terminals and workshops",
    subtitleBn: "টার্মিনাল ও কেন্দ্রীয় ওয়ার্কশপ ব্যবস্থাপনা",
    categoryEn: "Depots & Storage",
    categoryBn: "ডিপো ও ওয়্যারহাউজ",
    icon: Building2,
    href: "/branches",
    keywords: ["depot", "terminal", "branch", "workshop", "ডিপো"],
  },
  {
    id: "warehouses",
    titleEn: "Warehouses & Storage Bins",
    titleBn: "ওয়্যারহাউজ ও স্টোরেজ বিন",
    subtitleEn: "Manage parts stores, racks, shelves, and bin matrices",
    subtitleBn: "স্পেয়ার পার্টস ওয়্যারহাউজ, র্যাক ও বিন লোকেশন",
    categoryEn: "Depots & Storage",
    categoryBn: "ডিপো ও ওয়্যারহাউজ",
    icon: WhIcon,
    href: "/warehouses",
    keywords: ["warehouse", "store", "bin", "rack", "ওয়্যারহাউজ", "বিন"],
  },
  {
    id: "suppliers",
    titleEn: "Parts Suppliers & Vendors",
    titleBn: "পার্টস সরবরাহকারী ও ভেন্ডর",
    subtitleEn: "Authorized parts vendors, contacts, and warranty providers",
    subtitleBn: "অনুমোদিত পার্টস ভেন্ডর, যোগাযোগ ও ওয়ারেন্টি পার্টনার",
    categoryEn: "Vendors & Suppliers",
    categoryBn: "ভেন্ডর ও সরবরাহকারী",
    icon: Truck,
    href: "/suppliers",
    keywords: ["supplier", "vendor", "parts", "warranty", "সরবরাহকারী", "ভেন্ডর"],
  },

  // Reports & Analytics
  {
    id: "reports-cost",
    titleEn: "Ticket Cost Reports",
    titleBn: "টিকিট ও রক্ষণাবেক্ষণ খরচ",
    subtitleEn: "Breakdown of parts expenses and maintenance ledger",
    subtitleBn: "পার্টসের ব্যয় ও রক্ষণাবেক্ষণ খরচের বিস্তারিত বিবরণ",
    categoryEn: "Reports & Analytics",
    categoryBn: "রিপোর্ট ও বিশ্লেষণ",
    icon: BarChart3,
    href: "/reports",
    keywords: ["reports", "cost", "financials", "খরচ"],
  },
  {
    id: "reports-premature",
    titleEn: "Premature Wear Alerts",
    titleBn: "অকাল নষ্ট পার্টস বিশ্লেষণ",
    subtitleEn: "Analytics on parts failing before expected lifespan",
    subtitleBn: "প্রত্যাশিত মেয়াদের আগেই নষ্ট হওয়া পার্টসের পরিসংখ্যান",
    categoryEn: "Reports & Analytics",
    categoryBn: "রিপোর্ট ও বিশ্লেষণ",
    icon: AlertTriangle,
    href: "/reports?type=premature",
    keywords: ["premature", "wear", "defect", "early", "ওয়ারেন্টি"],
  },

  // Admin & Governance
  {
    id: "dashboard",
    titleEn: "Executive Dashboard",
    titleBn: "মূল ড্যাশবোর্ড",
    subtitleEn: "Real-time KPIs, pending approvals and fleet health",
    subtitleBn: "রিয়েল-টাইম কেপিআই, পেন্ডিং অনুমোদন ও বহরের অবস্থা",
    categoryEn: "Admin & Governance",
    categoryBn: "অ্যাডমিন ও ব্যবস্থাপনা",
    icon: BarChart3,
    href: "/dashboard",
    keywords: ["dashboard", "home", "ড্যাশবোর্ড"],
  },
  {
    id: "settings",
    titleEn: "Company Branding & Policies",
    titleBn: "কোম্পানি ব্র্যান্ডিং ও সেটিংস",
    subtitleEn: "Soudia system configuration, logo & gate pass rules",
    subtitleBn: "সৌদিয়া কনফিগারেশন, লোগো ও গেটপাস নিয়মাবলী",
    categoryEn: "Admin & Governance",
    categoryBn: "অ্যাডমিন ও ব্যবস্থাপনা",
    icon: Settings,
    href: "/settings",
    keywords: ["settings", "branding", "soudia", "লোগো"],
  },
  {
    id: "rbac-roles",
    titleEn: "Roles & Permission Matrix",
    titleBn: "ভূমিকা ও পারমিশন ম্যাট্রিক্স",
    subtitleEn: "3-step approval roles, storekeeper, manager, admin",
    subtitleBn: "৩-ধাপ অনুমোদন রোল, স্টোরকিপার, ম্যানেজার, অ্যাডমিন",
    categoryEn: "Admin & Governance",
    categoryBn: "অ্যাডমিন ও ব্যবস্থাপনা",
    icon: ShieldCheck,
    href: "/rbac",
    keywords: ["rbac", "permissions", "roles", "পারমিশন"],
  },
  {
    id: "staff-users",
    titleEn: "Staff User Accounts",
    titleBn: "কর্মকর্তা অ্যাকাউন্ট ব্যবস্থাপনা",
    subtitleEn: "User accounts, depot assignments & credentials",
    subtitleBn: "ব্যবহারকারী অ্যাকাউন্ট, ডিপো দায়িত্ব ও ইউজার ক্রেডেনশিয়াল",
    categoryEn: "Admin & Governance",
    categoryBn: "অ্যাডমিন ও ব্যবস্থাপনা",
    icon: Users,
    href: "/users",
    keywords: ["users", "staff", "employees", "অ্যাকাউন্ট"],
  },
];

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { lang } = useLanguage();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [open]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) onClose();
        else window.dispatchEvent(new Event("omni:open-command-palette"));
      }
      if (e.key === "Escape" && open) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const filtered = COMMANDS.filter((cmd) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase().trim();
    return (
      cmd.titleEn.toLowerCase().includes(q) ||
      cmd.titleBn.toLowerCase().includes(q) ||
      cmd.subtitleEn.toLowerCase().includes(q) ||
      cmd.subtitleBn.toLowerCase().includes(q) ||
      cmd.categoryEn.toLowerCase().includes(q) ||
      cmd.categoryBn.toLowerCase().includes(q) ||
      cmd.keywords?.some((k) => k.toLowerCase().includes(q))
    );
  });

  const handleSelect = (cmd: CommandItem) => {
    onClose();
    router.push(cmd.href);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl rounded-xl border border-brand-border bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-brand-light bg-slate-50/60">
          <Search size={18} className="text-brand-primary shrink-0" />
          <input
            type="text"
            placeholder={
              lang === "bn"
                ? "পৃষ্ঠা, বাস নম্বর, মেনু বা অ্যাকশন খুঁজুন... (Ctrl + K)"
                : "Search pages, coaches, actions... (Ctrl + K)"
            }
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            autoFocus
            className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none font-medium"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-slate-400 hover:text-slate-600">
              <X size={15} />
            </button>
          )}
          <span className="hidden sm:inline-block rounded-sm bg-white border border-slate-200 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              {lang === "bn" ? "কোনো মিল খুঁজে পাওয়া যায়নি" : "No matching commands found."}
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;
              const title = lang === "bn" ? cmd.titleBn : cmd.titleEn;
              const subtitle = lang === "bn" ? cmd.subtitleBn : cmd.subtitleEn;
              const category = lang === "bn" ? cmd.categoryBn : cmd.categoryEn;

              return (
                <button
                  key={cmd.id}
                  onClick={() => handleSelect(cmd)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors cursor-pointer",
                    isSelected ? "bg-brand-50 text-brand-dark" : "hover:bg-slate-50 text-slate-700"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                        isSelected
                          ? "bg-brand-primary text-white border-brand-primary"
                          : "bg-white text-brand-primary border-brand-border"
                      )}
                    >
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{title}</p>
                      <p className="text-[11px] text-slate-400 truncate">{subtitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-semibold text-slate-400 px-2 py-0.5 rounded-full bg-slate-100">
                      {category}
                    </span>
                    <ArrowRight size={13} className={cn("text-slate-300", isSelected && "text-brand-primary")} />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
