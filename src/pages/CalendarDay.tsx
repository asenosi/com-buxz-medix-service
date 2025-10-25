import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar as CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Medication = { id: string; name: string; image_url: string | null };
type Schedule = { id: string; medication_id: string; time_of_day: string; with_food: boolean; special_instructions: string | null; days_of_week: number[] | null; active: boolean };
type DoseItem = { medication: Medication; schedule: Schedule; time: Date; status: "taken" | "skipped" | "snoozed" | "pending" };

const CalendarDay = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const dateStr = params.get("date");
  const date = useMemo(() => (dateStr ? new Date(dateStr + "T00:00:00") : new Date()), [dateStr]);

  const [items, setItems] = useState<DoseItem[]>([]);

  const load = useCallback(async () => {
    try {
      const { data: meds } = await supabase
        .from("medications")
        .select("id, name, image_url, active")
        .eq("active", true);
      const medIds = (meds || []).map(m => m.id);
      if (medIds.length === 0) { setItems([]); return; }

      const { data: schedules } = await supabase
        .from("medication_schedules")
        .select("id, medication_id, time_of_day, with_food, special_instructions, days_of_week, active")
        .in("medication_id", medIds)
        .eq("active", true);

      const start = new Date(date); start.setHours(0,0,0,0);
      const end = new Date(date); end.setHours(23,59,59,999);
      const { data: logs } = await supabase
        .from("dose_logs")
        .select("*")
        .gte("scheduled_time", start.toISOString())
        .lte("scheduled_time", end.toISOString());

      const dow = date.getDay();
      const list: DoseItem[] = [];
      (schedules || []).forEach((s: Schedule) => {
        if (s.days_of_week && !s.days_of_week.includes(dow)) return;
        const [h, m] = s.time_of_day.split(":").map(Number);
        const t = new Date(date); t.setHours(h, m, 0, 0);
        const log = logs?.find(l => l.schedule_id === s.id && new Date(l.scheduled_time).getHours() === h && new Date(l.scheduled_time).getMinutes() === m);
        const med = (meds || []).find(mm => mm.id === s.medication_id)!;
        list.push({ medication: med, schedule: s, time: t, status: (log?.status as any) || "pending" });
      });
      list.sort((a,b)=> a.time.getTime() - b.time.getTime());
      setItems(list);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load schedule for the day");
    }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Button onClick={() => navigate(-1)} variant="ghost">
              <ArrowLeft className="w-5 h-5 mr-2" /> Back
            </Button>
            <div className="flex items-center gap-3">
              <div className="bg-primary rounded-full p-2">
                <CalendarIcon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold">{date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</h1>
            </div>
            <span />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {items.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">No medications scheduled for this day.</CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {items.map((it, idx) => (
              <Card key={`${it.schedule.id}-${idx}`} className="hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    {it.medication.image_url && (
                      <img src={it.medication.image_url} alt={it.medication.name} className="w-12 h-12 rounded object-cover" />
                    )}
                    <div className="flex-1">
                      <CardTitle className="text-lg">{it.medication.name}</CardTitle>
                      <div className="text-sm text-muted-foreground">{it.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                    </div>
                    <Badge
                      variant={it.status === 'taken' ? 'success' : it.status === 'snoozed' ? 'warning' : it.status === 'skipped' ? 'destructive' : 'secondary'}
                      className="capitalize"
                    >
                      {it.status}
                    </Badge>
                  </div>
                </CardHeader>
                {it.schedule.special_instructions && (
                  <CardContent>
                    <div className="text-sm text-muted-foreground">{it.schedule.special_instructions}</div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default CalendarDay;
