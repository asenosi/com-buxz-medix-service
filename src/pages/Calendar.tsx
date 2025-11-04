import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon, ArrowLeft, Flame, LayoutGrid, List, Search as SearchIcon, X, TrendingUp, Target } from "lucide-react";
import { toast } from "sonner";
import { Session } from "@supabase/supabase-js";
import { CalendarSkeleton } from "@/components/LoadingSkeletons";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeekCalendar } from "@/components/WeekCalendar";
import { MonthCalendar } from "@/components/MonthCalendar";
import { DoseCard } from "@/components/DoseCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

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

interface TodayDose {
  medication: Medication;
  schedule: Schedule;
  nextDoseTime: Date;
  status: "upcoming" | "due" | "overdue";
  isTaken?: boolean;
  isSkipped?: boolean;
  isSnoozed?: boolean;
  snoozeUntil?: Date;
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
  const [selectedDoses, setSelectedDoses] = useState<TodayDose[]>([]);
  const [view, setView] = useState<"month" | "week">("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [adherenceStats, setAdherenceStats] = useState({
    taken: 0,
    missed: 0,
    skipped: 0,
    total: 0,
    percentage: 0
  });
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [medicationAdherence, setMedicationAdherence] = useState<{
    medicationId: string;
    medicationName: string;
    taken: number;
    total: number;
    percentage: number;
  }[]>([]);

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

  const calculateAdherenceForPeriod = useCallback(async (baseDate: Date, viewMode: "week" | "month") => {
    try {
      let startDate: Date;
      let endDate: Date;
      
      if (viewMode === "week") {
        // Calculate week boundaries (Sunday to Saturday)
        startDate = new Date(baseDate);
        startDate.setDate(baseDate.getDate() - baseDate.getDay());
        startDate.setHours(0, 0, 0, 0);
        
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
      } else {
        // Calculate month boundaries
        startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);
        
        endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
      }
      
      let query = supabase
        .from("dose_logs")
        .select("*, medications(name)")
        .gte("scheduled_time", startDate.toISOString())
        .lte("scheduled_time", endDate.toISOString());
      
      if (selectedMedication) {
        query = query.eq("medication_id", selectedMedication);
      }
      
      const { data: logs, error } = await query;
      
      if (error) throw error;
      
      const taken = logs?.filter(log => log.status === 'taken').length || 0;
      const missed = logs?.filter(log => log.status === 'missed').length || 0;
      const skipped = logs?.filter(log => log.status === 'skipped').length || 0;
      const total = logs?.length || 0;
      const percentage = total > 0 ? Math.round((taken / total) * 100) : 0;
      
      setAdherenceStats({ taken, missed, skipped, total, percentage });
      
      // Calculate per-medication adherence
      const medAdherence: Record<string, { name: string; taken: number; total: number }> = {};
      
      logs?.forEach(log => {
        const medId = log.medication_id;
        const medName = (log.medications as { name: string } | null)?.name || "Unknown";
        
        if (!medAdherence[medId]) {
          medAdherence[medId] = { name: medName, taken: 0, total: 0 };
        }
        
        medAdherence[medId].total++;
        if (log.status === 'taken') {
          medAdherence[medId].taken++;
        }
      });
      
      const medAdherenceArray = Object.entries(medAdherence).map(([id, data]) => ({
        medicationId: id,
        medicationName: data.name,
        taken: data.taken,
        total: data.total,
        percentage: data.total > 0 ? Math.round((data.taken / data.total) * 100) : 0
      }));
      
      setMedicationAdherence(medAdherenceArray);
    } catch (error: unknown) {
      console.error("Failed to calculate adherence:", error);
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

      // Calculate streak and adherence
      calculateStreak();
      calculateAdherenceForPeriod(selectedDate || currentDate, view);
    } catch (error: unknown) {
      toast.error("Failed to load calendar data");
      console.error(error);
    }
  }, [currentMonth, selectedMedication, calculateStreak, calculateAdherenceForPeriod]);

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
      const items: TodayDose[] = [];
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
        items.push({ 
          medication: med, 
          schedule: s, 
          nextDoseTime: t, 
          status: "upcoming",
          isTaken: toStatus(log?.status) === "taken",
          isSkipped: toStatus(log?.status) === "skipped",
          isSnoozed: toStatus(log?.status) === "snoozed"
        });
      });

      items.sort((a,b) => a.nextDoseTime.getTime() - b.nextDoseTime.getTime());
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
    if (session) {
      calculateAdherenceForPeriod(selectedDate || currentDate, view);
    }
  }, [selectedDate, view, session, calculateAdherenceForPeriod, currentDate]);

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
    calculateAdherenceForPeriod(date, view);
  };

  const filteredDoses = useMemo(() => {
    let filtered = selectedDoses;
    
    // Filter by search text
    if (searchText.trim()) {
      filtered = filtered.filter(dose => 
        dose.medication.name.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    
    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(dose => {
        if (statusFilter === "taken") return dose.isTaken;
        if (statusFilter === "skipped") return dose.isSkipped;
        if (statusFilter === "snoozed") return dose.isSnoozed;
        if (statusFilter === "pending") return !dose.isTaken && !dose.isSkipped && !dose.isSnoozed;
        return true;
      });
    }
    
    return filtered;
  }, [selectedDoses, searchText, statusFilter]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchText.trim()) count++;
    if (statusFilter !== "all") count++;
    if (selectedMedication) count++;
    return count;
  }, [searchText, statusFilter, selectedMedication]);

  const clearAllFilters = () => {
    setSearchText("");
    setStatusFilter("all");
    setSelectedMedication(null);
  };

  const markAsTaken = async (dose: TodayDose) => {
    try {
      const { error } = await supabase.from("dose_logs").insert([
        {
          medication_id: dose.medication.id,
          schedule_id: dose.schedule.id,
          scheduled_time: dose.nextDoseTime.toISOString(),
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

  const markAsSkipped = async (dose: TodayDose) => {
    try {
      const { error } = await supabase.from("dose_logs").insert([
        {
          medication_id: dose.medication.id,
          schedule_id: dose.schedule.id,
          scheduled_time: dose.nextDoseTime.toISOString(),
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

  const markAsSnoozed = async (dose: TodayDose, minutes: number) => {
    try {
      const snoozeUntil = new Date(dose.nextDoseTime);
      snoozeUntil.setMinutes(snoozeUntil.getMinutes() + minutes);
      const { error } = await supabase.from("dose_logs").insert([
        {
          medication_id: dose.medication.id,
          schedule_id: dose.schedule.id,
          scheduled_time: dose.nextDoseTime.toISOString(),
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search medications..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-9 h-10"
              />
              {searchText && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                  onClick={() => setSearchText("")}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
            
            <div className="flex gap-2">
              <Select value={selectedMedication || "all"} onValueChange={(v) => setSelectedMedication(v === "all" ? null : v)}>
                <SelectTrigger className="h-10 w-[180px]">
                  <SelectValue placeholder="All Medications" />
                </SelectTrigger>
                <SelectContent className="bg-card z-50">
                  <SelectItem value="all">All Medications</SelectItem>
                  {medications.map(med => (
                    <SelectItem key={med.id} value={med.id}>{med.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-card z-50">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="taken">Taken</SelectItem>
                  <SelectItem value="skipped">Skipped</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>

              {activeFiltersCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10"
                  onClick={clearAllFilters}
                >
                  Clear ({activeFiltersCount})
                </Button>
              )}
            </div>
          </div>

          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-2">
              {searchText && (
                <Badge variant="secondary" className="gap-1">
                  Search: {searchText}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSearchText("")} />
                </Badge>
              )}
              {statusFilter !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  Status: {statusFilter}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setStatusFilter("all")} />
                </Badge>
              )}
              {selectedMedication && (
                <Badge variant="secondary" className="gap-1">
                  Medication: {medications.find(m => m.id === selectedMedication)?.name}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedMedication(null)} />
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">
            {view === "week" ? "Week Overview" : "Month Overview"}
            {selectedDate && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                {view === "week" 
                  ? `Week of ${new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() - selectedDate.getDay()).toLocaleDateString()}`
                  : selectedDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
                }
              </span>
            )}
          </h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Overall Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="bg-primary/10 rounded-full p-3">
                    <Flame className="w-6 h-6 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">{streak}</p>
                    <p className="text-xs text-muted-foreground">Day Streak</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-success/5 to-success/10 border-success/20">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="bg-success/10 rounded-full p-3">
                    <Target className="w-6 h-6 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-success">{adherenceStats.percentage}%</p>
                    <p className="text-xs text-muted-foreground">Adherence</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-accent/5 to-accent/10 border-border">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="bg-accent rounded-full p-3">
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{adherenceStats.total}</p>
                    <p className="text-xs text-muted-foreground">Total Doses</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Stats */}
          <Card className="bg-gradient-to-br from-card to-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Dose Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 rounded-lg bg-success/10">
                  <p className="text-2xl font-bold text-success">{adherenceStats.taken}</p>
                  <p className="text-xs text-muted-foreground mt-1">Taken</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-warning/10">
                  <p className="text-2xl font-bold text-warning">{adherenceStats.skipped}</p>
                  <p className="text-xs text-muted-foreground mt-1">Skipped</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-destructive/10">
                  <p className="text-2xl font-bold text-destructive">{adherenceStats.missed}</p>
                  <p className="text-xs text-muted-foreground mt-1">Missed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Per-Medication Adherence */}
        {medicationAdherence.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Adherence by Medication</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {medicationAdherence.map((med) => (
                  <div key={med.medicationId} className="flex items-center justify-between p-3 rounded-lg bg-accent/5 border border-border">
                    <div className="flex-1">
                      <p className="font-medium">{med.medicationName}</p>
                      <p className="text-sm text-muted-foreground">{med.taken} of {med.total} doses taken</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-success transition-all duration-300"
                          style={{ width: `${med.percentage}%` }}
                        />
                      </div>
                      <span className="text-lg font-bold text-success min-w-[3rem] text-right">{med.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* View Selector */}
        <Tabs value={view} onValueChange={(v) => setView(v as "month" | "week")} className="w-full mb-6">
          <TabsList className="grid h-10 w-full max-w-[300px] mx-auto grid-cols-2">
            <TabsTrigger value="week" className="text-sm gap-2">
              <List className="w-4 h-4" />
              Week View
            </TabsTrigger>
            <TabsTrigger value="month" className="text-sm gap-2">
              <LayoutGrid className="w-4 h-4" />
              Month View
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <Card>
            <CardContent className="pt-6">
              {view === "month" && (
                <MonthCalendar
                  selectedDate={selectedDate || new Date()}
                  onDateSelect={handleDateSelect}
                  adherenceData={calendarDays.map(day => ({
                    date: day.date,
                    hasTaken: day.hasTaken,
                    hasSkipped: day.hasSkipped,
                    hasSnoozed: day.hasSnoozed,
                    totalDoses: day.logs.length,
                    takenDoses: day.logs.filter(log => log.status === 'taken').length
                  }))}
                />
              )}

              {view === "week" && (
                <WeekCalendar
                  selectedDate={selectedDate || new Date()}
                  onDateSelect={handleDateSelect}
                  adherenceData={calendarDays.map(day => ({
                    date: day.date,
                    hasTaken: day.hasTaken,
                    hasSkipped: day.hasSkipped,
                    hasSnoozed: day.hasSnoozed,
                    totalDoses: day.logs.length,
                    takenDoses: day.logs.filter(log => log.status === 'taken').length
                  }))}
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

                  const dosesForDay = filteredDoses;

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
