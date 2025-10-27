import { Outlet, useLocation } from "react-router-dom";
import AppHeader from "@/components/AppHeader";

// Minimal shell that injects the mobile-first top bar
export default function AppLayout() {
  const location = useLocation();
  // Optionally hide header on marketing/auth routes if needed later
  return (
    <div className="min-h-dvh bg-background">
      <AppHeader />
      <main className="mx-auto max-w-screen-sm px-3 pb-8 pt-4">
        <Outlet />
      </main>
    </div>
  );
}

