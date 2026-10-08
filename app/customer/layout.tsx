import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { CustomerShell } from "./components/CustomerShell";
import "./customer.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-bricolage",
  display: "swap",
});

const body = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-figtree",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Área do cliente",
};

// viewport-fit=cover libera env(safe-area-inset-*) para as barras do topo e de baixo
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1b1b1e" },
  ],
};

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return <CustomerShell fontClassName={`${display.variable} ${body.variable}`}>{children}</CustomerShell>;
}
