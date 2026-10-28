"use client";

import { useMemo } from "react";
import {
  LayoutDashboard,
  Ticket,
  PlusCircle,
  Clock,
  ArrowRightLeft,
  Wrench,
  CarFront,
  ShieldCheck,
  Building2,
  FileText,
  BarChart3,
  Settings,
  History,
  Users,
  AlertTriangle,
  ClipboardCheck,
  Warehouse as WhIcon,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "./auth";
import { hasPermission } from "./permissions";

export interface NavChild {
  label: string;
  labelBn?: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  target?: string;
  children?: {
    label: string;
    labelBn?: string;
    href: string;
    icon: LucideIcon;
    badge?: string;
  }[];
}

export interface NavItem {
  label: string;
  labelBn?: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  children?: NavChild[];
}

export interface NavGroup {
  title: string;
  titleBn?: string;
  items: NavItem[];
}

export function useDynamicNav() {
  const { user } = useAuth();

  const navGroups = useMemo<NavGroup[]>(() => {
    const groups: NavGroup[] = [
      // 1. Overview
      {
        title: "Overview",
        titleBn: "সারসংক্ষেপ",
        items: [
          {
            label: "Dashboard",
            labelBn: "ড্যাশবোর্ড",
            href: "/dashboard",
            icon: LayoutDashboard,
          },
        ],
      },

      // 2. Ticketing Core System
      {
        title: "Ticketing System",
        titleBn: "টিকেটিং সিস্টেম",
        items: [
          {
            label: "Tickets Management",
            labelBn: "টিকিট ব্যবস্থাপনা",
            href: "/tickets",
            icon: Ticket,
            children: [
              {
                label: "All Tickets",
                labelBn: "সকল টিকিট",
                href: "/tickets",
                icon: Ticket,
              },
              {
                label: "Pending My Approval",
                labelBn: "আমার অনুমোদনের অপেক্ষায়",
                href: "/tickets?filter=pending_me",
                icon: Clock,
                badge: "3-Step",
              },
              {
                label: "Raise New Ticket",
                labelBn: "নতুন টিকিট খুলুন",
                href: "/tickets/new",
                icon: PlusCircle,
              },
              {
                label: "Part Replacement (Photo)",
                labelBn: "পার্টস বদল (ছবিসহ)",
                href: "/tickets?type=PART_REPLACEMENT",
                icon: Wrench,
              },
              {
                label: "Bus-to-Bus Transfer",
                labelBn: "বাস থেকে বাস ট্রান্সফার",
                href: "/tickets?type=PART_TRANSFER",
                icon: ArrowRightLeft,
              },
              {
                label: "Vehicle Release & Gate Pass",
                labelBn: "গাড়ি রিলিজ ও গেট পাস",
                href: "/tickets?type=VEHICLE_RELEASE",
                icon: ClipboardCheck,
              },
            ],
          },
        ],
      },

      // 3. Fleet & Coaches
      {
        title: "Fleet",
        titleBn: "বাস বহর",
        items: [
          {
            label: "Bus Fleet",
            labelBn: "বাস বহর",
            href: "/fleet",
            icon: CarFront,
            children: [
              {
                label: "All Coaches & Buses",
                labelBn: "সকল বাস তালিকা",
                href: "/fleet",
                icon: CarFront,
              },
              {
                label: "Parts History & Log Book",
                labelBn: "পার্টস ব্যবহারের ইতিহাস",
                href: "/fleet/history",
                icon: History,
              },
            ],
          },
          {
            label: "Depots & Storage",
            labelBn: "ডিপো ও ওয়্যারহাউজ",
            href: "/branches",
            icon: Building2,
            children: [
              {
                label: "Depots & Hubs",
                labelBn: "ডিপো ও টার্মিনাল",
                href: "/branches",
                icon: Building2,
              },
              {
                label: "Warehouses & Storage Bins",
                labelBn: "ওয়্যারহাউজ ও স্টোরেজ বিন",
                href: "/warehouses",
                icon: WhIcon,
              },
            ],
          },
          {
            label: "Parts Suppliers & Vendors",
            labelBn: "পার্টস সরবরাহকারী ও ভেন্ডর",
            href: "/suppliers",
            icon: Truck,
          },
        ],
      },

      // 4. Reports & Verification
      {
        title: "Reports & Logs",
        titleBn: "রিপোর্টস",
        items: [
          {
            label: "Reports & Analytics",
            labelBn: "রিপোর্ট ও বিশ্লেষণ",
            href: "/reports",
            icon: BarChart3,
            children: [
              {
                label: "Ticket Status & Costs",
                labelBn: "টিকিট ও খরচ রিপোর্ট",
                href: "/reports",
                icon: FileText,
              },
              {
                label: "Premature Wear Alerts",
                labelBn: "অকাল নষ্ট পার্টস সতর্কতা",
                href: "/reports?tab=premature",
                icon: AlertTriangle,
              },
              {
                label: "Coach Spend Ranking",
                labelBn: "কোচ অনুযায়ী খরচ র‍্যাঙ্কিং",
                href: "/reports?tab=buses",
                icon: CarFront,
              },
            ],
          },
        ],
      },

      // 5. System Governance & RBAC
      {
        title: "Administration",
        titleBn: "প্রশাসন",
        items: [
          {
            label: "Security & RBAC",
            labelBn: "নিরাপত্তা ও পারমিশন",
            href: "/rbac",
            icon: ShieldCheck,
            children: [
              {
                label: "Roles & Permission Matrix",
                labelBn: "রোল ও পারমিশন ম্যাট্রিক্স",
                href: "/rbac",
                icon: ShieldCheck,
              },
              {
                label: "Staff Accounts",
                labelBn: "কর্মী অ্যাকাউন্টস",
                href: "/users",
                icon: Users,
              },
              {
                label: "System Settings",
                labelBn: "সিস্টেম সেটিংস",
                href: "/settings",
                icon: Settings,
              },
            ],
          },
        ],
      },
    ];

    return groups;
  }, [user]);

  return { navGroups, loading: false };
}
