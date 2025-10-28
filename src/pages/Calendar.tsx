import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon, ArrowLeft, Flame } from "lucide-react";
import { toast } from "sonner";
import { Session } from "@supabase/supabase-js";
import { Badge } from "@/components/ui/badge";
import { DayDetailsDialog } from "@/components/DayDetailsDialog";
import { CalendarSkeleton } from "@/components/LoadingSkeletons";

interface DoseLog {
  id: string;
  medication_id: string;
  scheduled_time: string;
  taken_at: string | null;
  status: string;
}

interface Medication {
  id: string;
  name: string;
  image_url: string | null;
}

interface Schedule {
  id: string;
  medication_id: string;
  time_of_day: string;
  with_food: boolean;
  special_instructions: string | null;
  days_of_week: number[] | null;
  active: boolean;
}

type DoseStatus = "pending" | "taken" | "skipped" | "snoozed" | "missed";

interface SelectedDoseItem {
  medication: Medication;
  schedule: Schedule;
  time: Date;
  status: DoseStatus;
}

interface CalendarDay {
  date: Date;
  logs: DoseLog[];
  hasTaken: boolean;
  hasSkipped: boolean;
  hasSnoozed: boolean;
}

const Calendar = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [selectedMedication, setSelectedMedication] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [isDayDialogOpen, setIsDayDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDoses, setSelectedDoses] = useState<SelectedDoseItem[]>([]);

  const fetchMedications = useCallback(async () => {
    try {
      const { data: sess } = await supabase.auth.getSession();
      const userId = sess.session?.user?.id;
      if (!userId) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("medications")
        .select("id, name, image_url")
        .eq("user_id", userId)
        .eq("active", true)
        .order("name");

      if (error) throw error;
      setMedications(data || []);
    } catch (error: unknown) {
      toast.error("Failed to load medications");
      console.error(error);
    }
  }, []);

  const calculateStreak = useCallback(async () => {
    try {
      let query = supabase
        .from("dose_logs")
        .select("*")
        .eq("status", "taken")
        .order("taken_at", { ascending: false });

      if (selectedMedication) {
        query = query.eq("medication_id", selectedMedication);
      }

      const { data: allLogs, error } = await query;

      if (error) throw error;

      if (allLogs && allLogs.length > 0) {
        let currentStreak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        for (let i = 0; i < 365; i++) {
          const checkDate = new Date(today);
          checkDate.setDate(today.getDate() - i);
          checkDate.setHours(0, 0, 0, 0);
          
          const nextDay = new Date(checkDate);
          nextDay.setDate(checkDate.getDate() + 1);
          
          const hasLog = allLogs.some(log => {
            const logDate = new Date(log.taken_at || log.scheduled_time);
            return logDate >= checkDate && logDate < nextDay;
          });
          
          if (hasLog) {
            currentStreak++;
          } else if (i > 0) {
            break;
          }
        }
        setStreak(currentStreak);
      } else {
        setStreak(0);
      }
    } catch (error: unknown) {
      console.error("Failed to calculate streak:", error);
    }
  }, [selectedMedication]);

  const fetchCalendarData = useCallback(async () => {
    try {
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      let query = supabase
        .from("dose_logs")
        .select("*")
        .gte("scheduled_time", startOfMonth.toISOString())
        .lte("scheduled_time", endOfMonth.toISOString());

      if (selectedMedication) {
        query = query.eq("medication_id", selectedMedication);
      }

      const { data: logs, error } = await query;

      if (error) throw error;

      // Generate calendar days
      const days: CalendarDay[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let d = new Date(startOfMonth); d <= endOfMonth; d.setDate(d.getDate() + 1)) {
        const dayStart = new Date(d);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(d);
        dayEnd.setHours(23, 59, 59, 999);

        const dayLogs = logs?.filter(log => {
          const logDate = new Date(log.scheduled_time);
          return logDate >= dayStart && logDate <= dayEnd;
        }) || [];

        days.push({
          date: new Date(d),
          logs: dayLogs,
          hasTaken: dayLogs.some(log => log.status === 'taken'),
          hasSkipped: dayLogs.some(log => log.status === 'skipped'),
          hasSnoozed: dayLogs.some(log => log.status === 'snoozed'),
        });
      }

      setCalendarDays(days);

      // Calculate streak
      calculateStreak();
    } catch (error: unknown) {
      toast.error("Failed to load calendar data");
      console.error(error);
    }
  }, [currentMonth, selectedMedication, calculateStreak]);

  const computeDosesForDate = useCallback(async (date: Date) => {
    try {
      let meds = medications;
      if (meds.length === 0) {
        const { data: sess } = await supabase.auth.getSession();
        const userId = sess.session?.user?.id;
        const { data: medsData } = await supabase
          .from("medications")
          .select("id, name, image_url, active")
          .eq("user_id", userId!)
          .eq("active", true);
        meds = medsData || [];
        setMedications(meds);
      }

      const medIds = meds.map(m => m.id);
      if (medIds.length === 0) { setSelectedDoses([]); return; }

      const { data: schedulesData } = await supabase
        .from("medication_schedules")
        .select("id, medication_id, time_of_day, with_food, special_instructions, days_of_week, active")
        .in("medication_id", medIds)
        .eq("active", true);

      const startOfDay = new Date(date); startOfDay.setHours(0,0,0,0);
      const endOfDay = new Date(date); endOfDay.setHours(23,59,59,999);

      const { data: logsData } = await supabase
        .from("dose_logs")
        .select("*")
        .gte("scheduled_time", startOfDay.toISOString())
        .lte("scheduled_time", endOfDay.toISOString());

      const dayOfWeek = date.getDay();
      const items: SelectedDoseItem[] = [];
      const toStatus = (v?: string): DoseStatus => {
        const allowed: DoseStatus[] = ["pending", "taken", "skipped", "snoozed", "missed"];
        return allowed.includes((v as DoseStatus)) ? (v as DoseStatus) : "pending";
      };

      const parseTime = (t?: unknown): [number, number] | null => {
        if (typeof t !== "string") return null;
        const parts = t.split(":");
        if (parts.length < 2) return null;
        const hours = Number(parts[0]);
        const minutes = Number(parts[1]);
        if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
        return [hours, minutes];
      };

      (schedulesData || []).forEach((s: Schedule) => {
        if (selectedMedication && s.medication_id !== selectedMedication) return;
        if (s.days_of_week && !s.days_of_week.includes(dayOfWeek)) return;
        const parsed = parseTime(s.time_of_day);
        if (!parsed) return;
        const [h, m] = parsed;
        const t = new Date(date); t.setHours(h, m, 0, 0);
        const log = logsData?.find(l => l.schedule_id === s.id && new Date(l.scheduled_time).getHours() === h && new Date(l.scheduled_time).getMinutes() === m);
        const med = meds.find(mm => mm.id === s.medication_id)!;
        items.push({ medication: med, schedule: s, time: t, status: toStatus(log?.status) });
      });

      items.sort((a,b) => a.time.getTime() - b.time.getTime());
      setSelectedDoses(items);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load day schedule");
    }
  }, [medications, selectedMedication]);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          setSession(session);
          if (!session) {
            navigate("/auth");
          }
        }
      );

      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      
      if (!currentSession) {
        navigate("/auth");
      } else {
        await fetchMedications();
        await fetchCalendarData();
      }

      setLoading(false);

      return () => subscription.unsubscribe();
    };

    initAuth();
  }, [navigate, fetchMedications, fetchCalendarData]);

  useEffect(() => {
    if (session) {
      fetchCalendarData();
    }
  }, [currentMonth, selectedMedication, session, fetchCalendarData]);

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const getDayColor = (day: CalendarDay) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayDate = new Date(day.date);
    dayDate.setHours(0, 0, 0, 0);

    if (dayDate > today) return 'bg-muted text-muted-foreground';
    if (day.hasTaken) return 'bg-primary text-primary-foreground';
    if (day.hasSkipped || day.hasSnoozed) return 'bg-warning text-warning-foreground';
    if (day.logs.length > 0) return 'bg-destructive text-destructive-foreground';
    return 'bg-card text-card-foreground border border-border';
  };

  const handleDayClick = (day: CalendarDay) => {
    const date = day.date;
    const isMobile = typeof window !== "undefined" && window.innerWidth < 1024;
    if (isMobile) {
      const y = date.getFullYear();
      const m = String(date.getMonth()+1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      navigate(`/calendar/day?date=${y}-${m}-${d}`);
      return;
    }
    setSelectedDay(day);
    setSelectedDate(date);
    computeDosesForDate(date);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-border shadow-sm sticky top-0 z-50 backdrop-blur-sm bg-card/95">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6" />
        </header>
        <CalendarSkeleton />
      </div>
    );
  }

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const emptyDays = Array(firstDayOfMonth).fill(null);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border shadow-sm sticky top-0 z-50 backdrop-blur-sm bg-card/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <Button onClick={() => navigate("/dashboard")} variant="ghost" size="lg" className="mb-4">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-3">
            <div className="bg-primary rounded-full p-3">
              <CalendarIcon className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Medication Calendar</h1>
              <p className="text-lg text-muted-foreground">Track your intake history and streak</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="mb-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-4">
              <Flame className="w-12 h-12 text-orange-500 animate-pulse" />
              <div className="text-center">
                <p className="text-4xl font-bold text-primary">{streak}</p>
                <p className="text-lg text-muted-foreground">Day Streak</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filter by Medication</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedMedication === null ? "default" : "outline"}
                onClick={() => setSelectedMedication(null)}
              >
                All Medications
              </Button>
              {medications.map(med => (
                <Button
                  key={med.id}
                  variant={selectedMedication === med.id ? "default" : "outline"}
                  onClick={() => setSelectedMedication(med.id)}
                  className="flex items-center gap-2"
                >
                  {med.image_url && (
                    <img 
                      src={med.image_url} 
                      alt={med.name}
                      className="w-5 h-5 rounded object-cover"
                    />
                  )}
                  {med.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button onClick={previousMonth} variant="outline">
                Previous
              </Button>
              <CardTitle className="text-2xl">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </CardTitle>
              <Button onClick={nextMonth} variant="outline">
                Next
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex justify-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-primary rounded"></div>
                <span className="text-sm">Taken</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-warning rounded"></div>
                <span className="text-sm">Skipped/Snoozed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-destructive rounded"></div>
                <span className="text-sm">Missed</span>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                <div key={day} className="text-center font-semibold text-sm p-2">
                  {day}
                </div>
              ))}
              
              {emptyDays.map((_, idx) => (
                <div key={`empty-${idx}`} className="aspect-square"></div>
              ))}
              
              {calendarDays.map((day, idx) => (
                <button
                  key={idx}
                  onClick={() => handleDayClick(day)}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center p-2 transition-all hover:scale-105 cursor-pointer ${getDayColor(day)}`}
                >
                  <div className="text-lg font-semibold">{day.date.getDate()}</div>
                  {day.logs.length > 0 && (
                    <Badge variant="secondary" className="text-xs mt-1">
                      {day.logs.length}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="hidden lg:block h-fit sticky top-24">
          <CardHeader>
            <CardTitle>{selectedDate ? selectedDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) : "Pick a date"}</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedDate ? (
              <p className="text-muted-foreground">Select a date to see your schedule.</p>
            ) : selectedDoses.length === 0 ? (
              <p className="text-muted-foreground">No medications scheduled.</p>
            ) : (
              <div className="space-y-3">
                {selectedDoses.map((it, idx) => (
                  <div key={`${it.schedule.id}-${idx}`} className="p-3 border rounded-lg hover:shadow-sm transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {it.medication.image_url && <img src={it.medication.image_url} alt={it.medication.name} className="w-10 h-10 rounded object-cover" />}
                        <div>
                          <div className="font-medium">{it.medication.name}</div>
                          <div className="text-sm text-muted-foreground">{it.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                        </div>
                      </div>
                      <Badge
                        variant={it.status === 'taken' ? 'success' : it.status === 'snoozed' ? 'warning' : it.status === 'skipped' ? 'destructive' : 'secondary'}
                        className="capitalize"
                      >
                        {it.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </main>

      <DayDetailsDialog
        open={isDayDialogOpen}
        onOpenChange={setIsDayDialogOpen}
        date={selectedDay?.date || null}
        logs={selectedDay?.logs || []}
        medications={medications}
      />
    </div>
  );
};

export default Calendar;
