import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Pill, CheckCircle2, XCircle, Clock } from "lucide-react";

interface Medication {
  id: string;
  name: string;
  dosage: string;
  form: string | null;
  image_url: string | null;
  images?: string[];
}

interface Schedule {
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
}

export const SimpleDoseCard = ({ medication, schedule, onClick, className, isTaken, isSkipped, isSnoozed }: SimpleDoseCardProps) => {
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

  const getIconColor = (form: string | null): string => {
    if (!form) return "bg-primary/10 text-primary";
    const f = form.toLowerCase();
    if (f.includes("pill")) return "bg-orange-500/10 text-orange-500";
    if (f.includes("inhaler")) return "bg-blue-500/10 text-blue-500";
    if (f.includes("cream")) return "bg-green-500/10 text-green-500";
    if (f.includes("drop") || f.includes("solution")) return "bg-cyan-500/10 text-cyan-500";
    if (f.includes("injection") || f.includes("syringe")) return "bg-blue-600/10 text-blue-600";
    if (f.includes("spray")) return "bg-purple-500/10 text-purple-500";
    return "bg-primary/10 text-primary";
  };

  return (
    <Card
      onClick={onClick}
      className={cn(
        "p-4 transition-colors border-l-4 border-l-transparent relative cursor-pointer hover:bg-accent/50",
        isCompleted && "bg-muted/40 opacity-70 saturate-[0.3] grayscale-[0.5]",
        className
      )}
    >
      <div className="flex items-center gap-4">
        {/* Icon/Image */}
        <div className={cn("w-12 h-12 rounded-full flex items-center justify-center shrink-0 relative", getIconColor(medication.form))}>
          {primaryImage ? (
            <img src={primaryImage} alt={medication.name} className={cn("w-8 h-8 object-contain", isCompleted && "opacity-50")} />
          ) : (
            <Pill className={cn("w-6 h-6", isCompleted && "opacity-50")} />
          )}
          {isTaken && (
            <div className="absolute -bottom-1 -right-1 bg-success rounded-full p-0.5">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
          )}
          {isSkipped && (
            <div className="absolute -bottom-1 -right-1 bg-warning rounded-full p-0.5">
              <XCircle className="w-4 h-4 text-white" />
            </div>
          )}
          {isSnoozed && (
            <div className="absolute -bottom-1 -right-1 bg-warning rounded-full p-0.5">
              <Clock className="w-4 h-4 text-white" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={cn("font-semibold text-lg truncate", isCompleted && "line-through")}>{medication.name}</h3>
          </div>
          <p className="text-sm text-muted-foreground truncate">{medication.dosage}</p>
          {schedule.special_instructions && (
            <p className="text-xs text-muted-foreground mt-1 truncate">{schedule.special_instructions}</p>
          )}
          {isTaken && (
            <Badge variant="outline" className="mt-1 text-[10px] h-5 bg-success/10 text-success border-success/30">
              ✓ Taken
            </Badge>
          )}
          {isSkipped && (
            <Badge variant="outline" className="mt-1 text-[10px] h-5 bg-warning/10 text-warning border-warning/30">
              ⚠️ Skipped
            </Badge>
          )}
          {isSnoozed && (
            <Badge variant="outline" className="mt-1 text-[10px] h-5 bg-warning/10 text-warning border-warning/30">
              ⏰ Snoozed
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
};
