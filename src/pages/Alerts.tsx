import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, AlertCircle, Clock, CheckCircle, ChevronRight, Settings, BellOff } from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { useNotification } from "@/hooks/use-notification";

interface Medication {
  id: string;
  name: string;
  dosage: string;
  pills_remaining: number | null;
}

interface Schedule {
  id: string;
  medication_id: string;
  time_of_day: string;
}

interface AlertDose {
  medication: Medication;
  schedule: Schedule;
  scheduledTime: Date;
  log?: {
    id: string;
    status: string;
    snooze_until?: string;
  };
}

const Alerts = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [missedDoses, setMissedDoses] = useState<AlertDose[]>([]);
  const [upcomingDoses, setUpcomingDoses] = useState<AlertDose[]>([]);
  const { preferences, sendNotification } = useNotification();

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      // Get medications
      const { data: medications, error: medsError } = await supabase
        .from("medications")
        .select("id, name, dosage, pills_remaining")
        .eq("user_id", session.user.id)
        .eq("active", true);

      if (medsError) throw medsError;

      if (!medications || medications.length === 0) {
        setLoading(false);
        return;
      }

      // Get schedules
      const medIds = medications.map(m => m.id);
      const { data: schedules, error: schedError } = await supabase
        .from("medication_schedules")
        .select("*")
        .in("medication_id", medIds)
        .eq("active", true);

      if (schedError) throw schedError;

      // Get today's logs
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const { data: logs } = await supabase
        .from("dose_logs")
        .select("*")
        .gte("scheduled_time", startOfDay.toISOString())
        .lte("scheduled_time", endOfDay.toISOString());

      const now = new Date();
      const currentDay = now.getDay();
      const missed: AlertDose[] = [];
      const upcoming: AlertDose[] = [];

      schedules?.forEach(schedule => {
        // Check if today is in the days_of_week
        if (schedule.days_of_week && !schedule.days_of_week.includes(currentDay)) {
          return;
        }

        const medication = medications.find(m => m.id === schedule.medication_id);
        if (!medication) return;

        const [hours, minutes] = schedule.time_of_day.split(":").map(Number);
        const scheduleTime = new Date();
        scheduleTime.setHours(hours, minutes, 0, 0);

        const log = logs?.find(l => 
          l.schedule_id === schedule.id &&
          new Date(l.scheduled_time).getHours() === hours &&
          new Date(l.scheduled_time).getMinutes() === minutes
        );

        const timeDiff = scheduleTime.getTime() - now.getTime();
        const minutesDiff = timeDiff / (1000 * 60);

        // Missed doses: past 30 minutes and not taken/skipped
        if (minutesDiff <= -30 && (!log || (log.status !== "taken" && log.status !== "skipped"))) {
          missed.push({
            medication,
            schedule,
            scheduledTime: scheduleTime,
            log,
          });
        }
        // Upcoming doses: future doses not yet taken
        else if (minutesDiff > 0 && minutesDiff <= 480 && (!log || log.status === "pending")) {
          upcoming.push({
            medication,
            schedule,
            scheduledTime: scheduleTime,
            log,
          });
        }
      });

      missed.sort((a, b) => b.scheduledTime.getTime() - a.scheduledTime.getTime());
      upcoming.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());

      setMissedDoses(missed);
      setUpcomingDoses(upcoming);

      // Send notifications for upcoming doses
      if (preferences?.enabled && preferences?.browser_enabled) {
        upcoming.slice(0, 3).forEach((dose) => {
          const timeUntil = dose.scheduledTime.getTime() - Date.now();
          const minutesUntil = Math.floor(timeUntil / (1000 * 60));
          
          if (minutesUntil <= (preferences?.reminder_minutes_before || 15) && minutesUntil > 0) {
            sendNotification(
              `Time for ${dose.medication.name}`,
              {
                body: `Your ${dose.medication.dosage} dose is due at ${format(dose.scheduledTime, "h:mm a")}`,
                tag: `dose-${dose.schedule.id}`,
                requireInteraction: true,
              }
            );
          }
        });

        // Send notifications for missed doses
        if (preferences?.remind_for_missed && missed.length > 0) {
          missed.slice(0, 2).forEach((dose) => {
            sendNotification(
              `Missed: ${dose.medication.name}`,
              {
                body: `You missed your ${dose.medication.dosage} dose scheduled for ${format(dose.scheduledTime, "h:mm a")}`,
                tag: `missed-${dose.schedule.id}`,
                requireInteraction: true,
              }
            );
          });
        }
      }
    } catch (error) {
      console.error("Failed to load alerts:", error);
      toast.error("Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }, [navigate, sendNotification, preferences]);

  useEffect(() => {
    fetchAlerts();
    
    // Set up interval to check for alerts every minute
    const interval = setInterval(fetchAlerts, 60000);
    
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const handleTakeNow = async (dose: AlertDose) => {
    try {
      const { error } = await supabase.from("dose_logs").insert([
        {
          medication_id: dose.medication.id,
          schedule_id: dose.schedule.id,
          scheduled_time: dose.scheduledTime.toISOString(),
          taken_at: new Date().toISOString(),
          status: "taken",
        },
      ]);

      if (error) throw error;

      if (dose.medication.pills_remaining && dose.medication.pills_remaining > 0) {
        await supabase
          .from("medications")
          .update({ pills_remaining: dose.medication.pills_remaining - 1 })
          .eq("id", dose.medication.id);
      }

      toast.success(`✅ ${dose.medication.name} marked as taken!`);
      fetchAlerts();
    } catch (error) {
      console.error("Failed to mark as taken:", error);
      toast.error("Failed to mark dose as taken");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="bg-background border-b border-border pb-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Alert Center</h1>
            <p className="text-muted-foreground text-lg">Stay on track with your medications</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/profile")}
            className="shrink-0"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Notification Status */}
        <div className="flex items-center gap-3 flex-wrap">
          {preferences?.enabled && preferences?.browser_enabled ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-success/10 text-success rounded-full text-sm">
              <Bell className="w-4 h-4" />
              <span>Notifications Active</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 text-destructive rounded-full text-sm">
              <BellOff className="w-4 h-4" />
              <span>Notifications Disabled</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-8">
        {/* Urgent Alerts */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Urgent Alerts</h2>
          {missedDoses.length === 0 ? (
            <Card className="border-border">
              <CardContent className="py-8 text-center text-muted-foreground">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-success" />
                <p className="text-lg">No missed doses - great job!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {missedDoses.map((dose, idx) => (
                <Card key={`${dose.schedule.id}-${idx}`} className="border-l-4 border-l-destructive">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-start gap-3 flex-1">
                      <AlertCircle className="w-6 h-6 text-destructive mt-1 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg mb-1">
                          Missed Dose: {dose.medication.name}
                        </h3>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>{formatDistanceToNow(dose.scheduledTime, { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleTakeNow(dose)}
                      className="bg-cyan-500 hover:bg-cyan-600 text-white shrink-0"
                      size="lg"
                    >
                      Take Now
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Today's Reminders */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Today's Reminders</h2>
          {upcomingDoses.length === 0 ? (
            <Card className="border-border">
              <CardContent className="py-8 text-center text-muted-foreground">
                <Bell className="w-12 h-12 mx-auto mb-2" />
                <p className="text-lg">No upcoming doses for today</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {upcomingDoses.slice(0, 5).map((dose, idx) => (
                <Card key={`${dose.schedule.id}-${idx}`} className="border-l-4 border-l-primary">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-start gap-3 flex-1">
                      <Bell className="w-6 h-6 text-primary mt-1 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg mb-1">{dose.medication.name}</h3>
                        <p className="text-muted-foreground mb-1">Due</p>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>{format(dose.scheduledTime, "h:mm a")}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => navigate("/dashboard")}
                      className="bg-cyan-500 hover:bg-cyan-600 text-white shrink-0"
                      size="lg"
                    >
                      Set Reminder
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Recent Updates */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Recent Updates</h2>
          <Card className="border-border hover:bg-accent/5 transition-colors cursor-pointer" onClick={() => navigate("/medications")}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="bg-success/10 rounded-full p-2 mt-1 shrink-0">
                  <CheckCircle className="w-5 h-5 text-success" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg mb-1">Medication Refill Ready</h3>
                  <p className="text-muted-foreground mb-2">Your prescription is ready for pickup</p>
                  <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                    <Clock className="w-4 h-4" />
                    <span>2:30 PM</span>
                  </div>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-muted-foreground shrink-0" />
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
};

export default Alerts;
