import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, Edit, Trash2, Clock, Calendar, Pill } from "lucide-react";
import { MedicationDetailsSkeleton } from "@/components/LoadingSkeletons";

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
        // Load up to 5 images from storage for this medication
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
          .order("time_of_day", { ascending: true });
        if (sErr) throw sErr;
        setSchedules((scheds as Schedule[]) || []);
      } catch (e) {
        toast.error("Failed to load medication");
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    const ok = window.confirm("Delete this medication and related data? This cannot be undone.");
    if (!ok) return;

    try {
      setLoading(true);
      // delete related rows first (dose_logs, medication_schedules), then medication
      await supabase.from("dose_logs").delete().eq("medication_id", id);
      await supabase.from("medication_schedules").delete().eq("medication_id", id);
      const { error: dErr } = await supabase.from("medications").delete().eq("id", id);
      if (dErr) throw dErr;
      toast.success("Medication deleted");
      navigate("/dashboard");
    } catch (e) {
      toast.error("Failed to delete medication");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <MedicationDetailsSkeleton />;
  }

  if (!med) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5 mr-2" /> Back
        </Button>
        <p className="mt-4 text-lg">Medication not found.</p>
      </div>
    );
  }

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const formatDays = (days: number[] | null) => {
    if (!days || days.length === 0) return "Everyday";
    if (days.length === 7) return "Everyday";
    if (days.length === 5 && !days.includes(0) && !days.includes(6)) return "Weekdays";
    if (days.length === 2 && days.includes(0) && days.includes(6)) return "Weekends";
    return days.sort((a, b) => a - b).map(d => dayNames[d]).join(", ");
  };

  const getFrequencyText = () => {
    const activeSchedules = schedules.filter(s => s.active);
    const count = activeSchedules.length;
    if (count === 0) return "No active schedules";
    if (count === 1) return "Once daily";
    if (count === 2) return "Twice daily";
    if (count === 3) return "Three times daily";
    if (count === 4) return "Four times daily";
    return `${count} times daily`;
  };

  return (
    <div className="space-y-4 pb-6">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between p-4">
          <Button onClick={() => navigate(-1)} variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate(`/medications/add?edit=${med.id}`)}
            >
              <Edit className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleDelete}
            >
              <Trash2 className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="px-3 space-y-4">
        {/* Header Card with Image */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6">
            <div className="flex items-start gap-4">
              <div className="shrink-0">
                <img 
                  src={(images[0] || med.image_url || defaultImageForForm(med.form))} 
                  alt={med.name} 
                  className="w-20 h-20 rounded-xl object-cover border-2 border-primary/20 shadow-lg" 
                />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold mb-1 truncate">{med.name}</h1>
                <p className="text-muted-foreground">
                  {med.dosage || ""} {med.form ? `• ${med.form}` : ""}
                </p>
                {med.route_of_administration && (
                  <Badge variant="secondary" className="mt-2">
                    {med.route_of_administration}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {images.length > 1 && (
            <CardContent className="pt-4">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((src, idx) => (
                  <img 
                    key={idx} 
                    src={src} 
                    alt={`${med.name} ${idx+1}`} 
                    className="w-20 h-20 rounded-lg object-cover border shrink-0" 
                  />
                ))}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Medication Info */}
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
            
            {med.instructions && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Instructions</p>
                  <p className="text-sm">{med.instructions}</p>
                </div>
              </>
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

        {/* Refill Reminder */}
        {(med.refill_reminder_threshold !== null || med.pills_remaining !== null) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Pill className="w-5 h-5" />
                Refill Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm font-medium">Pills Remaining</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Current inventory</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{med.pills_remaining ?? 0}</p>
                </div>
              </div>
              
              {med.refill_reminder_threshold !== null && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Refill Alert Threshold</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        You'll be notified when pills fall below this amount
                      </p>
                    </div>
                    <Badge variant="outline" className="ml-2">
                      {med.refill_reminder_threshold} pills
                    </Badge>
                  </div>
                </>
              )}
              
              {med.pills_remaining !== null && med.refill_reminder_threshold !== null && 
               med.pills_remaining <= med.refill_reminder_threshold && (
                <>
                  <Separator />
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
                    <Badge variant="destructive" className="mt-0.5">Low Stock</Badge>
                    <p className="text-sm flex-1">
                      Time to refill! Your medication is running low.
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Schedules */}
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
                <Badge variant="secondary" className="text-sm">
                  {formatDays(schedules[0]?.days_of_week)}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {schedules.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No schedules configured</p>
            ) : (
              <div className="space-y-4">
                {/* Timing Section */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Times</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {schedules.filter(s => s.active).map((s) => (
                      <div key={s.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                        <Clock className="w-4 h-4 text-primary shrink-0" />
                        <span className="font-medium">{s.time_of_day}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Instructions Section */}
                {(schedules.some(s => s.with_food) || schedules.some(s => s.special_instructions)) && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Instructions</p>
                      <div className="space-y-2">
                        {schedules.some(s => s.with_food) && (
                          <div className="flex items-center gap-2 text-sm">
                            <Pill className="w-4 h-4 text-primary" />
                            <span>Take with food</span>
                          </div>
                        )}
                        {schedules.map((s) => s.special_instructions && (
                          <div key={s.id} className="text-sm text-muted-foreground">
                            • {s.special_instructions}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Inactive Schedules */}
                {schedules.filter(s => !s.active).length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Inactive</p>
                      <div className="flex flex-wrap gap-2">
                        {schedules.filter(s => !s.active).map((s) => (
                          <Badge key={s.id} variant="outline" className="text-xs">
                            {s.time_of_day}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MedicationDetails;

