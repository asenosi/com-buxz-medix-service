import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Check, Clock as ClockIcon, Trash2, Edit, Info, Pill, Utensils, Stethoscope, Syringe } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Medication {
  id: string;
  name: string;
  form: string | null;
  image_url: string | null;
  images?: string[];
  pills_remaining: number | null;
  reason_for_taking?: string | null;
  prescribing_doctor?: string | null;
  route_of_administration?: string | null;
  grace_period_minutes?: number | null;
  reminder_window_minutes?: number | null;
  missed_dose_cutoff_minutes?: number | null;
}

interface Schedule {
  time_of_day: string;
  special_instructions: string | null;
  with_food: boolean;
}

interface DoseActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medication: Medication;
  schedule: Schedule;
  scheduledTime: Date;
  dosage: string;
  lastTaken?: Date;
  gracePeriodMinutes?: number;
  missedDoseCutoffMinutes?: number;
  onTake: () => void;
  onSkip: () => void;
  onReschedule: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onInfo: () => void;
}

export const DoseActionDialog = ({
  open,
  onOpenChange,
  medication,
  schedule,
  scheduledTime,
  dosage,
  lastTaken,
  gracePeriodMinutes = 60,
  missedDoseCutoffMinutes = 180,
  onTake,
  onSkip,
  onReschedule,
  onEdit,
  onDelete,
  onInfo,
}: DoseActionDialogProps) => {
  // Calculate time difference and dose status
  const now = new Date();
  const minutesLate = Math.floor((now.getTime() - scheduledTime.getTime()) / (60 * 1000));
  const isLate = minutesLate > gracePeriodMinutes;
  const isTooLate = minutesLate > missedDoseCutoffMinutes;
  const isEarly = minutesLate < 0;
  const getDefaultImage = (form: string | null): string | null => {
    if (!form) return null;
    const f = form.toLowerCase();
    if (f.includes("pill")) return "/images/meds/pill.svg";
    if (f.includes("inhaler")) return "/images/meds/inhaler.svg";
    if (f.includes("cream")) return "/images/meds/cream.svg";
    if (f.includes("drop") || f.includes("solution")) return "/images/meds/drop.svg";
    if (f.includes("injection") || f.includes("syringe")) return "/images/meds/syringe.svg";
    if (f.includes("spray")) return "/images/meds/spray.svg";
    return "/images/meds/pill.svg";
  };

  const primaryImage =
    (medication.images && medication.images[0]) || medication.image_url || getDefaultImage(medication.form);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* Header */}
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 border-b">
          <div className="flex items-center justify-between p-3">
            <Button size="sm" variant="ghost" onClick={onInfo} className="h-8 px-2">
              <Info className="h-4 w-4 mr-1" />
              <span className="text-xs">Details</span>
            </Button>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={onEdit} className="h-8 px-2">
                <Edit className="h-4 w-4 mr-1" />
                <span className="text-xs">Edit</span>
              </Button>
              <Button size="sm" variant="ghost" onClick={onDelete} className="h-8 px-2 text-destructive hover:text-destructive">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Medication Info */}
        <div className="p-4 space-y-4">
          {/* Image and Name */}
          <div className="flex flex-col items-center gap-3">
            {primaryImage && (
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center shadow-md">
                <img src={primaryImage} alt={medication.name} className="w-14 h-14 object-contain" />
              </div>
            )}
            <div className="text-center">
              <h2 className="text-xl font-bold">{medication.name}</h2>
              <p className="text-sm text-muted-foreground">{dosage}</p>
            </div>
          </div>

          {/* Status Banner */}
          {isTooLate && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                <div className="flex-1">
                  <p className="font-semibold text-destructive text-sm">Dose Window Exceeded</p>
                  <p className="text-xs text-destructive/80">
                    {minutesLate} min late • Logged as MISSED
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {isLate && !isTooLate && (
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
              <div className="flex items-center gap-2">
                <span className="text-lg">⏰</span>
                <div className="flex-1">
                  <p className="font-semibold text-warning-foreground text-sm">Outside Grace Period</p>
                  <p className="text-xs text-warning-foreground/80">
                    {minutesLate} min late • Logged as LATE
                  </p>
                </div>
              </div>
            </div>
          )}

          {isEarly && Math.abs(minutesLate) > 30 && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
              <div className="flex items-center gap-2">
                <span className="text-lg">ℹ️</span>
                <div className="flex-1">
                  <p className="font-semibold text-primary text-sm">Taking Early</p>
                  <p className="text-xs text-primary/80">
                    Scheduled in {Math.abs(minutesLate)} min
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-lg bg-muted/50 flex items-center gap-2">
              <ClockIcon className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Scheduled</p>
                <p className="text-sm font-medium">{scheduledTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
              </div>
            </div>

            {medication.form && (
              <div className="p-2 rounded-lg bg-muted/50 flex items-center gap-2">
                <Pill className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Form</p>
                  <p className="text-sm font-medium">{medication.form}</p>
                </div>
              </div>
            )}

            {medication.pills_remaining !== null && (
              <div className="p-2 rounded-lg bg-muted/50 flex items-center gap-2">
                <span className="text-lg">💊</span>
                <div>
                  <p className="text-xs text-muted-foreground">Remaining</p>
                  <p className="text-sm font-medium">{medication.pills_remaining} pills</p>
                </div>
              </div>
            )}

            {schedule.with_food && (
              <div className="p-2 rounded-lg bg-muted/50 flex items-center gap-2">
                <Utensils className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Take with</p>
                  <p className="text-sm font-medium">Food</p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Detailed Information */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Details</h3>
            
            {medication.reason_for_taking && (
              <div className="flex items-start gap-2 p-2 rounded-lg bg-accent/5">
                <Stethoscope className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Reason</p>
                  <p className="text-sm">{medication.reason_for_taking}</p>
                </div>
              </div>
            )}

            {medication.route_of_administration && (
              <div className="flex items-start gap-2 p-2 rounded-lg bg-accent/5">
                <Syringe className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Route</p>
                  <p className="text-sm">{medication.route_of_administration}</p>
                </div>
              </div>
            )}

            {schedule.special_instructions && (
              <div className="flex items-start gap-2 p-2 rounded-lg bg-accent/5">
                <span className="text-lg flex-shrink-0">📋</span>
                <div>
                  <p className="text-xs text-muted-foreground">Instructions</p>
                  <p className="text-sm">{schedule.special_instructions}</p>
                </div>
              </div>
            )}

            {medication.prescribing_doctor && (
              <div className="flex items-start gap-2 p-2 rounded-lg bg-accent/5">
                <span className="text-lg flex-shrink-0">👨‍⚕️</span>
                <div>
                  <p className="text-xs text-muted-foreground">Prescribed by</p>
                  <p className="text-sm">{medication.prescribing_doctor}</p>
                </div>
              </div>
            )}

            {lastTaken && (
              <div className="flex items-start gap-2 p-2 rounded-lg bg-success/5 border border-success/20">
                <ClockIcon className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Last taken</p>
                  <p className="text-sm text-success-foreground">
                    {lastTaken.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}, {lastTaken.toLocaleDateString([], { day: "numeric", month: "short" })}
                  </p>
                </div>
              </div>
            )}

            {/* Timing Settings */}
            <div className="flex flex-wrap gap-1.5 pt-2">
              {medication.grace_period_minutes && (
                <Badge variant="secondary" className="text-xs">
                  Grace: {medication.grace_period_minutes}m
                </Badge>
              )}
              {medication.reminder_window_minutes && (
                <Badge variant="secondary" className="text-xs">
                  Reminder: {medication.reminder_window_minutes}m
                </Badge>
              )}
              {medication.missed_dose_cutoff_minutes && (
                <Badge variant="secondary" className="text-xs">
                  Cutoff: {medication.missed_dose_cutoff_minutes}m
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="sticky bottom-0 bg-background border-t p-3">
          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={() => {
                onSkip();
                onOpenChange(false);
              }}
              variant="outline"
              size="sm"
              className="h-auto py-3 flex flex-col gap-1"
            >
              <X className="h-5 w-5" />
              <span className="text-xs font-semibold">Skip</span>
            </Button>

            <Button
              onClick={() => {
                onTake();
                onOpenChange(false);
              }}
              size="sm"
              className={cn(
                "h-auto py-3 flex flex-col gap-1",
                isTooLate && "bg-destructive hover:bg-destructive/90",
                isLate && !isTooLate && "bg-warning hover:bg-warning/90 text-warning-foreground",
                !isLate && !isTooLate && "bg-primary hover:bg-primary/90"
              )}
            >
              <Check className="h-5 w-5" strokeWidth={3} />
              <span className="text-xs font-bold">
                {isTooLate ? "Missed" : isLate ? "Late" : "Take"}
              </span>
            </Button>

            <Button
              onClick={() => {
                onReschedule();
                onOpenChange(false);
              }}
              variant="outline"
              size="sm"
              className="h-auto py-3 flex flex-col gap-1"
            >
              <ClockIcon className="h-5 w-5" />
              <span className="text-xs font-semibold">Snooze</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
