import { Bus, type LucideIcon } from "lucide-react";

export interface SiteConfig {
  name: string;
  nameBn: string;
  shortName: string;
  description: string;
  tagline: string;
  logoIcon: LucideIcon;
}

export const siteConfig: SiteConfig = {
  name: "Soudia Parts Ticketing",
  nameBn: "সৌদিয়া পার্টস টিকেটিং সিস্টেম",
  shortName: "Soudia",
  description: "Enterprise Bus Fleet Parts Ticketing & Multi-Step Verification System",
  tagline: "Smart • Verified • Fleet",
  logoIcon: Bus,
};
