import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import type { ReactNode } from "react";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import "./globals.css";

const cairo = Cairo({ subsets: ["arabic", "latin"], variable: "--font-cairo", display: "swap" });
export const metadata: Metadata = {
  title: { default: "Smart Edu Center", template: "%s | Smart Edu Center" },
  description: "نظام لإدارة السنتر أو المدرس، مع مسار مستقل لمنصة الكورسات الأونلاين والهوية المخصصة.",
  applicationName: "Smart Edu Center",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Smart Edu" },
};
export const viewport: Viewport = { themeColor: "#6547d9", colorScheme: "light" };
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="ar" dir="rtl" className={cairo.variable}><body>{children}<ServiceWorkerRegistration /></body></html>;
}
