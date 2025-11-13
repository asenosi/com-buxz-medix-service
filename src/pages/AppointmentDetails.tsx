import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  User, 
  Pill,
  FileText,
  Edit,
  Trash2,
  Bell,
  X,
  CalendarClock,
  CheckCircle,
  XCircle
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { AppointmentWizard } from "@/components/appointments/AppointmentWizard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

const appointmentTypeLabels: Record<string, string> = {
  checkup: "Checkup",
  follow_up: "Follow-up",
  lab_test: "Lab Test",
  imaging: "Imaging",
  procedure: "Procedure",
  consultation: "Consultation",
  vaccination: "Vaccination",
  therapy: "Therapy",
  other: "Other",
};

const statusLabels: Record<string, string> = {
  scheduled: "Scheduled",
  completed: "Attended",
  cancelled: "Cancelled",
  rescheduled: "Rescheduled",
  no_show: "Missed",
};

const formatReminderTime = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min before`;
  } else if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} before`;
  } else {
    const days = Math.floor(minutes / 1440);
    return `${days} ${days === 1 ? 'day' : 'days'} before`;
  }
};

export default function AppointmentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const { data: appointment, isLoading, refetch } = useQuery({
    queryKey: ["appointment", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, medications(name), medical_practitioners(name, specialty, phone_number, email)")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Real-time subscription for this appointment
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`appointment-${id}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `id=eq.${id}`
        },
        () => {
          // Refetch appointment data when changes occur
          queryClient.invalidateQueries({ queryKey: ["appointment", id] });
          queryClient.invalidateQueries({ queryKey: ["appointments"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

  const handleDelete = async () => {
    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete appointment");
    } else {
      toast.success("Appointment deleted", {
        style: {
          background: "hsl(var(--success))",
          color: "hsl(var(--success-foreground))",
          border: "1px solid hsl(var(--success))",
        },
      });
      navigate("/appointments");
    }
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    refetch();
  };

  const handleCancel = async () => {
    const { error } = await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", id);

    if (error) {
      toast.error("Failed to cancel appointment");
    } else {
      toast.success("Appointment cancelled", {
        style: {
          background: "hsl(var(--warning))",
          color: "hsl(var(--warning-foreground))",
          border: "1px solid hsl(var(--warning))",
        },
      });
      setCancelDialogOpen(false);
      refetch();
    }
  };

  const handleReschedule = () => {
    setEditDialogOpen(true);
  };

  const handleMarkCompleted = async () => {
    const { error } = await supabase
      .from("appointments")
      .update({ status: "completed" })
      .eq("id", id);

    if (error) {
      toast.error("Failed to mark appointment as completed");
    } else {
      toast.success("Appointment marked as completed", {
        style: {
          background: "hsl(var(--success))",
          color: "hsl(var(--success-foreground))",
          border: "1px solid hsl(var(--success))",
        },
      });
      refetch();
    }
  };

  const handleMarkMissed = async () => {
    const { error } = await supabase
      .from("appointments")
      .update({ status: "no_show" })
      .eq("id", id);

    if (error) {
      toast.error("Failed to mark appointment as missed");
    } else {
      toast.error("Appointment marked as missed", {
        style: {
          background: "hsl(var(--destructive))",
          color: "hsl(var(--destructive-foreground))",
          border: "1px solid hsl(var(--destructive))",
        },
      });
      refetch();
    }
  };

  // Check if appointment is in the past
  const isAppointmentPast = appointment ? (() => {
    const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
    return appointmentDateTime < new Date();
  })() : false;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="text-muted-foreground">Appointment not found</div>
        <Button onClick={() => navigate("/appointments")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Appointments
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/appointments")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            {appointment.title}
          </h1>
        </div>
        <Button
          onClick={() => setEditDialogOpen(true)}
          variant="ghost"
          size="icon"
        >
          <Edit className="w-5 h-5" />
        </Button>
        <Button
          onClick={() => setDeleteDialogOpen(true)}
          variant="ghost"
          size="icon"
        >
          <Trash2 className="w-5 h-5 text-destructive" />
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                appointmentTypeColors[appointment.appointment_type]
              }`}
            />
            <Badge variant="outline" className="text-xs">
              {appointmentTypeLabels[appointment.appointment_type]}
            </Badge>
            <Badge 
              variant={appointment.status === "scheduled" ? "default" : "secondary"} 
              className={`text-xs ${appointment.status === "completed" ? "bg-success text-success-foreground" : ""}`}
            >
              {statusLabels[appointment.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 px-4 pb-4">
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <CalendarIcon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="text-sm font-medium">
                  {format(new Date(appointment.appointment_date), "EEEE, MMMM d, yyyy")}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Time</p>
                <p className="text-sm font-medium">
                  {format(
                    new Date(`2000-01-01T${appointment.appointment_time}`),
                    "h:mm a"
                  )}
                  {" "}
                  ({appointment.duration_minutes} min)
                </p>
              </div>
            </div>

            {(appointment.doctor_name || appointment.medical_practitioners) && (
              <>
                <Separator className="my-2" />
                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Doctor</p>
                    <p className="text-sm font-medium">
                      {appointment.medical_practitioners?.name || appointment.doctor_name}
                    </p>
                    {(appointment.medical_practitioners?.specialty || appointment.doctor_specialty) && (
                      <p className="text-xs text-muted-foreground">
                        {appointment.medical_practitioners?.specialty || appointment.doctor_specialty}
                      </p>
                    )}
                    {appointment.medical_practitioners?.phone_number && (
                      <p className="text-xs text-muted-foreground mt-1">
                        📞 {appointment.medical_practitioners.phone_number}
                      </p>
                    )}
                    {appointment.medical_practitioners?.email && (
                      <p className="text-xs text-muted-foreground">
                        ✉️ {appointment.medical_practitioners.email}
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

            {appointment.location && (
              <>
                <Separator className="my-2" />
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="text-sm font-medium">{appointment.location}</p>
                  </div>
                </div>
              </>
            )}

            {appointment.medications && (
              <>
                <Separator className="my-2" />
                <div className="flex items-start gap-2">
                  <Pill className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Related Medication</p>
                    <p className="text-sm font-medium">{appointment.medications.name}</p>
                  </div>
                </div>
              </>
            )}

            {appointment.reminder_minutes_before && (
              <>
                <Separator className="my-2" />
                <div className="flex items-start gap-2">
                  <Bell className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Reminder</p>
                    <p className="text-sm font-medium">
                      {formatReminderTime(appointment.reminder_minutes_before)}
                    </p>
                  </div>
                </div>
              </>
            )}

            {(appointment.description || appointment.notes) && (
              <>
                <Separator className="my-2" />
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    {appointment.description && (
                      <div>
                        <p className="text-xs text-muted-foreground">Description</p>
                        <p className="text-sm">{appointment.description}</p>
                      </div>
                    )}
                    {appointment.notes && (
                      <div>
                        <p className="text-xs text-muted-foreground">Notes</p>
                        <p className="text-sm">{appointment.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {appointment.status === "scheduled" && !isAppointmentPast && (
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={handleReschedule}
            variant="outline"
            size="sm"
            className="w-full rounded-full"
          >
            <CalendarClock className="w-4 h-4 mr-2" />
            Reschedule
          </Button>
          <Button
            onClick={() => setCancelDialogOpen(true)}
            variant="outline"
            size="sm"
            className="w-full rounded-full text-destructive hover:text-destructive"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      )}

      {/* Mark Attendance for Past Appointments */}
      {appointment.status === "scheduled" && isAppointmentPast && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleMarkCompleted}
              size="sm"
              className="w-full rounded-full bg-success text-success-foreground hover:bg-success/90"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Attended
            </Button>
            <Button
              onClick={handleMarkMissed}
              variant="outline"
              size="sm"
              className="w-full rounded-full text-destructive hover:text-destructive"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Missed
            </Button>
          </div>
          <Button
            onClick={handleReschedule}
            variant="outline"
            size="sm"
            className="w-full rounded-full"
          >
            <CalendarClock className="w-4 h-4 mr-2" />
            Reschedule
          </Button>
        </div>
      )}

      <AppointmentWizard
        open={editDialogOpen}
        onOpenChange={handleEditClose}
        appointment={appointment}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this appointment. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the appointment as cancelled. You can still view it in your past appointments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel}>
              Cancel Appointment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
