import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, truncateText } from "@/lib/utils";
import { Pill, CheckCircle2, XCircle, Clock, AlarmClock, ChevronDown, ChevronUp, User, FileText } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Medication {
  id: string;
  name: string;
  dosage: string;
  form: string | null;
  image_url?: string | null;
  image_urls?: string[] | null;
  images?: string[];
  instructions?: string | null;
  reason_for_taking?: string | null;
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
  taken: "border-success text-success",
  skipped: "border-destructive text-destructive",
  snoozed: "border-warning text-warning",
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
  const [expanded, setExpanded] = useState(false);
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
  
  const canShowActions = !isCompleted && !isPastDate && !isTooFarInFuture && (onMarkTaken || onMarkSkipped || onMarkSnoozed);

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
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatForm = (form: string | null) => {
    if (!form) return null;
    return form.charAt(0).toUpperCase() + form.slice(1).toLowerCase();
  };

  const handleCardClick = () => {
    onClick?.();
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
    if (expanded) {
      setShowSnoozeOptions(false);
    }
  };

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all active:scale-[0.99] overflow-hidden hover:shadow-md",
        className
      )}
      onClick={handleCardClick}
    >
      <CardContent className="p-0">
        {/* Main row */}
        <div className="flex items-stretch">
          {/* Accent bar */}
          <div className={cn("w-1 shrink-0", getBorderColor())} />
          
          {/* Content */}
          <div className="flex-1 p-3 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {/* Time and Form */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-medium">{schedule.time_of_day ? formatTime(schedule.time_of_day) : "Anytime"}</span>
                  {medication.form && (
                    <span className="text-xs">• {formatForm(medication.form)}</span>
                  )}
                </div>
                
                {/* Medication Name */}
                <h4 className={cn(
                  "font-semibold text-foreground mt-0.5 truncate",
                  isTaken && "text-muted-foreground"
                )}>
                  {truncateText(medication.name)}
                </h4>
                
                {/* Dosage */}
                <p className="text-sm text-muted-foreground truncate">
                  {medication.dosage}
                </p>
              </div>
              
              {/* Expand button */}
              <button
                onClick={handleExpandClick}
                className="p-1 -m-1 hover:bg-muted rounded-md transition-colors"
              >
                {expanded ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Expanded content */}
        {expanded && (
          <div className="px-4 pb-3 pt-0 border-t border-border/50 mt-0 space-y-2 animate-fade-in">
            <div className="pt-3 space-y-2 text-sm">
              {/* Instructions */}
              {(schedule.special_instructions || medication.instructions) && (
                <div className="flex items-start gap-2 text-muted-foreground">
                  <FileText className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">
                    {schedule.special_instructions || medication.instructions}
                  </span>
                </div>
              )}

              {/* Reason for taking */}
              {medication.reason_for_taking && (
                <div className="flex items-start gap-2 text-muted-foreground">
                  <User className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{medication.reason_for_taking}</span>
                </div>
              )}

              {/* Status badges */}
              <div className="flex items-center gap-2 pt-1">
                {medication.form && (
                  <Badge variant="secondary" className="text-xs capitalize">
                    {medication.form}
                  </Badge>
                )}
                {isCompleted && (
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs capitalize",
                      isTaken && statusColors.taken,
                      isSkipped && statusColors.skipped,
                      isSnoozed && statusColors.snoozed
                    )}
                  >
                    {isTaken && "Taken"}
                    {isSkipped && "Skipped"}
                    {isSnoozed && "Snoozed"}
                  </Badge>
                )}
              </div>

              {/* Action buttons */}
              {canShowActions && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2">
                    {onMarkTaken && (
                      <Button
                        onClick={(e) => { e.stopPropagation(); onMarkTaken(); }}
                        size="sm"
                        className="flex-1 rounded-xl h-9 text-xs font-medium"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Take
                      </Button>
                    )}
                    {onMarkSnoozed && (
                      <Button 
                        onClick={(e) => { e.stopPropagation(); setShowSnoozeOptions(!showSnoozeOptions); }}
                        size="sm" 
                        variant="outline" 
                        className="flex-1 rounded-xl h-9 text-xs font-medium"
                      >
                        <AlarmClock className="w-3.5 h-3.5 mr-1.5" /> Snooze
                      </Button>
                    )}
                    {onMarkSkipped && (
                      <Button 
                        onClick={(e) => { e.stopPropagation(); onMarkSkipped(); }}
                        size="sm" 
                        variant="ghost" 
                        className="rounded-xl h-9 text-xs font-medium text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1.5" /> Skip
                      </Button>
                    )}
                  </div>
                  
                  {/* Snooze options */}
                  {showSnoozeOptions && onMarkSnoozed && (
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-xl">
                      <Select value={snoozeMinutes} onValueChange={setSnoozeMinutes}>
                        <SelectTrigger className="flex-1 h-9 text-xs rounded-lg bg-background">
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
                        className="rounded-xl h-9 text-xs px-4"
                      >
                        Confirm
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
