import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Clock,
  MapPin,
  User,
  Pill,
  MoreVertical,
  Edit,
  Trash,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  appointment: any;
  onEdit: (appointment: any) => void;
  onDelete: (id: string) => void;
}

export function AppointmentCard({ appointment, onEdit, onDelete }: AppointmentCardProps) {
  const isPast = new Date(appointment.appointment_date) < new Date();

  return (
    <Card className={cn("transition-all hover:shadow-md", isPast && "opacity-75")}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-foreground">
                    {appointment.title}
                  </h3>
                  <Badge className={appointmentTypeColors[appointment.appointment_type]}>
                    {appointment.appointment_type.replace("_", " ")}
                  </Badge>
                  <Badge className={statusColors[appointment.status]}>
                    {appointment.status}
                  </Badge>
                </div>
                {appointment.description && (
                  <p className="text-sm text-muted-foreground">
                    {appointment.description}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>
                  {format(new Date(appointment.appointment_date), "MMM d, yyyy")} at{" "}
                  {format(new Date(`2000-01-01T${appointment.appointment_time}`), "h:mm a")}
                </span>
              </div>

              {appointment.location && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{appointment.location}</span>
                </div>
              )}

              {appointment.doctor_name && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="w-4 h-4" />
                  <span>
                    {appointment.doctor_name}
                    {appointment.doctor_specialty && ` - ${appointment.doctor_specialty}`}
                  </span>
                </div>
              )}

              {appointment.medications && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Pill className="w-4 h-4" />
                  <span>{appointment.medications.name}</span>
                </div>
              )}
            </div>

            {appointment.notes && (
              <div className="flex items-start gap-2 text-sm">
                <FileText className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <p className="text-muted-foreground">{appointment.notes}</p>
              </div>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(appointment)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(appointment.id)}
                className="text-destructive"
              >
                <Trash className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
