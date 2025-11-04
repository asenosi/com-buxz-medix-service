import { useState } from "react";
import { Plus, Pill, Activity, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FABAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  color: string;
}

interface FloatingActionButtonProps {
  actions: FABAction[];
}

export const FloatingActionButton = ({ actions }: FloatingActionButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-20 right-0 sm:bottom-6 sm:right-0 z-50 mr-4">
      {/* Action Buttons */}
      <div
        className={cn(
          "flex flex-col-reverse gap-3 mb-3 transition-all duration-300",
          isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        )}
      >
        {actions.map((action, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 animate-fade-in"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <span className="bg-card text-card-foreground px-4 py-2 rounded-lg shadow-lg text-sm font-medium whitespace-nowrap hidden sm:block">
              {action.label}
            </span>
            <span className="bg-card text-card-foreground px-3 py-1.5 rounded-lg shadow-lg text-xs font-medium whitespace-nowrap sm:hidden">
              {action.label}
            </span>
            <Button
              size="lg"
              className={cn(
                "rounded-full h-14 w-14 sm:h-16 sm:w-16 shadow-xl hover:scale-110 transition-transform",
                action.color
              )}
              onClick={() => {
                action.onClick();
                setIsOpen(false);
              }}
            >
              {action.icon}
            </Button>
          </div>
        ))}
      </div>

      {/* Main FAB */}
      <Button
        size="lg"
        className={cn(
          "rounded-full h-16 w-16 sm:h-20 sm:w-20 shadow-2xl hover:scale-110 transition-all duration-300",
          isOpen ? "bg-muted-foreground hover:bg-muted-foreground rotate-45" : "bg-primary hover:bg-primary/90"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-8 w-8" /> : <Plus className="h-8 w-8" />}
      </Button>
    </div>
  );
};
