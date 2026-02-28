import { Card } from "@/components/ui/card";
import { Flame, ChevronRight, Target, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface StreakCardProps {
  streak: number;
  todayProgress?: number;
  weeklyAdherence?: number;
  className?: string;
  onClick?: () => void;
}

export function StreakCard({ 
  streak, 
  todayProgress = 0, 
  weeklyAdherence = 0,
  className, 
  onClick 
}: StreakCardProps) {
  const getStreakLevel = () => {
    if (streak >= 30) return { label: "Champion", color: "text-amber-500" };
    if (streak >= 14) return { label: "Strong", color: "text-emerald-500" };
    if (streak >= 7) return { label: "Building", color: "text-blue-500" };
    if (streak >= 1) return { label: "Started", color: "text-primary" };
    return { label: "Begin", color: "text-muted-foreground" };
  };

  const level = getStreakLevel();

  return (
    <Card 
      className={cn(
        "bg-gradient-to-br from-primary/5 via-card to-accent/5 border-border/40 overflow-hidden shadow-[var(--shadow-sm)]",
        onClick && "cursor-pointer hover:border-primary/30 transition-all duration-300 hover:shadow-[var(--shadow-md)]",
        className
      )}
      onClick={onClick}
    >
      <div className="p-4">
        {/* Main streak display */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex items-center justify-center w-12 h-12 rounded-full",
              streak > 0 ? "bg-orange-500/15" : "bg-muted"
            )}>
              <Flame className={cn(
                "h-6 w-6",
                streak > 0 ? "text-orange-500" : "text-muted-foreground"
              )} />
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold">{streak}</span>
                <span className="text-sm text-muted-foreground">days</span>
              </div>
              <span className={cn("text-xs font-medium", level.color)}>{level.label}</span>
            </div>
          </div>
          {onClick && (
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          )}
        </div>

        {/* Progress indicators */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-success" />
                <span className="text-xs text-muted-foreground">Today</span>
              </div>
              <span className="text-xs font-medium">{todayProgress}%</span>
            </div>
            <Progress value={todayProgress} className="h-1.5" />
          </div>
          
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-accent" />
                <span className="text-xs text-muted-foreground">Week</span>
              </div>
              <span className="text-xs font-medium">{weeklyAdherence}%</span>
            </div>
            <Progress value={weeklyAdherence} className="h-1.5" />
          </div>
        </div>
      </div>
    </Card>
  );
}
