"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck,
  PlusCircle,
  Check,
  Users,
  Lock,
  Edit2,
  Trash2,
  Save,
  RefreshCw,
  AlertCircle,
  CheckSquare,
  Square,
  Building2,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import {
  CustomButton,
  CustomInput,
  CustomCard,
  CustomModal,
} from "@/components/custom";

interface RoleItem {
  id: number;
  name: string;
  key: string;
  description?: string;
  isSystem: boolean;
  permCount: number;
  userCount: number;
}

interface PermissionItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  module: string;
}

export default function RbacPage() {
  const { user } = useAuth();
  const { lang, t } = useLanguage();
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [selectedRole, setSelectedRole] = useState<RoleItem | null>(null);
  const [groupedPermissions, setGroupedPermissions] = useState<Record<string, PermissionItem[]>>({});
  const [rolePermCodes, setRolePermCodes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [savingPerms, setSavingPerms] = useState(false);

  // Create role modal
  const [createModal, setCreateModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleKey, setNewRoleKey] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [creating, setCreating] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [resRoles, resModules] = await Promise.all([
        api.get<RoleItem[]>("/api/v1/rbac/roles"),
        api.get<Record<string, PermissionItem[]>>("/api/v1/rbac/permissions/modules"),
      ]);

      setRoles(resRoles || []);
      setGroupedPermissions(resModules || {});

      // Auto select first role if none selected
      if (resRoles && resRoles.length > 0) {
        const initial = selectedRole
          ? resRoles.find((r) => r.id === selectedRole.id) || resRoles[0]
          : resRoles[0];
        setSelectedRole(initial);
        await loadRolePermissions(initial.id);
      }
    } catch (err) {
      console.error("Failed to load RBAC data:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadRolePermissions = async (roleId: number) => {
    try {
      const perms = await api.get<PermissionItem[]>(`/api/v1/rbac/roles/${roleId}/permissions`);
      const codes = new Set<string>((perms || []).map((p) => p.code));
      setRolePermCodes(codes);
    } catch (err) {
      console.error("Failed to load permissions for role:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectRole = async (r: RoleItem) => {
    setSelectedRole(r);
    await loadRolePermissions(r.id);
  };

  const togglePermission = (code: string) => {
    setRolePermCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const toggleAllInModule = (moduleKey: string) => {
    const items = groupedPermissions[moduleKey] || [];
    const allSelected = items.every((p) => rolePermCodes.has(p.code));

    setRolePermCodes((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        items.forEach((p) => next.delete(p.code));
      } else {
        items.forEach((p) => next.add(p.code));
      }
      return next;
    });
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    try {
      setSavingPerms(true);
      await api.put(`/api/v1/rbac/roles/${selectedRole.id}/permissions`, {
        permissionCodes: Array.from(rolePermCodes),
      });

      // Update local role permCount
      setRoles((prev) =>
        prev.map((r) =>
          r.id === selectedRole.id ? { ...r, permCount: rolePermCodes.size } : r
        )
      );

      alert(lang === "bn" ? "অনুমতি সংরক্ষিত হয়েছে!" : "Role permissions updated successfully!");
    } catch (err: any) {
      alert("❌ " + (err.message || "Failed to update permissions"));
    } finally {
      setSavingPerms(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) {
      alert(lang === "bn" ? "রোলের নাম প্রদান করুন" : "Role name is required");
      return;
    }

    try {
      setCreating(true);
      await api.post("/api/v1/rbac/roles", {
        name: newRoleName.trim(),
        key: newRoleKey.trim() || undefined,
        description: newRoleDesc.trim() || undefined,
      });

      setCreateModal(false);
      setNewRoleName("");
      setNewRoleKey("");
      setNewRoleDesc("");
      await loadData();
    } catch (err: any) {
      alert("❌ " + (err.message || "Failed to create role"));
    } finally {
      setCreating(false);
    }
  };

  const moduleDisplayTitles: Record<string, { en: string; bn: string }> = {
    tickets: { en: "Tickets & 3-Step Verification Pipeline", bn: "টিকেটিং ও ৩-ধাপ অনুমোদন পাইপলাইন" },
    fleet: { en: "Bus Fleet & Parts Log Book", bn: "বাস বহর ও পার্টস লগ বই" },
    branches: { en: "Operational Depots & Workshops", bn: "ডিপো ও ওয়ার্কশপ ব্যবস্থাপনা" },
    reports: { en: "Reports & Financial Auditing", bn: "রিপোর্ট ও অডিট হিসাব" },
    rbac: { en: "Security & Governance (RBAC)", bn: "নিরাপত্তা ও পারমিশন কন্ট্রোল" },
    settings: { en: "System Branding & Master Settings", bn: "সিস্টেম ব্র্যান্ডিং ও কনফিগ" },
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-primary via-brand-dark to-slate-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-md text-white border border-white/20">
                <ShieldCheck size={13} />
                {lang === "bn" ? "পারমিশন ও নিরাপত্তা প্রশাসন" : "Access Governance"}
              </span>
              <span className="text-xs text-white/70">
                • {lang === "bn" ? "রোল ও পারমিশন ম্যাট্রিক্স" : "Roles & Permission Matrix"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {lang === "bn" ? "রোল ও পারমিশন ম্যাট্রিক্স (RBAC)" : "Roles & Permission Matrix (RBAC)"}
            </h1>
            <p className="mt-1 text-sm text-white/80 max-w-2xl">
              {lang === "bn"
                ? "স্টোর ইনচার্জ, ডিপো ম্যানেজার ও মেকানিকদের ৩-ধাপ অনুমোদন, বাস ট্রান্সফার ও গেট পাস ইস্যুর নিরাপত্তা পারমিশন নির্ধারণ করুন।"
                : "Configure granular security permissions for Store Incharges, Depot Managers, Admins, and Technicians across 3-step verification, bus transfers, and gate pass release."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <CustomButton
              variant="outline"
              onClick={() => setCreateModal(true)}
              className="bg-white text-brand-dark hover:bg-slate-100 border-white text-xs font-bold"
            >
              <PlusCircle size={14} className="mr-1.5 text-brand-primary" />
              {lang === "bn" ? "নতুন রোল তৈরি" : "Add Custom Role"}
            </CustomButton>
          </div>
        </div>

        {/* Decorative background watermark */}
        <div className="pointer-events-none absolute right-4 bottom-2 opacity-10">
          <ShieldCheck size={180} />
        </div>
      </div>

      {/* Main Grid: Left Roles List, Right Permission Checkboxes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Roles Sidebar */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {lang === "bn" ? `সিস্টেম রোলসমূহ (${roles.length})` : `System Roles (${roles.length})`}
            </h2>
            <CustomButton
              variant="ghost"
              size="sm"
              onClick={loadData}
              title={lang === "bn" ? "রিফ্রেশ" : "Refresh"}
              className="text-xs px-2 h-7 text-slate-400 hover:text-slate-700"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            </CustomButton>
          </div>

          <div className="space-y-2">
            {roles.map((r) => {
              const isSelected = selectedRole?.id === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => handleSelectRole(r)}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? "bg-brand-50/80 border-brand-primary shadow-xs ring-1 ring-brand-primary/40"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-800">{r.name}</span>
                    {r.isSystem && (
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Lock size={9} /> {lang === "bn" ? "সিস্টেম" : "System"}
                      </span>
                    )}
                  </div>

                  <p className="font-mono text-[11px] text-slate-400 mt-0.5">key: {r.key}</p>
                  {r.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">{r.description}</p>
                  )}

                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                    <span>
                      {lang === "bn" ? `${r.permCount || 0} টি পারমিশন` : `${r.permCount || 0} Permissions`}
                    </span>
                    <span>
                      {lang === "bn" ? `${r.userCount || 0} জন কর্মী` : `${r.userCount || 0} Staff`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Module Permission Matrix */}
        <div className="lg:col-span-8">
          <CustomCard className="p-5 shadow-xs">
            {selectedRole ? (
              <div className="space-y-6">
                {/* Header of selected role */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-slate-900">
                        {selectedRole.name}
                      </h3>
                      {selectedRole.isSystem && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10.5px] font-bold text-amber-700 border border-amber-200">
                          <Lock size={10} /> {lang === "bn" ? "ডিফল্ট সিস্টেম রোল" : "Built-in System Role"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {lang === "bn"
                        ? "এই রোলের অধীনে থাকা কর্মীদের জন্য মডিউল পারমিশন পরিবর্তন করুন।"
                        : "Toggle specific module permissions for staff members assigned to this role."}
                    </p>
                  </div>

                  <CustomButton
                    variant="primary"
                    onClick={handleSavePermissions}
                    disabled={savingPerms}
                    className="text-xs"
                  >
                    <Save size={14} className="mr-1.5" />
                    {savingPerms
                      ? (lang === "bn" ? "সংরক্ষণ হচ্ছে..." : "Saving...")
                      : (lang === "bn" ? "পারমিশন সংরক্ষণ করুন" : "Save Permissions")}
                  </CustomButton>
                </div>

                {/* Modules & Checkboxes */}
                <div className="space-y-6">
                  {Object.entries(groupedPermissions).map(([moduleKey, perms]) => {
                    const titles = moduleDisplayTitles[moduleKey] || {
                      en: moduleKey.toUpperCase(),
                      bn: moduleKey.toUpperCase(),
                    };
                    const allSelected = perms.every((p) => rolePermCodes.has(p.code));
                    const someSelected =
                      !allSelected && perms.some((p) => rolePermCodes.has(p.code));

                    return (
                      <div
                        key={moduleKey}
                        className="rounded-xl border border-slate-200 bg-slate-50/50 p-4"
                      >
                        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-brand-primary" />
                            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                              {lang === "bn" ? titles.bn : titles.en}
                            </h4>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleAllInModule(moduleKey)}
                            className="text-[11px] font-bold text-brand-primary hover:underline cursor-pointer"
                          >
                            {allSelected
                              ? (lang === "bn" ? "সবগুলো বাতিল" : "Deselect All")
                              : (lang === "bn" ? "সবগুলো নির্বাচন" : "Select All")}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {perms.map((p) => {
                            const isChecked = rolePermCodes.has(p.code);
                            return (
                              <label
                                key={p.code}
                                className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                                  isChecked
                                    ? "bg-white border-brand-primary/60 shadow-2xs"
                                    : "bg-white/60 border-slate-200 hover:bg-white hover:border-slate-300"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => togglePermission(p.code)}
                                  className="mt-0.5 h-4 w-4 rounded-xs border-slate-300 text-brand-primary focus:ring-brand-primary cursor-pointer"
                                />
                                <div className="space-y-0.5">
                                  <span className="font-bold text-slate-800 block leading-tight">
                                    {p.name}
                                  </span>
                                  <span className="font-mono text-[10px] text-slate-400 block">
                                    {p.code}
                                  </span>
                                  {p.description && (
                                    <p className="text-[11px] text-slate-500 leading-tight">
                                      {p.description}
                                    </p>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-slate-400">
                <ShieldCheck size={40} className="mx-auto mb-2 text-slate-300" />
                {lang === "bn"
                  ? "পারমিশন কনফিগার করতে বামের তালিকা থেকে একটি রোল নির্বাচন করুন।"
                  : "Select a role from the left to configure permissions."}
              </div>
            )}
          </CustomCard>
        </div>
      </div>

      {/* Create Custom Role Modal */}
      <CustomModal
        open={createModal}
        onClose={() => setCreateModal(false)}
        title={lang === "bn" ? "কাস্টম সিকিউরিটি রোল তৈরি" : "Create Custom Security Role"}
      >
        <form onSubmit={handleCreateRole} className="space-y-4">
          <CustomInput
            label={lang === "bn" ? "রোলের নাম *" : "Role Name *"}
            placeholder="e.g. Lead Bus Electrician"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            required
          />

          <CustomInput
            label={lang === "bn" ? "রোল কোড (সিস্টেম কি)" : "Role Key"}
            placeholder="e.g. lead_electrician (auto-generated if blank)"
            value={newRoleKey}
            onChange={(e) => setNewRoleKey(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
          />

          <CustomInput
            label={lang === "bn" ? "দায়িত্ব ও বিবরণ" : "Role Responsibilities & Description"}
            placeholder="e.g. Inspects coach alternators, starter motors & battery systems"
            value={newRoleDesc}
            onChange={(e) => setNewRoleDesc(e.target.value)}
          />

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <CustomButton
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCreateModal(false)}
            >
              {lang === "bn" ? "বাতিল" : "Cancel"}
            </CustomButton>
            <CustomButton
              type="submit"
              variant="primary"
              size="sm"
              disabled={creating}
            >
              {creating
                ? (lang === "bn" ? "তৈরি হচ্ছে..." : "Creating...")
                : (lang === "bn" ? "রোল তৈরি করুন" : "Create Role")}
            </CustomButton>
          </div>
        </form>
      </CustomModal>
    </div>
  );
}
