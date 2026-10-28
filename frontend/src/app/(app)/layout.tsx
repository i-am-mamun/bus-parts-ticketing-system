"use client";

import { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ToastContainer, toast } from "react-toastify";
import { useTheme } from "@/lib/theme";
import { LanguageProvider } from "@/lib/i18n";
import "react-toastify/dist/ReactToastify.css";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  useTheme(); // Synchronizes active data-theme attribute on <html>

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  // Global safety override: Prevent native browser window.alert and window.confirm popups anywhere in the application
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.alert = (message?: any) => {
        const str = String(message || "");
        if (str.startsWith("✅") || str.toLowerCase().includes("success")) {
          toast.success(str.replace(/^[✅\s]+/, ""));
        } else if (
          str.startsWith("⚠️") ||
          str.toLowerCase().includes("select") ||
          str.toLowerCase().includes("required") ||
          str.toLowerCase().includes("please")
        ) {
          toast.warning(str.replace(/^[⚠️\s]+/, ""));
        } else if (
          str.startsWith("❌") ||
          str.toLowerCase().includes("fail") ||
          str.toLowerCase().includes("error") ||
          str.toLowerCase().includes("exceed")
        ) {
          toast.error(str.replace(/^[❌\s]+/, ""));
        } else {
          toast.info(str);
        }
      };

      window.confirm = (message?: string) => {
        if (message) {
          toast.info(message);
        }
        return true;
      };

      const storedAppName = localStorage.getItem("bus_inventory_app_name");
      if (storedAppName && document.title) {
        document.title = document.title.replace("BUS Inventory", storedAppName);
      }
      const handleBrandChange = (e: Event) => {
        const customEvt = e as CustomEvent<{ app_name?: string }>;
        if (customEvt.detail?.app_name) {
          document.title = customEvt.detail.app_name;
        }
      };
      window.addEventListener("bus_inventory:brand_changed", handleBrandChange);
      return () => window.removeEventListener("bus_inventory:brand_changed", handleBrandChange);
    }
  }, []);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-border border-t-brand-primary" />
      </div>
    );
  }

  return (
    <LanguageProvider>
      <div
        className="flex h-screen print:h-auto print:overflow-visible flex-col overflow-hidden transition-colors duration-300 print:bg-white"
        style={{ backgroundColor: "var(--theme-page-bg, #edf5fd)" }}
      >
        <Header />
        <div className="flex flex-1 print:flex-none print:overflow-visible overflow-hidden min-h-0 relative print:static">
          <Suspense fallback={<div className="w-64 shrink-0 bg-white border-r border-brand-border h-full print:hidden" />}>
            <Sidebar />
          </Suspense>
          <div className="flex flex-1 print:flex-none print:overflow-visible flex-col overflow-hidden min-w-0">
            <main className="flex-1 print:flex-none print:overflow-visible overflow-y-auto p-3 sm:p-4 lg:p-5 pb-10 custom-scrollbar print:p-0 print:overflow-visible">
              <div className="min-h-full print:min-h-0 w-full rounded-2xl print:rounded-none border print:border-none border-brand-border/60 bg-white/95 print:bg-white p-4 sm:p-6 print:p-0 shadow-xs print:shadow-none">
                {children}
              </div>
            </main>
            <Footer />
          </div>
        </div>
        <div className="print:hidden">
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="colored"
          />
        </div>
      </div>
    </LanguageProvider>
  );
}
