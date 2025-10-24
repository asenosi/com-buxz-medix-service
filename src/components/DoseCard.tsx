import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, CheckCircle2, XCircle, Pill, AlarmClock, Edit } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

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
  isSnoozed?: boolean;
  snoozeUntil?: Date;
}

interface DoseCardProps {
  dose: TodayDose;
  onMarkTaken: (dose: TodayDose) => void;
  onMarkSkipped: (dose: TodayDose) => void;
  onMarkSnoozed: (dose: TodayDose, minutes: number) => void;
  onEdit: (medicationId: string) => void;
}

export const DoseCard = ({ dose, onMarkTaken, onMarkSkipped, onMarkSnoozed, onEdit }: DoseCardProps) => {
  const [snoozeMinutes, setSnoozeMinutes] = useState("15");
  const [showSnoozeOptions, setShowSnoozeOptions] = useState(false);
  const isCompleted = dose.isTaken || dose.isSkipped || dose.isSnoozed;

  return (
    <Card
      className={cn(
        "border-l-4 transition-all duration-500 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]",
        dose.isTaken && "opacity-60 bg-success/5 border-l-success animate-fade-in",
        (dose.isSkipped || dose.isSnoozed) && "bg-warning/20 border-l-warning opacity-75 animate-fade-in",
        !isCompleted && dose.status === "overdue" && "border-l-destructive animate-pulse-slow shadow-destructive/30 shadow-xl",
        !isCompleted && dose.status === "due" && "border-l-accent shadow-accent/30 shadow-xl animate-bounce-subtle",
        !isCompleted && dose.status === "upcoming" && "border-l-primary hover:border-l-primary/80"
      )}
    >
      <CardHeader className="pb-3 sm:pb-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div className="flex items-center gap-2 sm:gap-3 flex-1">
            <div className={cn(
              "p-2 sm:p-3 rounded-full transition-all duration-300",
              dose.isTaken && "bg-success/20 animate-scale-in",
              (dose.isSkipped || dose.isSnoozed) && "bg-warning/20 animate-scale-in",
              !isCompleted && "bg-primary/20 animate-pulse-slow"
            )}>
              <Pill className={cn(
                "w-5 h-5 sm:w-6 sm:h-6",
                dose.isTaken && "text-success",
                (dose.isSkipped || dose.isSnoozed) && "text-warning",
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
          <div className="flex items-center gap-2">
            <Button
              onClick={() => onEdit(dose.medication.id)}
              size="sm"
              variant="ghost"
              className="hover:scale-110 transition-transform duration-200"
            >
              <Edit className="w-4 h-4" />
            </Button>
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
          {dose.isSnoozed && dose.snoozeUntil && (
            <span className="text-warning font-semibold bg-warning/10 px-2 sm:px-3 py-1 rounded-full">
              ⏰ Snoozed until {dose.snoozeUntil.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
        {!isCompleted && (
          <div className="space-y-3">
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
                onClick={() => setShowSnoozeOptions(!showSnoozeOptions)}
                size="lg" 
                variant="outline" 
                className="text-base sm:text-xl hover:scale-105 active:scale-95 transition-all duration-200 hover:border-accent hover:text-accent hover:bg-accent/5"
              >
                <AlarmClock className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                Snooze
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
            
            {showSnoozeOptions && (
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center p-3 bg-muted/30 rounded-lg animate-fade-in">
                <span className="text-sm sm:text-base text-muted-foreground">Remind me in:</span>
                <Select value={snoozeMinutes} onValueChange={setSnoozeMinutes}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 minutes</SelectItem>
                    <SelectItem value="10">10 minutes</SelectItem>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  onClick={() => {
                    onMarkSnoozed(dose, parseInt(snoozeMinutes));
                    setShowSnoozeOptions(false);
                  }}
                  size="lg"
                  className="flex-1 sm:flex-initial hover:scale-105 transition-transform duration-200"
                >
                  Confirm Snooze
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
