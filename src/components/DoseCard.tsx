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
        "border-l-4 transition-all duration-500 hover:shadow-lg hover:scale-[1.01]",
        dose.isTaken && "opacity-60 bg-success/5 border-l-success animate-fade-in",
        dose.isSkipped && "bg-warning/20 border-l-warning opacity-75 animate-fade-in",
        !isCompleted && dose.status === "overdue" && "border-l-destructive animate-pulse shadow-destructive/20 shadow-lg",
        !isCompleted && dose.status === "due" && "border-l-accent shadow-accent/20 shadow-lg",
        !isCompleted && dose.status === "upcoming" && "border-l-primary"
      )}
    >
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-3 rounded-full",
              dose.isTaken && "bg-success/20",
              dose.isSkipped && "bg-warning/20",
              !isCompleted && "bg-primary/20"
            )}>
              <Pill className={cn(
                "w-6 h-6",
                dose.isTaken && "text-success",
                dose.isSkipped && "text-warning",
                !isCompleted && "text-primary"
              )} />
            </div>
            <div>
              <CardTitle className="text-2xl">{dose.medication.name}</CardTitle>
              <CardDescription className="text-lg mt-2">
                {dose.medication.dosage}
                {dose.medication.form && ` • ${dose.medication.form}`}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-6 h-6 text-muted-foreground" />
            <span className="text-2xl font-semibold">
              {dose.nextDoseTime.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 mb-4 text-lg">
          {dose.schedule.with_food && (
            <span className="text-muted-foreground">Take with food</span>
          )}
          {dose.schedule.special_instructions && (
            <span className="text-muted-foreground">
              {dose.schedule.special_instructions}
            </span>
          )}
          {dose.medication.pills_remaining !== null && (
            <span className="text-muted-foreground">
              {dose.medication.pills_remaining} remaining
            </span>
          )}
          {dose.isTaken && (
            <span className="text-success font-semibold">✓ Taken</span>
          )}
          {dose.isSkipped && (
            <span className="text-warning font-semibold">Skipped</span>
          )}
        </div>
        {!isCompleted && (
          <div className="flex gap-3">
            <Button
              onClick={() => onMarkTaken(dose)}
              size="lg"
              className="flex-1 text-xl hover:scale-105 transition-transform duration-200 hover:shadow-xl"
              variant="default"
            >
              <CheckCircle2 className="w-6 h-6 mr-2 animate-scale-in" />
              I Took This
            </Button>
            <Button 
              onClick={() => onMarkSkipped(dose)}
              size="lg" 
              variant="outline" 
              className="text-xl hover:scale-105 transition-transform duration-200 hover:border-warning hover:text-warning"
            >
              <XCircle className="w-6 h-6 mr-2" />
              Skip
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
