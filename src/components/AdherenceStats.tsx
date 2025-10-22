import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy, Flame, Target, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdherenceStatsProps {
  streak: number;
  todayProgress: number;
  weeklyAdherence: number;
  totalTaken: number;
}

export const AdherenceStats = ({ 
  streak, 
  todayProgress, 
  weeklyAdherence,
  totalTaken 
}: AdherenceStatsProps) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 hover:scale-105 transition-transform duration-300 hover:shadow-xl animate-fade-in">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
          <Flame className={cn(
            "h-6 w-6",
            streak > 0 ? "text-accent" : "text-muted-foreground"
          )} />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{streak} days</div>
          <p className="text-xs text-muted-foreground mt-1">
            {streak > 7 ? "Amazing! Keep it up! 🎉" : "Build your streak!"}
          </p>
        </CardContent>
      </Card>

      <Card className="border-2 border-success/20 bg-gradient-to-br from-success/5 to-success/10 hover:scale-105 transition-transform duration-300 hover:shadow-xl animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Today's Progress</CardTitle>
          <Target className="h-6 w-6 text-success" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{todayProgress}%</div>
          <Progress value={todayProgress} className="mt-2" />
        </CardContent>
      </Card>

      <Card className="border-2 border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10 hover:scale-105 transition-transform duration-300 hover:shadow-xl animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Weekly Adherence</CardTitle>
          <TrendingUp className="h-6 w-6 text-accent" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{weeklyAdherence}%</div>
          <Progress value={weeklyAdherence} className="mt-2" />
        </CardContent>
      </Card>

      <Card className="border-2 border-secondary/20 bg-gradient-to-br from-secondary/5 to-secondary/10 hover:scale-105 transition-transform duration-300 hover:shadow-xl animate-fade-in" style={{ animationDelay: '0.3s' }}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Doses</CardTitle>
          <Trophy className="h-6 w-6 text-secondary" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{totalTaken}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {totalTaken > 50 ? "Medication Master! 🏆" : "Keep going!"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
