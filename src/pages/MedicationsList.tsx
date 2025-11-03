import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Pause, Play, Trash2, Plus, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { SimpleDoseCard } from "@/components/SimpleDoseCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

interface Medication {
  id: string;
  name: string;
  dosage: string;
  form: string | null;
  active: boolean;
  image_url: string | null;
  user_id: string;
  images?: string[];
  reason_for_taking?: string | null;
  instructions?: string | null;
}

interface Schedule {
  id: string;
  medication_id: string;
  time_of_day: string;
  with_food: boolean;
  special_instructions: string | null;
}

const MedicationsList = () => {
  const navigate = useNavigate();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMedId, setSelectedMedId] = useState<string | null>(null);

  const fetchMedications = useCallback(async () => {
    try {
      setLoading(true);
      const { data: sess } = await supabase.auth.getSession();
      const userId = sess.session?.user?.id;
      if (!userId) throw new Error("Not authenticated");

      const { data: medsData, error: medsError } = await supabase
        .from("medications")
        .select("*")
        .eq("user_id", userId)
        .order("name");

      if (medsError) throw medsError;

      // Attach images
      const medsWithImages: Medication[] = await Promise.all(
        (medsData || []).map(async (m) => {
          const base = `${m.user_id}/${m.id}`;
          const { data: files } = await supabase.storage
            .from("medication-images")
            .list(base, { limit: 10, sortBy: { column: "updated_at", order: "desc" } });
          const names = (files || []).slice(0, 5).map(f => `${base}/${f.name}`);
          const images = names.map(n => 
            supabase.storage.from("medication-images").getPublicUrl(n).data.publicUrl
          );
          return { ...m, images };
        })
      );

      setMedications(medsWithImages || []);

      // Fetch schedules
      const medIds = medsWithImages.map(m => m.id);
      if (medIds.length > 0) {
        const { data: schedulesData, error: schedError } = await supabase
          .from("medication_schedules")
          .select("*")
          .in("medication_id", medIds);

        if (schedError) throw schedError;
        setSchedules(schedulesData || []);
      }
    } catch (error) {
      toast.error("Failed to load medications");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMedications();
  }, [fetchMedications]);

  const handleToggleActive = async (medId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from("medications")
        .update({ active: !currentActive })
        .eq("id", medId);

      if (error) throw error;

      toast.success(currentActive ? "Medication suspended" : "Medication activated");
      fetchMedications();
    } catch (error) {
      toast.error("Failed to update medication");
      console.error(error);
    }
  };

  const handleDelete = async () => {
    if (!selectedMedId) return;

    try {
      const { error } = await supabase
        .from("medications")
        .delete()
        .eq("id", selectedMedId);

      if (error) throw error;

      toast.success("Medication deleted");
      setDeleteDialogOpen(false);
      setSelectedMedId(null);
      fetchMedications();
    } catch (error) {
      toast.error("Failed to delete medication");
      console.error(error);
    }
  };

  const getFirstSchedule = (medId: string) => {
    return schedules.find(s => s.medication_id === medId);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (medications.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">My Medications</h1>
        <Card className="p-12 text-center border-2 border-dashed border-muted-foreground/30">
          <p className="text-muted-foreground mb-4">No medications added yet</p>
          <Button onClick={() => navigate("/medications/add")}>
            <Plus className="mr-2 h-4 w-4" />
            Add Medication
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">My Medications</h1>
        <Button onClick={() => navigate("/medications/add")} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Add Medication
        </Button>
      </div>

      <div className="space-y-3">
        {medications.map((med) => {
          const schedule = getFirstSchedule(med.id);
          return (
            <Card key={med.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div 
                    className="flex-1 cursor-pointer" 
                    onClick={() => navigate(`/medications/${med.id}`)}
                  >
                    <SimpleDoseCard
                      medication={med}
                      schedule={schedule}
                    />
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge 
                      variant={med.active ? "default" : "secondary"}
                      className="hidden sm:flex"
                    >
                      {med.active ? "Active" : "Inactive"}
                    </Badge>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => navigate(`/medications/${med.id}`)}>
                          <Edit className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleActive(med.id, med.active)}>
                          {med.active ? (
                            <>
                              <Pause className="mr-2 h-4 w-4" />
                              Suspend
                            </>
                          ) : (
                            <>
                              <Play className="mr-2 h-4 w-4" />
                              Activate
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => {
                            setSelectedMedId(med.id);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Medication</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this medication? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MedicationsList;
