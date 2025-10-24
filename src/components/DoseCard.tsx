import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle2, XCircle, Pill } from "lucide-react";
import { cn } from "@/lib/utils";

interface Medication {
  id: string;
  name: string;
  dosage: string;
  form: string | null;
  pills_remaining: number | null;
}

interface Schedule {
  id: string;
  medication_id: string;
  time_of_day: string;
  with_food: boolean;
  special_instructions: string | null;
}

interface TodayDose {
  medication: Medication;
  schedule: Schedule;
  nextDoseTime: Date;
  status: "upcoming" | "due" | "overdue";
  isTaken?: boolean;
  isSkipped?: boolean;
}

interface DoseCardProps {
  dose: TodayDose;
  onMarkTaken: (dose: TodayDose) => void;
  onMarkSkipped: (dose: TodayDose) => void;
}

export const DoseCard = ({ dose, onMarkTaken, onMarkSkipped }: DoseCardProps) => {
  const isCompleted = dose.isTaken || dose.isSkipped;

  return (
    <Card
      className={cn(
        "border-l-4 transition-all duration-500 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]",
        dose.isTaken && "opacity-60 bg-success/5 border-l-success animate-fade-in",
        dose.isSkipped && "bg-warning/20 border-l-warning opacity-75 animate-fade-in",
        !isCompleted && dose.status === "overdue" && "border-l-destructive animate-pulse-slow shadow-destructive/30 shadow-xl",
        !isCompleted && dose.status === "due" && "border-l-accent shadow-accent/30 shadow-xl animate-bounce-subtle",
        !isCompleted && dose.status === "upcoming" && "border-l-primary hover:border-l-primary/80"
      )}
    >
      <CardHeader className="pb-3 sm:pb-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={cn(
              "p-2 sm:p-3 rounded-full transition-all duration-300",
              dose.isTaken && "bg-success/20 animate-scale-in",
              dose.isSkipped && "bg-warning/20 animate-scale-in",
              !isCompleted && "bg-primary/20 animate-pulse-slow"
            )}>
              <Pill className={cn(
                "w-5 h-5 sm:w-6 sm:h-6",
                dose.isTaken && "text-success",
                dose.isSkipped && "text-warning",
                !isCompleted && "text-primary"
              )} />
            </div>
            <div>
              <CardTitle className="text-lg sm:text-2xl">{dose.medication.name}</CardTitle>
              <CardDescription className="text-base sm:text-lg mt-1 sm:mt-2">
                {dose.medication.dosage}
                {dose.medication.form && ` • ${dose.medication.form}`}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 sm:px-4 sm:py-2 self-start">
            <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground animate-pulse-slow" />
            <span className="text-lg sm:text-2xl font-semibold">
              {dose.nextDoseTime.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-2 sm:gap-4 mb-3 sm:mb-4 text-sm sm:text-lg">
          {dose.schedule.with_food && (
            <span className="text-muted-foreground bg-muted/50 px-2 sm:px-3 py-1 rounded-full">🍽️ With food</span>
          )}
          {dose.schedule.special_instructions && (
            <span className="text-muted-foreground bg-muted/50 px-2 sm:px-3 py-1 rounded-full">
              {dose.schedule.special_instructions}
            </span>
          )}
          {dose.medication.pills_remaining !== null && (
            <span className="text-muted-foreground bg-muted/50 px-2 sm:px-3 py-1 rounded-full">
              💊 {dose.medication.pills_remaining} remaining
            </span>
          )}
          {dose.isTaken && (
            <span className="text-success font-semibold bg-success/10 px-2 sm:px-3 py-1 rounded-full animate-bounce-subtle">✓ Taken</span>
          )}
          {dose.isSkipped && (
            <span className="text-warning font-semibold bg-warning/10 px-2 sm:px-3 py-1 rounded-full">⚠️ Skipped</span>
          )}
        </div>
        {!isCompleted && (
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button
              onClick={() => onMarkTaken(dose)}
              size="lg"
              className="flex-1 text-base sm:text-xl hover:scale-105 active:scale-95 transition-all duration-200 hover:shadow-xl animate-fade-in"
              variant="default"
            >
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
              I Took This
            </Button>
            <Button 
              onClick={() => onMarkSkipped(dose)}
              size="lg" 
              variant="outline" 
              className="text-base sm:text-xl hover:scale-105 active:scale-95 transition-all duration-200 hover:border-warning hover:text-warning hover:bg-warning/5"
            >
              <XCircle className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
              Skip
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
