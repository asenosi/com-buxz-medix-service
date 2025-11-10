import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, CheckCircle2, XCircle, Pill, AlarmClock, Edit } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useCountdown } from "@/hooks/use-countdown";
import { Badge } from "@/components/ui/badge";
import { MedicationImageCarousel } from "@/components/MedicationImageCarousel";

interface Medication {
  id: string;
  name: string;
  dosage: string;
  form: string | null;
  pills_remaining: number | null;
  image_url: string | null;
  image_urls?: string[] | null;
  images?: string[];
  grace_period_minutes?: number | null;
  reminder_window_minutes?: number | null;
  missed_dose_cutoff_minutes?: number | null;
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
  isPastDate?: boolean;
  onMarkTaken: (dose: TodayDose) => void;
  onMarkSkipped: (dose: TodayDose) => void;
  onMarkSnoozed: (dose: TodayDose, minutes: number) => void;
  onEdit: (medicationId: string) => void;
  onOpenDetails: (medicationId: string) => void;
}

export const DoseCard = ({ dose, isPastDate = false, onMarkTaken, onMarkSkipped, onMarkSnoozed, onEdit, onOpenDetails }: DoseCardProps) => {
  const [snoozeMinutes, setSnoozeMinutes] = useState("15");
  const [showSnoozeOptions, setShowSnoozeOptions] = useState(false);
  const isCompleted = dose.isTaken || dose.isSkipped || dose.isSnoozed;
  const showCountdown = !isCompleted && dose.status === "upcoming";
  const countdown = useCountdown(showCountdown ? dose.nextDoseTime : null);
  const snoozeCountdown = useCountdown(dose.isSnoozed && dose.snoozeUntil ? dose.snoozeUntil : null);
  
  // Calculate grace period status
  const now = new Date();
  const minutesLate = Math.floor((now.getTime() - dose.nextDoseTime.getTime()) / (60 * 1000));
  const gracePeriodMinutes = dose.medication.grace_period_minutes || 60;
  const missedDoseCutoffMinutes = dose.medication.missed_dose_cutoff_minutes || 180;
  const isLate = minutesLate > gracePeriodMinutes && minutesLate <= missedDoseCutoffMinutes;
  const isTooLate = minutesLate > missedDoseCutoffMinutes;
  
  const getDefaultImage = (form: string | null): string | null => {
    if (!form) return null;
    const f = form.toLowerCase();
    if (f.includes("pill")) return "/images/meds/pill.svg";
    if (f.includes("inhaler")) return "/images/meds/inhaler.svg";
    if (f.includes("cream")) return "/images/meds/cream.svg";
    if (f.includes("drop") || f.includes("solution")) return "/images/meds/drop.svg";
    if (f.includes("injection") || f.includes("syringe")) return "/images/meds/syringe.svg";
    if (f.includes("spray")) return "/images/meds/spray.svg";
    if (f.includes("powder") || f.includes("strip") || f.includes("insert") || f.includes("other") || f.includes("stick")) return "/images/meds/pill.svg";
    return null;
  };
  const primaryImage = (dose.medication.images && dose.medication.images[0]) || dose.medication.image_url || getDefaultImage(dose.medication.form);
  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button,[role=button],a,input,select,textarea")) return;
    onOpenDetails(dose.medication.id);
  };

  return (
    <Card
      onClick={handleCardClick}
      className={cn(
        "rounded-lg border px-3 py-3 transition-all duration-300 hover:shadow-lg cursor-pointer",
        dose.isTaken && "bg-success/5 border-success/30",
        (dose.isSkipped || dose.isSnoozed) && "bg-warning/5 border-warning/30",
        !isCompleted && dose.status === "overdue" && "bg-destructive/5 border-destructive/30",
        !isCompleted && dose.status === "due" && "bg-accent/5 border-accent/30"
      )}
    >
      <CardHeader className="p-0 pb-2 pointer-events-none">
        <div className="flex items-start gap-3">
          <div className="shrink-0">
            {((dose.medication.image_urls && dose.medication.image_urls.length > 0) || dose.medication.image_url || primaryImage) ? (
              <div className="w-12 h-12 rounded-lg overflow-hidden border relative">
                <MedicationImageCarousel
                  images={dose.medication.image_urls || []}
                  fallbackImage={dose.medication.image_url || primaryImage}
                  alt={dose.medication.name}
                  className="w-12 h-12"
                  imageClassName="rounded-lg"
                />
                {((dose.medication.image_urls?.filter(img => img && img.trim() !== "").length || 0) > 1) && (
                  <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-semibold rounded-full w-5 h-5 flex items-center justify-center shadow-sm border border-background">
                    {dose.medication.image_urls?.filter(img => img && img.trim() !== "").length}
                  </div>
                )}
              </div>
            ) : (
              <div className={cn("p-2 rounded-lg border bg-muted")}> 
                <Pill className="w-5 h-5 text-primary" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{dose.medication.name}</CardTitle>
            <CardDescription className="text-sm mt-0.5">
              {dose.medication.dosage}
              {dose.medication.form && ` • ${dose.medication.form}`}
            </CardDescription>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-gray-500" />
                {dose.nextDoseTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              {showCountdown && (
                <div>
                  in {countdown.hours > 0 ? `${countdown.hours}h ` : ''}{countdown.minutes}m
                </div>
              )}
              {dose.isSnoozed && dose.snoozeUntil && (
                <div>
                  resumes in {snoozeCountdown.hours > 0 ? `${snoozeCountdown.hours}h ` : ''}{snoozeCountdown.minutes}m
                </div>
              )}
            </div>
          </div>
          <div className="self-start pointer-events-auto">
            <Button onClick={() => onEdit(dose.medication.id)} size="icon" variant="ghost" className="rounded-full h-7 w-7">
              <Edit className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 pt-2 pointer-events-none">
        <div className="flex flex-wrap gap-1.5 mb-2 text-xs">
          {dose.schedule.with_food && (
            <span className="text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">🍽️ With food</span>
          )}
          {dose.schedule.special_instructions && (
            <span className="text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
              {dose.schedule.special_instructions}
            </span>
          )}
          {dose.medication.pills_remaining !== null && (
            <span className="text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
              💊 {dose.medication.pills_remaining} left
            </span>
          )}
          {dose.isTaken && (
            <span className="text-success font-semibold bg-success/10 px-2 py-0.5 rounded-full">✓ Taken</span>
          )}
          {dose.isSkipped && (
            <span className="text-warning font-semibold bg-warning/10 px-2 py-0.5 rounded-full">⚠️ Skipped</span>
          )}
          {dose.isSnoozed && dose.snoozeUntil && (
            <span className="text-warning font-semibold bg-warning/10 px-2 py-0.5 rounded-full text-[10px]">
              ⏰ Snoozed until {dose.snoozeUntil.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
        {!isCompleted && !isPastDate && (
          <div className="space-y-2 pointer-events-auto">
            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={() => onMarkTaken(dose)}
                size="sm"
                className="rounded-lg h-9 text-xs"
              >
                <CheckCircle2 className="w-4 h-4 mr-1" /> Take
              </Button>
              <Button 
                onClick={() => setShowSnoozeOptions(!showSnoozeOptions)}
                size="sm" 
                variant="outline" 
                className="rounded-lg h-9 text-xs"
              >
                <AlarmClock className="w-4 h-4 mr-1" /> Snooze
              </Button>
              <Button 
                onClick={() => onMarkSkipped(dose)}
                size="sm" 
                variant="outline" 
                className="rounded-lg h-9 text-xs border-destructive text-destructive hover:bg-destructive/5"
              >
                <XCircle className="w-4 h-4 mr-1" /> Skip
              </Button>
            </div>
            
            {showSnoozeOptions && (
              <div className="flex flex-col gap-2 p-2 bg-muted/30 rounded-lg animate-fade-in">
                <span className="text-xs text-muted-foreground">Remind me in:</span>
                <Select value={snoozeMinutes} onValueChange={setSnoozeMinutes}>
                  <SelectTrigger className="w-full h-8 text-xs">
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
                  size="sm"
                  className="rounded-lg h-8 text-xs"
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
