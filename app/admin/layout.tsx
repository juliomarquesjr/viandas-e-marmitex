"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { Menu } from "lucide-react";
import { SidebarProvider, ModernSidebar, MobileSidebar, HeaderActions } from "./components/layout";
import { AdminThemeProvider } from "./components/layout/AdminThemeProvider";
import { Button } from "@/app/components/ui/button";
import RoAssistant from "./components/ro-assistant";

/**
 * AdminLayout - Design System
 * 
 * Layout moderno com sidebar e header.
 * Inspirado em HubSpot/Salesforce.
 */

interface ExtendedSession {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role: string;
  };
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession() as { data: ExtendedSession | null };
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const userRole = session?.user?.role;

  return (
    <SidebarProvider>
      <AdminThemeProvider>
        {/* Mobile Sidebar */}
        <MobileSidebar
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          userRole={userRole}
        />

        {/* Main Layout */}
        <div className="flex h-screen">
          {/* Desktop Sidebar */}
          <ModernSidebar userRole={userRole} />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Header */}
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[color:var(--border)] bg-[color:var(--card)] px-4 lg:px-6 shrink-0 transition-colors duration-200">
              {/* Left side - Mobile menu button */}
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setMobileMenuOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </div>

              {/* Right side - User menu */}
              <HeaderActions />
            </header>

            {/* Page Content */}
            <main className="flex-1 overflow-auto bg-background" style={{ scrollbarGutter: "stable" }}>
              <div className="container mx-auto px-4 lg:px-6 py-6 max-w-7xl">
                {children}
              </div>
            </main>
          </div>
        </div>

        {/* RO Assistant */}
        <RoAssistant />
      </AdminThemeProvider>
    </SidebarProvider>
  );
}
