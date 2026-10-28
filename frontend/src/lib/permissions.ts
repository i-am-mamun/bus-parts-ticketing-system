import { User, UserRole } from "./types";

export interface RoleMeta {
  key: UserRole;
  label: string;
  labelBn: string;
  subLabel: string;
  badgeClass: string;
  borderClass: string;
  bgClass: string;
  textClass: string;
  description: string;
  stepName?: string;
  icon: string;
}

export const ROLE_DEFINITIONS: Record<string, RoleMeta> = {
  admin: {
    key: "admin",
    label: "Administrator",
    labelBn: "সুপার অ্যাডমিন",
    subLabel: "Step 3: Final Approval",
    stepName: "ধাপ ৩: চূড়ান্ত অনুমোদন",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    borderClass: "border-purple-300",
    bgClass: "bg-purple-50",
    textClass: "text-purple-700",
    description: "Full unrestricted access across all tickets, emergency override authority, RBAC governance, and audit logs.",
    icon: "ShieldAlert",
  },
  manager: {
    key: "manager",
    label: "Depot Operations Manager",
    labelBn: "ডিপো ও অপারেশনস ম্যানেজার",
    subLabel: "Step 2: Manager Approval",
    stepName: "ধাপ ২: ম্যানেজার অনুমোদন",
    badgeClass: "bg-brand-50 text-brand-primary border-brand-border",
    borderClass: "border-brand-border",
    bgClass: "bg-brand-50",
    textClass: "text-brand-primary",
    description: "Evaluates verified tickets, authorizes maintenance expenses, and approves bus-to-bus part transfers.",
    icon: "Briefcase",
  },
  storekeeper: {
    key: "storekeeper",
    label: "Store Incharge",
    labelBn: "স্টোর ইনচার্জ",
    subLabel: "Step 1: Inspection & Verification",
    stepName: "ধাপ ১: যাচাই ও ইন্সপেকশন",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    borderClass: "border-amber-300",
    bgClass: "bg-amber-50",
    textClass: "text-amber-700",
    description: "Step 1 verification of defect photos and parts, runs the 11-point Form 1804 release checklist and issues gate passes.",
    icon: "Boxes",
  },
  technician: {
    key: "technician",
    label: "Workshop Technician",
    labelBn: "ওয়ার্কশপ মেকানিক",
    subLabel: "Ticket Requester & Execution",
    stepName: "টিকিট আবেদনকারী",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    borderClass: "border-blue-300",
    bgClass: "bg-blue-50",
    textClass: "text-blue-700",
    description: "Creates tickets with direct camera photo evidence, explains premature part wear, and executes maintenance work.",
    icon: "Wrench",
  },
  accountant: {
    key: "accountant",
    label: "Chief Accountant",
    labelBn: "হিসাব কর্মকর্তা",
    subLabel: "Cost & Invoicing Officer",
    stepName: "মূল্য ও ইনভয়েস",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    borderClass: "border-emerald-300",
    bgClass: "bg-emerald-50",
    textClass: "text-emerald-700",
    description: "Inputs part unit prices and labor charges, prints formal invoices and parts cost sheets.",
    icon: "Calculator",
  },
};

export interface ModulePermission {
  module: string;
  moduleBn: string;
  description: string;
  admin: "FULL" | "VIEW" | "NONE";
  manager: "FULL" | "VIEW" | "NONE";
  storekeeper: "FULL" | "VIEW" | "NONE";
  technician: "FULL" | "VIEW" | "NONE";
  accountant: "FULL" | "VIEW" | "NONE";
}

