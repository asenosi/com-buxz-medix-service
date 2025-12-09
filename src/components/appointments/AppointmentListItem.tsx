import { useState } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronUp, Clock, MapPin, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";

type Appointment = Database["public"]["Tables"]["appointments"]["Row"];

interface AppointmentListItemProps {
  appointment: Appointment;
}

const appointmentTypeColors: Record<string, string> = {
  checkup: "bg-blue-500",
  follow_up: "bg-green-500",
  lab_test: "bg-purple-500",
  imaging: "bg-orange-500",
  procedure: "bg-red-500",
  consultation: "bg-teal-500",
  vaccination: "bg-pink-500",
  therapy: "bg-indigo-500",
  other: "bg-gray-500",
};

export function AppointmentListItem({ appointment }: AppointmentListItemProps) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/appointments/${appointment.id}`);
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  const formatTime = () => {
    if (!appointment.appointment_time) return "All day";
    try {
      return format(new Date(`2000-01-01T${appointment.appointment_time}`), "h:mm a");
    } catch {
      return appointment.appointment_time;
    }
  };

  const formatDuration = () => {
    if (!appointment.duration_minutes) return null;
    if (appointment.duration_minutes < 60) {
      return `${appointment.duration_minutes} min`;
    }
    const hours = Math.floor(appointment.duration_minutes / 60);
    const mins = appointment.duration_minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const accentColor = appointmentTypeColors[appointment.appointment_type] || "bg-gray-500";

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all active:scale-[0.99] overflow-hidden",
        "hover:shadow-md"
      )}
      onClick={handleCardClick}
    >
      <CardContent className="p-0">
        {/* Main row */}
        <div className="flex items-stretch">
          {/* Accent bar */}
          <div className={cn("w-1 shrink-0", accentColor)} />
          
          {/* Content */}
          <div className="flex-1 p-3 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {/* Time and Duration */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-medium">{formatTime()}</span>
                  {formatDuration() && (
                    <span className="text-xs">• {formatDuration()}</span>
                  )}
                </div>
                
                {/* Title */}
                <h4 className="font-semibold text-foreground mt-0.5 truncate">
                  {appointment.title}
                </h4>
                
                {/* Location */}
                {appointment.location && (
                  <p className="text-sm text-muted-foreground truncate">
                    {appointment.location}
                  </p>
                )}
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
              {appointment.doctor_name && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4 shrink-0" />
                  <span>{appointment.doctor_name}</span>
                  {appointment.doctor_specialty && (
                    <Badge variant="outline" className="text-xs">
                      {appointment.doctor_specialty}
                    </Badge>
                  )}
                </div>
              )}

              {appointment.location && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span className="line-clamp-2">{appointment.location}</span>
                </div>
              )}

              {appointment.description && (
                <p className="text-muted-foreground pt-1">
                  {appointment.description}
                </p>
              )}

              <div className="flex items-center gap-2 pt-1">
                <Badge variant="secondary" className="text-xs capitalize">
                  {appointment.appointment_type.replace("_", " ")}
                </Badge>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs capitalize",
                    appointment.status === "completed" && "border-success text-success",
                    appointment.status === "cancelled" && "border-destructive text-destructive",
                    appointment.status === "no_show" && "border-warning text-warning"
                  )}
                >
                  {appointment.status}
                </Badge>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
