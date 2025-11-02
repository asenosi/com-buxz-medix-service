import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Check, Clock as ClockIcon, Trash2, Edit, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface Medication {
  id: string;
  name: string;
  form: string | null;
  image_url: string | null;
  images?: string[];
}

interface Schedule {
  time_of_day: string;
  special_instructions: string | null;
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
      <DialogContent className="sm:max-w-md p-0 gap-0 bg-card/95 backdrop-blur-sm border-2">
        {/* Header Actions */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <Button size="icon" variant="ghost" onClick={onInfo} className="rounded-full hover:bg-primary/10">
            <Info className="h-5 w-5" />
          </Button>
          <div className="flex gap-2">
            <Button size="icon" variant="ghost" onClick={onDelete} className="rounded-full text-destructive hover:bg-destructive/10">
              <Trash2 className="h-5 w-5" />
            </Button>
            <Button size="icon" variant="ghost" onClick={onEdit} className="rounded-full hover:bg-primary/10">
              <Edit className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Medication Info */}
        <div className="flex flex-col items-center p-6 space-y-5">
          {primaryImage && (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-lg animate-scale-in">
              <img src={primaryImage} alt={medication.name} className="w-16 h-16 object-contain" />
            </div>
          )}
          <h2 className="text-2xl font-bold text-center leading-tight">{medication.name}</h2>

          <div className="w-full space-y-3">
            {/* Status Warnings - Most Important First */}
            {isTooLate && (
              <div className="p-4 rounded-xl bg-destructive/15 border-2 border-destructive/40 animate-fade-in">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div className="flex-1 space-y-1">
                    <p className="font-bold text-destructive text-base">Dose Window Exceeded</p>
                    <p className="text-sm text-destructive/90">
                      {minutesLate} min late • Will be logged as <strong>MISSED</strong>
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {isLate && !isTooLate && (
              <div className="p-4 rounded-xl bg-warning/15 border-2 border-warning/40 animate-fade-in">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⏰</span>
                  <div className="flex-1 space-y-1">
                    <p className="font-bold text-warning-foreground text-base">Outside Grace Period</p>
                    <p className="text-sm text-warning-foreground/80">
                      {minutesLate} min late • Will be logged as <strong>LATE</strong>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isEarly && Math.abs(minutesLate) > 30 && (
              <div className="p-4 rounded-xl bg-primary/10 border-2 border-primary/30 animate-fade-in">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">ℹ️</span>
                  <div className="flex-1 space-y-1">
                    <p className="font-bold text-primary text-base">Taking Early</p>
                    <p className="text-sm text-primary/80">
                      Scheduled in {Math.abs(minutesLate)} min • Consider waiting
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Medication Details */}
            <div className="pt-2 space-y-3 text-base">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <ClockIcon className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="text-foreground">
                  {scheduledTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} today
                </span>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <span className="text-2xl">💊</span>
                <span className="text-foreground font-medium">{dosage}</span>
              </div>

              {schedule.special_instructions && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/10 border border-accent/30">
                  <span className="text-2xl">📋</span>
                  <span className="text-foreground text-sm leading-relaxed">{schedule.special_instructions}</span>
                </div>
              )}

              {lastTaken && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-success/10 border border-success/30">
                  <ClockIcon className="h-5 w-5 text-success flex-shrink-0" />
                  <span className="text-success-foreground text-sm">
                    Last: {lastTaken.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}, {lastTaken.toLocaleDateString([], { day: "numeric", month: "short" })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-3 p-6 pt-0 bg-muted/20">
          <button
            onClick={() => {
              onSkip();
              onOpenChange(false);
            }}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card hover:bg-muted/60 transition-all duration-200 border-2 border-border hover:border-muted-foreground/30 active:scale-95"
          >
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <X className="h-7 w-7 text-muted-foreground" />
            </div>
            <span className="text-sm font-semibold text-foreground">SKIP</span>
          </button>

          <button
            onClick={() => {
              onTake();
              onOpenChange(false);
            }}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-200 border-2 active:scale-95",
              isTooLate && "bg-destructive/20 hover:bg-destructive/30 border-destructive/40 hover:border-destructive/60",
              isLate && !isTooLate && "bg-warning/20 hover:bg-warning/30 border-warning/40 hover:border-warning/60",
              !isLate && !isTooLate && "bg-primary/20 hover:bg-primary/30 border-primary/40 hover:border-primary/60"
            )}
          >
            <div className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center shadow-md",
              isTooLate && "bg-destructive",
              isLate && !isTooLate && "bg-warning",
              !isLate && !isTooLate && "bg-primary"
            )}>
              <Check className="h-7 w-7 text-white" strokeWidth={3} />
            </div>
            <span className={cn(
              "text-sm font-bold",
              isTooLate && "text-destructive",
              isLate && !isTooLate && "text-warning-foreground",
              !isLate && !isTooLate && "text-primary"
            )}>
              {isTooLate ? "MISSED" : isLate ? "LATE" : "TAKE"}
            </span>
          </button>

          <button
            onClick={() => {
              onReschedule();
              onOpenChange(false);
            }}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card hover:bg-muted/60 transition-all duration-200 border-2 border-border hover:border-muted-foreground/30 active:scale-95"
          >
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <ClockIcon className="h-7 w-7 text-muted-foreground" />
            </div>
            <span className="text-sm font-semibold text-foreground">SNOOZE</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
