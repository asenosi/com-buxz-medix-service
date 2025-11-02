import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, LogOut, Pill, Calendar, User as UserIcon, Menu, Sun, Moon, Monitor, Search as SearchIcon, SlidersHorizontal, BarChart3, Activity, Clock, List, X } from "lucide-react";
import { format } from "date-fns";
import ThemePicker from "@/components/ThemePicker";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Session } from "@supabase/supabase-js";
import { DoseCard } from "@/components/DoseCard";
import { SimpleDoseCard } from "@/components/SimpleDoseCard";
import { AdherenceStats } from "@/components/AdherenceStats";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import { DoseActionDialog } from "@/components/DoseActionDialog";
import { useTheme } from "@/hooks/use-theme";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SplitMediaCard } from "@/components/SplitMediaCard";
import { cn } from "@/lib/utils";
import { DoseItemSkeleton, MedCardGridSkeleton } from "@/components/LoadingSkeletons";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { WeekCalendar } from "@/components/WeekCalendar";
import { MonthCalendar } from "@/components/MonthCalendar";

interface Medication {
  id: string;
  name: string;
  dosage: string;
  form: string | null;
  pills_remaining: number | null;
  active: boolean;
  image_url: string | null;
  user_id: string;
  images?: string[];
  reason_for_taking?: string | null;
  instructions?: string | null;
  medication_color?: string | null;
  medication_icon?: string | null;
  grace_period_minutes?: number | null;
  reminder_window_minutes?: number | null;
  missed_dose_cutoff_minutes?: number | null;
}

interface Schedule {
  id: string;
  medication_id: string;
  time_of_day: string;
  with_food: boolean;
  special_instructions: string | null;
}

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

