"use client";

import { useEffect, useState } from "react";
import {
  Users,
  PlusCircle,
  Search,
  ShieldCheck,
  Building2,
  Mail,
  Phone,
  Edit2,
  KeyRound,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Lock,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { User, Branch } from "@/lib/types";
import {
  CustomButton,
  CustomInput,
  CustomSelect,
  CustomCard,
  CustomModal,
} from "@/components/custom";

interface RoleOption {
  id: number;
  name: string;
  key: string;
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { lang, t } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  // Create / Edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("storekeeper");
  const [branchId, setBranchId] = useState("");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Password reset modal state
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [pwTargetUser, setPwTargetUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resettingPw, setResettingPw] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, rolesRes, branchesRes] = await Promise.all([
        api.get<{ items: User[]; total: number }>("/api/v1/users?page_size=100"),
        api.get<RoleOption[]>("/api/v1/rbac/roles").catch(() => []),
        api.get<{ items: Branch[] }>("/api/v1/branches?page_size=100").catch(() => ({ items: [] })),
      ]);

      setUsers(usersRes.items || []);
      setRoles(rolesRes || []);
      setBranches(branchesRes.items || []);
    } catch (err) {
      console.error("Failed to load staff accounts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingUser(null);
    setName("");
    setUsername("");
    setEmail("");
    setPhone("");
    setRole("storekeeper");
    setBranchId("");
    setPassword("");
    setIsActive(true);
    setModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setName(user.name);
    setUsername(user.username);
    setEmail(user.email || "");
    setPhone(user.phone || "");
    setRole(user.role);
    setBranchId(user.branch_id ? String(user.branch_id) : "");
    setPassword("");
    setIsActive(user.is_active);
    setModalOpen(true);
  };

  const openPasswordModal = (user: User) => {
    setPwTargetUser(user);
    setNewPassword("");
    setPwModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim()) {
      alert(lang === "bn" ? "নাম এবং ইউজারনেম আবশ্যক" : "Name and username are required");
      return;
    }
    if (!editingUser && !password.trim()) {
      alert(lang === "bn" ? "নতুন অ্যাকাউন্টের জন্য পাসওয়ার্ড প্রদান করুন" : "Password is required for new accounts");
      return;
    }

    try {
      setSubmitting(true);
      const payload: any = {
        name: name.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        role,
        branch_id: branchId ? Number(branchId) : undefined,
        is_active: isActive,
      };

      if (!editingUser && password.trim()) {
        payload.password = password.trim();
      }

      if (editingUser) {
        await api.put(`/api/v1/users/${editingUser.id}`, payload);
      } else {
        await api.post("/api/v1/users", payload);
      }

      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert("❌ " + (err.message || "Failed to save user account"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwTargetUser || !newPassword.trim()) {
      alert(lang === "bn" ? "নতুন পাসওয়ার্ড লিখুন" : "Please enter a new password");
      return;
    }

    try {
      setResettingPw(true);
      await api.post(`/api/v1/users/${pwTargetUser.id}/reset-password`, {
        new_password: newPassword.trim(),
      });
      alert(lang === "bn" ? "পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!" : "Password reset successfully!");
      setPwModalOpen(false);
      setNewPassword("");
    } catch (err: any) {
      alert("❌ " + (err.message || "Failed to reset password"));
    } finally {
      setResettingPw(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      !searchQuery.trim() ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = !roleFilter || u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const getRoleLabel = (roleKey: string) => {
    const map: Record<string, { en: string; bn: string }> = {
      admin: { en: "Super Administrator", bn: "প্রধান প্রশাসন" },
      manager: { en: "Operations Depot Manager", bn: "ডিপো ম্যানেজার" },
      storekeeper: { en: "Store Incharge", bn: "স্টোর ইনচার্জ" },
      technician: { en: "Senior Bus Technician", bn: "বাস মেকানিক" },
      accountant: { en: "Accounts Officer", bn: "হিসাব কর্মকর্তা" },
    };
    return map[roleKey] ? (lang === "bn" ? map[roleKey].bn : map[roleKey].en) : roleKey;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-primary via-brand-dark to-slate-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-md text-white border border-white/20">
                <Users size={13} />
                {lang === "bn" ? "কর্মী প্রশাসন ও নিরাপত্তা" : "Staff Governance"}
              </span>
              <span className="text-xs text-white/70">
                • {lang === "bn" ? "কর্মী অ্যাকাউন্ট তালিকা" : "Staff Accounts & Security"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {lang === "bn" ? "কর্মী অ্যাকাউন্ট ও রোল ব্যবস্থাপনা" : "Staff User Management & Credentials"}
            </h1>
            <p className="mt-1 text-sm text-white/80 max-w-2xl">
              {lang === "bn"
                ? "স্টোর ইনচার্জ, ডিপো ম্যানেজার ও ওয়ার্কশপ মেকানিকদের অ্যাকাউন্ট তৈরি, রোল নির্ধারণ ও পাসওয়ার্ড নিয়ন্ত্রণ করুন।"
                : "Provision accounts for Store Incharges, Depot Managers, and Workshop Technicians, configure active credentials, and assign operational roles."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <CustomButton
              variant="outline"
              onClick={openAddModal}
              className="bg-white text-brand-dark hover:bg-slate-100 border-white text-xs font-bold"
            >
              <PlusCircle size={14} className="mr-1.5 text-brand-primary" />
              {lang === "bn" ? "নতুন কর্মী যোগ" : "Add Staff Member"}
            </CustomButton>
          </div>
        </div>

        {/* Decorative background watermark */}
        <div className="pointer-events-none absolute right-4 bottom-2 opacity-10">
          <Users size={180} />
        </div>
      </div>

      {/* Filter / Search Bar */}
      <CustomCard className="p-4 bg-white shadow-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-1 flex-col sm:flex-row items-center gap-3 w-full">
            <div className="relative w-full sm:w-80">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === "bn" ? "নাম, ইউজারনেম বা ইমেইল দিয়ে খুঁজুন..." : "Search staff by name, username, or email..."}
                className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-brand-primary outline-none transition"
              />
            </div>

            <div className="w-full sm:w-60">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-brand-primary outline-none transition cursor-pointer"
              >
                <option value="">{lang === "bn" ? "সকল রোল" : "All Roles"}</option>
                <option value="admin">{lang === "bn" ? "প্রধান প্রশাসন (অ্যাডমিন)" : "Super Administrator"}</option>
                <option value="manager">{lang === "bn" ? "ডিপো ম্যানেজার" : "Depot Manager"}</option>
                <option value="storekeeper">{lang === "bn" ? "স্টোর ইনচার্জ" : "Store Incharge"}</option>
                <option value="technician">{lang === "bn" ? "বাস মেকানিক" : "Technician"}</option>
                <option value="accountant">{lang === "bn" ? "হিসাব কর্মকর্তা" : "Accounts Officer"}</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <span className="text-xs font-bold text-slate-500">
              {lang === "bn" ? `মোট ${filteredUsers.length} জন কর্মী` : `Total ${filteredUsers.length} Staff`}
            </span>
            <CustomButton
              variant="outline"
              size="sm"
              onClick={loadData}
              title={lang === "bn" ? "রিফ্রেশ" : "Refresh"}
              className="text-xs px-2.5"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            </CustomButton>
          </div>
        </div>
      </CustomCard>

      {/* Users Table */}
      <CustomCard className="overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">{lang === "bn" ? "কর্মীর নাম" : "Staff Member"}</th>
                <th className="py-3 px-4">{lang === "bn" ? "ইউজারনেম" : "Username"}</th>
                <th className="py-3 px-4">{lang === "bn" ? "নির্ধারিত রোল" : "Assigned Role"}</th>
                <th className="py-3 px-4">{lang === "bn" ? "যোগাযোগের তথ্য" : "Contact Info"}</th>
                <th className="py-3 px-4">{lang === "bn" ? "অবস্থা" : "Status"}</th>
                <th className="py-3 px-4 text-right">{lang === "bn" ? "অ্যাকশন" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw size={24} className="mx-auto animate-spin text-brand-primary mb-2" />
                    {lang === "bn" ? "কর্মী তালিকা লোড হচ্ছে..." : "Loading staff accounts..."}
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Users size={36} className="mx-auto mb-2 text-slate-300" />
                    {lang === "bn" ? "কোনো কর্মী পাওয়া যায়নি।" : "No staff users found matching your filters."}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-brand-50 text-brand-primary flex items-center justify-center font-bold text-xs border border-brand-border">
                          {u.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{u.name}</p>
                          {u.branch_name && (
                            <p className="text-[10.5px] text-slate-400 flex items-center gap-1">
                              <Building2 size={10} />
                              {u.branch_name}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                      @{u.username}
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md text-[11px] border border-slate-200">
                        <ShieldCheck size={12} className="text-brand-primary" />
                        {getRoleLabel(u.role)}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      <div className="space-y-0.5 text-[11px]">
                        {u.email && (
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Mail size={11} className="text-slate-400" />
                            <span>{u.email}</span>
                          </div>
                        )}
                        {u.phone && (
                          <div className="flex items-center gap-1.5 text-slate-700 font-mono font-medium">
                            <Phone size={11} className="text-slate-400" />
                            <span>{u.phone}</span>
                          </div>
                        )}
                        {!u.email && !u.phone && <span className="text-slate-400">—</span>}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          u.is_active
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {u.is_active ? (
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
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <CustomButton
                          variant="outline"
                          size="xs"
                          onClick={() => openPasswordModal(u)}
                          title={lang === "bn" ? "পাসওয়ার্ড রিসেট" : "Reset Password"}
                          className="px-2 text-slate-600 hover:text-brand-primary"
                        >
                          <KeyRound size={12} className="mr-1" />
                          {lang === "bn" ? "পাসওয়ার্ড" : "Password"}
                        </CustomButton>

                        <CustomButton
                          variant="outline"
                          size="xs"
                          onClick={() => openEditModal(u)}
                          className="px-2 text-slate-700"
                        >
                          <Edit2 size={12} className="mr-1" />
                          {lang === "bn" ? "সম্পাদনা" : "Edit"}
                        </CustomButton>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CustomCard>

      {/* Create / Edit Staff Modal */}
      <CustomModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editingUser
            ? (lang === "bn" ? "কর্মী তথ্য পরিবর্তন" : "Edit Staff Account")
            : (lang === "bn" ? "নতুন কর্মী যোগ করুন" : "Add Staff Member")
        }
      >
        <form onSubmit={handleSaveUser} className="space-y-4">
          <CustomInput
            label={lang === "bn" ? "পূর্ণ নাম *" : "Full Name *"}
            placeholder="e.g. Mohammad Rafiqul Islam"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <CustomInput
              label={lang === "bn" ? "ইউজারনেম *" : "Username *"}
              placeholder="e.g. rafiqul_ctg"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
              disabled={!!editingUser}
              required
            />
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                {lang === "bn" ? "নিরাপত্তা রোল *" : "Security Role *"}
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-md p-2 outline-none focus:border-brand-primary cursor-pointer"
              >
                <option value="admin">{lang === "bn" ? "প্রধান প্রশাসন (অ্যাডমিন)" : "Super Administrator"}</option>
                <option value="manager">{lang === "bn" ? "ডিপো ম্যানেজার" : "Operations Depot Manager"}</option>
                <option value="storekeeper">{lang === "bn" ? "স্টোর ইনচার্জ" : "Store Incharge"}</option>
                <option value="technician">{lang === "bn" ? "বাস মেকানিক" : "Senior Bus Technician"}</option>
                <option value="accountant">{lang === "bn" ? "হিসাব কর্মকর্তা" : "Accounts Officer"}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <CustomInput
              label={lang === "bn" ? "ইমেইল ঠিকানা" : "Email Address"}
              type="email"
              placeholder="e.g. rafiqul@soudiabd.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <CustomInput
              label={lang === "bn" ? "মোবাইল নম্বর" : "Phone Number"}
              placeholder="e.g. 01711-234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {!editingUser && (
            <CustomInput
              label={lang === "bn" ? "লগইন পাসওয়ার্ড *" : "Account Password *"}
              type="password"
              placeholder="Enter secure initial password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          )}

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="userActiveToggle"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded-xs border-slate-300 text-brand-primary focus:ring-brand-primary cursor-pointer"
            />
            <label htmlFor="userActiveToggle" className="text-xs font-semibold text-slate-700 cursor-pointer">
              {lang === "bn" ? "সক্রিয় কর্মী অ্যাকাউন্ট" : "Active Staff Account"}
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
                : editingUser
                ? (lang === "bn" ? "আপডেট করুন" : "Update Staff")
                : (lang === "bn" ? "কর্মী যোগ করুন" : "Create Account")}
            </CustomButton>
          </div>
        </form>
      </CustomModal>

      {/* Password Reset Modal */}
      <CustomModal
        open={pwModalOpen}
        onClose={() => setPwModalOpen(false)}
        title={
          lang === "bn"
            ? `@${pwTargetUser?.username} এর পাসওয়ার্ড পরিবর্তন`
            : `Reset Password for @${pwTargetUser?.username}`
        }
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <p className="text-xs text-slate-500">
            {lang === "bn"
              ? `${pwTargetUser?.name} এর জন্য একটি নতুন পাসওয়ার্ড সেট করুন। পরবর্তী লগইনে কর্মী এই পাসওয়ার্ড ব্যবহার করবেন।`
              : `Set a new temporary password for ${pwTargetUser?.name}. The user will use this new password on their next login.`}
          </p>

          <CustomInput
            label={lang === "bn" ? "নতুন পাসওয়ার্ড *" : "New Password *"}
            type="password"
            placeholder="Enter at least 6 characters..."
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <CustomButton
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPwModalOpen(false)}
            >
              {lang === "bn" ? "বাতিল" : "Cancel"}
            </CustomButton>
            <CustomButton
              type="submit"
              variant="primary"
              size="sm"
              disabled={resettingPw}
            >
              {resettingPw
                ? (lang === "bn" ? "পরিবর্তন হচ্ছে..." : "Resetting...")
                : (lang === "bn" ? "পাসওয়ার্ড সেট করুন" : "Set New Password")}
            </CustomButton>
          </div>
        </form>
      </CustomModal>
    </div>
  );
}
