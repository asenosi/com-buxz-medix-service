import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, Edit, Trash2, User, Phone, Mail, MapPin, Stethoscope, FileText, Calendar } from "lucide-react";
import { format } from "date-fns";
import PageLoader from "@/components/PageLoader";
import { toast } from "sonner";

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
      <div className="min-h-screen bg-background flex items-center justify-center">
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
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/practitioners")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{practitioner.name}</h1>
            {practitioner.specialty && (
              <p className="text-muted-foreground">{practitioner.specialty}</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate(`/practitioners/${id}/edit`)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>

        {/* Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {practitioner.clinic_name && (
              <div className="flex items-start gap-3">
                <Stethoscope className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Clinic</p>
                  <p className="font-medium">{practitioner.clinic_name}</p>
                </div>
              </div>
            )}
            {practitioner.phone_number && (
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{practitioner.phone_number}</p>
                </div>
              </div>
            )}
            {practitioner.email && (
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{practitioner.email}</p>
                </div>
              </div>
            )}
            {practitioner.address && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">{practitioner.address}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes Card */}
        {practitioner.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground whitespace-pre-wrap">{practitioner.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Appointments Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {appointments && appointments.length > 0 ? (
              <div className="space-y-3">
                {appointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    onClick={() => navigate(`/appointments/${appointment.id}`)}
                    className="p-4 rounded-lg border border-border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground truncate">{appointment.title}</h4>
                        {appointment.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{appointment.description}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium text-foreground">
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
              <p className="text-muted-foreground text-sm">No appointments scheduled with this practitioner.</p>
            )}
          </CardContent>
        </Card>
      </div>

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