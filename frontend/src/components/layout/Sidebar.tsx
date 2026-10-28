"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useMemo } from "react";
import {
  ChevronDown, LogOut, Loader2, Search, X,
} from "lucide-react";
import { useDynamicNav, type NavItem, type NavChild } from "@/lib/dynamic-nav";
import { siteConfig } from "@/config/site";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/cn";

const STORAGE_KEY = "car_inventory_sidebar_collapsed";
const EXPANDED_KEY = "car_inventory_sidebar_expanded";

// ─── Route Active Helpers ─────────────────────────────────────────────

function normalizeRoute(route: string): { path: string; query: string } {
  if (!route) return { path: "", query: "" };
  const [path, query] = route.split("?");
  return { path: path.replace(/\/$/, ""), query: query || "" };
}

function isRouteActive(href: string, currentFullPath: string, allHrefs: Set<string>): boolean {
  if (!href || href === "#") return false;

  const currentNorm = normalizeRoute(currentFullPath);
  const hrefNorm = normalizeRoute(href);

  // If link specifies a query string, require exact match of path AND query
  if (hrefNorm.query) {
    return currentNorm.path === hrefNorm.path && currentNorm.query === hrefNorm.query;
  }

  // If link has no query params, it matches if paths are identical
  if (currentNorm.path === hrefNorm.path) {
    if (currentNorm.query) {
      // Check if any other item in allHrefs matches this exact query
      const exactQueryMatchExists = Array.from(allHrefs).some((other) => {
        const otherNorm = normalizeRoute(other);
        return (
          otherNorm.path === currentNorm.path &&
          otherNorm.query &&
          otherNorm.query === currentNorm.query
        );
      });
      // If a specialized sub-route exists for this query, parent without query is inactive
      if (exactQueryMatchExists) return false;
    }
    return true;
  }

  if (currentNorm.path.startsWith(hrefNorm.path + "/")) {
    const exactOrLongerMatchExists = Array.from(allHrefs).some((other) => {
      const otherNorm = normalizeRoute(other);
      if (otherNorm.path === currentNorm.path) return true;
      if (
        otherNorm.path.startsWith(hrefNorm.path + "/") &&
        currentNorm.path.startsWith(otherNorm.path + "/") &&
        otherNorm.path.length > hrefNorm.path.length
      ) {
        return true;
      }
      return false;
    });

    if (exactOrLongerMatchExists) return false;
    return true;
  }

  return false;
}

function isModuleActive(item: NavItem, currentFullPath: string, allHrefs: Set<string>): boolean {
  if (isRouteActive(item.href, currentFullPath, allHrefs)) return true;
  return (item.children ?? []).some((c) =>
    isRouteActive(c.href, currentFullPath, allHrefs) ||
    (c.children ?? []).some((s) => isRouteActive(s.href, currentFullPath, allHrefs)),
  );
}

function isChildActive(child: NavChild, currentFullPath: string, allHrefs: Set<string>): boolean {
  if (isRouteActive(child.href, currentFullPath, allHrefs)) return true;
  return (child.children ?? []).some((s) => isRouteActive(s.href, currentFullPath, allHrefs));
}

