import { useNavigate, useLocation } from "react-router-dom";
import { Home, Bell, Calendar, Settings, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHaptic } from "@/hooks/use-haptic";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: MessageCircle, label: "Chat", path: "/chat" },
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-t border-border/40 safe-area-inset-bottom shadow-[0_-4px_16px_-4px_hsl(200_25%_10%/0.06)]">
      <div className="grid grid-cols-5 h-16 max-w-screen-2xl mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-colors",
                "active:scale-95 touch-manipulation",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-xl transition-colors duration-200",
                isActive && "bg-primary/10"
              )}>
                <Icon className={cn("h-5 w-5 transition-all", isActive && "stroke-[2.5]")} />
              </div>
              <span className={cn(
                "text-[10px] font-medium leading-none",
                isActive && "font-semibold text-primary"
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
