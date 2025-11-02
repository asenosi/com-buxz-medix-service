import { useNavigate, useLocation } from "react-router-dom";
import { Home, Bell, Calendar, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHaptic } from "@/hooks/use-haptic";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Bell, label: "Alerts", path: "/alerts" },
  { icon: Calendar, label: "Progress", path: "/calendar" },
  { icon: Settings, label: "Manage", path: "/medications" },
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-inset-bottom">
      <div className="grid grid-cols-4 h-16 max-w-screen-2xl mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 min-h-[44px] transition-colors",
                "active:scale-95 touch-manipulation",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-6 w-6", isActive && "stroke-[2.5]")} />
              <span className={cn(
                "text-xs font-medium",
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
