import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search as SearchIcon, ArrowLeft, Calendar as CalendarIcon, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Medication = { id: string; name: string; dosage?: string | null; image_url?: string | null; active?: boolean };
type Schedule = { id: string; medication_id: string; time_of_day: string; days_of_week: number[] | null; active: boolean };
type DoseLog = { id: string; medication_id: string; schedule_id: string; scheduled_time: string; status: string };

type Status = "all" | "pending" | "taken" | "skipped" | "snoozed" | "missed";
type Sort = "latest" | "earliest" | "name";
type Frequency = "any" | "once" | "twice" | "thrice" | "custom";

type Result = {
  medication: Medication;
  schedules: Schedule[];
  logs: DoseLog[];
  latestTime?: number;
};

const Search = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [sort, setSort] = useState<Sort>("latest");
  const [freq, setFreq] = useState<Frequency>("any");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [medications, setMedications] = useState<Medication[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [logs, setLogs] = useState<DoseLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: meds } = await supabase
        .from("medications")
        .select("id, name, dosage, image_url, active")
        .eq("active", true)
        .order("name");

      const medIds = (meds || []).map(m => m.id);
      const { data: scheds } = await supabase
        .from("medication_schedules")
        .select("id, medication_id, time_of_day, days_of_week, active")
        .in("medication_id", medIds)
        .eq("active", true);

      // Date window for logs
      const now = new Date();
      const defaultFrom = new Date(now); defaultFrom.setDate(now.getDate() - 30);
      const fromISO = from ? new Date(from + "T00:00:00").toISOString() : defaultFrom.toISOString();
      const toISO = to ? new Date(to + "T23:59:59").toISOString() : new Date().toISOString();

      const { data: fetchedLogs } = await supabase
        .from("dose_logs")
        .select("id, medication_id, schedule_id, scheduled_time, status")
        .gte("scheduled_time", fromISO)
        .lte("scheduled_time", toISO);

      setMedications(meds || []);
      setSchedules(scheds || []);
      setLogs(fetchedLogs || []);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { loadData(); }, [loadData]);

  const results: Result[] = useMemo(() => {
    const grouped: Record<string, Result> = {};
    medications.forEach(m => {
      grouped[m.id] = { medication: m, schedules: [], logs: [] };
    });
    schedules.forEach(s => {
      const g = grouped[s.medication_id];
      if (g) g.schedules.push(s);
    });
    logs.forEach(l => {
      const g = grouped[l.medication_id];
      if (g) g.logs.push(l);
    });

    let list = Object.values(grouped);

    // Filter: query by name
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(r => r.medication.name.toLowerCase().includes(q));
    }

    // Filter: status
    if (status !== "all") {
      list = list.filter(r => r.logs.some(l => l.status === status));
    }

    // Filter: frequency
    if (freq !== "any") {
      list = list.filter(r => {
        const count = r.schedules.length;
        if (freq === "once") return count === 1;
        if (freq === "twice") return count === 2;
        if (freq === "thrice") return count === 3;
        return count >= 4; // custom
      });
    }

    // Compute latestTime for sorting
    list.forEach(r => {
      const latest = r.logs.reduce((acc, l) => Math.max(acc, new Date(l.scheduled_time).getTime()), 0);
      r.latestTime = latest || 0;
    });

    // Sort
    if (sort === "name") list.sort((a,b) => a.medication.name.localeCompare(b.medication.name));
    else if (sort === "earliest") list.sort((a,b) => (a.latestTime||0) - (b.latestTime||0));
    else list.sort((a,b) => (b.latestTime||0) - (a.latestTime||0));

    return list;
  }, [medications, schedules, logs, query, status, sort, freq]);

  const frequencyLabel = (count: number) => {
    if (count === 1) return "Once daily";
    if (count === 2) return "Twice daily";
    if (count === 3) return "Thrice daily";
    if (count >= 4) return `${count} times / day`;
    return "No schedule";
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5 mr-2" /> Back
            </Button>
            <div className="flex items-center gap-3">
              <div className="bg-primary rounded-full p-2">
                <CalendarIcon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold">Search</h1>
            </div>
            <span />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  placeholder="Search medications, logs…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-10 h-12 rounded-xl"
                />
              </div>
              <Select value={status} onValueChange={(v: Status) => setStatus(v)}>
                <SelectTrigger className="h-12 rounded-xl w-full lg:w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="taken">Taken</SelectItem>
                  <SelectItem value="snoozed">Snoozed</SelectItem>
                  <SelectItem value="skipped">Skipped</SelectItem>
                  <SelectItem value="missed">Missed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={freq} onValueChange={(v: Frequency) => setFreq(v)}>
                <SelectTrigger className="h-12 rounded-xl w-full lg:w-[160px]"><SelectValue placeholder="Frequency" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any frequency</SelectItem>
                  <SelectItem value="once">Once daily</SelectItem>
                  <SelectItem value="twice">Twice daily</SelectItem>
                  <SelectItem value="thrice">Thrice daily</SelectItem>
                  <SelectItem value="custom">4+ times</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={(v: Sort) => setSort(v)}>
                <SelectTrigger className="h-12 rounded-xl w-full lg:w-[140px]"><SelectValue placeholder="Sort" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">Latest</SelectItem>
                  <SelectItem value="earliest">Earliest</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="text-xs text-muted-foreground">From</label>
                <Input type="date" value={from} onChange={(e)=>setFrom(e.target.value)} className="h-10 rounded-lg" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">To</label>
                <Input type="date" value={to} onChange={(e)=>setTo(e.target.value)} className="h-10 rounded-lg" />
              </div>
              <div className="hidden lg:flex items-end">
                <Button variant="outline" className="w-full" onClick={loadData}>
                  <Filter className="w-4 h-4 mr-2" /> Apply
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">Loading…</CardContent></Card>
        ) : results.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="text-6xl mb-3">🔎</div>
              <CardTitle className="mb-1">No results</CardTitle>
              <CardDescription>Try adjusting your filters or search terms.</CardDescription>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((r) => (
              <Card key={r.medication.id} className="hover:shadow-lg transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    {r.medication.image_url && (
                      <img src={r.medication.image_url} alt={r.medication.name} className="w-12 h-12 rounded object-cover" />
                    )}
                    <div className="flex-1">
                      <CardTitle className="text-lg">{r.medication.name}</CardTitle>
                      {r.medication.dosage && <CardDescription>{r.medication.dosage}</CardDescription>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  <div className="text-sm text-muted-foreground">{frequencyLabel(r.schedules.length)}</div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="success">Taken {r.logs.filter(l=>l.status==='taken').length}</Badge>
                    <Badge variant="warning">Snoozed {r.logs.filter(l=>l.status==='snoozed').length}</Badge>
                    <Badge variant="destructive">Skipped {r.logs.filter(l=>l.status==='skipped').length}</Badge>
                    <Badge variant="outline">Total {r.logs.length}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Search;