export const RBAC_MATRIX: ModulePermission[] = [
  {
    module: "Tickets Management",
    moduleBn: "টিকিট ব্যবস্থাপনা",
    description: "Raise part requests, replacements, bus transfers, worksheets, and vehicle release tickets",
    admin: "FULL",
    manager: "FULL",
    storekeeper: "FULL",
    technician: "FULL",
    accountant: "VIEW",
  },
  {
    module: "3-Step Verification & Approval",
    moduleBn: "৩-ধাপ ভেরিফিকেশন ও অনুমোদন",
    description: "Step 1 (Verify) → Step 2 (Approve) → Step 3 (Final Approve) + Emergency Admin Override",
    admin: "FULL",
    manager: "FULL",
    storekeeper: "FULL",
    technician: "NONE",
    accountant: "NONE",
  },
  {
    module: "Vehicle Release & Gate Pass (Form 1804)",
    moduleBn: "গাড়ি রিলিজ ও গেট পাস",
    description: "11-point safety checklist sign-off and official gate pass issuance to clear bus for highway",
    admin: "FULL",
    manager: "FULL",
    storekeeper: "FULL",
    technician: "NONE",
    accountant: "NONE",
  },
  {
    module: "Part Costs & Invoice Entry",
    moduleBn: "পার্টসের মূল্য ও ইনভয়েস",
    description: "Enter part unit prices, labor cost, and download printable cost sheets and bills",
    admin: "FULL",
    manager: "FULL",
    storekeeper: "NONE",
    technician: "NONE",
    accountant: "FULL",
  },
  {
    module: "Bus Fleet & Parts Log Book",
    moduleBn: "বাস বহর ও পার্টস ব্যবহারের ইতিহাস",
    description: "Bus registry, routes, odometer tracking, and lifetime replacement log history",
    admin: "FULL",
    manager: "FULL",
    storekeeper: "VIEW",
    technician: "VIEW",
    accountant: "VIEW",
  },
  {
    module: "Depots & Branches",
    moduleBn: "ডিপো ও টার্মিনাল হাব",
    description: "Terminal workshop management, phone numbers, and depot locations",
    admin: "FULL",
    manager: "FULL",
    storekeeper: "VIEW",
    technician: "VIEW",
    accountant: "VIEW",
  },
  {
    module: "Staff Accounts & RBAC Matrix",
    moduleBn: "কর্মী ও পারমিশন কন্ট্রোল",
    description: "Create staff users, assign roles, and customize individual granular checkbox permissions",
    admin: "FULL",
    manager: "NONE",
    storekeeper: "NONE",
    technician: "NONE",
    accountant: "NONE",
  },
  {
    module: "System Settings & Audit Trail",
    moduleBn: "সিস্টেম সেটিংস ও অডিট লগ",
    description: "Company profile, logo, theme, print parameters, and complete user action audit trail",
    admin: "FULL",
    manager: "VIEW",
    storekeeper: "NONE",
    technician: "NONE",
    accountant: "NONE",
  },
];

// ─── Dynamic RBAC Permissions Verification ───────────────────────────────

export function hasPermission(user: User | null | undefined, permCode: string): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;

  if (Array.isArray(user.permissions)) {
    if (user.permissions.includes("*") || user.permissions.includes(permCode)) {
      return true;
    }
  }

  // Fallback to role-based mapping if permissions array is empty/unset
  const role = user.role;
  if (role === "admin") return true;
  if (role === "manager") {
    return (
      permCode.startsWith("tickets.") ||
      permCode.startsWith("fleet.") ||
      permCode.startsWith("branches.") ||
      permCode.startsWith("reports.") ||
      permCode === "dashboard.view" ||
      permCode === "settings.view"
    );
  }
  if (role === "storekeeper") {
    return (
      permCode === "dashboard.view" ||
      permCode === "tickets.view" ||
      permCode === "tickets.create" ||
      permCode === "tickets.verify" ||
      permCode === "tickets.work" ||
      permCode === "tickets.release" ||
      permCode === "fleet.view" ||
      permCode === "branches.view"
    );
  }
  if (role === "technician") {
    return (
      permCode === "dashboard.view" ||
      permCode === "tickets.view" ||
      permCode === "tickets.create" ||
      permCode === "tickets.work" ||
      permCode === "fleet.view"
    );
  }
  if (role === "accountant") {
    return (
      permCode === "dashboard.view" ||
      permCode === "tickets.view" ||
      permCode === "tickets.cost" ||
      permCode.startsWith("reports.") ||
      permCode === "fleet.view" ||
      permCode === "branches.view"
    );
  }
  return false;
}

export function hasAnyPermission(user: User | null | undefined, permCodes: string[]): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  return permCodes.some((code) => hasPermission(user, code));
}

export const canViewCost = (user?: User | null): boolean => {
  return hasPermission(user, "tickets.cost");
};
