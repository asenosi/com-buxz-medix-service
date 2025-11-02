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
        "bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20",
        onClick && "cursor-pointer hover:border-primary/40 transition-colors",
        className
      )}
      onClick={onClick}
    >
      <div className="p-4 flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-1">
            {getMessage()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-background rounded-full px-4 py-2 border border-border">
            <Flame className="h-5 w-5 text-orange-500" />
            <div className="text-center">
              <div className="text-2xl font-bold">{streak}</div>
              <div className="text-xs text-muted-foreground">day streak</div>
            </div>
          </div>
          {onClick && (
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </div>
    </Card>
  );
}
