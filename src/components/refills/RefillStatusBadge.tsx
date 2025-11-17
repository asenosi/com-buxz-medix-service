import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, AlertCircle, XCircle } from "lucide-react";

interface RefillStatusBadgeProps {
  pillsRemaining: number | null;
  refillThreshold: number | null;
  className?: string;
}

export const RefillStatusBadge = ({ 
  pillsRemaining, 
  refillThreshold,
  className 
}: RefillStatusBadgeProps) => {
  if (pillsRemaining === null) return null;

  const getStatus = () => {
    if (pillsRemaining === 0) {
      return {
        label: "Out of Stock",
        variant: "destructive" as const,
        icon: XCircle,
        color: "text-destructive"
      };
    }
    
    if (refillThreshold !== null && pillsRemaining <= refillThreshold) {
      if (pillsRemaining <= Math.floor(refillThreshold / 2)) {
        return {
          label: "Critical Low",
          variant: "destructive" as const,
          icon: AlertCircle,
          color: "text-destructive"
        };
      }
      return {
        label: "Low Stock",
        variant: "outline" as const,
        icon: AlertTriangle,
        color: "text-amber-500"
      };
    }
    
    return {
      label: "Good Stock",
      variant: "outline" as const,
      icon: CheckCircle2,
      color: "text-green-500"
    };
  };

  const status = getStatus();
  const Icon = status.icon;

  return (
    <Badge 
      variant={status.variant} 
      className={className}
    >
      <Icon className={`h-3 w-3 mr-1 ${status.color}`} />
      {status.label}
    </Badge>
  );
};
