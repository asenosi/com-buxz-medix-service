import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, Edit, Trash2, User, Phone, Mail, MapPin, Stethoscope, FileText, Calendar } from "lucide-react";
import { format } from "date-fns";
import PageLoader from "@/components/PageLoader";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  scheduled: "bg-primary/10 text-primary",
  completed: "bg-green-500/10 text-green-700 dark:text-green-300",
  cancelled: "bg-red-500/10 text-red-700 dark:text-red-300",
  rescheduled: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
  no_show: "bg-gray-500/10 text-gray-700 dark:text-gray-300",
};

const statusLabels: Record<string, string> = {
  scheduled: "Scheduled",
  completed: "Attended",
  cancelled: "Cancelled",
  rescheduled: "Rescheduled",
  no_show: "Missed",
};

export default function PractitionerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: practitioner, isLoading } = useQuery({
    queryKey: ["practitioner", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medical_practitioners")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Practitioner not found");
      return data;
    },
  });

  const { data: appointments } = useQuery({
    queryKey: ["practitioner-appointments", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true });

      if (error) throw error;
      // Filter by practitioner_id in JS since types don't have it yet
      return (data || []).filter((apt) => (apt as { practitioner_id?: string }).practitioner_id === id);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("medical_practitioners")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practitioners"] });
      toast.success("Practitioner deleted successfully");
      navigate("/practitioners");
    },
    onError: () => {
      toast.error("Failed to delete practitioner");
    },
  });

  if (isLoading) {
    return <PageLoader />;
  }

  if (!practitioner) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Practitioner not found</h2>
          <Button onClick={() => navigate("/practitioners")}>
            Back to Practitioners
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/practitioners")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">{practitioner.name}</h1>
          {practitioner.specialty && (
            <p className="text-sm text-muted-foreground">{practitioner.specialty}</p>
          )}
        </div>
        <Button
          onClick={() => navigate(`/practitioners/${id}/edit`)}
          variant="ghost"
          size="icon"
        >
          <Edit className="w-5 h-5" />
        </Button>
        <Button
          onClick={() => setShowDeleteDialog(true)}
          variant="ghost"
          size="icon"
        >
          <Trash2 className="w-5 h-5 text-destructive" />
        </Button>
      </div>

      {/* Details Card */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-base font-semibold">Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 px-4 pb-4">
          {practitioner.clinic_name && (
            <div className="flex items-start gap-2">
              <Stethoscope className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Clinic</p>
                <p className="text-sm font-medium">{practitioner.clinic_name}</p>
              </div>
            </div>
          )}
          {practitioner.phone_number && (
            <div className="flex items-start gap-2">
              <Phone className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="text-sm font-medium">{practitioner.phone_number}</p>
              </div>
            </div>
          )}
          {practitioner.email && (
            <div className="flex items-start gap-2">
              <Mail className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium">{practitioner.email}</p>
              </div>
            </div>
          )}
          {practitioner.address && (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Address</p>
                <p className="text-sm font-medium">{practitioner.address}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes Card */}
      {practitioner.notes && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base font-semibold">Notes</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-sm text-foreground whitespace-pre-wrap">{practitioner.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Appointments Card */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-base font-semibold">Appointments</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {appointments && appointments.length > 0 ? (
            <div className="space-y-2">
              {appointments.map((appointment) => (
                <div
                  key={appointment.id}
                  onClick={() => navigate(`/appointments/${appointment.id}`)}
                  className="p-3 rounded-lg border border-border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-foreground truncate">{appointment.title}</h4>
                      {appointment.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{appointment.description}</p>
                      )}
                      <Badge variant="secondary" className={`${statusColors[appointment.status]} mt-1.5 text-xs`}>
                        {statusLabels[appointment.status]}
                      </Badge>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-medium text-foreground">
                        {format(new Date(appointment.appointment_date), "MMM d, yyyy")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(`2000-01-01T${appointment.appointment_time}`), "h:mm a")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No appointments scheduled with this practitioner.</p>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Practitioner</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {practitioner.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}