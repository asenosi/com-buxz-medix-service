import { Card } from "@/components/ui/card";
import { Flame, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreakCardProps {
  streak: number;
  className?: string;
  onClick?: () => void;
}

export function StreakCard({ streak, className, onClick }: StreakCardProps) {
  const getMessage = () => {
    if (streak === 0) {
      return "Start your medication streak today!";
    }
    if (streak === 1) {
      return "Congratulations! You've started your streak! Keep going and build on this great start!";
    }
    if (streak < 7) {
      return `Great job! You're ${streak} days in. Keep the momentum going!`;
    }
    if (streak < 30) {
      return `Amazing ${streak}-day streak! You're building a strong habit!`;
    }
    return `Incredible ${streak}-day streak! You're a medication champion!`;
  };

  return (
    <Card 
      className={cn(
        "bg-card border-border",
        onClick && "cursor-pointer hover:border-primary/40 transition-colors",
        className
      )}
      onClick={onClick}
    >
      <div className="p-3 flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground truncate">
            {getMessage()}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 bg-primary/10 rounded-lg px-3 py-1.5">
            <Flame className="h-4 w-4 text-orange-500" />
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold">{streak}</span>
              <span className="text-xs text-muted-foreground">day streak</span>
            </div>
          </div>
          {onClick && (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>
    </Card>
  );
}
