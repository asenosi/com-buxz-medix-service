import { useNavigate } from "react-router-dom";
import { 
  Pill, 
  Activity, 
  Calendar, 
  BookText, 
  Contact, 
  Droplet,
  Settings,
  Shield,
  Bell,
  HelpCircle,
  Share2
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MenuItem {
  icon: React.ElementType;
  label: string;
  description?: string;
  path: string;
  badge?: string | number;
  iconBg: string;
}

const menuSections = {
  health: [
    {
      icon: Pill,
      label: "Medications",
      path: "/dashboard",
      iconBg: "bg-blue-500/10 text-blue-500",
    },
    {
      icon: Activity,
      label: "Health Trackers & Measurements",
      path: "/trackers",
      iconBg: "bg-teal-500/10 text-teal-500",
    },
    {
      icon: Calendar,
      label: "Appointments",
      path: "/appointments",
      iconBg: "bg-indigo-500/10 text-indigo-500",
    },
    {
      icon: BookText,
      label: "Diary Notes",
      path: "/diary",
      iconBg: "bg-orange-500/10 text-orange-500",
    },
    {
      icon: Contact,
      label: "Health Contacts",
      path: "/contacts",
      iconBg: "bg-cyan-500/10 text-cyan-500",
    },
    {
      icon: Droplet,
      label: "Refills",
      path: "/refills",
      iconBg: "bg-blue-400/10 text-blue-400",
    },
  ],
  settings: [
    {
      icon: Settings,
      label: "App Settings",
      path: "/profile",
      iconBg: "bg-primary/10 text-primary",
    },
    {
      icon: Shield,
      label: "Create Account",
      description: "Sign up to backup your data",
      path: "/auth",
      badge: "!",
      iconBg: "bg-emerald-500/10 text-emerald-500",
    },
    {
      icon: Bell,
      label: "Reminders Troubleshooting",
      path: "/alerts",
      badge: "!",
      iconBg: "bg-purple-500/10 text-purple-500",
    },
    {
      icon: HelpCircle,
      label: "Help Center",
      path: "/help",
      iconBg: "bg-sky-500/10 text-sky-500",
    },
    {
      icon: Share2,
      label: "Share Medisafe",
      path: "/share",
      iconBg: "bg-pink-500/10 text-pink-500",
    },
  ],
};

const ManageMedications = () => {
  const navigate = useNavigate();

  const handleItemClick = (path: string) => {
    navigate(path);
  };

  const renderMenuItem = (item: MenuItem) => {
    const Icon = item.icon;
    
    return (
      <Card
        key={item.path}
        onClick={() => handleItemClick(item.path)}
        className="p-6 cursor-pointer hover:bg-accent/50 transition-colors active:scale-98 relative"
      >
        <div className="flex items-center gap-4">
          <div className={cn("p-3 rounded-xl", item.iconBg)}>
            <Icon className="h-6 w-6" />
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold text-base">{item.label}</h3>
            {item.description && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {item.description}
              </p>
            )}
          </div>

          {item.badge && (
            <div className="absolute top-4 left-12 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-semibold">
              {item.badge}
            </div>
          )}

          <div className="text-muted-foreground">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-8 pb-8">
      <div className="space-y-3">
        {menuSections.health.map(renderMenuItem)}
      </div>

      <div>
        <h2 className="text-primary font-semibold text-lg mb-3 px-1">Settings</h2>
        <div className="space-y-3">
          {menuSections.settings.map(renderMenuItem)}
        </div>
      </div>
    </div>
  );
};

export default ManageMedications;
