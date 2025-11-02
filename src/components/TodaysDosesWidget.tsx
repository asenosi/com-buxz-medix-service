import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, AlertCircle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface Medication {
  id: string;
  name: string;
  dosage: string;
  form: string | null;
  image_url: string | null;
  images?: string[];
}

interface Schedule {
  id: string;
  time_of_day: string;
}

interface TodayDose {
  medication: Medication;
  schedule: Schedule;
  nextDoseTime: Date;
  status: "upcoming" | "due" | "overdue";
  isTaken?: boolean;
  isSkipped?: boolean;
}

interface TodaysDosesWidgetProps {
  doses: TodayDose[];
  onMarkTaken: (dose: TodayDose) => void;
  onViewAll: () => void;
}

export const TodaysDosesWidget = ({ doses, onMarkTaken, onViewAll }: TodaysDosesWidgetProps) => {
  const upcomingDoses = doses
    .filter(d => !d.isTaken && !d.isSkipped && d.status !== "overdue")
    .slice(0, 3);
    
  const overdueDoses = doses.filter(d => !d.isTaken && !d.isSkipped && d.status === "overdue");
  const takenCount = doses.filter(d => d.isTaken).length;
  const totalCount = doses.length;

  if (doses.length === 0) return null;

  return (
    <Card className="sticky top-0 z-30 mb-4 bg-card/95 backdrop-blur-sm border-2 shadow-lg animate-fade-in">
      <div className="p-4">
        {/* Header with Progress */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-bold">Today's Doses</h3>
            <p className="text-sm text-muted-foreground">
              {takenCount} of {totalCount} taken
            </p>
          </div>
          <div className="flex items-center gap-2">
            {overdueDoses.length > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {overdueDoses.length} overdue
              </Badge>
            )}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onViewAll}
              className="text-primary hover:text-primary"
            >
              View All
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-muted rounded-full h-2 mb-4">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-500"
            style={{ width: `${(takenCount / totalCount) * 100}%` }}
          />
        </div>

        {/* Quick Action Doses */}
        <div className="space-y-2">
          {overdueDoses.slice(0, 2).map((dose) => (
            <QuickDoseItem
              key={`${dose.medication.id}-${dose.schedule.id}`}
              dose={dose}
              onMarkTaken={onMarkTaken}
              variant="overdue"
            />
          ))}
          {upcomingDoses.map((dose) => (
            <QuickDoseItem
              key={`${dose.medication.id}-${dose.schedule.id}`}
              dose={dose}
              onMarkTaken={onMarkTaken}
              variant={dose.status === "due" ? "due" : "upcoming"}
            />
          ))}
        </div>
      </div>
    </Card>
  );
};

interface QuickDoseItemProps {
  dose: TodayDose;
  onMarkTaken: (dose: TodayDose) => void;
  variant: "upcoming" | "due" | "overdue";
}

const QuickDoseItem = ({ dose, onMarkTaken, variant }: QuickDoseItemProps) => {
  const getDefaultImage = (form: string | null): string | null => {
    if (!form) return null;
    const f = form.toLowerCase();
    if (f.includes("pill")) return "/images/meds/pill.svg";
    if (f.includes("inhaler")) return "/images/meds/inhaler.svg";
    if (f.includes("cream")) return "/images/meds/cream.svg";
    if (f.includes("drop")) return "/images/meds/drop.svg";
    if (f.includes("injection") || f.includes("syringe")) return "/images/meds/syringe.svg";
    if (f.includes("spray")) return "/images/meds/spray.svg";
    return "/images/meds/pill.svg";
  };

  const primaryImage = 
    (dose.medication.images && dose.medication.images[0]) || 
    dose.medication.image_url || 
    getDefaultImage(dose.medication.form);

  const handleTake = () => {
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    onMarkTaken(dose);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg transition-all duration-200 active:scale-98",
        variant === "overdue" && "bg-destructive/10 border border-destructive/30",
        variant === "due" && "bg-accent/10 border border-accent/30",
        variant === "upcoming" && "bg-muted/50"
      )}
    >
      {/* Icon */}
      <div className="shrink-0">
        {variant === "overdue" && <AlertCircle className="w-5 h-5 text-destructive" />}
        {variant === "due" && <Clock className="w-5 h-5 text-primary" />}
        {variant === "upcoming" && <Clock className="w-5 h-5 text-muted-foreground" />}
      </div>

      {/* Image */}
      {primaryImage && (
        <img
          src={primaryImage}
          alt={dose.medication.name}
          className="w-10 h-10 rounded object-cover"
        />
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate text-sm">{dose.medication.name}</p>
        <p className="text-xs text-muted-foreground">
          {dose.nextDoseTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {" • "}
          {dose.medication.dosage}
        </p>
      </div>

      {/* Action Button */}
      <Button
        size="sm"
        onClick={handleTake}
        className={cn(
          "rounded-full h-10 w-10 p-0 shrink-0",
          variant === "overdue" && "bg-destructive hover:bg-destructive/90"
        )}
      >
        <CheckCircle2 className="w-5 h-5" />
      </Button>
    </div>
  );
};