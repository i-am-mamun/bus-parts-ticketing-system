import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type StatTone = "primary" | "blue" | "violet" | "green" | "amber" | "red";

const TONE_STYLES: Record<StatTone, { bg: string; icon: string; border: string }> = {
  primary: {
    bg: "bg-gradient-to-br from-brand-50/70 via-white to-brand-50/30",
    icon: "bg-brand-gradient text-white shadow-2xs",
    border: "border-brand-border hover:border-brand-primary",
  },
  blue: {
    bg: "bg-gradient-to-br from-blue-50/70 via-white to-blue-50/30",
    icon: "bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-2xs",
    border: "border-blue-100 hover:border-blue-400",
  },
  violet: {
    bg: "bg-gradient-to-br from-indigo-50/70 via-white to-violet-50/30",
    icon: "bg-gradient-to-tr from-indigo-500 to-violet-600 text-white shadow-2xs",
    border: "border-violet-100 hover:border-violet-400",
  },
  green: {
    bg: "bg-gradient-to-br from-emerald-50/70 via-white to-brand-50/30",
    icon: "bg-gradient-to-tr from-emerald-500 to-brand-primary text-white shadow-2xs",
    border: "border-emerald-100 hover:border-emerald-400",
  },
  amber: {
    bg: "bg-gradient-to-br from-amber-50/70 via-white to-orange-50/30",
    icon: "bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-2xs",
    border: "border-amber-100 hover:border-amber-400",
  },
  red: {
    bg: "bg-gradient-to-br from-rose-50/70 via-white to-pink-50/30",
    icon: "bg-gradient-to-tr from-rose-500 to-pink-500 text-white shadow-2xs",
    border: "border-rose-100 hover:border-rose-400",
  },
};

export interface CustomStatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: StatTone;
  className?: string;
  subtitle?: string;
}

export function CustomStatCard({ label, value, icon: Icon, tone = "primary", className, subtitle }: CustomStatCardProps) {
  const style = TONE_STYLES[tone] || TONE_STYLES.primary;

  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-xl border p-3.5 sm:p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md min-h-[96px]",
        style.bg,
        style.border,
        className
      )}
    >
      {/* Top Row: Icon Badge on left, Bold Metric Value on right */}
      <div className="flex items-center justify-between gap-2">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105",
            style.icon
          )}
        >
          <Icon size={18} />
        </div>
        <p className="text-xl sm:text-2xl font-black tracking-tight text-slate-800 group-hover:text-brand-dark transition-colors [font-variant-numeric:tabular-nums]">
          {value}
        </p>
      </div>

      {/* Bottom Row: Title and Subtitle */}
      <div className="mt-2.5 min-w-0">
        <p className="text-xs sm:text-[12px] font-bold text-slate-700 leading-snug truncate">
          {label}
        </p>
        {subtitle && (
          <p className="mt-0.5 text-[10.5px] text-brand-primary font-semibold leading-tight truncate">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