const Dashboard = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [todayDoses, setTodayDoses] = useState<TodayDose[]>([]);
  const [streak, setStreak] = useState(0);
  const [totalTaken, setTotalTaken] = useState(0);
  const [todayProgress, setTodayProgress] = useState(0);
  const [weeklyAdherence, setWeeklyAdherence] = useState(0);
  const { mode, setMode } = useTheme();
  const scheduledRef = useRef<Set<string>>(new Set());
  const timersRef = useRef<Map<string, number>>(new Map());
  const [showStats, setShowStats] = useState(false);
  const [selectedDose, setSelectedDose] = useState<TodayDose | null>(null);
  const [showDoseDialog, setShowDoseDialog] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(new Date());
  const [calendarViewType, setCalendarViewType] = useState<"week" | "month">("week");
  const [userName, setUserName] = useState<string>("");
  const defaultImageForForm = useCallback((form?: string | null) => {
    if (!form) return "";
    const f = form.toLowerCase();
    if (f.includes("pill")) return "/images/meds/pill.svg";
    if (f.includes("inhaler")) return "/images/meds/inhaler.svg";
    if (f.includes("cream")) return "/images/meds/cream.svg";
    if (f.includes("drop") || f.includes("solution")) return "/images/meds/drop.svg";
    if (f.includes("injection") || f.includes("syringe")) return "/images/meds/syringe.svg";
    if (f.includes("spray")) return "/images/meds/spray.svg";
    if (f.includes("powder") || f.includes("strip") || f.includes("insert") || f.includes("other") || f.includes("stick")) return "/images/meds/pill.svg";
    return "";
  }, []);

  const borderColorClass = useCallback((color?: string | null) => {
    switch ((color || '').toLowerCase()) {
      case 'blue': return 'border-l-primary';
      case 'green': return 'border-l-success';
      case 'orange': return 'border-l-warning';
      case 'red': return 'border-l-destructive';
      case 'purple': return 'border-l-purple-500';
      case 'pink': return 'border-l-pink-500';
      default: return 'border-l-primary';
    }
  }, []);

  const getTimeGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    if (hour < 21) return "Good evening";
    return "Good evening";
  }, []);

  // Search & Filters for Today's Schedule
  type StatusFilter = "all" | "upcoming" | "due" | "overdue" | "taken" | "skipped" | "snoozed";
  type TimeBucket = "all" | "morning" | "afternoon" | "evening" | "night";
  type WithFood = "any" | "yes" | "no";
  type SortOpt = "timeAsc" | "timeDesc";

  const [searchText, setSearchText] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [timeBucket, setTimeBucket] = useState<TimeBucket>("all");
  const [withFood, setWithFood] = useState<WithFood>("any");
  const [sortOpt, setSortOpt] = useState<SortOpt>("timeAsc");

  const filteredDoses = useMemo(() => {
    const inBucket = (d: Date): boolean => {
      const h = d.getHours();
      if (timeBucket === "all") return true;
      if (timeBucket === "morning") return h >= 5 && h < 11;
      if (timeBucket === "afternoon") return h >= 11 && h < 17;
      if (timeBucket === "evening") return h >= 17 && h < 21;
      if (timeBucket === "night") return h >= 21 || h < 5;
      return true;
    };

    const list = todayDoses
      .filter(d => !searchText || d.medication.name.toLowerCase().includes(searchText.toLowerCase()))
      .filter(d => {
        if (statusFilter === "all") return true;
        if (statusFilter === "taken") return Boolean(d.isTaken);
        if (statusFilter === "skipped") return Boolean(d.isSkipped);
        if (statusFilter === "snoozed") return Boolean(d.isSnoozed);
        return d.status === statusFilter;
      })
      .filter(d => {
        if (withFood === "any") return true;
        if (withFood === "yes") return Boolean(d.schedule.with_food);
        return !d.schedule.with_food;
      })
      .filter(d => inBucket(d.nextDoseTime))
      .slice()
      .sort((a,b) => sortOpt === "timeAsc" ? a.nextDoseTime.getTime() - b.nextDoseTime.getTime() : b.nextDoseTime.getTime() - a.nextDoseTime.getTime());

    return list;
  }, [todayDoses, searchText, statusFilter, timeBucket, withFood, sortOpt]);

  const fetchGamificationStats = useCallback(async () => {
    try {
      // Get total taken doses
      const { data: allLogs, error: logsError } = await supabase
        .from("dose_logs")
        .select("*")
        .eq("status", "taken")
        .order("taken_at", { ascending: false });

      if (logsError) throw logsError;

      setTotalTaken(allLogs?.length || 0);

      // Calculate streak
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
      }

      // Calculate weekly adherence
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: weekLogs } = await supabase
        .from("dose_logs")
        .select("*")
        .gte("scheduled_time", sevenDaysAgo.toISOString());

      if (weekLogs && weekLogs.length > 0) {
        const takenCount = weekLogs.filter(l => l.status === "taken").length;
        setWeeklyAdherence(Math.round((takenCount / weekLogs.length) * 100));
      }
    } catch (error: unknown) {
      console.error("Failed to fetch gamification stats:", error);
    }
  }, []);

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
        .eq("active", true)
        .order("name");

      if (medsError) throw medsError;
      
      // Attach up to 5 storage images per medication
      const medsWithImages: Medication[] = await (async () => {
        const listForMed = async (med: Pick<Medication, "user_id" | "id">): Promise<string[]> => {
          const base = `${med.user_id}/${med.id}`;
          const { data: files } = await supabase.storage
            .from("medication-images")
            .list(base, { limit: 10, sortBy: { column: "updated_at", order: "desc" } });
          const names = (files || []).slice(0, 5).map(f => `${base}/${f.name}`);
          return names.map(n => supabase.storage.from("medication-images").getPublicUrl(n).data.publicUrl);
        };
        return Promise.all(((medsData || []) as Medication[]).map(async (m) => ({ ...m, images: await listForMed(m) })));
      })();

      setMedications(medsWithImages || []);

      if (medsWithImages && medsWithImages.length > 0) {
        const medIds = medsWithImages.map(m => m.id);
        const { data: schedulesData, error: schedError } = await supabase
          .from("medication_schedules")
          .select("*")
          .in("medication_id", medIds)
          .eq("active", true);

        if (schedError) throw schedError;

        // Fetch today's logs
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const { data: logsData } = await supabase
          .from("dose_logs")
          .select("*")
          .gte("scheduled_time", startOfDay.toISOString())
          .lte("scheduled_time", endOfDay.toISOString());

        const doses: TodayDose[] = [];
        const now = new Date();
        const currentDay = now.getDay();

        const parseTime = (t?: unknown): [number, number] | null => {
          if (typeof t !== "string") return null;
          const parts = t.split(":");
          if (parts.length < 2) return null;
          const hours = Number(parts[0]);
          const minutes = Number(parts[1]);
          if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
          return [hours, minutes];
        };

        medsWithImages.forEach(med => {
          const medSchedules = schedulesData?.filter(s => s.medication_id === med.id) || [];
          
          medSchedules.forEach(schedule => {
            // Check if today is in the days_of_week array
            if (schedule.days_of_week && !schedule.days_of_week.includes(currentDay)) {
              return; // Skip this schedule if today is not in the recurring days
            }

            const parsed = parseTime(schedule.time_of_day);
            if (!parsed) return; // Skip invalid times
            const [hours, minutes] = parsed;
            const doseTime = new Date();
            doseTime.setHours(hours, minutes, 0, 0);

            const timeDiff = doseTime.getTime() - now.getTime();
            const minutesDiff = timeDiff / (1000 * 60);

            let status: "upcoming" | "due" | "overdue" = "upcoming";
            if (minutesDiff <= 0 && minutesDiff > -30) {
              status = "due";
            } else if (minutesDiff <= -30) {
              status = "overdue";
            }

            // Check if this dose has been logged
            const doseLog = logsData?.find(log => 
              log.schedule_id === schedule.id &&
              new Date(log.scheduled_time).getHours() === hours &&
              new Date(log.scheduled_time).getMinutes() === minutes
            );

            // Keep snoozed doses in the list; surface as snoozed with snoozeUntil

            doses.push({
              medication: med,
              schedule,
              nextDoseTime: doseTime,
              status,
              isTaken: doseLog?.status === "taken",
              isSkipped: doseLog?.status === "skipped",
              isSnoozed: doseLog?.status === "snoozed",
              snoozeUntil: doseLog?.snooze_until ? new Date(doseLog.snooze_until) : undefined,
            });
          });
        });

        doses.sort((a, b) => a.nextDoseTime.getTime() - b.nextDoseTime.getTime());
        setTodayDoses(doses);

        // Calculate today's progress
        if (doses.length > 0) {
          const takenCount = doses.filter(d => d.isTaken).length;
          setTodayProgress(Math.round((takenCount / doses.length) * 100));
        }
      }

      // Fetch gamification stats
      await fetchGamificationStats();
    } catch (error: unknown) {
      toast.error("Failed to load medications");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [fetchGamificationStats]);

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
        fetchMedications();
        // Fetch user profile
        const fetchProfile = async () => {
          try {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("user_id", currentSession.user.id)
              .single();
            
            if (profile?.full_name) {
              setUserName(profile.full_name.split(" ")[0]);
            }
          } catch (error) {
            console.error("Failed to fetch profile:", error);
          }
        };
        fetchProfile();
      }

      return () => subscription.unsubscribe();
    };

    initAuth();
  }, [navigate, fetchMedications]);

  // Ask for browser notification permission; falls back to in-app toast
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        if (Notification.permission === "default") {
          Notification.requestPermission().catch(() => {});
        }
      } catch {
        // ignore
      }
    }
  }, []);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((id) => clearTimeout(id));
      timersRef.current.clear();
      scheduledRef.current.clear();
    };
  }, []);

  const notify = useCallback((title: string, body: string) => {
    try {
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body });
      }
    } catch {
      // ignore Notification failures; fallback to toast below
    }
    toast.info(body, { description: title });
  }, []);

  const scheduleReminder = useCallback((key: string, when: Date, title: string, message: string) => {
    if (scheduledRef.current.has(key)) return;
    const delay = when.getTime() - Date.now();
    const trigger = () => {
      notify(title, message);
      scheduledRef.current.delete(key);
      const t = timersRef.current.get(key);
      if (t) timersRef.current.delete(key);
    };
    if (delay <= 0) {
      trigger();
      return;
    }
    scheduledRef.current.add(key);
    const timeoutId = window.setTimeout(trigger, delay);
    timersRef.current.set(key, timeoutId);
  }, [notify]);

  // Schedule reminders for upcoming medication times and snooze end times
  useEffect(() => {
    const now = Date.now();
    todayDoses.forEach((dose) => {
      // Snoozed item: schedule reminder for snooze end
      if (dose.isSnoozed && dose.snoozeUntil && dose.snoozeUntil.getTime() > now) {
        const sKey = `snooze-${dose.schedule.id}-${dose.snoozeUntil.toISOString()}`;
        scheduleReminder(sKey, dose.snoozeUntil, "Snooze Over", `Take ${dose.medication.name} now`);
        return;
      }

      // Otherwise, schedule regular reminder if not taken/skipped
      if (dose.isTaken || dose.isSkipped) return;
      const key = `${dose.schedule.id}-${dose.nextDoseTime.toISOString()}`;
      const when = dose.nextDoseTime;
      if (when.getTime() > now) {
        scheduleReminder(key, when, "Medication Reminder", `Time to take ${dose.medication.name}`);
      } else if ((now - when.getTime()) < 60_000) {
        // Just became due within last minute
        scheduleReminder(key, new Date(), "Medication Reminder", `Time to take ${dose.medication.name}`);
      }
    });
  }, [todayDoses, scheduleReminder]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/auth");
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

      if (dose.medication.pills_remaining && dose.medication.pills_remaining > 0) {
        const { error: updateError } = await supabase
          .from("medications")
          .update({ pills_remaining: dose.medication.pills_remaining - 1 })
          .eq("id", dose.medication.id);

        if (updateError) throw updateError;
      }

      toast.success(`✅ Great job! ${dose.medication.name} marked as taken!`);
      fetchMedications();
    } catch (error: unknown) {
      toast.error("Failed to log dose");
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
          taken_at: null,
          status: "skipped",
        },
      ]);

      if (error) throw error;

      toast.info(`${dose.medication.name} marked as skipped`);
      fetchMedications();
    } catch (error: unknown) {
      toast.error("Failed to log skip");
      console.error(error);
    }
  };

  const markAsSnoozed = async (dose: TodayDose, minutes: number) => {
    try {
      const snoozeUntil = new Date();
      snoozeUntil.setMinutes(snoozeUntil.getMinutes() + minutes);

      const { error } = await supabase.from("dose_logs").insert([
        {
          medication_id: dose.medication.id,
          schedule_id: dose.schedule.id,
          scheduled_time: dose.nextDoseTime.toISOString(),
          taken_at: null,
          status: "snoozed",
          snooze_until: snoozeUntil.toISOString(),
        },
      ]);

      if (error) throw error;

      toast.success(`⏰ ${dose.medication.name} snoozed until ${snoozeUntil.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
      fetchMedications();
    } catch (error: unknown) {
      toast.error("Failed to snooze");
      console.error(error);
    }
  };

  const handleEditMedication = (medicationId: string) => {
    navigate(`/medications?edit=${medicationId}`);
  };

  const handleDoseClick = (dose: TodayDose) => {
    setSelectedDose(dose);
    setShowDoseDialog(true);
  };

  const groupDosesByTime = (doses: TodayDose[]) => {
    const groups: { [key: string]: TodayDose[] } = {};
    doses.forEach((dose) => {
      const timeStr = dose.nextDoseTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      if (!groups[timeStr]) {
        groups[timeStr] = [];
      }
      groups[timeStr].push(dose);
    });
    return groups;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-border shadow-sm sticky top-0 z-50 backdrop-blur-sm bg-card/95">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6" />
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <DoseItemSkeleton count={5} />
          </div>
          <div className="mt-8">
            <MedCardGridSkeleton count={4} />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border shadow-sm backdrop-blur-sm bg-card/95 animate-slide-down">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="flex items-center gap-3 animate-fade-in">
              <div className="bg-primary rounded-full p-2 sm:p-3 animate-scale-in">
                <Pill className="w-6 h-6 sm:w-8 sm:h-8 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">MedTracker</h1>
                <p className="text-sm sm:text-lg text-muted-foreground">Your medication companion</p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="lg" className="w-full sm:w-auto hover:scale-105 transition-transform">
                  <Menu className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Menu
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate("/profile")}>
                  <UserIcon className="w-4 h-4 mr-2" /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate("/search")}>
                  <SearchIcon className="w-4 h-4 mr-2" /> Search
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setShowStats(s => !s)}>
                  <BarChart3 className="w-4 h-4 mr-2" /> {showStats ? "Hide Stats" : "Show Stats"}
                </DropdownMenuItem>
                <ThemePicker trigger={<DropdownMenuItem onSelect={(e) => e.preventDefault()}><span className="flex items-center"><Menu className="w-4 h-4 mr-2" /> Themes</span></DropdownMenuItem>} />
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Theme Mode</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => setMode("light")}>
                  <Sun className="w-4 h-4 mr-2" /> Light
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setMode("dark")}>
                  <Moon className="w-4 h-4 mr-2" /> Dark
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setMode("system")}>
                  <Monitor className="w-4 h-4 mr-2" /> System
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" /> Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Welcome Message */}
        <div className="mb-6 animate-fade-in">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">
            {getTimeGreeting()}{userName ? `, ${userName}` : ""}! 👋
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground">
            {todayDoses.length > 0 
              ? `You have ${todayDoses.length} medication${todayDoses.length > 1 ? 's' : ''} scheduled today. Stay on track with your health journey!`
              : "Great job staying on top of your medications! Keep up the excellent work."}
          </p>
        </div>

        {/* Search and Filters - Full Width */}
        <div className="mb-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search doses"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-9 h-10 text-sm"
              />
            </div>
            <Button variant="outline" className="h-10 px-3" onClick={() => setShowFilters(s => !s)}>
              <SlidersHorizontal className="w-4 h-4" />
            </Button>
            {(searchText || statusFilter !== "all" || timeBucket !== "all" || withFood !== "any" || sortOpt !== "timeAsc") && (
              <Button
                variant="ghost"
                className="h-10 px-3"
                onClick={() => { setSearchText(""); setStatusFilter("all"); setTimeBucket("all"); setWithFood("any"); setSortOpt("timeAsc"); setShowFilters(false); }}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          {showFilters && (
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <Select value={statusFilter} onValueChange={(v: StatusFilter) => setStatusFilter(v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="due">Due</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="taken">Taken</SelectItem>
                      <SelectItem value="snoozed">Snoozed</SelectItem>
                      <SelectItem value="skipped">Skipped</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={timeBucket} onValueChange={(v: TimeBucket) => setTimeBucket(v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Time of day" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any time</SelectItem>
                      <SelectItem value="morning">Morning (5–11)</SelectItem>
                      <SelectItem value="afternoon">Afternoon (11–17)</SelectItem>
                      <SelectItem value="evening">Evening (17–21)</SelectItem>
                      <SelectItem value="night">Night (21–5)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={withFood} onValueChange={(v: WithFood) => setWithFood(v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="With food" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">With or without</SelectItem>
                      <SelectItem value="yes">With food</SelectItem>
                      <SelectItem value="no">Without food</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortOpt} onValueChange={(v: SortOpt) => setSortOpt(v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Sort" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="timeAsc">Time ↑</SelectItem>
                      <SelectItem value="timeDesc">Time ↓</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "list" | "calendar")} className="mb-6">
          <TabsList className="grid h-auto w-full max-w-md mx-auto grid-cols-2 bg-muted">
            <TabsTrigger 
              value="list" 
              className="min-w-0 whitespace-normal break-words text-sm sm:text-base flex items-center justify-center gap-2"
            >
              <List className="w-4 h-4 sm:w-5 sm:h-5" />
              List View
            </TabsTrigger>
            <TabsTrigger 
              value="calendar" 
              className="min-w-0 whitespace-normal break-words text-sm sm:text-base flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
              Calendar View
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar">
            <div className="animate-fade-in">
              <div className="mb-4">
                <Tabs value={calendarViewType} onValueChange={(v) => setCalendarViewType(v as "week" | "month")} className="w-full">
                  <TabsList className="grid h-auto w-full max-w-md mx-auto grid-cols-2">
                    <TabsTrigger value="week" className="min-w-0 whitespace-normal break-words text-sm sm:text-base flex items-center gap-2 justify-center">
                      <List className="w-4 h-4" />
                      Week
                    </TabsTrigger>
                    <TabsTrigger value="month" className="min-w-0 whitespace-normal break-words text-sm sm:text-base flex items-center gap-2 justify-center">
                      <Calendar className="w-4 h-4" />
                      Month
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {calendarViewType === "week" ? (
                <WeekCalendar 
                  selectedDate={selectedCalendarDate}
                  onDateSelect={setSelectedCalendarDate}
                />
              ) : (
                <MonthCalendar
                  selectedDate={selectedCalendarDate}
                  onDateSelect={setSelectedCalendarDate}
                />
              )}
              
              <div className="mb-6">
                <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">
                  {format(selectedCalendarDate, "EEEE, MMMM d, yyyy")}
                </h2>
                
                {loading ? (
                  <DoseItemSkeleton count={3} />
                ) : (() => {
                  const selectedDayStart = new Date(selectedCalendarDate);
                  selectedDayStart.setHours(0, 0, 0, 0);
                  const selectedDayEnd = new Date(selectedCalendarDate);
                  selectedDayEnd.setHours(23, 59, 59, 999);
                  
                  const dosesForDay = todayDoses.filter(dose => {
                    const doseDate = new Date(dose.nextDoseTime);
                    return doseDate >= selectedDayStart && doseDate <= selectedDayEnd;
                  });
                  
                  const todayStart = new Date();
                  todayStart.setHours(0, 0, 0, 0);
                  const isPastDate = selectedDayStart < todayStart;

                  if (dosesForDay.length === 0) {
                    return (
                      <Card className="text-center py-6 sm:py-8">
                        <CardContent>
                          <p className="text-lg sm:text-xl text-muted-foreground px-4">
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
            </div>
          </TabsContent>

          <TabsContent value="list">
            {!loading && medications.length === 0 ? (
              <Card className="text-center py-12 sm:py-16 animate-fade-in">
                <CardContent>
                  <Pill className="w-16 h-16 sm:w-20 sm:h-20 text-muted-foreground mx-auto mb-4 sm:mb-6 animate-pulse" />
                  <h2 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-3">No Medications Yet</h2>
                  <p className="text-lg sm:text-xl text-muted-foreground mb-4 sm:mb-6 px-4">
                    Get started by adding your first medication
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {showStats && (
              <AdherenceStats
                streak={streak}
                todayProgress={todayProgress}
                weeklyAdherence={weeklyAdherence}
                totalTaken={totalTaken}
              />
            )}

            <div className="mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 animate-slide-in-left hidden sm:block">Today's Schedule</h2>
              <h2 className="text-2xl font-bold mb-4 sm:hidden text-primary">Today, {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</h2>
              
              {loading ? (
                <DoseItemSkeleton count={3} />
              ) : todayDoses.length === 0 ? (
                <Card className="text-center py-6 sm:py-8 animate-fade-in">
                  <CardContent>
                    <p className="text-lg sm:text-xl text-muted-foreground px-4">
                      No medications scheduled for today
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Mobile: Time-grouped layout */}
                  <div className="sm:hidden space-y-6">
                    {Object.entries(groupDosesByTime(filteredDoses.length === 0 ? [] : filteredDoses)).map(([timeStr, doses], groupIdx) => (
                      <div key={timeStr} className="animate-fade-in" style={{ animationDelay: `${groupIdx * 0.1}s` }}>
                        <h3 className="text-3xl font-bold mb-3 text-primary">{timeStr}</h3>
                        <div className="space-y-2">
                          {doses.map((dose, idx) => (
                            <SimpleDoseCard
                              key={`${dose.schedule.id}-${idx}`}
                              medication={dose.medication}
                              schedule={dose.schedule}
                              onClick={() => handleDoseClick(dose)}
                              className={cn(
                                dose.isTaken && "bg-success/5 border-l-success",
                                (dose.isSkipped || dose.isSnoozed) && "bg-warning/5 border-l-warning",
                                !dose.isTaken && !dose.isSkipped && !dose.isSnoozed && dose.status === "overdue" && "bg-destructive/5 border-l-destructive",
                                !dose.isTaken && !dose.isSkipped && !dose.isSnoozed && dose.status === "due" && "bg-accent/5 border-l-accent"
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop: Original DoseCard layout */}
                  <div className="hidden sm:grid gap-3 sm:gap-4">
                    {(filteredDoses.length === 0 ? [] : filteredDoses).map((dose, idx) => (
                      <div 
                        key={`${dose.schedule.id}-${idx}`}
                        className="animate-slide-in-right"
                        style={{ animationDelay: `${idx * 0.1}s` }}
                      >
                        <DoseCard
                          dose={dose}
                          onMarkTaken={markAsTaken}
                          onMarkSkipped={markAsSkipped}
                          onMarkSnoozed={markAsSnoozed}
                          onEdit={handleEditMedication}
                          onOpenDetails={(id) => navigate(`/medications/${id}`)}
                        />
                      </div>
                    ))}
                  </div>

                  {filteredDoses.length === 0 && (
                    <Card className="text-center py-6 sm:py-8 animate-fade-in">
                      <CardContent>
                        <p className="text-lg sm:text-xl text-muted-foreground px-4">No medications match your search/filter for today</p>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 animate-slide-in-left">All Medications</h2>
              {loading ? (
                <MedCardGridSkeleton count={4} />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                {medications.map((med, idx) => {
                  const img = (med.images && med.images[0]) || med.image_url || defaultImageForForm(med.form || undefined);
                  const descParts = [
                    med.dosage ? `${med.dosage}${med.form ? ` · ${med.form}` : ""}` : undefined,
                    med.reason_for_taking || undefined,
                  ].filter(Boolean);
                  return (
                    <div key={med.id} className="animate-scale-in" style={{ animationDelay: `${idx * 0.08}s` }}>
                      <SplitMediaCard
                        imageSrc={img}
                        imageAlt={med.name}
                        title={med.name}
                        description={descParts.join(" — ")}
                        buttonLabel="View Details"
                        onButtonClick={() => navigate(`/medications/${med.id}`)}
                        orientation={idx % 2 === 0 ? "imageLeft" : "imageRight"}
                        className={"hover:shadow-xl hover:scale-[1.02] transition-all duration-300 border-l-4 " + borderColorClass(med.medication_color)}
                      >
                        {typeof med.pills_remaining === "number" && (
                          <div className="text-sm text-muted-foreground">{med.pills_remaining} remaining</div>
                        )}
                      </SplitMediaCard>
                    </div>
                  );
                })}
              </div>
              )}
            </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Floating Action Button */}
      <FloatingActionButton
        actions={[
          {
            label: "Add Medication",
            icon: <Pill className="h-6 w-6" />,
            onClick: () => navigate("/medications"),
            color: "bg-primary hover:bg-primary/90",
          },
          {
            label: "Add Tracker Entry",
            icon: <Activity className="h-6 w-6" />,
            onClick: () => navigate("/calendar"),
            color: "bg-blue-500 hover:bg-blue-600",
          },
          {
            label: "Add Dose",
            icon: <Clock className="h-6 w-6" />,
            onClick: () => navigate("/medications"),
            color: "bg-purple-500 hover:bg-purple-600",
          },
        ]}
      />

      {/* Dose Action Dialog */}
      {selectedDose && (
        <DoseActionDialog
          open={showDoseDialog}
          onOpenChange={setShowDoseDialog}
          medication={selectedDose.medication}
          schedule={selectedDose.schedule}
          scheduledTime={selectedDose.nextDoseTime}
          dosage={selectedDose.medication.dosage}
          gracePeriodMinutes={selectedDose.medication.grace_period_minutes || 60}
          missedDoseCutoffMinutes={selectedDose.medication.missed_dose_cutoff_minutes || 180}
          onTake={() => markAsTaken(selectedDose)}
          onSkip={() => markAsSkipped(selectedDose)}
          onReschedule={() => {
            markAsSnoozed(selectedDose, 15);
          }}
          onEdit={() => handleEditMedication(selectedDose.medication.id)}
          onDelete={() => {
            // TODO: Implement delete functionality
            toast.info("Delete functionality coming soon");
          }}
          onInfo={() => navigate(`/medications/${selectedDose.medication.id}`)}
        />
      )}
    </div>
  );
};

export default Dashboard;
