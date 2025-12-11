import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, truncateText } from "@/lib/utils";
import { Pill, CheckCircle2, XCircle, Clock, Calendar, AlarmClock } from "lucide-react";
import { MedicationImageCarousel } from "@/components/MedicationImageCarousel";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Medication {
  id: string;
  name: string;
  dosage: string;
  form: string | null;
  image_url: string | null;
  image_urls?: string[] | null;
  images?: string[];
}

interface Schedule {
  time_of_day?: string;
  special_instructions: string | null;
}

interface SimpleDoseCardProps {
  medication: Medication;
  schedule: Schedule;
  onClick?: () => void;
  className?: string;
  isTaken?: boolean;
  isSkipped?: boolean;
  isSnoozed?: boolean;
  snoozeUntil?: Date;
  isPastDate?: boolean;
  onMarkTaken?: () => void;
  onMarkSkipped?: () => void;
  onMarkSnoozed?: (minutes: number) => void;
}

const statusColors: Record<string, string> = {
  taken: "bg-success/10 text-success",
  skipped: "bg-destructive/10 text-destructive",
  snoozed: "bg-warning/10 text-warning",
};

export const SimpleDoseCard = ({ 
  medication, 
  schedule, 
  onClick, 
  className, 
  isTaken, 
  isSkipped, 
  isSnoozed, 
  snoozeUntil,
  isPastDate = false,
  onMarkTaken,
  onMarkSkipped,
  onMarkSnoozed
}: SimpleDoseCardProps) => {
  const [showSnoozeOptions, setShowSnoozeOptions] = useState(false);
  const [snoozeMinutes, setSnoozeMinutes] = useState("15");
  const isCompleted = isTaken || isSkipped || isSnoozed;
  
  // Check if dose is more than 3 hours in the future
  const isTooFarInFuture = (() => {
    if (!schedule.time_of_day) return false;
    const [hours, minutes] = schedule.time_of_day.split(':').map(Number);
    const now = new Date();
    const doseTime = new Date();
    doseTime.setHours(hours, minutes, 0, 0);
    const hoursUntilDose = (doseTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilDose > 3;
  })();
  
  const showActions = !isCompleted && !isPastDate && !isTooFarInFuture && (onMarkTaken || onMarkSkipped || onMarkSnoozed);

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

  const getBorderColor = () => {
    if (isTaken) return "bg-success";
    if (isSkipped) return "bg-destructive";
    if (isSnoozed) return "bg-warning";
    return "bg-primary";
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button,[role=button],input,select,textarea")) return;
    onClick?.();
  };

  return (
    <Card
      onClick={handleCardClick}
      className={cn(
        "relative overflow-hidden transition-all duration-200 active:scale-[0.98] cursor-pointer hover:shadow-md border-border/50",
        "rounded-2xl",
        className
      )}
    >
      {/* Left colored border */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1", getBorderColor())} />
      
      <CardContent className="p-3 pl-4">
        <div className="space-y-2">
          {/* Header: Image + Content + Status */}
          <div className="flex items-start gap-3">
            {/* Medication Image */}
            <div className="shrink-0">
              {((medication.image_urls && medication.image_urls.length > 0) || medication.image_url || primaryImage) ? (
                <div className="w-10 h-10 rounded-lg overflow-hidden border relative">
                  <MedicationImageCarousel
                    images={medication.image_urls || []}
                    fallbackImage={medication.image_url || primaryImage}
                    alt={medication.name}
                    className="w-10 h-10"
                    imageClassName={cn("rounded-lg", isCompleted && "opacity-70")}
                  />
                  {((medication.image_urls?.filter(img => img && img.trim() !== "").length || 0) > 1) && (
                    <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[9px] font-semibold rounded-full w-4 h-4 flex items-center justify-center shadow-sm border border-background z-10">
                      {medication.image_urls?.filter(img => img && img.trim() !== "").length}
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-10 h-10 rounded-lg border bg-muted flex items-center justify-center">
                  <Pill className={cn("w-5 h-5 text-primary", isCompleted && "opacity-70")} />
                </div>
              )}
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className={cn(
                    "text-base font-semibold leading-tight truncate",
                    isTaken && "text-muted-foreground"
                  )}>
                    {truncateText(medication.name)}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {medication.dosage}
                  </p>
                </div>
                
                {/* Status icon */}
                <div className="shrink-0">
                  {isTaken && <CheckCircle2 className="w-5 h-5 text-success" />}
                  {isSkipped && <XCircle className="w-5 h-5 text-destructive" />}
                  {isSnoozed && <Clock className="w-5 h-5 text-warning" />}
                </div>
              </div>

              {/* Time and instructions */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                {schedule.time_of_day && (
                  <>
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-medium">
                      {formatTime(schedule.time_of_day)}
                    </span>
                  </>
                )}
                {schedule.special_instructions && (
                  <>
                    {schedule.time_of_day && <span className="text-muted-foreground/40">•</span>}
                    <span className="truncate">{schedule.special_instructions}</span>
                  </>
                )}
              </div>

              {/* Status badges */}
              {isCompleted && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {isTaken && (
                    <Badge variant="secondary" className={cn("text-[10px] h-5 font-normal", statusColors.taken)}>
                      ✓ Taken
                    </Badge>
                  )}
                  {isSkipped && (
                    <Badge variant="secondary" className={cn("text-[10px] h-5 font-normal", statusColors.skipped)}>
                      ✕ Skipped
                    </Badge>
                  )}
                  {isSnoozed && (
                    <Badge variant="secondary" className={cn("text-[10px] h-5 font-normal", statusColors.snoozed)}>
                      ⏰ Snoozed
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          {showActions && (
            <div className="flex items-center gap-2 pt-2 border-t border-border/30">
              {onMarkTaken && (
                <Button
                  onClick={(e) => { e.stopPropagation(); onMarkTaken(); }}
                  size="sm"
                  className="flex-1 rounded-xl h-8 text-xs font-medium"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Take
                </Button>
              )}
              {onMarkSnoozed && (
                <Button 
                  onClick={(e) => { e.stopPropagation(); setShowSnoozeOptions(!showSnoozeOptions); }}
                  size="sm" 
                  variant="outline" 
                  className="flex-1 rounded-xl h-8 text-xs font-medium"
                >
                  <AlarmClock className="w-3.5 h-3.5 mr-1" /> Snooze
                </Button>
              )}
              {onMarkSkipped && (
                <Button 
                  onClick={(e) => { e.stopPropagation(); onMarkSkipped(); }}
                  size="sm" 
                  variant="ghost" 
                  className="rounded-xl h-8 text-xs font-medium text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" /> Skip
                </Button>
              )}
            </div>
          )}
          
          {/* Snooze options */}
          {showSnoozeOptions && onMarkSnoozed && (
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-xl animate-fade-in">
              <Select value={snoozeMinutes} onValueChange={setSnoozeMinutes}>
                <SelectTrigger className="flex-1 h-8 text-xs rounded-lg bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border shadow-lg z-50">
                  <SelectItem value="5">5 min</SelectItem>
                  <SelectItem value="10">10 min</SelectItem>
                  <SelectItem value="15">15 min</SelectItem>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkSnoozed(parseInt(snoozeMinutes));
                  setShowSnoozeOptions(false);
                }}
                size="sm"
                className="rounded-xl h-8 text-xs px-4"
              >
                Confirm
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
