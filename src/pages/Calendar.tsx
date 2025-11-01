import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon, ArrowLeft, Flame, Filter, LayoutGrid, List, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Session } from "@supabase/supabase-js";
import { Badge } from "@/components/ui/badge";
import { DayDetailsDialog } from "@/components/DayDetailsDialog";
import { CalendarSkeleton } from "@/components/LoadingSkeletons";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [currentDate, setCurrentDate] = useState(new Date());

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

  useEffect(() => {
    if (view === 'day') {
      computeDosesForDate(currentDate);
    }
  }, [view, currentDate, computeDosesForDate]);

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
    const isToday = dayDate.getTime() === today.getTime();

    if (isToday) return 'bg-primary text-primary-foreground hover:bg-primary/90';
    if (dayDate > today) return 'bg-background text-muted-foreground hover:bg-muted/50';
    if (day.hasTaken) return 'bg-primary/20 text-foreground hover:bg-primary/30';
    if (day.hasSkipped || day.hasSnoozed) return 'bg-warning/20 text-foreground hover:bg-warning/30';
    if (day.logs.length > 0) return 'bg-destructive/20 text-foreground hover:bg-destructive/30';
    return 'bg-background text-foreground hover:bg-muted/50';
  };

  const getWeekDays = () => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - day);
    
    const days: CalendarDay[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dayData = calendarDays.find(d => 
        d.date.toDateString() === date.toDateString()
      );
      if (dayData) {
        days.push(dayData);
      } else {
        days.push({ date, logs: [], hasTaken: false, hasSkipped: false, hasSnoozed: false });
      }
    }
    return days;
  };

  const navigateView = (direction: 'prev' | 'next') => {
    if (view === 'month') {
      if (direction === 'prev') previousMonth();
      else nextMonth();
    } else if (view === 'week') {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + (direction === 'prev' ? -7 : 7));
      setCurrentDate(newDate);
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + (direction === 'prev' ? -1 : 1));
      setCurrentDate(newDate);
    }
  };

  const getViewTitle = () => {
    if (view === 'month') {
      return `${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;
    } else if (view === 'week') {
      const weekDays = getWeekDays();
      if (weekDays.length > 0) {
        const first = weekDays[0].date;
        const last = weekDays[6].date;
        return `${monthNames[first.getMonth()]} ${first.getDate()} - ${
          first.getMonth() !== last.getMonth() ? monthNames[last.getMonth()] + ' ' : ''
        }${last.getDate()}, ${last.getFullYear()}`;
      }
    } else {
      return currentDate.toLocaleDateString(undefined, { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
      });
    }
    return '';
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
        {/* Filter and View Selector */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex items-center gap-2 flex-1">
            <Filter className="w-5 h-5 text-muted-foreground" />
            <Select value={selectedMedication || "all"} onValueChange={(val) => setSelectedMedication(val === "all" ? null : val)}>
              <SelectTrigger className="w-full sm:w-[280px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Medications</SelectItem>
                {medications.map(med => (
                  <SelectItem key={med.id} value={med.id}>
                    {med.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs value={view} onValueChange={(v) => setView(v as "month" | "week" | "day")} className="w-full sm:w-auto">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="month" className="gap-2">
                <LayoutGrid className="w-4 h-4" />
                Month
              </TabsTrigger>
              <TabsTrigger value="week" className="gap-2">
                <List className="w-4 h-4" />
                Week
              </TabsTrigger>
              <TabsTrigger value="day" className="gap-2">
                <CalendarDays className="w-4 h-4" />
                Day
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <Button onClick={() => navigateView('prev')} variant="ghost" size="icon" className="rounded-full">
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" />
                  <CardTitle className="text-xl">{getViewTitle()}</CardTitle>
                </div>
                <Button onClick={() => navigateView('next')} variant="ghost" size="icon" className="rounded-full">
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="flex items-center justify-center gap-4 p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg">
                <Flame className="w-8 h-8 text-orange-500" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{streak}</p>
                  <p className="text-sm text-muted-foreground">Day Streak</p>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {view === "month" && (
                <div className="grid grid-cols-7 gap-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                    <div key={day} className="text-center font-medium text-sm text-muted-foreground p-2">
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
                      className={`aspect-square rounded-2xl flex flex-col items-center justify-center p-2 transition-all font-semibold ${getDayColor(day)}`}
                    >
                      <div className="text-base">{day.date.getDate()}</div>
                    </button>
                  ))}
                </div>
              )}

              {view === "week" && (
                <div className="space-y-3">
                  {getWeekDays().map((day, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleDayClick(day)}
                      className={`w-full rounded-xl p-4 transition-all ${getDayColor(day)} text-left`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">{day.date.toLocaleDateString(undefined, { weekday: 'long' })}</div>
                          <div className="text-sm opacity-75">{day.date.toLocaleDateString()}</div>
                        </div>
                        {day.logs.length > 0 && (
                          <Badge variant="secondary" className="text-sm">
                            {day.logs.length} doses
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {view === "day" && (
                <div className="space-y-4">
                  {selectedDoses.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No medications scheduled for this day</p>
                  ) : (
                    selectedDoses.map((it, idx) => (
                      <div key={`${it.schedule.id}-${idx}`} className="p-4 border rounded-xl hover:shadow-md transition-all bg-card">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            {it.medication.image_url && (
                              <img 
                                src={it.medication.image_url} 
                                alt={it.medication.name} 
                                className="w-12 h-12 rounded-lg object-cover" 
                              />
                            )}
                            <div>
                              <div className="font-semibold">{it.medication.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {it.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </div>
                            </div>
                          </div>
                          <Badge
                            variant={
                              it.status === 'taken' ? 'default' : 
                              it.status === 'snoozed' ? 'secondary' : 
                              it.status === 'skipped' ? 'destructive' : 
                              'outline'
                            }
                            className="capitalize"
                          >
                            {it.status}
                          </Badge>
                        </div>
                        {it.schedule.special_instructions && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {it.schedule.special_instructions}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
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
