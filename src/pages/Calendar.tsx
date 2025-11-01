import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon, ArrowLeft, Flame, LayoutGrid, List } from "lucide-react";
import { toast } from "sonner";
import { Session } from "@supabase/supabase-js";
import { CalendarSkeleton } from "@/components/LoadingSkeletons";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeekCalendar } from "@/components/WeekCalendar";
import { MonthCalendar } from "@/components/MonthCalendar";
import { DoseCard } from "@/components/DoseCard";

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
  dosage: string;
  form: string | null;
  pills_remaining: number | null;
  image_url: string | null;
  images?: string[];
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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDoses, setSelectedDoses] = useState<SelectedDoseItem[]>([]);
  const [view, setView] = useState<"month" | "week">("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [adherenceStats, setAdherenceStats] = useState({
    taken: 0,
    missed: 0,
    skipped: 0,
    total: 0,
    percentage: 0
  });

  const fetchMedications = useCallback(async () => {
    try {
      const { data: sess } = await supabase.auth.getSession();
      const userId = sess.session?.user?.id;
      if (!userId) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("medications")
        .select("id, name, dosage, form, pills_remaining, image_url")
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

      // Calculate adherence stats for the current month
      const pastLogs = logs?.filter(log => {
        const logDate = new Date(log.scheduled_time);
        logDate.setHours(0, 0, 0, 0);
        return logDate <= today;
      }) || [];

      const taken = pastLogs.filter(log => log.status === 'taken').length;
      const missed = pastLogs.filter(log => log.status === 'missed').length;
      const skipped = pastLogs.filter(log => log.status === 'skipped').length;
      const total = pastLogs.length;
      const percentage = total > 0 ? Math.round((taken / total) * 100) : 0;

      setAdherenceStats({ taken, missed, skipped, total, percentage });

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
          .select("id, name, dosage, form, pills_remaining, image_url, active")
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

  useEffect(() => {
    if (selectedDate) {
      computeDosesForDate(selectedDate);
    }
  }, [selectedDate, computeDosesForDate]);

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setCurrentDate(date);
    computeDosesForDate(date);
  };

  const markAsTaken = async (dose: any) => {
    try {
      const { error } = await supabase.from("dose_logs").insert([
        {
          medication_id: dose.medication.id,
          schedule_id: dose.schedule.id,
          scheduled_time: dose.time.toISOString(),
          taken_at: new Date().toISOString(),
          status: "taken",
        },
      ]);
      if (error) throw error;
      toast.success(`Marked ${dose.medication.name} as taken`);
      if (selectedDate) computeDosesForDate(selectedDate);
      fetchCalendarData();
    } catch (error: unknown) {
      toast.error("Failed to mark dose as taken");
      console.error(error);
    }
  };

  const markAsSkipped = async (dose: any) => {
    try {
      const { error } = await supabase.from("dose_logs").insert([
        {
          medication_id: dose.medication.id,
          schedule_id: dose.schedule.id,
          scheduled_time: dose.time.toISOString(),
          status: "skipped",
        },
      ]);
      if (error) throw error;
      toast.info(`Marked ${dose.medication.name} as skipped`);
      if (selectedDate) computeDosesForDate(selectedDate);
      fetchCalendarData();
    } catch (error: unknown) {
      toast.error("Failed to mark dose as skipped");
      console.error(error);
    }
  };

  const markAsSnoozed = async (dose: any, minutes: number) => {
    try {
      const snoozeUntil = new Date(dose.time);
      snoozeUntil.setMinutes(snoozeUntil.getMinutes() + minutes);
      const { error } = await supabase.from("dose_logs").insert([
        {
          medication_id: dose.medication.id,
          schedule_id: dose.schedule.id,
          scheduled_time: dose.time.toISOString(),
          status: "snoozed",
          snooze_until: snoozeUntil.toISOString(),
        },
      ]);
      if (error) throw error;
      toast.info(`Snoozed ${dose.medication.name} for ${minutes} minutes`);
      if (selectedDate) computeDosesForDate(selectedDate);
      fetchCalendarData();
    } catch (error: unknown) {
      toast.error("Failed to snooze dose");
      console.error(error);
    }
  };

  const handleEditMedication = (medicationId: string) => {
    navigate(`/medications/${medicationId}`);
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

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border shadow-sm sticky top-0 z-50 backdrop-blur-sm bg-card/95 hidden md:block">
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
        {/* Filter and View Selector */}
        <Tabs value={view} onValueChange={(v) => setView(v as "month" | "week")} className="w-full mb-6">
          <TabsList className="grid h-auto w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="week" className="min-w-0 whitespace-normal break-words text-xs sm:text-sm gap-2 justify-center">
              <List className="w-4 h-4" />
              Week
            </TabsTrigger>
            <TabsTrigger value="month" className="min-w-0 whitespace-normal break-words text-xs sm:text-sm gap-2 justify-center">
              <LayoutGrid className="w-4 h-4" />
              Month
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                <div>
                  <p className="text-lg font-bold text-primary">{streak}</p>
                  <p className="text-xs text-muted-foreground">Day Streak</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-sm">
                <div className="text-center">
                  <p className="font-bold text-primary">{adherenceStats.percentage}%</p>
                  <p className="text-xs text-muted-foreground">Rate</p>
                </div>
                
                <div className="flex gap-3 text-xs">
                  <div className="text-center">
                    <p className="font-semibold text-primary">{adherenceStats.taken}</p>
                    <p className="text-muted-foreground">✓</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-destructive">{adherenceStats.missed}</p>
                    <p className="text-muted-foreground">✕</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-warning">{adherenceStats.skipped}</p>
                    <p className="text-muted-foreground">−</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <Card>
            <CardContent className="pt-6">
              {view === "month" && (
                <MonthCalendar
                  selectedDate={selectedDate || new Date()}
                  onDateSelect={handleDateSelect}
                />
              )}

              {view === "week" && (
                <WeekCalendar
                  selectedDate={selectedDate || new Date()}
                  onDateSelect={handleDateSelect}
                />
              )}
            </CardContent>
          </Card>

          <Card className="h-fit sticky top-24">
            <CardHeader>
              <CardTitle>
                {selectedDate 
                  ? selectedDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
                  : "Select a date"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(() => {
                  if (!selectedDate) {
                    return (
                      <Card className="text-center py-8 animate-fade-in">
                        <CardContent>
                          <p className="text-muted-foreground">
                            Select a date to see your schedule
                          </p>
                        </CardContent>
                      </Card>
                    );
                  }

                  const dosesForDay = selectedDoses.map(item => ({
                    medication: item.medication,
                    schedule: item.schedule,
                    nextDoseTime: item.time,
                    status: "upcoming" as const,
                    isTaken: item.status === "taken",
                    isSkipped: item.status === "skipped",
                    isSnoozed: item.status === "snoozed",
                  }));

                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const isPastDate = selectedDate < today;

                  if (dosesForDay.length === 0) {
                    return (
                      <Card className="text-center py-8 animate-fade-in">
                        <CardContent>
                          <p className="text-muted-foreground">
                            {isPastDate 
                              ? "No medications were scheduled for this day"
                              : "No medications scheduled for this day"
                            }
                          </p>
                        </CardContent>
                      </Card>
                    );
                  }
                  
                  return (
                    <div className="grid gap-3 sm:gap-4">
                      {dosesForDay.map((dose, idx) => (
                        <div 
                          key={`${dose.schedule.id}-${idx}`}
                          className="animate-slide-in-right"
                          style={{ animationDelay: `${idx * 0.1}s` }}
                        >
                          <DoseCard
                            dose={dose}
                            isPastDate={isPastDate}
                            onMarkTaken={markAsTaken}
                            onMarkSkipped={markAsSkipped}
                            onMarkSnoozed={markAsSnoozed}
                            onEdit={handleEditMedication}
                            onOpenDetails={(id) => navigate(`/medications/${id}`)}
                          />
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

    </div>
  );
};

export default Calendar;
