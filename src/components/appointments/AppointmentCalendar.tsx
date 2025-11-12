import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, isSameDay } from "date-fns";
import { Clock, MapPin } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Appointment = Database["public"]["Tables"]["appointments"]["Row"];

interface AppointmentCalendarProps {
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
  onDateClick: (date: Date) => void;
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

export function AppointmentCalendar({
  appointments,
  onAppointmentClick,
  onDateClick,
}: AppointmentCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const appointmentDates = appointments.map((apt) => new Date(apt.appointment_date));

  const appointmentsForDate = appointments.filter((apt) =>
    isSameDay(new Date(apt.appointment_date), selectedDate)
  );

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      const hasAppointment = appointments.some((apt) =>
        isSameDay(new Date(apt.appointment_date), date)
      );
      if (!hasAppointment) {
        onDateClick(date);
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
      <div className="lg:col-span-2">
        <Card className="shadow-sm border-border/50">
          <CardContent className="p-4 sm:p-6">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              modifiers={{
                hasAppointment: appointmentDates,
              }}
              modifiersClassNames={{
                hasAppointment: "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-success after:rounded-full",
              }}
              className="rounded-md border-0"
            />
            <div className="mt-4 pt-4 border-t border-border/50">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-success" />
                  <span>Has appointments</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h3 className="text-base sm:text-lg font-semibold text-foreground px-1">
          {format(selectedDate, "MMM d, yyyy")}
        </h3>

        {appointmentsForDate.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              No appointments
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {appointmentsForDate.map((appointment) => (
              <Card
                key={appointment.id}
                className="cursor-pointer transition-all active:scale-[0.98]"
                onClick={() => onAppointmentClick(appointment)}
              >
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">
                        {appointment.title}
                      </h4>
                      {appointment.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {appointment.description}
                        </p>
                      )}
                    </div>
                    <div
                      className={`w-3 h-3 rounded-full ${
                        appointmentTypeColors[appointment.appointment_type]
                      }`}
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>
                        {format(
                          new Date(`2000-01-01T${appointment.appointment_time}`),
                          "h:mm a"
                        )}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {appointment.duration_minutes} min
                      </Badge>
                    </div>

                    {appointment.location && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        <span className="line-clamp-1">{appointment.location}</span>
                      </div>
                    )}
                  </div>

                  <Badge
                    variant="outline"
                    className="text-xs"
                  >
                    {appointment.appointment_type.replace("_", " ")}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
