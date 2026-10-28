export const formatMoney = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined || isNaN(amount)) return "৳0";
  return `৳${Number(amount).toLocaleString("en-BD", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

export const formatBDT = formatMoney;

export const formatDate = (dateString?: string | null): string => {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateString;
  }
};

export const parseUTCDate = (dateString?: string | null): Date | null => {
  if (!dateString) return null;
  try {
    const isIsoWithoutTz =
      typeof dateString === "string" &&
      dateString.includes("T") &&
      !dateString.endsWith("Z") &&
      !dateString.includes("+");
    const safeStr = isIsoWithoutTz ? `${dateString}Z` : dateString;
    const d = new Date(safeStr);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
};

export const formatTime = (dateString?: string | null): string => {
  const d = parseUTCDate(dateString);
  if (!d) return "";
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export const formatDateTime = (dateString?: string | null): string => {
  const d = parseUTCDate(dateString);
  if (!d) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};
