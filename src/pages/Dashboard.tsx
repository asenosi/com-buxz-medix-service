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

            doses.push({
              medication: med,
              schedule,
              nextDoseTime: doseTime,
              status,
              isTaken: doseLog?.status === "taken",
              isSkipped: doseLog?.status === "skipped",
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
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-primary rounded-full p-3">
                <Pill className="w-8 h-8 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">MedTracker</h1>
                <p className="text-lg text-muted-foreground">Your medication companion</p>
              </div>
            </div>
            <Button onClick={handleSignOut} variant="outline" size="lg">
              <LogOut className="w-5 h-5 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Button onClick={() => navigate("/medications")} size="lg" className="text-xl">
            <Plus className="w-6 h-6 mr-2" />
            Add Medication
          </Button>
        </div>

        {medications.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <Pill className="w-20 h-20 text-muted-foreground mx-auto mb-6" />
              <h2 className="text-2xl font-semibold mb-3">No Medications Yet</h2>
              <p className="text-xl text-muted-foreground mb-6">
                Get started by adding your first medication
              </p>
              <Button onClick={() => navigate("/medications")} size="lg" className="text-xl">
                <Plus className="w-6 h-6 mr-2" />
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

            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Today's Schedule</h2>
              {todayDoses.length === 0 ? (
                <Card className="text-center py-8">
                  <CardContent>
                    <p className="text-xl text-muted-foreground">
                      No medications scheduled for today
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {todayDoses.map((dose, idx) => (
                    <DoseCard
                      key={`${dose.schedule.id}-${idx}`}
                      dose={dose}
                      onMarkTaken={markAsTaken}
                      onMarkSkipped={markAsSkipped}
                    />
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">All Medications</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {medications.map((med) => (
                  <Card key={med.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-xl">{med.name}</CardTitle>
                      <CardDescription className="text-lg">
                        {med.dosage}
                        {med.form && ` • ${med.form}`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {med.pills_remaining !== null && (
                        <p className="text-lg text-muted-foreground">
                          {med.pills_remaining} pills remaining
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
