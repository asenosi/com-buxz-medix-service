import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Pill, Calendar as CalendarIcon, Search, User as UserIcon, SunMedium, Moon, Monitor, LogOut, Home } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

export default function DesktopSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, setMode } = useTheme();
  const [medCount, setMedCount] = useState<number>(0);
  const [profileIncomplete, setProfileIncomplete] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const run = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (user?.id) {
        const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
        const hasName = typeof meta.full_name === "string" && meta.full_name.trim().length > 0;
        const hasAvatar = typeof meta.avatar_url === "string" && meta.avatar_url.trim().length > 0;
        setProfileIncomplete(!(hasName && hasAvatar));

        const { count } = await supabase
          .from("medications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("active", true);
        setMedCount(count ?? 0);
      }
      setLoading(false);
    };
    run();
  }, []);

  const setTheme = (next: "light" | "dark" | "system") => setMode(next);

  const onSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const isActive = (path: string, startsWith = false) =>
    startsWith ? location.pathname.startsWith(path) : location.pathname === path;

  const itemBase = "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors";
  const itemActive = "bg-primary/10 text-primary";
  const itemHover = "hover:bg-muted";
  const badgeCls = "ml-auto inline-flex items-center justify-center min-w-5 h-5 rounded-md bg-primary/10 text-primary text-[10px] px-1.5 leading-none";

  return (
    <div className="sticky top-14 h-[calc(100dvh-56px)] overflow-auto rounded-md border bg-card p-3">
      <div className="flex items-center gap-2 px-1 py-2">
        <Pill className="h-5 w-5 text-primary" />
        <span className="text-sm font-semibold">MedTracker</span>
      </div>
      <div className="mt-1 space-y-1">
        <button
          onClick={() => navigate("/dashboard")}
          className={`${itemBase} ${isActive("/dashboard") ? itemActive : itemHover}`}
          aria-current={isActive("/dashboard") ? "page" : undefined}
        >
          <Home className="h-4 w-4" />
          <span className="text-sm font-medium">Dashboard</span>
        </button>
        <button
          onClick={() => navigate("/medications")}
          className={`${itemBase} ${isActive("/medications", true) ? itemActive : itemHover}`}
          aria-current={isActive("/medications", true) ? "page" : undefined}
        >
          <Pill className="h-4 w-4" />
          <span className="text-sm font-medium">Medications</span>
          {loading ? (
            <Skeleton className="ml-auto h-4 w-6 rounded" />
          ) : (
            medCount > 0 && <span className={badgeCls}>{medCount}</span>
          )}
        </button>
        <button
          onClick={() => navigate("/calendar")}
          className={`${itemBase} ${isActive("/calendar", true) ? itemActive : itemHover}`}
          aria-current={isActive("/calendar", true) ? "page" : undefined}
        >
          <CalendarIcon className="h-4 w-4" />
          <span className="text-sm font-medium">Calendar</span>
        </button>
        <button
          onClick={() => navigate("/search")}
          className={`${itemBase} ${isActive("/search") ? itemActive : itemHover}`}
          aria-current={isActive("/search") ? "page" : undefined}
        >
          <Search className="h-4 w-4" />
          <span className="text-sm font-medium">Search</span>
        </button>
        <button
          onClick={() => navigate("/profile")}
          className={`${itemBase} ${isActive("/profile") ? itemActive : itemHover}`}
          aria-current={isActive("/profile") ? "page" : undefined}
        >
          <UserIcon className="h-4 w-4" />
          <span className="text-sm font-medium">Profile</span>
          {loading ? (
            <Skeleton className="ml-auto h-4 w-4 rounded" />
          ) : (
            profileIncomplete && <span className={badgeCls}>!</span>
          )}
        </button>
      </div>
      <Separator className="my-3" />
      <div className="space-y-1">
        <button onClick={() => setTheme("light")} className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-accent ${mode === "light" ? "bg-accent" : ""}`}>
          <SunMedium className="h-4 w-4" /> <span className="text-sm font-medium">Light</span>
        </button>
        <button onClick={() => setTheme("dark")} className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-accent ${mode === "dark" ? "bg-accent" : ""}`}>
          <Moon className="h-4 w-4" /> <span className="text-sm font-medium">Dark</span>
        </button>
        <button onClick={() => setTheme("system")} className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-accent ${mode === "system" ? "bg-accent" : ""}`}>
          <Monitor className="h-4 w-4" /> <span className="text-sm font-medium">System</span>
        </button>
      </div>
      <Separator className="my-3" />
      <Button variant="outline" className="w-full justify-start gap-2" onClick={onSignOut}>
        <LogOut className="h-4 w-4" /> Sign Out
      </Button>
    </div>
  );
}
