import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, truncateText } from "@/lib/utils";
import { Pill, CheckCircle2, XCircle, Clock, Calendar } from "lucide-react";
import { MedicationImageCarousel } from "@/components/MedicationImageCarousel";

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
}

const statusColors: Record<string, string> = {
  taken: "bg-success/10 text-success",
  skipped: "bg-destructive/10 text-destructive",
  snoozed: "bg-warning/10 text-warning",
};

export const SimpleDoseCard = ({ medication, schedule, onClick, className, isTaken, isSkipped, isSnoozed, snoozeUntil }: SimpleDoseCardProps) => {
  const isCompleted = isTaken || isSkipped || isSnoozed;

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

  return (
    <Card
      onClick={onClick}
      className={cn(
        "relative overflow-hidden transition-all duration-200 active:scale-[0.98] cursor-pointer hover:shadow-md border-border/50",
        "rounded-2xl",
        className
      )}
    >
      {/* Left colored border */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1", getBorderColor())} />
      
      <CardContent className="p-3 pl-4">
        <div className="space-y-1.5">
          {/* Header: Title + Status */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
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
              
              <div className="flex-1 min-w-0 space-y-0.5">
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
            </div>

            {/* Status icon */}
            <div className="shrink-0">
              {isTaken && <CheckCircle2 className="w-5 h-5 text-success" />}
              {isSkipped && <XCircle className="w-5 h-5 text-destructive" />}
              {isSnoozed && <Clock className="w-5 h-5 text-warning" />}
            </div>
          </div>

          {/* Status chips */}
          <div className="flex flex-wrap gap-1.5">
            {isTaken && (
              <Badge variant="secondary" className={cn("text-xs font-normal", statusColors.taken)}>
                ✓ Taken
              </Badge>
            )}
            {isSkipped && (
              <Badge variant="secondary" className={cn("text-xs font-normal", statusColors.skipped)}>
                ✕ Skipped
              </Badge>
            )}
            {isSnoozed && (
              <Badge variant="secondary" className={cn("text-xs font-normal", statusColors.snoozed)}>
                ⏰ Snoozed
              </Badge>
            )}
          </div>

          {/* Info rows with icons */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {schedule.time_of_day && (
              <>
                <Calendar className="w-4 h-4 shrink-0" />
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
        </div>
      </CardContent>
    </Card>
  );
};
