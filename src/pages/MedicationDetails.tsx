import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Edit, Trash2, Pill } from "lucide-react";

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Pill className="w-16 h-16 animate-pulse text-primary mx-auto mb-4" />
          <p className="text-xl text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
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

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <Button onClick={() => navigate(-1)} variant="ghost" size="lg">
              <ArrowLeft className="w-5 h-5 mr-2" /> Back
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate(`/medications?edit=${med.id}`)}>
                <Edit className="w-4 h-4 mr-2" /> Edit
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {images.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Images</CardTitle>
              <CardDescription>Medication photos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {images.map((src, idx) => (
                  <img key={idx} src={src} alt={`${med.name} ${idx+1}`} className="w-28 h-28 rounded-lg object-cover border" />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              {(images[0] || med.image_url) && (
                <img src={images[0] || med.image_url || ''} alt={med.name} className="w-16 h-16 rounded-lg object-cover border" />
              )}
              <div>
                <CardTitle className="text-2xl">{med.name}</CardTitle>
                <CardDescription>
                  {med.dosage || ""} {med.form ? `- ${med.form}` : ""}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            <div><span className="text-muted-foreground">Route:</span> {med.route_of_administration || "—"}</div>
            <div><span className="text-muted-foreground">Reason:</span> {med.reason_for_taking || "—"}</div>
            <div><span className="text-muted-foreground">Instructions:</span> {med.instructions || "—"}</div>
            <div><span className="text-muted-foreground">With food timing:</span> {med.with_food_timing || "—"}</div>
            <div><span className="text-muted-foreground">Total pills:</span> {med.total_pills ?? "—"}</div>
            <div><span className="text-muted-foreground">Remaining:</span> {med.pills_remaining ?? "—"}</div>
            <div><span className="text-muted-foreground">Refill threshold:</span> {med.refill_reminder_threshold ?? "—"}</div>
            <div><span className="text-muted-foreground">Start date:</span> {med.start_date ?? "—"}</div>
            <div><span className="text-muted-foreground">End date:</span> {med.end_date ?? "—"}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schedules</CardTitle>
            <CardDescription>Recurring times and notes</CardDescription>
          </CardHeader>
          <CardContent>
            {schedules.length === 0 ? (
              <p className="text-muted-foreground">No schedules</p>
            ) : (
              <div className="grid gap-2">
                {schedules.map((s) => (
                  <div key={s.id} className="flex flex-wrap justify-between items-center border rounded-md px-3 py-2">
                    <div className="font-medium">{s.time_of_day}</div>
                    <div className="text-sm text-muted-foreground">
                      {s.days_of_week ? `Days: ${s.days_of_week.join(",")}` : "Any day"}
                      {s.with_food ? " · With food" : ""}
                      {s.special_instructions ? ` · ${s.special_instructions}` : ""}
                    </div>
                    <div className="text-sm">{s.active ? "Active" : "Inactive"}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default MedicationDetails;

