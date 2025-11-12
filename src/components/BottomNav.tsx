import { useNavigate, useLocation } from "react-router-dom";
import { Home, CalendarDays, TrendingUp, MessageSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHaptic } from "@/hooks/use-haptic";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: CalendarDays, label: "Appointments", path: "/appointments" },
  { icon: TrendingUp, label: "Progress", path: "/calendar" },
  { icon: MessageSquare, label: "Messages", path: "/alerts" },
  { icon: User, label: "Profile", path: "/profile" },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { triggerHaptic } = useHaptic();

  const handleNavigation = (path: string) => {
    triggerHaptic("light");
    navigate(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border/50 safe-area-inset-bottom shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      <div className="grid grid-cols-5 h-16 max-w-screen-2xl mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 min-h-[44px] transition-all duration-200",
                "active:scale-95 touch-manipulation relative",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-full" />
              )}
              <Icon className={cn(
                "h-5 w-5 transition-all",
                isActive && "scale-110 stroke-[2.5]"
              )} />
              <span className={cn(
                "text-[10px] font-medium leading-tight transition-all",
                isActive && "font-semibold"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
