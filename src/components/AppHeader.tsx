import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import ThemePicker from "@/components/ThemePicker";
import { Bell, LogOut, Settings, Monitor, Pill, Menu, SunMedium, Moon, Home, Calendar as CalendarIcon, Search, User as UserIcon } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { Skeleton } from "@/components/ui/skeleton";

const brand = {
  name: "MedTracker",
};

export default function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, setMode } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [medCount, setMedCount] = useState<number>(0);

  const [email, setEmail] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [hasUnread, setHasUnread] = useState(true);
  const [loadingNav, setLoadingNav] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      setEmail(user?.email ?? null);

      if (user?.id) {
        // Load full name from profiles table
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", user.id)
          .maybeSingle();
        
        setFullName(profile?.full_name ?? null);

        // Load avatar from storage
        const { data: files } = await supabase.storage
          .from("avatars")
          .list(user.id, { limit: 1, sortBy: { column: "created_at", order: "desc" } });
        
        if (files && files.length > 0) {
          const { data: urlData } = supabase.storage
            .from("avatars")
            .getPublicUrl(`${user.id}/${files[0].name}`);
          setAvatarUrl(urlData.publicUrl);
        }

        const { count } = await supabase
          .from("medications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("active", true);
        setMedCount(count ?? 0);
      }
      setLoadingNav(false);
    };
    load();

    // Listen for navigation to refresh avatar
    const handleFocus = () => load();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const initials = useMemo(() => {
    const src = fullName || email || "";
    if (!src) return "?";
    const parts = src.split("@")[0].split(/[\s._-]+/).filter(Boolean);
    const a = parts[0]?.[0];
    const b = parts[1]?.[0];
    return ((a || "").toUpperCase() + (b || "").toUpperCase()).slice(0, 2) || "?";
  }, [fullName, email]);

  const onSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const setTheme = (next: "light" | "dark" | "system") => setMode(next);

  const go = (to: string) => {
    navigate(to);
    setMenuOpen(false);
  };

  const profileIncomplete = !avatarUrl || !(fullName && fullName.trim().length > 0);
  const itemBase = "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors";
  const itemActive = "bg-primary/10 text-primary";
  const itemHover = "hover:bg-muted";
  const badgeCls = "ml-auto inline-flex items-center justify-center min-w-5 h-5 rounded-md bg-primary/10 text-primary text-[10px] px-1.5 leading-none";

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-screen-sm items-center gap-2 px-3 lg:max-w-screen-2xl lg:px-6">
        {/* Mobile: hamburger opens overlay sheet; hidden on large screens */}
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <div className="lg:hidden">
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Pill className="h-5 w-5 text-primary" />
                  <span>{brand.name}</span>
                </SheetTitle>
              </SheetHeader>
              {(() => {
                const isActive = (path: string, startsWith = false) =>
                  startsWith ? location.pathname.startsWith(path) : location.pathname === path;
                return (
                  <div className="mt-4 space-y-1">
                    <button
                      onClick={() => go("/dashboard")}
                      className={`${itemBase} ${isActive("/dashboard") ? itemActive : itemHover}`}
                      aria-current={isActive("/dashboard") ? "page" : undefined}
                    >
                      <Home className="h-4 w-4" />
                      <span className="text-sm font-medium">Dashboard</span>
                    </button>
                    <button
                      onClick={() => go("/alerts")}
                      className={`${itemBase} ${isActive("/alerts") ? itemActive : itemHover}`}
                      aria-current={isActive("/alerts") ? "page" : undefined}
                    >
                      <Bell className="h-4 w-4" />
                      <span className="text-sm font-medium">Alerts</span>
                    </button>
                    <button
                      onClick={() => go("/medications")}
                      className={`${itemBase} ${isActive("/medications", true) ? itemActive : itemHover}`}
                      aria-current={isActive("/medications", true) ? "page" : undefined}
                    >
                      <Pill className="h-4 w-4" />
                      <span className="text-sm font-medium">Medications</span>
                      {loadingNav ? (
                        <Skeleton className="ml-auto h-4 w-6 rounded" />
                      ) : (
                        medCount > 0 && <span className={badgeCls}>{medCount}</span>
                      )}
                    </button>
                    <button
                      onClick={() => go("/calendar")}
                      className={`${itemBase} ${isActive("/calendar", true) ? itemActive : itemHover}`}
                      aria-current={isActive("/calendar", true) ? "page" : undefined}
                    >
                      <CalendarIcon className="h-4 w-4" />
                      <span className="text-sm font-medium">Calendar</span>
                    </button>
                    <button
                      onClick={() => go("/search")}
                      className={`${itemBase} ${isActive("/search") ? itemActive : itemHover}`}
                      aria-current={isActive("/search") ? "page" : undefined}
                    >
                      <Search className="h-4 w-4" />
                      <span className="text-sm font-medium">Search</span>
                    </button>
                    <button
                      onClick={() => go("/profile")}
                      className={`${itemBase} ${isActive("/profile") ? itemActive : itemHover}`}
                      aria-current={isActive("/profile") ? "page" : undefined}
                    >
                      <UserIcon className="h-4 w-4" />
                      <span className="text-sm font-medium">Profile</span>
                      {loadingNav ? (
                        <Skeleton className="ml-auto h-4 w-4 rounded" />
                      ) : (
                        profileIncomplete && <span className={badgeCls}>!</span>
                      )}
                    </button>
                  </div>
                );
              })()}
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
            </SheetContent>
          </div>
        </Sheet>

        <div className="flex min-w-0 items-center gap-2">
          <Pill className="h-5 w-5 text-primary" />
          <div className="truncate text-sm font-semibold">{brand.name}</div>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
                <Bell className="h-5 w-5" />
                {hasUnread && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" />}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-0">
              <div className="p-3">
                <div className="mb-2 text-sm font-medium">Notifications</div>
                <div className="rounded-md border p-3 text-sm text-muted-foreground">No new notifications</div>
                <div className="mt-3 text-right">
                  <Button size="sm" variant="outline" onClick={() => setHasUnread(false)}>Clear dot</Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 gap-2 px-2">
                <Avatar className="h-7 w-7">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt="avatar" /> : null}
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    {avatarUrl ? <AvatarImage src={avatarUrl} alt="avatar" /> : null}
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden">
                    <div className="text-sm font-medium break-words">{fullName || initials}</div>
                    <div className="text-xs text-muted-foreground break-words">{email}</div>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/profile")}> <Settings className="mr-2 h-4 w-4" /> Settings </DropdownMenuItem>
              {/* Prevent dropdown from closing so the Dialog doesn't unmount */}
              <DropdownMenuItem asChild onSelect={(e) => e.preventDefault()}>
                <div className="w-full">
                  <ThemePicker trigger={<div className="flex w-full cursor-pointer items-center"><Monitor className="mr-2 h-4 w-4" /> Choose Theme</div>} />
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSignOut} className="text-destructive focus:text-destructive"> <LogOut className="mr-2 h-4 w-4" /> Sign Out </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
