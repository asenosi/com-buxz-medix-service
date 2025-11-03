import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Pill } from "lucide-react";

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
}

export const SimpleDoseCard = ({ medication, schedule, onClick, className }: SimpleDoseCardProps) => {
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
      className={cn(
        "p-4 hover:bg-accent/50 transition-colors cursor-pointer border-l-4 border-l-transparent relative",
        className
      )}
    >
      <div onClick={onClick} className="absolute inset-0 z-0" />
      <div className="flex items-center gap-4 relative z-10">
        {/* Icon/Image */}
        <div className={cn("w-12 h-12 rounded-full flex items-center justify-center shrink-0", getIconColor(medication.form))}>
          {primaryImage ? (
            <img src={primaryImage} alt={medication.name} className="w-8 h-8 object-contain" />
          ) : (
            <Pill className="w-6 h-6" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg truncate">{medication.name}</h3>
          <p className="text-sm text-muted-foreground truncate">{medication.dosage}</p>
          {schedule.special_instructions && (
            <p className="text-xs text-muted-foreground mt-1 truncate">{schedule.special_instructions}</p>
          )}
        </div>
      </div>
    </Card>
  );
};
