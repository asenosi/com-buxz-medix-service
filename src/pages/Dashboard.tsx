import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, LogOut, Pill } from "lucide-react";
import { toast } from "sonner";
import { Session } from "@supabase/supabase-js";
import { DoseCard } from "@/components/DoseCard";
import { AdherenceStats } from "@/components/AdherenceStats";

interface Medication {
  id: string;
  name: string;
  dosage: string;
  form: string | null;
  pills_remaining: number | null;
  active: boolean;
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
      }

      setLoading(false);

      return () => subscription.unsubscribe();
    };

    initAuth();
  }, [navigate]);

  const fetchMedications = async () => {
    try {
      const { data: medsData, error: medsError } = await supabase
        .from("medications")
        .select("*")
        .eq("active", true)
        .order("name");

      if (medsError) throw medsError;

      setMedications(medsData || []);

      if (medsData && medsData.length > 0) {
        const medIds = medsData.map(m => m.id);
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

        medsData.forEach(med => {
          const medSchedules = schedulesData?.filter(s => s.medication_id === med.id) || [];
          
          medSchedules.forEach(schedule => {
            // Check if today is in the days_of_week array
            if (schedule.days_of_week && !schedule.days_of_week.includes(currentDay)) {
              return; // Skip this schedule if today is not in the recurring days
            }

            const [hours, minutes] = schedule.time_of_day.split(":").map(Number);
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

            // Skip snoozed doses if their snooze time hasn't passed yet
            if (doseLog?.status === "snoozed" && doseLog.snooze_until) {
              const snoozeUntil = new Date(doseLog.snooze_until);
              if (now < snoozeUntil) {
                return; // Don't show this dose yet
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
    } catch (error: any) {
      toast.error("Failed to load medications");
      console.error(error);
    }
  };

  const fetchGamificationStats = async () => {
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
    } catch (error: any) {
      console.error("Failed to fetch gamification stats:", error);
    }
  };

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
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
      toast.error("Failed to snooze");
      console.error(error);
    }
  };

  const handleEditMedication = (medicationId: string) => {
    navigate(`/medications?edit=${medicationId}`);
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

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border shadow-sm sticky top-0 z-50 backdrop-blur-sm bg-card/95 animate-slide-down">
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
            <Button onClick={handleSignOut} variant="outline" size="lg" className="w-full sm:w-auto hover:scale-105 transition-transform">
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8 animate-fade-in">
          <Button 
            onClick={() => navigate("/medications")} 
            size="lg" 
            className="w-full sm:w-auto text-lg sm:text-xl hover:scale-105 transition-all duration-300 hover:shadow-xl animate-bounce-subtle"
          >
            <Plus className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
            Add Medication
          </Button>
        </div>

        {medications.length === 0 ? (
          <Card className="text-center py-12 sm:py-16 animate-fade-in">
            <CardContent>
              <Pill className="w-16 h-16 sm:w-20 sm:h-20 text-muted-foreground mx-auto mb-4 sm:mb-6 animate-pulse" />
              <h2 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-3">No Medications Yet</h2>
              <p className="text-lg sm:text-xl text-muted-foreground mb-4 sm:mb-6 px-4">
                Get started by adding your first medication
              </p>
              <Button 
                onClick={() => navigate("/medications")} 
                size="lg" 
                className="w-full sm:w-auto text-lg sm:text-xl hover:scale-105 transition-transform"
              >
                <Plus className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                Add Your First Medication
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <AdherenceStats
              streak={streak}
              todayProgress={todayProgress}
              weeklyAdherence={weeklyAdherence}
              totalTaken={totalTaken}
            />

            <div className="mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 animate-slide-in-left">Today's Schedule</h2>
              {todayDoses.length === 0 ? (
                <Card className="text-center py-6 sm:py-8 animate-fade-in">
                  <CardContent>
                    <p className="text-lg sm:text-xl text-muted-foreground px-4">
                      No medications scheduled for today
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3 sm:gap-4">
                  {todayDoses.map((dose, idx) => (
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
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 animate-slide-in-left">All Medications</h2>
              <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {medications.map((med, idx) => (
                  <Card 
                    key={med.id} 
                    className="hover:shadow-xl hover:scale-[1.02] transition-all duration-300 animate-scale-in cursor-pointer"
                    style={{ animationDelay: `${idx * 0.1}s` }}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg sm:text-xl">{med.name}</CardTitle>
                      <CardDescription className="text-base sm:text-lg">
                        {med.dosage}
                        {med.form && ` • ${med.form}`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {med.pills_remaining !== null && (
                        <p className="text-base sm:text-lg text-muted-foreground">
                          {med.pills_remaining} remaining
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
