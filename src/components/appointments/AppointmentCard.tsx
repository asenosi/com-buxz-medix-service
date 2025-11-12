import { format, formatDistanceToNow, isToday, isTomorrow, isPast } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, User, FileText, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import type { Database } from "@/integrations/supabase/types";

type Appointment = Database["public"]["Tables"]["appointments"]["Row"] & {
  medications?: { name: string } | null;
};

const appointmentTypeColors: Record<string, string> = {
  checkup: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  follow_up: "bg-green-500/10 text-green-700 dark:text-green-300",
  lab_test: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  imaging: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  procedure: "bg-red-500/10 text-red-700 dark:text-red-300",
  consultation: "bg-teal-500/10 text-teal-700 dark:text-teal-300",
  vaccination: "bg-pink-500/10 text-pink-700 dark:text-pink-300",
  therapy: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  other: "bg-gray-500/10 text-gray-700 dark:text-gray-300",
};

const statusColors: Record<string, string> = {
  scheduled: "bg-primary/10 text-primary",
  completed: "bg-green-500/10 text-green-700 dark:text-green-300",
  cancelled: "bg-red-500/10 text-red-700 dark:text-red-300",
  rescheduled: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
  no_show: "bg-gray-500/10 text-gray-700 dark:text-gray-300",
};

interface AppointmentCardProps {
  appointment: Appointment;
}

export function AppointmentCard({ appointment }: AppointmentCardProps) {
  const navigate = useNavigate();
  const [showFullNotes, setShowFullNotes] = useState(false);
  const appointmentDate = new Date(appointment.appointment_date);
  const isAppointmentPast = isPast(appointmentDate);
  
  // Format relative time
  const getRelativeTime = () => {
    if (isToday(appointmentDate)) return "Today";
    if (isTomorrow(appointmentDate)) return "Tomorrow";
    if (isAppointmentPast) return formatDistanceToNow(appointmentDate, { addSuffix: true });
    return `In ${formatDistanceToNow(appointmentDate)}`;
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on action buttons
    if ((e.target as HTMLElement).closest('button')) return;
    navigate(`/appointments/${appointment.id}`);
  };

  return (
    <Card 
      className={cn(
        "relative overflow-hidden transition-all duration-200 active:scale-[0.98] cursor-pointer hover:shadow-md border-border/50",
        "rounded-2xl"
      )}
      onClick={handleCardClick}
    >
      {/* Left colored border */}
      <div 
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1",
          isAppointmentPast ? "bg-muted-foreground/30" : "bg-primary"
        )} 
      />
      
      <CardContent className="p-4 pl-5">
        <div className="space-y-2.5">
          {/* Header: Relative time + Status chips */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <p className={cn(
                "text-sm font-medium",
                isAppointmentPast ? "text-muted-foreground" : "text-primary"
              )}>
                {getRelativeTime()}
              </p>
              
              <h3 className="text-lg font-semibold text-foreground leading-tight">
                {appointment.title}
              </h3>
              
              {appointment.description && (
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {appointment.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1">
              <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
            </div>
          </div>

          {/* Status chips */}
          <div className="flex flex-wrap gap-2">
            <Badge 
              variant="secondary" 
              className={cn("text-xs font-normal", appointmentTypeColors[appointment.appointment_type])}
            >
              {appointment.appointment_type.replace("_", " ")}
            </Badge>
            <Badge 
              variant="secondary"
              className={cn("text-xs font-normal", statusColors[appointment.status])}
            >
              {appointment.status}
            </Badge>
          </div>

          {/* Info rows with icons */}
          <div className="space-y-2 text-sm pt-0.5">
            {/* Date & Time */}
            <div className="flex items-center gap-3 text-muted-foreground">
              <Calendar className="w-4 h-4 shrink-0" />
              <span className="font-medium">
                {format(appointmentDate, "EEE, MMM d, yyyy")} — {format(new Date(`2000-01-01T${appointment.appointment_time}`), "h:mm a")}
              </span>
            </div>

            {/* Doctor */}
            {appointment.doctor_name && (
              <div className="flex items-center gap-3 text-muted-foreground">
                <User className="w-4 h-4 shrink-0" />
                <span>
                  {appointment.doctor_name}
                  {appointment.doctor_specialty && (
                    <span className="text-xs ml-1">({appointment.doctor_specialty})</span>
                  )}
                </span>
              </div>
            )}

            {/* Location */}
            {appointment.location && (
              <div className="flex items-center gap-3 text-muted-foreground">
                <MapPin className="w-4 h-4 shrink-0" />
                <span>{appointment.location}</span>
              </div>
            )}

            {/* Notes */}
            {appointment.notes && (
              <div 
                className="flex items-start gap-3 pt-1.5 border-t border-border/50 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFullNotes(!showFullNotes);
                }}
              >
                <FileText className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                <p className={cn(
                  "text-muted-foreground text-sm",
                  !showFullNotes && "line-clamp-1"
                )}>
                  {appointment.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
