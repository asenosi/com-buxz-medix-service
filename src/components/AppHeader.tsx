import { ComponentType } from "react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import ThemePicker from "@/components/ThemePicker";
import { Bell, Menu, LogOut, Settings, SunMedium, Moon, Monitor, Search, Calendar as CalendarIcon, Pill, Home, User as UserIcon } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

const brand = {
  name: "MedTracker",
};

type IconProps = { className?: string };
const NavLink = ({ to, icon: Icon, label, onNavigate }: { to: string; icon: ComponentType<IconProps>; label: string; onNavigate: (to: string) => void }) => (
  <button onClick={() => onNavigate(to)} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-accent">
    <Icon className="h-4 w-4" />
    <span className="text-sm font-medium">{label}</span>
  </button>
);

export default function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, setMode } = useTheme();

  const [email, setEmail] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [hasUnread, setHasUnread] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      setEmail(user?.email ?? null);
      const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
      const fn = typeof meta.full_name === "string" ? meta.full_name : undefined;
      setFullName(fn ?? null);
      const avatar = typeof meta.avatar_url === "string" ? meta.avatar_url : undefined;
      setAvatarUrl(avatar ?? null);
    };
    load();
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

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-screen-sm items-center gap-2 px-3">
        <Sheet>
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
            <div className="mt-4 space-y-1">
              <NavLink to="/dashboard" icon={Home} label="Dashboard" onNavigate={navigate} />
              <NavLink to="/medications" icon={Pill} label="Medications" onNavigate={navigate} />
              <NavLink to="/calendar" icon={CalendarIcon} label="Calendar" onNavigate={navigate} />
              <NavLink to="/search" icon={Search} label="Search" onNavigate={navigate} />
              <NavLink to="/profile" icon={UserIcon} label="Profile" onNavigate={navigate} />
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
          </SheetContent>
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
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{fullName || initials}</div>
                    <div className="truncate text-xs text-muted-foreground">{email}</div>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/profile")}> <Settings className="mr-2 h-4 w-4" /> Settings </DropdownMenuItem>
              <DropdownMenuItem asChild>
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
