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
  onTake,
  onSkip,
  onReschedule,
  onEdit,
  onDelete,
  onInfo,
}: DoseActionDialogProps) => {
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
      <DialogContent className="sm:max-w-md p-0 gap-0 bg-card/95 backdrop-blur">
        {/* Header Actions */}
        <div className="flex items-center justify-between p-4 border-b">
          <Button size="icon" variant="ghost" onClick={onInfo} className="rounded-full">
            <Info className="h-5 w-5" />
          </Button>
          <div className="flex gap-2">
            <Button size="icon" variant="ghost" onClick={onDelete} className="rounded-full text-destructive">
              <Trash2 className="h-5 w-5" />
            </Button>
            <Button size="icon" variant="ghost" onClick={onEdit} className="rounded-full">
              <Edit className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Medication Info */}
        <div className="flex flex-col items-center p-6 space-y-4">
          {primaryImage && (
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <img src={primaryImage} alt={medication.name} className="w-12 h-12 object-contain" />
            </div>
          )}
          <h2 className="text-2xl font-bold text-center">{medication.name}</h2>

          <div className="w-full space-y-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ClockIcon className="h-4 w-4" />
              <span>
                Scheduled for {scheduledTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}, today
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-lg">💊</span>
              <span>{dosage}</span>
            </div>
            {schedule.special_instructions && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-lg">ℹ️</span>
                <span>{schedule.special_instructions}</span>
              </div>
            )}
            {lastTaken && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <ClockIcon className="h-4 w-4" />
                <span>
                  Last taken at {lastTaken.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}, today,{" "}
                  {lastTaken.toLocaleDateString([], { day: "numeric", month: "short" })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-4 p-6 pt-0">
          <button
            onClick={() => {
              onSkip();
              onOpenChange(false);
            }}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-muted hover:bg-muted/80 transition-colors"
          >
            <div className="w-14 h-14 rounded-full bg-muted-foreground/20 flex items-center justify-center">
              <X className="h-6 w-6" />
            </div>
            <span className="text-sm font-medium text-primary">SKIP</span>
          </button>

          <button
            onClick={() => {
              onTake();
              onOpenChange(false);
            }}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-primary/10 hover:bg-primary/20 transition-colors"
          >
            <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center">
              <Check className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-sm font-medium text-primary">TAKE</span>
          </button>

          <button
            onClick={() => {
              onReschedule();
              onOpenChange(false);
            }}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-muted hover:bg-muted/80 transition-colors"
          >
            <div className="w-14 h-14 rounded-full bg-muted-foreground/20 flex items-center justify-center">
              <ClockIcon className="h-6 w-6" />
            </div>
            <span className="text-sm font-medium text-primary">RESCHEDULE</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
