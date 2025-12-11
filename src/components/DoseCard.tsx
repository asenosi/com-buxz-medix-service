import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, CheckCircle2, XCircle, Pill, AlarmClock, Calendar, ChevronDown } from "lucide-react";
import { cn, truncateText } from "@/lib/utils";
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

const statusColors: Record<string, string> = {
  taken: "bg-success/10 text-success",
  skipped: "bg-destructive/10 text-destructive",
  snoozed: "bg-warning/10 text-warning",
};

export const DoseCard = ({ dose, isPastDate = false, onMarkTaken, onMarkSkipped, onMarkSnoozed, onEdit, onOpenDetails }: DoseCardProps) => {
  const [snoozeMinutes, setSnoozeMinutes] = useState("15");
  const [showSnoozeOptions, setShowSnoozeOptions] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const isCompleted = dose.isTaken || dose.isSkipped || dose.isSnoozed;
  const showCountdown = !isCompleted && dose.status === "upcoming";
  const countdown = useCountdown(showCountdown ? dose.nextDoseTime : null);
  const snoozeCountdown = useCountdown(dose.isSnoozed && dose.snoozeUntil ? dose.snoozeUntil : null);
  
  // Check if dose is more than 3 hours in the future
  const now = new Date();
  const hoursUntilDose = (dose.nextDoseTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  const isTooFarInFuture = hoursUntilDose > 3;
  const canShowActions = !isCompleted && !isPastDate && !isTooFarInFuture;
  
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

  const handleToggleActions = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowActions(!showActions);
    if (showActions) {
      setShowSnoozeOptions(false);
    }
  };

  const getRelativeTime = () => {
    if (showCountdown) {
      if (countdown.hours > 0) {
        return `In ${countdown.hours}h ${countdown.minutes}m`;
      } else if (countdown.minutes > 0) {
        return `In ${countdown.minutes}m`;
      } else if (countdown.seconds > 0) {
        return `In ${countdown.seconds}s`;
      }
      return "Now";
    }
    if (dose.isSnoozed && dose.snoozeUntil) {
      if (snoozeCountdown.hours > 0) {
        return `In ${snoozeCountdown.hours}h ${snoozeCountdown.minutes}m`;
      }
      return `In ${snoozeCountdown.minutes}m`;
    }
    if (dose.status === "overdue") return "Overdue";
    if (dose.status === "due") return "Due now";
    return "";
  };

  const getBorderColor = () => {
    if (dose.isTaken) return "bg-success";
    if (dose.isSkipped) return "bg-destructive";
    if (dose.isSnoozed) return "bg-warning";
    if (dose.status === "overdue") return "bg-destructive";
    if (dose.status === "due") return "bg-primary";
    return "bg-primary";
  };

  return (
    <Card 
      className={cn(
        "relative overflow-hidden transition-all duration-200 active:scale-[0.98] cursor-pointer hover:shadow-md border-border/50",
        "rounded-2xl"
      )}
      onClick={handleCardClick}
    >
      {/* Left colored border */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1", getBorderColor())} />
      
      <CardContent className="p-3 pl-4">
        <div className="space-y-2">
          {/* Header: Title + Relative time */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {/* Medication Image */}
              <div className="shrink-0">
                {((dose.medication.image_urls && dose.medication.image_urls.length > 0) || dose.medication.image_url || primaryImage) ? (
                  <div className="w-10 h-10 rounded-lg overflow-hidden border relative">
                    <MedicationImageCarousel
                      images={dose.medication.image_urls || []}
                      fallbackImage={dose.medication.image_url || primaryImage}
                      alt={dose.medication.name}
                      className="w-10 h-10"
                      imageClassName="rounded-lg"
                    />
                    {((dose.medication.image_urls?.filter(img => img && img.trim() !== "").length || 0) > 1) && (
                      <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[9px] font-semibold rounded-full w-4 h-4 flex items-center justify-center shadow-sm border border-background">
                        {dose.medication.image_urls?.filter(img => img && img.trim() !== "").length}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg border bg-muted flex items-center justify-center">
                    <Pill className="w-5 h-5 text-primary" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0 space-y-0.5">
                <h3 className="text-base font-semibold text-foreground leading-tight truncate">
                  {truncateText(dose.medication.name)}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {dose.medication.dosage}
                  {dose.medication.form && ` • ${dose.medication.form}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <p className={cn(
                "text-sm font-medium",
                isCompleted ? "text-muted-foreground" : 
                dose.status === "overdue" ? "text-destructive" : "text-primary"
              )}>
                {getRelativeTime()}
              </p>
              {canShowActions && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleActions}
                  className={cn(
                    "h-7 w-7 p-0 rounded-full hover:bg-muted transition-transform",
                    showActions && "rotate-180"
                  )}
                >
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </Button>
              )}
            </div>
          </div>

          {/* Status chips */}
          <div className="flex flex-wrap gap-1.5">
            {dose.isTaken && (
              <Badge variant="secondary" className={cn("text-xs font-normal", statusColors.taken)}>
                ✓ Taken
              </Badge>
            )}
            {dose.isSkipped && (
              <Badge variant="secondary" className={cn("text-xs font-normal", statusColors.skipped)}>
                ✕ Skipped
              </Badge>
            )}
            {dose.isSnoozed && (
              <Badge variant="secondary" className={cn("text-xs font-normal", statusColors.snoozed)}>
                ⏰ Snoozed
              </Badge>
            )}
            {dose.schedule.with_food && (
              <Badge variant="secondary" className="text-xs font-normal bg-muted/50 text-muted-foreground">
                🍽️ With food
              </Badge>
            )}
            {dose.medication.pills_remaining !== null && (
              <Badge variant="secondary" className="text-xs font-normal bg-muted/50 text-muted-foreground">
                💊 {dose.medication.pills_remaining} left
              </Badge>
            )}
          </div>

          {/* Info rows with icons */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4 shrink-0" />
            <span className="font-medium">
              {dose.nextDoseTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {dose.schedule.special_instructions && (
              <>
                <span className="text-muted-foreground/40">•</span>
                <span className="truncate">{dose.schedule.special_instructions}</span>
              </>
            )}
          </div>

          {/* Collapsible Action buttons */}
          {showActions && canShowActions && (
            <div className="space-y-2 pt-2 border-t border-border/50 animate-fade-in">
              <div className="grid grid-cols-3 gap-2">
                <Button
                  onClick={(e) => { e.stopPropagation(); onMarkTaken(dose); setShowActions(false); }}
                  size="sm"
                  className="rounded-xl h-9 text-xs"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Take
                </Button>
                <Button 
                  onClick={(e) => { e.stopPropagation(); setShowSnoozeOptions(!showSnoozeOptions); }}
                  size="sm" 
                  variant="outline" 
                  className="rounded-xl h-9 text-xs"
                >
                  <AlarmClock className="w-4 h-4 mr-1" /> Snooze
                </Button>
                <Button 
                  onClick={(e) => { e.stopPropagation(); onMarkSkipped(dose); setShowActions(false); }}
                  size="sm" 
                  variant="outline" 
                  className="rounded-xl h-9 text-xs border-destructive text-destructive hover:bg-destructive/5"
                >
                  <XCircle className="w-4 h-4 mr-1" /> Skip
                </Button>
              </div>
              
              {showSnoozeOptions && (
                <div className="flex flex-col gap-2 p-2 bg-muted/30 rounded-xl">
                  <span className="text-xs text-muted-foreground">Remind me in:</span>
                  <Select value={snoozeMinutes} onValueChange={setSnoozeMinutes}>
                    <SelectTrigger className="w-full h-8 text-xs rounded-lg">
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
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkSnoozed(dose, parseInt(snoozeMinutes));
                      setShowSnoozeOptions(false);
                      setShowActions(false);
                    }}
                    size="sm"
                    className="rounded-xl h-8 text-xs"
                  >
                    Confirm Snooze
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
