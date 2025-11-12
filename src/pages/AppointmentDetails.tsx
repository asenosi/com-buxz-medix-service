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
  Bell
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
  completed: "Completed",
  cancelled: "Cancelled",
  rescheduled: "Rescheduled",
  no_show: "No Show",
};

export default function AppointmentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: appointment, isLoading, refetch } = useQuery({
    queryKey: ["appointment", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, medications(name)")
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
      toast.success("Appointment deleted");
      navigate("/appointments");
    }
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    refetch();
  };

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
    <div className="space-y-4 pb-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/appointments")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {appointment.title}
          </h1>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <div
                className={`w-4 h-4 rounded-full ${
                  appointmentTypeColors[appointment.appointment_type]
                }`}
              />
              <Badge variant="outline">
                {appointmentTypeLabels[appointment.appointment_type]}
              </Badge>
              <Badge variant={appointment.status === "scheduled" ? "default" : "secondary"}>
                {statusLabels[appointment.status]}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CalendarIcon className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-medium">
                  {format(new Date(appointment.appointment_date), "EEEE, MMMM d, yyyy")}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Time</p>
                <p className="font-medium">
                  {format(
                    new Date(`2000-01-01T${appointment.appointment_time}`),
                    "h:mm a"
                  )}
                  {" "}
                  ({appointment.duration_minutes} minutes)
                </p>
              </div>
            </div>

            {appointment.doctor_name && (
              <>
                <Separator />
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Doctor</p>
                    <p className="font-medium">{appointment.doctor_name}</p>
                    {appointment.doctor_specialty && (
                      <p className="text-sm text-muted-foreground">
                        {appointment.doctor_specialty}
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

            {appointment.location && (
              <>
                <Separator />
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">{appointment.location}</p>
                  </div>
                </div>
              </>
            )}

            {appointment.medications && (
              <>
                <Separator />
                <div className="flex items-start gap-3">
                  <Pill className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Related Medication</p>
                    <p className="font-medium">{appointment.medications.name}</p>
                  </div>
                </div>
              </>
            )}

            {appointment.reminder_minutes_before && (
              <>
                <Separator />
                <div className="flex items-start gap-3">
                  <Bell className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Reminder</p>
                    <p className="font-medium">
                      {appointment.reminder_minutes_before} minutes before
                    </p>
                  </div>
                </div>
              </>
            )}

            {(appointment.description || appointment.notes) && (
              <>
                <Separator />
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1 space-y-2">
                    {appointment.description && (
                      <div>
                        <p className="text-sm text-muted-foreground">Description</p>
                        <p className="text-sm">{appointment.description}</p>
                      </div>
                    )}
                    {appointment.notes && (
                      <div>
                        <p className="text-sm text-muted-foreground">Notes</p>
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

      <div className="flex gap-3">
        <Button
          onClick={() => setEditDialogOpen(true)}
          className="flex-1"
          size="lg"
        >
          <Edit className="w-4 h-4 mr-2" />
          Edit
        </Button>
        <Button
          onClick={() => setDeleteDialogOpen(true)}
          variant="destructive"
          className="flex-1"
          size="lg"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </Button>
      </div>

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
    </div>
  );
}
