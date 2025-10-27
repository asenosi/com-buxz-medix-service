import { Outlet, useLocation } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import DesktopSidebar from "@/components/DesktopSidebar";

// Minimal shell that injects the mobile-first top bar
export default function AppLayout() {
  const location = useLocation();
  return (
    <div className="min-h-dvh bg-background">
      <AppHeader />
      <div className="mx-auto max-w-screen-2xl px-4 pb-8 pt-4 lg:flex lg:gap-6">
        <aside className="hidden lg:block w-64 shrink-0">
          <DesktopSidebar />
        </aside>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