// ─── Sidebar Component ───────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { lang } = useLanguage();
  const { navGroups, loading } = useDynamicNav();

  const [collapsed, setCollapsed] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [activeFlyout, setActiveFlyout] = useState<{
    item: NavItem;
    top: number;
  } | null>(null);

  const flyoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const collapsedNavRef = useRef<HTMLElement | null>(null);
  const expandedNavRef = useRef<HTMLElement | null>(null);

  const displayRole = user?.role || "Staff";

  const currentFullPath = useMemo(() => {
    const q = searchParams?.toString();
    return q ? `${pathname}?${q}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    setActiveFlyout(null);
  }, [currentFullPath]);

  const allHrefs = useMemo(() => {
    const set = new Set<string>();
    for (const group of navGroups) {
      for (const mod of group.items) {
        if (mod.href && mod.href !== "#") set.add(mod.href);
        for (const child of mod.children ?? []) {
          if (child.href && child.href !== "#") set.add(child.href);
          for (const sub of child.children ?? []) {
            if (sub.href && sub.href !== "#") set.add(sub.href);
          }
        }
      }
    }
    return set;
  }, [navGroups]);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === "1") {
      setCollapsed(true);
    }
    try {
      const saved = localStorage.getItem(EXPANDED_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { modules: string[]; items: string[] };
        const lastMod = (parsed.modules ?? []).slice(-1);
        const lastItem = (parsed.items ?? []).slice(-1);
        setExpandedModules(new Set(lastMod));
        setExpandedItems(new Set(lastItem));
      } else {
        setExpandedModules(new Set(["Tickets Management", "Bus Fleet"]));
      }
    } catch {
      setExpandedModules(new Set(["Tickets Management", "Bus Fleet"]));
    }
    setIsReady(true);
  }, []);

  // Automatically expand active module if route changes
  useEffect(() => {
    if (!currentFullPath || !navGroups.length) return;
    for (const group of navGroups) {
      for (const mod of group.items) {
        if (isModuleActive(mod, currentFullPath, allHrefs)) {
          setExpandedModules((prev) => {
            if (prev.has(mod.label)) return prev;
            const next = new Set(prev);
            next.add(mod.label);
            return next;
          });
        }
      }
    }
  }, [currentFullPath, navGroups, allHrefs]);

  useEffect(() => {
    if (!isReady) return;
    try {
      localStorage.setItem(
        EXPANDED_KEY,
        JSON.stringify({
          modules: Array.from(expandedModules),
          items: Array.from(expandedItems),
        }),
      );
    } catch {}
  }, [expandedModules, expandedItems, isReady]);

  // Listen to toggle events from Header
  useEffect(() => {
    const onToggle = () => {
      setCollapsed((prev) => {
        const next = !prev;
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
        return next;
      });
    };
    window.addEventListener("bpos:toggle-sidebar", onToggle);
    window.addEventListener("sbci:toggle-sidebar", onToggle);
    return () => {
      window.removeEventListener("bpos:toggle-sidebar", onToggle);
      window.removeEventListener("sbci:toggle-sidebar", onToggle);
    };
  }, []);

  const toggleModule = (moduleLabel: string) => {
    setExpandedModules((prev) => {
      const next = new Set<string>();
      if (!prev.has(moduleLabel)) {
        next.add(moduleLabel);
      }
      return next;
    });
  };

  const toggleItem = (itemHref: string) => {
    setExpandedItems((prev) => {
      const next = new Set<string>();
      if (!prev.has(itemHref)) {
        next.add(itemHref);
      }
      return next;
    });
  };

  const handleOpenFlyout = (item: NavItem, top: number) => {
    if (flyoutTimerRef.current) clearTimeout(flyoutTimerRef.current);
    setActiveFlyout({ item, top });
  };

  const handleCloseFlyout = () => {
    flyoutTimerRef.current = setTimeout(() => {
      setActiveFlyout(null);
    }, 120);
  };

  const isSearching = searchQuery.trim().length > 0;
  const filteredNavGroups = useMemo(() => {
    if (!isSearching) return navGroups;
    const query = searchQuery.toLowerCase().trim();

    return navGroups
      .map((group) => {
        const matchedItems = group.items
          .map((item) => {
            const itemMatches = item.label.toLowerCase().includes(query);
            const matchedChildren = (item.children ?? []).filter((child) => {
              const childMatches = child.label.toLowerCase().includes(query);
              const subMatches = (child.children ?? []).some((s) => s.label.toLowerCase().includes(query));
              return childMatches || subMatches;
            });

            if (itemMatches || matchedChildren.length > 0) {
              return {
                ...item,
                children: matchedChildren.length > 0 ? matchedChildren : item.children,
              };
            }
            return null;
          })
          .filter(Boolean) as NavItem[];

        return {
          ...group,
          items: matchedItems,
        };
      })
      .filter((group) => group.items.length > 0);
  }, [navGroups, searchQuery, isSearching]);

  return (
    <aside
      className="relative hidden shrink-0 flex-col border-r border-brand-border bg-white text-slate-700 lg:flex shadow-xs select-none z-20 h-full print:hidden"
      style={{
        width: collapsed ? "72px" : "264px",
        minWidth: collapsed ? "72px" : "264px",
        maxWidth: collapsed ? "72px" : "264px",
        transition: isReady ? "width 160ms cubic-bezier(0.4, 0, 0.2, 1), min-width 160ms cubic-bezier(0.4, 0, 0.2, 1), max-width 160ms cubic-bezier(0.4, 0, 0.2, 1)" : "none",
        willChange: "width",
      }}
    >
      {/* ── TRACK 1: COLLAPSED PANEL (72px Width) ── */}
      <div
        className="absolute inset-y-0 left-0 w-[72px] min-w-[72px] max-w-[72px] flex flex-col z-10"
        style={{
          display: collapsed ? "flex" : "none",
          opacity: collapsed ? 1 : 0,
          pointerEvents: collapsed ? "auto" : "none",
          visibility: collapsed ? "visible" : "hidden",
          transition: isReady ? "opacity 160ms ease-in-out, visibility 160ms ease-in-out" : "none",
        }}
        aria-hidden={!collapsed}
      >
        <nav
          ref={collapsedNavRef}
          className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1.5 custom-scrollbar"
        >
          {loading ? (
            <div className="flex h-24 items-center justify-center">
              <Loader2 size={18} className="animate-spin text-brand-primary" />
            </div>
          ) : (
            navGroups.map((group) =>
              group.items.map((item, idx) => {
                const Icon = item.icon;
                const active = isModuleActive(item, currentFullPath, allHrefs);
                const isFlyoutOpen = activeFlyout?.item.label === item.label;

                if (!item.children?.length) {
                  return (
                    <div key={`col-${group.title}-${item.label}-${idx}`} className="flex justify-center">
                      <Link
                        href={item.href}
                        title={item.label}
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-sm border transition-colors duration-150 shrink-0 shadow-2xs",
                          active
                            ? "bg-brand-gradient border-brand-border text-white shadow-2xs"
                            : "border-brand-light bg-white text-brand-primary hover:border-brand-border hover:bg-brand-50 hover:text-brand-dark",
                        )}
                      >
                        <Icon size={20} />
                      </Link>
                    </div>
                  );
                }

                return (
                  <div
                    key={`col-${group.title}-${item.label}-${idx}`}
                    className="relative flex w-full items-center justify-center"
                    onMouseEnter={(e) => handleOpenFlyout(item, e.currentTarget.getBoundingClientRect().top)}
                    onMouseLeave={handleCloseFlyout}
                  >
                    <button
                      type="button"
                      onClick={(e) => handleOpenFlyout(item, e.currentTarget.getBoundingClientRect().top)}
                      title={item.label}
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-sm border transition-colors duration-150 cursor-pointer shrink-0 shadow-2xs",
                        active || isFlyoutOpen
                          ? "bg-brand-gradient border-brand-border text-white shadow-2xs"
                          : "border-brand-light bg-white text-brand-primary hover:border-brand-border hover:bg-brand-50 hover:text-brand-dark",
                      )}
                    >
                      <Icon size={20} />
                    </button>
                  </div>
                );
              })
            )
          )}
        </nav>

        <div className="flex h-14 shrink-0 items-center justify-center border-t border-brand-light bg-white p-2">
          <button
            onClick={logout}
            title={lang === "bn" ? "লগআউট" : "Sign Out"}
            className="flex h-10 w-10 items-center justify-center rounded-sm bg-rose-50 border border-rose-200 text-rose-600 transition hover:bg-rose-600 hover:text-white hover:border-rose-600 cursor-pointer shadow-2xs"
          >
            <LogOut size={17} />
          </button>
        </div>
      </div>

      {/* ── TRACK 2: EXPANDED PANEL (264px Width) ── */}
      <div
        className="absolute inset-y-0 left-0 w-[264px] min-w-[264px] max-w-[264px] flex flex-col z-20"
        style={{
          display: collapsed ? "none" : "flex",
          opacity: collapsed ? 0 : 1,
          pointerEvents: collapsed ? "none" : "auto",
          visibility: collapsed ? "hidden" : "visible",
          transition: isReady ? "opacity 160ms ease-in-out, visibility 160ms ease-in-out" : "none",
        }}
        aria-hidden={collapsed}
      >
        {/* Menu Quick Search */}
        <div className="px-3 pt-3 pb-1">
          <div className="relative flex items-center">
            <Search size={14} className="pointer-events-none absolute left-3 text-brand-primary" />
            <input
              type="text"
              placeholder={lang === "en" ? "Search menu..." : "মেনু অনুসন্ধান..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="theme-search-input w-full rounded-full pl-9 pr-8 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 outline-none shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Main Navigation List */}
        <nav
          ref={expandedNavRef}
          className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-2 space-y-1 custom-scrollbar"
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
              <Loader2 size={20} className="animate-spin text-brand-primary" />
              <span className="text-xs font-medium">Loading navigation...</span>
            </div>
          ) : filteredNavGroups.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-slate-400">
              No matching menus found.
            </div>
          ) : (
            filteredNavGroups.map((group) => (
              <div key={group.title} className="space-y-1">
                {group.items.map((item, idx) => (
                  <ExpandedModuleRow
                    key={`exp-${group.title}-${item.label}-${idx}`}
                    item={item}
                    currentFullPath={currentFullPath}
                    allHrefs={allHrefs}
                    moduleExpanded={isSearching || expandedModules.has(item.label)}
                    expandedItems={expandedItems}
                    onToggleModule={() => toggleModule(item.label)}
                    onToggleItem={toggleItem}
                    isSearching={isSearching}
                  />
                ))}
              </div>
            ))
          )}
        </nav>

        {/* Sidebar Footer User Info & Logout */}
        <div className="flex h-14 shrink-0 items-center justify-between border-t border-brand-light px-2.5 bg-white">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-brand-gradient text-xs font-bold text-white shadow-2xs">
              {(user?.name || "A")[0].toUpperCase()}
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="truncate text-xs font-bold text-brand-dark">
                {user?.name || "Administrator"}
              </span>
              <span className="truncate text-[10px] text-brand-primary font-semibold">
                {displayRole}
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            title={lang === "bn" ? "লগআউট" : "Sign Out"}
            className="flex h-8 w-8 items-center justify-center rounded-sm bg-rose-50 border border-rose-200 text-rose-600 transition hover:bg-rose-600 hover:text-white hover:border-rose-600 shadow-2xs cursor-pointer shrink-0"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>

      {/* ── Collapsed Mode Floating Flyout Submenu ── */}
      {collapsed && activeFlyout && (
        <div
          onMouseEnter={() => {
            if (flyoutTimerRef.current) clearTimeout(flyoutTimerRef.current);
          }}
          onMouseLeave={handleCloseFlyout}
          style={{
            position: "fixed",
            left: "72px",
            top: Math.max(12, Math.min(typeof window !== "undefined" ? window.innerHeight - 380 : 100, activeFlyout.top)),
            zIndex: 999999,
          }}
          className="pl-2 select-none"
        >
          <div className="min-w-[210px] max-w-[260px] overflow-hidden rounded-sm border border-brand-border bg-white shadow-xl select-none">
            {(() => {
              const FlyoutIcon = activeFlyout.item.icon;
              return (
                <div className="flex items-center justify-between border-b border-brand-light px-3.5 py-2.5 bg-white">
                  <div className="flex items-center gap-2">
                    <FlyoutIcon size={16} className="shrink-0 text-brand-primary" />
                    <span className="text-xs font-bold tracking-tight text-brand-dark">
                      {lang === "bn" ? (activeFlyout.item.labelBn || activeFlyout.item.label) : activeFlyout.item.label}
                    </span>
                  </div>
                  {activeFlyout.item.badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm border bg-brand-50 text-brand-primary border-brand-border">
                      {activeFlyout.item.badge}
                    </span>
                  )}
                </div>
              );
            })()}

            <div className="p-1.5 space-y-0.5 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {activeFlyout.item.children?.map((child, idx) => {
                const ChildIcon = child.icon;
                const childActive = isChildActive(child, currentFullPath, allHrefs);
                const hasSub = !!child.children?.length;
                const childLabel = lang === "bn" ? (child.labelBn || child.label) : child.label;

                return (
                  <div key={`${child.label}-${child.href}-${idx}`}>
                    <Link
                      href={child.href !== "#" ? child.href : (child.children?.[0]?.href || "#")}
                      onClick={() => setActiveFlyout(null)}
                      className={cn(
                        "flex items-center justify-between gap-2.5 px-3 py-2 text-xs rounded-sm transition-colors",
                        childActive
                          ? "bg-brand-gradient text-white font-bold"
                          : "text-brand-primary font-semibold hover:bg-brand-50 hover:text-brand-dark"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <ChildIcon size={14} className={cn("shrink-0", childActive ? "text-white" : "text-brand-primary")} />
                        <span className="truncate">{childLabel}</span>
                      </div>
                    </Link>

                    {hasSub && (
                      <div className="ml-4 pl-2 border-l border-brand-border my-1 space-y-0.5">
                        {child.children!.map((sub, sIdx) => {
                          const SubIcon = sub.icon;
                          const subActive = isRouteActive(sub.href, currentFullPath, allHrefs);
                          const subLabel = lang === "bn" ? (sub.labelBn || sub.label) : sub.label;
                          return (
                            <Link
                              key={`${sub.label}-${sub.href}-${sIdx}`}
                              href={sub.href}
                              onClick={() => setActiveFlyout(null)}
                              className={cn(
                                "flex items-center gap-2 px-2 py-1.5 text-[11px] rounded-sm transition-colors",
                                subActive
                                  ? "bg-brand-gradient text-white font-bold"
                                  : "text-brand-primary font-medium hover:bg-brand-50 hover:text-brand-dark"
                              )}
                            >
                              <SubIcon size={11} className={cn("shrink-0", subActive ? "text-white" : "text-brand-primary")} />
                              <span className="truncate">{subLabel}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

// ─── ExpandedModuleRow (Accordion Module Item) ────────────────────────

interface ExpandedModuleRowProps {
  item: NavItem;
  currentFullPath: string;
  allHrefs: Set<string>;
  moduleExpanded: boolean;
  expandedItems: Set<string>;
  onToggleModule: () => void;
  onToggleItem: (href: string) => void;
  isSearching?: boolean;
}

function ExpandedModuleRow({
  item,
  currentFullPath,
  allHrefs,
  moduleExpanded,
  expandedItems,
  onToggleModule,
  onToggleItem,
  isSearching,
}: ExpandedModuleRowProps) {
  const { lang } = useLanguage();
  const Icon = item.icon;
  const hasChildren = !!item.children?.length;
  const active = isModuleActive(item, currentFullPath, allHrefs);
  const displayLabel = lang === "bn" ? (item.labelBn || item.label) : item.label;

  if (!hasChildren) {
    return (
      <Link
        href={item.href}
        className={cn(
          "group flex items-center justify-between rounded-sm px-3 py-2 text-xs transition-all duration-150 cursor-pointer",
          active
            ? "bg-brand-gradient text-white font-bold shadow-2xs"
            : "text-brand-primary font-semibold hover:bg-brand-50 hover:text-brand-dark",
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon
            size={16}
            className={cn(
              "transition-colors shrink-0",
              active ? "text-white" : "text-brand-primary group-hover:text-brand-dark",
            )}
          />
          <span className="truncate">{displayLabel}</span>
        </div>
        {item.badge && (
          <span className={cn(
            "shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-sm",
            active ? "bg-white/20 text-white" : "bg-brand-100 text-brand-primary border border-brand-border"
          )}>
            {item.badge}
          </span>
        )}
      </Link>
    );
  }

  return (
    <div className="space-y-0.5">
      <button
        onClick={onToggleModule}
        className={cn(
          "group flex w-full items-center justify-between rounded-sm px-3 py-2 text-xs transition-all duration-150 cursor-pointer",
          active
            ? "bg-brand-gradient text-white font-bold shadow-2xs"
            : moduleExpanded
            ? "text-brand-primary font-bold bg-brand-50"
            : "text-brand-primary font-semibold hover:bg-brand-50 hover:text-brand-dark",
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <Icon
            size={16}
            className={cn(
              "transition-colors shrink-0",
              active ? "text-white" : "text-brand-primary group-hover:text-brand-dark",
            )}
          />
          <span className="truncate text-left">{displayLabel}</span>
        </div>
        {item.badge && (
          <span className={cn(
            "shrink-0 mr-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-sm",
            active ? "bg-white/20 text-white" : "bg-brand-100 text-brand-primary border border-brand-border"
          )}>
            {item.badge}
          </span>
        )}
        <ChevronDown
          size={13}
          className={cn(
            "shrink-0 transition-transform duration-200",
            active ? "text-white" : "text-brand-primary group-hover:text-brand-dark",
            moduleExpanded && "rotate-180",
          )}
        />
      </button>

      {/* Submenu Children Container with exact brand visual guide line */}
      {moduleExpanded && (
        <div className="ml-3.5 mt-1 space-y-1 border-l-2 border-brand-border pl-2.5 py-0.5 transition-all">
          {item.children!.map((child, idx) => (
            <MenuItemRow
              key={`${child.label}-${child.href}-${idx}`}
              child={child}
              currentFullPath={currentFullPath}
              allHrefs={allHrefs}
              itemExpanded={isSearching || expandedItems.has(child.href)}
              onToggle={() => onToggleItem(child.href)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MenuItemRow (2nd Level Submenu Items) ───────────────────────────

interface MenuItemRowProps {
  child: NavChild;
  currentFullPath: string;
  allHrefs: Set<string>;
  itemExpanded: boolean;
  onToggle: () => void;
}

function MenuItemRow({ child, currentFullPath, allHrefs, itemExpanded, onToggle }: MenuItemRowProps) {
  const { lang } = useLanguage();
  const ChildIcon = child.icon;
  const exactActive = isRouteActive(child.href, currentFullPath, allHrefs);
  const displayLabel = lang === "bn" ? (child.labelBn || child.label) : child.label;

  return (
    <Link
      href={child.href}
      target={child.target}
      rel={child.target === "_blank" ? "noopener noreferrer" : undefined}
      className={cn(
        "group flex items-center gap-2 rounded-sm px-2.5 py-1.5 text-xs transition-all duration-150 cursor-pointer",
        exactActive
          ? "bg-brand-gradient text-white font-bold shadow-2xs"
          : "text-brand-primary font-semibold hover:bg-brand-50 hover:text-brand-dark",
      )}
    >
      <ChildIcon
        size={13}
        className={cn(
          "transition-colors shrink-0",
          exactActive ? "text-white" : "text-brand-primary group-hover:text-brand-dark",
        )}
      />
      <span className="truncate flex-1">{displayLabel}</span>
      {child.badge && (
        <span
          className={cn(
            "shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-xs border tracking-tight uppercase",
            exactActive
              ? "bg-white/20 text-white border-white/30"
              : "bg-brand-50 text-brand-primary border-brand-border/60 group-hover:bg-brand-100",
          )}
        >
          {child.badge}
        </span>
      )}
    </Link>
  );
}
