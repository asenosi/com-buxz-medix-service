import { Outlet, useLocation } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import DesktopSidebar from "@/components/DesktopSidebar";
import BottomNav from "@/components/BottomNav";
import { useDashboardCalendar } from "@/contexts/DashboardCalendarContext";

// Minimal shell that injects the mobile-first top bar
export default function AppLayout() {
  const location = useLocation();
  const { calendarLabel, onPrev, onNext } = useDashboardCalendar();
  
  // Only show calendar controls on dashboard
  const isDashboard = location.pathname === "/dashboard";
  
  return (
    <div className="min-h-dvh bg-background pb-16 lg:pb-0">
      <AppHeader 
        calendarLabel={isDashboard ? calendarLabel : undefined}
        onCalendarPrev={isDashboard && onPrev ? onPrev : undefined}
        onCalendarNext={isDashboard && onNext ? onNext : undefined}
      />
      <div className="mx-auto max-w-screen-2xl px-4 pb-8 pt-4 lg:flex lg:gap-6">
        <aside className="hidden lg:block w-64 shrink-0">
          <DesktopSidebar />
        </aside>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
      <div className="lg:hidden">
        <BottomNav />
      </div>
    </div>
  );
}

