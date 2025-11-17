import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, Edit, Trash2, Clock, Calendar, Pill, X, Package, AlertCircle } from "lucide-react";
import { MedicationDetailsSkeleton } from "@/components/LoadingSkeletons";
import { MedicationImageCarousel } from "@/components/MedicationImageCarousel";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { truncateText } from "@/lib/utils";

type Medication = {
  id: string;
  name: string;
  dosage: string | null;
  form: string | null;
  route_of_administration: string | null;
  reason_for_taking: string | null;
  instructions: string | null;
  total_pills: number | null;
  pills_remaining: number | null;
  refill_reminder_threshold: number | null;
  with_food_timing: string | null;
  start_date: string | null;
  end_date: string | null;
  medication_color: string | null;
  medication_icon: string | null;
  image_url: string | null;
  image_urls?: string[] | null;
  user_id: string;
};

type Schedule = {
  id: string;
  time_of_day: string;
  days_of_week: number[] | null;
  with_food: boolean | null;
  special_instructions: string | null;
  active: boolean;
};

const MedicationDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [med, setMed] = useState<Medication | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [showFullImage, setShowFullImage] = useState(false);
  
  const defaultImageForForm = (form?: string | null) => {
    if (!form) return "";
    const f = (form || "").toLowerCase();
    if (f.includes("pill")) return "/images/meds/pill.svg";
    if (f.includes("inhaler")) return "/images/meds/inhaler.svg";
    if (f.includes("cream")) return "/images/meds/cream.svg";
    if (f.includes("drop") || f.includes("solution")) return "/images/meds/drop.svg";
    if (f.includes("injection") || f.includes("syringe")) return "/images/meds/syringe.svg";
    if (f.includes("spray")) return "/images/meds/spray.svg";
    if (f.includes("powder") || f.includes("strip") || f.includes("insert") || f.includes("other") || f.includes("stick")) return "/images/meds/pill.svg";
    return "";
  };

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const { data: m, error: mErr } = await supabase
          .from("medications")
          .select("*")
          .eq("id", id)
          .single();
        if (mErr) throw mErr;
        setMed(m as Medication);
        
        try {
          const base = `${(m as Medication).user_id}/${(m as Medication).id}`;
          const { data: files } = await supabase.storage
            .from("medication-images")
            .list(base, { limit: 10, sortBy: { column: "updated_at", order: "desc" } });
          const names = (files || []).slice(0, 10).map(f => `${base}/${f.name}`);
          const urls = names.map(n => supabase.storage.from("medication-images").getPublicUrl(n).data.publicUrl);
          setImages(urls.slice(0, 5));
        } catch {
          setImages([]);
        }

        const { data: scheds, error: sErr } = await supabase
          .from("medication_schedules")
          .select("*")
          .eq("medication_id", id)
          .order("time_of_day");
        if (sErr) throw sErr;
        setSchedules(scheds as Schedule[]);
      } catch (error) {
        console.error("Error loading medication:", error);
        toast.error("Failed to load medication details");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleDelete = async () => {
    if (!med) return;
    if (!confirm(`Are you sure you want to delete ${med.name}?`)) return;

    try {
      const { error } = await supabase
        .from("medications")
        .delete()
        .eq("id", med.id);

      if (error) throw error;

      toast.success(`${med.name} deleted successfully`);
      navigate("/medications");
    } catch (error) {
      console.error("Error deleting medication:", error);
      toast.error("Failed to delete medication");
    }
  };

  const formatDays = (days: number[] | null) => {
    if (!days || days.length === 0) return "No specific days";
    if (days.length === 7) return "Every day";
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days.map(d => dayNames[d]).join(", ");
  };

  const getFrequencyText = () => {
    const activeSchedules = schedules.filter(s => s.active);
    if (activeSchedules.length === 0) return "No active schedules";
    if (activeSchedules.length === 1) return "Once daily";
    if (activeSchedules.length === 2) return "Twice daily";
    if (activeSchedules.length === 3) return "3 times daily";
    return `${activeSchedules.length} times daily`;
  };

  const handleRefillComplete = () => {
    if (id) {
      const load = async () => {
        const { data: m, error: mErr } = await supabase
          .from("medications")
          .select("*")
          .eq("id", id)
          .single();
        if (!mErr && m) {
          setMed(m as Medication);
        }
      };
      load();
    }
  };

  if (loading) return <MedicationDetailsSkeleton />;
  if (!med) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">Medication not found</p>
        <Button onClick={() => navigate("/medications")} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Medications
        </Button>
      </div>
    );
  }

  const needsRefill = med.pills_remaining !== null && 
    med.refill_reminder_threshold !== null && 
    med.pills_remaining <= med.refill_reminder_threshold;

  return (
    <div className="pb-24 px-4 space-y-4">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-4 -mx-4 px-4 border-b">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/medications")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(`/medications/${med.id}/edit`)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold break-words">{truncateText(med.name)}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-muted-foreground">
            {med.dosage || ""} {med.form ? `• ${med.form}` : ""}
          </p>
          {med.route_of_administration && (
            <Badge variant="secondary">
              {med.route_of_administration}
            </Badge>
          )}
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6">
          <div className="flex items-center justify-center">
            <div className="w-48 h-48 rounded-xl overflow-hidden border-2 border-primary/20 shadow-lg">
              <MedicationImageCarousel
                images={[...images, ...(med.image_urls || [])].filter((url, index, self) => url && self.indexOf(url) === index)}
                fallbackImage={med.image_url || defaultImageForForm(med.form)}
                alt={med.name}
                className="w-48 h-48"
                imageClassName="rounded-xl"
                onImageClick={() => setShowFullImage(true)}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Medication Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {med.reason_for_taking && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Reason</p>
              <p className="text-sm">{med.reason_for_taking}</p>
            </div>
          )}

          {med.with_food_timing && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Food Timing</p>
                <p className="text-sm">{med.with_food_timing}</p>
              </div>
            </>
          )}

          <Separator />
          
          <div className="grid grid-cols-2 gap-3">
            {med.total_pills !== null && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Pills</p>
                <p className="text-sm font-medium">{med.total_pills}</p>
              </div>
            )}
            {med.pills_remaining !== null && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Remaining</p>
                <p className="text-sm font-medium">{med.pills_remaining}</p>
              </div>
            )}
            {med.start_date && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Start Date</p>
                <p className="text-sm font-medium">{new Date(med.start_date).toLocaleDateString()}</p>
              </div>
            )}
            {med.end_date && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">End Date</p>
                <p className="text-sm font-medium">{new Date(med.end_date).toLocaleDateString()}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Schedule
              </CardTitle>
              <CardDescription className="mt-1">{getFrequencyText()}</CardDescription>
            </div>
            {schedules.length > 0 && (
              <Badge variant="outline">
                <Calendar className="w-3 h-3 mr-1" />
                {schedules.length} time{schedules.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {schedules.filter(s => s.active).map((schedule, idx) => (
            <div key={schedule.id} className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Pill className="h-4 w-4 text-primary" />
                  <span className="font-medium">
                    {new Date(`2000-01-01T${schedule.time_of_day}`).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {formatDays(schedule.days_of_week)}
                </Badge>
              </div>
              {schedule.special_instructions && (
                <p className="text-sm text-muted-foreground mt-2">
                  {schedule.special_instructions}
                </p>
              )}
            </div>
          ))}
          
          {schedules.filter(s => !s.active).length > 0 && (
            <>
              <Separator className="my-4" />
              <p className="text-sm text-muted-foreground font-medium mb-2">Inactive Schedules</p>
              {schedules.filter(s => !s.active).map(schedule => (
                <div key={schedule.id} className="border rounded-lg p-3 opacity-60">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {new Date(`2000-01-01T${schedule.time_of_day}`).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                    <Badge variant="outline" className="text-xs">Inactive</Badge>
                  </div>
                </div>
              ))}
            </>
          )}
          
          {schedules.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No schedules configured
            </p>
          )}
        </CardContent>
      </Card>

      {med.pills_remaining !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="w-5 h-5" />
              Refill Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Track refills, view history, and get predictions for when you'll need to refill {med.name}.
            </p>
            <Button 
              onClick={() => navigate(`/medications/${med.id}/refills`)}
              className="w-full"
            >
              <Package className="mr-2 h-4 w-4" />
              View Refill Details
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={showFullImage} onOpenChange={setShowFullImage}>
        <DialogContent className="max-w-3xl p-0">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-background/80 hover:bg-background"
              onClick={() => setShowFullImage(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            <MedicationImageCarousel
              images={[...images, ...(med.image_urls || [])].filter((url, index, self) => url && self.indexOf(url) === index)}
              fallbackImage={med.image_url || defaultImageForForm(med.form)}
              alt={med.name}
              className="w-full h-[70vh]"
              imageClassName="rounded-lg"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MedicationDetails;
