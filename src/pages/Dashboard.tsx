import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, LogOut, Pill, Calendar, User as UserIcon, Menu, Sun, Moon, Monitor, Search as SearchIcon, SlidersHorizontal, BarChart3, Activity, Clock, List, X, FileText } from "lucide-react";
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
import { BulkPrescriptionUpload } from "@/components/BulkPrescriptionUpload";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SplitMediaCard } from "@/components/SplitMediaCard";
import { cn } from "@/lib/utils";
import { DoseItemSkeleton, MedCardGridSkeleton } from "@/components/LoadingSkeletons";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { WeekCalendar } from "@/components/WeekCalendar";
import { MonthCalendar } from "@/components/MonthCalendar";
import { StreakCard } from "@/components/StreakCard";
import { useNotification } from "@/hooks/use-notification";

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
  takenAt?: Date;
  adherenceStatus?: "on_time" | "late" | "missed";
}

interface DoseLog {
  id: string;
  medication_id: string;
  schedule_id: string;
  scheduled_time: string;
  taken_at: string | null;
  status: "taken" | "skipped" | "snoozed" | "missed";
  snooze_until: string | null;
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
  
  const [selectedDose, setSelectedDose] = useState<TodayDose | null>(null);
  const [showDoseDialog, setShowDoseDialog] = useState(false);
  const [doseLogs, setDoseLogs] = useState<DoseLog[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "calendar" | "stats">("list");
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(new Date());
  const [calendarViewType, setCalendarViewType] = useState<"week" | "month">("week");
  const [userName, setUserName] = useState<string>("");
  const { permission, preferences, requestPermission, sendNotification } = useNotification();
  const [showPrescriptionUpload, setShowPrescriptionUpload] = useState(false);
  const [periodStates, setPeriodStates] = useState<Map<string, boolean>>(new Map());
  
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

            // Calculate adherence status if taken
            let adherenceStatus: "on_time" | "late" | "missed" | undefined;
            let takenAtDate: Date | undefined;
            
            if (doseLog?.status === "taken") {
              // Use taken_at if available, otherwise fall back to scheduled_time
              const takenTimeValue = doseLog.taken_at || doseLog.scheduled_time;
              if (takenTimeValue) {
                takenAtDate = new Date(takenTimeValue);
                const scheduledTime = doseTime;
                const minutesLate = Math.floor((takenAtDate.getTime() - scheduledTime.getTime()) / (60 * 1000));
                const gracePeriod = med.grace_period_minutes || 60;
                const missedCutoff = med.missed_dose_cutoff_minutes || 180;
                
                if (minutesLate <= gracePeriod) {
                  adherenceStatus = "on_time";
                } else if (minutesLate <= missedCutoff) {
                  adherenceStatus = "late";
                } else {
                  adherenceStatus = "missed";
                }
              }
            }

            doses.push({
              medication: med,
              schedule,
              nextDoseTime: doseTime,
              status,
              isTaken: doseLog?.status === "taken",
              isSkipped: doseLog?.status === "skipped",
              isSnoozed: doseLog?.status === "snoozed",
              snoozeUntil: doseLog?.snooze_until ? new Date(doseLog.snooze_until) : undefined,
              takenAt: takenAtDate,
              adherenceStatus,
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

  // Request notification permission on mount
  useEffect(() => {
    if (permission === "default") {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((id) => clearTimeout(id));
      timersRef.current.clear();
      scheduledRef.current.clear();
    };
  }, []);

  const notify = useCallback((title: string, body: string) => {
    if (preferences?.enabled && preferences?.browser_enabled) {
      sendNotification(title, { body, requireInteraction: false });
    }
    // Also show toast for in-app visibility
    toast.info(body, { description: title });
  }, [preferences, sendNotification]);

  const scheduleReminder = useCallback((key: string, when: Date, title: string, message: string) => {
    if (!preferences?.enabled) return;
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
  }, [notify, preferences]);

  // Schedule reminders for upcoming medication times and snooze end times
  useEffect(() => {
    const now = Date.now();
    const reminderMinutes = preferences?.reminder_minutes_before || 15;
    
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
      // Schedule reminder X minutes before dose time
      const reminderTime = new Date(dose.nextDoseTime.getTime() - (reminderMinutes * 60 * 1000));
      
      if (reminderTime.getTime() > now) {
        scheduleReminder(key, reminderTime, "Medication Reminder", `${dose.medication.name} due in ${reminderMinutes} minutes`);
      } else if (dose.nextDoseTime.getTime() > now) {
        // If we're past the reminder time but dose is still upcoming, notify now
        scheduleReminder(key, new Date(), "Medication Reminder", `Time to take ${dose.medication.name}`);
      } else if ((now - dose.nextDoseTime.getTime()) < 60_000) {
        // Just became due within last minute
        scheduleReminder(key, new Date(), "Medication Reminder", `Time to take ${dose.medication.name}`);
      }
    });
  }, [todayDoses, scheduleReminder, preferences]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/auth");
  };

  const markAsTaken = async (dose: TodayDose) => {
    // Prevent duplicate actions
    if (dose.isTaken) {
      toast.info("This dose is already marked as taken");
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("update-reminder-status", {
        body: {
          medication_id: dose.medication.id,
          schedule_id: dose.schedule.id,
          scheduled_time: dose.nextDoseTime.toISOString(),
          status: "taken",
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`✅ Great job! ${dose.medication.name} marked as taken!`);
      fetchMedications();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to log dose";
      toast.error(message);
      console.error(error);
    }
  };

  const markAsSkipped = async (dose: TodayDose) => {
    // Prevent duplicate actions
    if (dose.isSkipped) {
      toast.info("This dose is already marked as skipped");
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("update-reminder-status", {
        body: {
          medication_id: dose.medication.id,
          schedule_id: dose.schedule.id,
          scheduled_time: dose.nextDoseTime.toISOString(),
          status: "skipped",
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.info(`${dose.medication.name} marked as skipped`);
      fetchMedications();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to log skip";
      toast.error(message);
      console.error(error);
    }
  };

  const markAsSnoozed = async (dose: TodayDose, minutes: number) => {
    // Prevent duplicate actions
    if (dose.isSnoozed) {
      toast.info("This dose is already snoozed");
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("update-reminder-status", {
        body: {
          medication_id: dose.medication.id,
          schedule_id: dose.schedule.id,
          scheduled_time: dose.nextDoseTime.toISOString(),
          status: "snoozed",
          snooze_minutes: minutes,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const snoozeUntil = new Date();
      snoozeUntil.setMinutes(snoozeUntil.getMinutes() + minutes);
      toast.success(`⏰ ${dose.medication.name} snoozed until ${snoozeUntil.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
      fetchMedications();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to snooze";
      toast.error(message);
      console.error(error);
    }
  };

  const handleEditMedication = (medicationId: string) => {
    navigate(`/medications/add?edit=${medicationId}`);
  };

  const handleDoseClick = async (dose: TodayDose) => {
    setSelectedDose(dose);
    setShowDoseDialog(true);
    
    // Fetch dose logs for this medication and schedule
    if (dose.isTaken || dose.isSkipped) {
      try {
        const startOfDay = new Date(dose.nextDoseTime);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(dose.nextDoseTime);
        endOfDay.setHours(23, 59, 59, 999);

        const { data: logs, error } = await supabase
          .from("dose_logs")
          .select("*")
          .eq("medication_id", dose.medication.id)
          .eq("schedule_id", dose.schedule.id)
          .gte("scheduled_time", startOfDay.toISOString())
          .lte("scheduled_time", endOfDay.toISOString())
          .order("taken_at", { ascending: false });

        if (error) throw error;
        setDoseLogs((logs || []) as DoseLog[]);
      } catch (error) {
        console.error("Failed to fetch dose logs:", error);
        setDoseLogs([]);
      }
    } else {
      setDoseLogs([]);
    }
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

  const groupDosesByPeriod = (doses: TodayDose[]) => {
    const groups: {
      morning: TodayDose[];
      midday: TodayDose[];
      evening: TodayDose[];
      night: TodayDose[];
    } = {
      morning: [],
      midday: [],
      evening: [],
      night: [],
    };

    doses.forEach((dose) => {
      const hour = dose.nextDoseTime.getHours();
      if (hour >= 5 && hour < 12) {
        groups.morning.push(dose);
      } else if (hour >= 12 && hour < 17) {
        groups.midday.push(dose);
      } else if (hour >= 17 && hour < 21) {
        groups.evening.push(dose);
      } else {
        groups.night.push(dose);
      }
    });

    return groups;
  };

  const getPeriodInfo = (period: string, doses: TodayDose[]) => {
    const totalCount = doses.length;
    const takenCount = doses.filter(d => d.isTaken).length;
    const isComplete = totalCount > 0 && doses.every(d => d.isTaken || d.isSnoozed);
    const hasUpcoming = doses.some(d => !d.isTaken && !d.isSkipped && d.status === "upcoming");
    const hasDue = doses.some(d => !d.isTaken && !d.isSkipped && d.status === "due");
    
    let icon = "🌅";
    let title = "Morning Medications";
    let celebrationMsg = "🎉 Amazing! You've completed all your morning meds!";
    let encourageMsg = "💪 Time for your morning medications!";
    
    if (period === "midday") {
      icon = "☀️";
      title = "Midday Medications";
      celebrationMsg = "🎉 Great job! All midday medications completed!";
      encourageMsg = "☀️ Don't forget your midday medications!";
    } else if (period === "evening") {
      icon = "🌆";
      title = "Evening Medications";
      celebrationMsg = "🎉 Excellent! Evening medications all done!";
      encourageMsg = "🌆 Time for your evening medications!";
    } else if (period === "night") {
      icon = "🌙";
      title = "Night Medications";
      celebrationMsg = "🎉 Perfect! Night medications complete!";
      encourageMsg = "🌙 Don't forget your night medications before bed!";
    }
    
    return {
      icon,
      title,
      celebrationMsg,
      encourageMsg,
      isComplete,
      hasUpcoming,
      hasDue,
      takenCount,
      totalCount,
    };
  };

  const togglePeriod = (period: string, currentState: boolean) => {
    setPeriodStates(prev => {
      const next = new Map(prev);
      next.set(period, !currentState);
      return next;
    });
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 sm:pb-28">
        {/* Welcome Message */}
        <div className="mb-6 animate-fade-in">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">
            {getTimeGreeting()}{userName ? `, ${userName}` : ""}! 👋
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground">
            {medications.length === 0 
              ? "Welcome to your medication tracker! Let's get started by adding your first medication."
              : todayDoses.length > 0 
                ? `You have ${todayDoses.length} medication${todayDoses.length > 1 ? 's' : ''} scheduled today. Stay on track with your health journey!`
                : "Great job staying on top of your medications! Keep up the excellent work."}
          </p>
        </div>

        {/* Streak Card - Only show if there are medications */}
        {medications.length > 0 && (
          <div className="mb-6 animate-fade-in">
            <StreakCard streak={streak} onClick={() => setViewMode("stats")} />
          </div>
        )}

        {/* Search and Filters - Only show if there are medications */}
        {medications.length > 0 && (
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
        )}

        {/* Tabs - Only show if there are medications */}
        {medications.length > 0 && (
          <div className="mb-6">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "list" | "calendar" | "stats")}>
              <TabsList className="grid h-auto w-full max-w-3xl mx-auto grid-cols-3 bg-muted">
                <TabsTrigger 
                  value="list" 
                  className="min-w-0 whitespace-normal break-words text-sm sm:text-base flex items-center justify-center gap-2"
                >
                  <List className="w-4 h-4 sm:w-5 sm:h-5" />
                  List
                </TabsTrigger>
                <TabsTrigger 
                  value="calendar" 
                  className="min-w-0 whitespace-normal break-words text-sm sm:text-base flex items-center justify-center gap-2"
                >
                  <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
                  Calendar
                </TabsTrigger>
                <TabsTrigger 
                  value="stats" 
                  className="min-w-0 whitespace-normal break-words text-sm sm:text-base flex items-center justify-center gap-2"
                >
                  <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
                  Stats
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}

        {medications.length === 0 ? (
          /* Empty State */
          <Card className="text-center py-12 sm:py-16 animate-fade-in relative overflow-visible border-2 border-dashed border-muted-foreground/30">
            <CardContent className="pb-32 sm:pb-40">
              <Pill className="w-16 h-16 sm:w-20 sm:h-20 text-muted-foreground mx-auto mb-4 sm:mb-6 animate-pulse" />
              <h2 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-3">No Medications Yet</h2>
              <p className="text-base sm:text-lg text-muted-foreground px-4 max-w-md mx-auto">
                Start your health journey by adding your first medication. Track doses, set reminders, and never miss a dose again.
              </p>
              
              {/* Curved Arrow pointing to FAB */}
              <div className="absolute bottom-6 right-6 sm:bottom-10 sm:right-10 flex items-start gap-3 pointer-events-none">
                <div className="text-right animate-fade-in" style={{ animationDelay: '0.5s' }}>
                  <p className="text-sm sm:text-base font-semibold text-primary mb-1">
                    Tap here to get started! 👉
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Add your first medication
                  </p>
                </div>
                <svg 
                  width="80" 
                  height="80" 
                  viewBox="0 0 100 100" 
                  className="text-primary animate-bounce flex-shrink-0"
                  style={{ animationDelay: '0.8s', animationDuration: '2s' }}
                >
                  <defs>
                    <marker
                      id="arrowhead"
                      markerWidth="8"
                      markerHeight="8"
                      refX="7"
                      refY="4"
                      orient="auto"
                      markerUnits="strokeWidth"
                    >
                      <path
                        d="M 0 0 L 8 4 L 0 8 Z"
                        fill="currentColor"
                      />
                    </marker>
                  </defs>
                  <path
                    d="M 20 15 Q 45 20, 60 45 Q 70 65, 80 85"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray="4 4"
                    markerEnd="url(#arrowhead)"
                  />
                </svg>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "list" | "calendar" | "stats")}>
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

            <div className="mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 animate-slide-in-left hidden sm:block">Today's Schedule</h2>
              <h2 className="text-2xl font-bold mb-4 sm:hidden text-gray-600">Today, {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</h2>
              
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
                  {/* Period-grouped layout for both mobile and desktop */}
                  <div className="space-y-8">
                    {(() => {
                      const periodGroups = groupDosesByPeriod(filteredDoses.length === 0 ? [] : filteredDoses);
                      const periods: Array<keyof typeof periodGroups> = ["morning", "midday", "evening", "night"];
                      
                      return periods.map((period, periodIdx) => {
                        const doses = periodGroups[period];
                        if (doses.length === 0) return null;
                        
                        const info = getPeriodInfo(period, doses);
                        // If user has manually toggled, use their preference. Otherwise, open only if incomplete
                        const isOpen = periodStates.has(period) ? periodStates.get(period)! : !info.isComplete;
                        
                        return (
                          <Collapsible 
                            key={period}
                            open={isOpen}
                            onOpenChange={() => togglePeriod(period, isOpen)}
                          >
                            <div 
                              className="animate-fade-in space-y-4"
                              style={{ animationDelay: `${periodIdx * 0.1}s` }}
                            >
                              {/* Period Header with Status */}
                              <CollapsibleTrigger className="w-full group">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-3 cursor-pointer group-hover:opacity-70 transition-all duration-200">
                                    <span className="text-xl">{info.icon}</span>
                                    <div className="flex-1 text-left">
                                      <h3 className="text-base font-medium">{info.title}</h3>
                                      <p className="text-xs text-muted-foreground">
                                        {info.takenCount} of {info.totalCount} completed
                                      </p>
                                    </div>
                                    <ChevronDown 
                                      className={`h-4 w-4 text-muted-foreground/50 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                                    />
                                  </div>
                                  
                                  {/* Celebratory or Encouraging Message */}
                                  {info.isComplete ? (
                                    <Card className="bg-success/5 border-success/10">
                                      <CardContent className="py-2 px-3">
                                        <p className="text-xs text-success-foreground/80">
                                          {info.celebrationMsg}
                                        </p>
                                      </CardContent>
                                    </Card>
                                  ) : info.hasDue || info.hasUpcoming ? (
                                    <Card className="bg-primary/5 border-primary/10">
                                      <CardContent className="py-2 px-3">
                                        <p className="text-xs text-primary-foreground/80">
                                          {info.encourageMsg}
                                        </p>
                                      </CardContent>
                                    </Card>
                                  ) : null}
                                </div>
                              </CollapsibleTrigger>
                              
                              <CollapsibleContent className="transition-all duration-200 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                                {/* Mobile: SimpleDoseCard layout */}
                                <div className="sm:hidden space-y-2">
                                  {doses.map((dose, idx) => (
                                    <SimpleDoseCard
                                      key={`${dose.schedule.id}-${idx}`}
                                      medication={dose.medication}
                                      schedule={dose.schedule}
                                      onClick={() => handleDoseClick(dose)}
                                      isTaken={dose.isTaken}
                                      isSkipped={dose.isSkipped}
                                      isSnoozed={dose.isSnoozed}
                                      className={cn(
                                        dose.isTaken && "bg-success/5 border-l-success",
                                        (dose.isSkipped || dose.isSnoozed) && "bg-warning/5 border-l-warning",
                                        !dose.isTaken && !dose.isSkipped && !dose.isSnoozed && dose.status === "overdue" && "bg-destructive/5 border-l-destructive",
                                        !dose.isTaken && !dose.isSkipped && !dose.isSnoozed && dose.status === "due" && "bg-accent/5 border-l-accent"
                                      )}
                                    />
                                  ))}
                                </div>
                                
                                {/* Desktop: DoseCard layout */}
                                <div className="hidden sm:grid gap-3 sm:gap-4">
                                  {doses.map((dose, idx) => (
                                    <div 
                                      key={`${dose.schedule.id}-${idx}`}
                                      className="animate-slide-in-right"
                                      style={{ animationDelay: `${idx * 0.05}s` }}
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
                              </CollapsibleContent>
                            </div>
                          </Collapsible>
                        );
                      });
                    })()}
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
              </>
            )}
          </TabsContent>

          <TabsContent value="stats">
            <div className="animate-fade-in">
              <AdherenceStats
                streak={streak}
                todayProgress={todayProgress}
                weeklyAdherence={weeklyAdherence}
                totalTaken={totalTaken}
              />
              
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Your Health Journey</CardTitle>
                  <CardDescription>
                    Keep track of your medication adherence and build healthy habits
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b">
                      <span className="text-sm font-medium">Active Medications</span>
                      <span className="text-2xl font-bold">{medications.length}</span>
                    </div>
                    <div className="flex items-center justify-between pb-2 border-b">
                      <span className="text-sm font-medium">Today's Doses</span>
                      <span className="text-2xl font-bold">{todayDoses.length}</span>
                    </div>
                    <div className="flex items-center justify-between pb-2 border-b">
                      <span className="text-sm font-medium">Completed Today</span>
                      <span className="text-2xl font-bold">
                        {todayDoses.filter(d => d.isTaken).length}/{todayDoses.length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
        )}
      </main>

      {/* Floating Action Button */}
      <FloatingActionButton
        actions={[
          {
            label: "Add Medication",
            icon: <Pill className="h-6 w-6" />,
            onClick: () => navigate("/medications/add"),
            color: "bg-primary hover:bg-primary/90",
          },
          {
            label: "Add Script",
            icon: <FileText className="h-6 w-6" />,
            onClick: () => setShowPrescriptionUpload(true),
            color: "bg-blue-500 hover:bg-blue-600",
          },
          {
            label: "Add Dose",
            icon: <Clock className="h-6 w-6" />,
            onClick: () => navigate("/medications/add"),
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
          isTaken={selectedDose.isTaken}
          isSkipped={selectedDose.isSkipped}
          isSnoozed={selectedDose.isSnoozed}
          doseLogs={doseLogs}
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

      {/* Bulk Prescription Upload Dialog */}
      <BulkPrescriptionUpload
        open={showPrescriptionUpload}
        onOpenChange={setShowPrescriptionUpload}
        onComplete={() => {
          fetchMedications();
          toast.success("Medications added successfully!");
        }}
      />
    </div>
  );
};

export default Dashboard;
