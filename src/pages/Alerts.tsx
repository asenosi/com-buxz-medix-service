import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, AlertCircle, Clock, CheckCircle, ChevronRight, Settings, BellOff, CalendarCheck } from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow, isToday, isTomorrow } from "date-fns";
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

interface Appointment {
  id: string;
  title: string;
  appointment_date: string;
  appointment_time: string;
  appointment_type: string;
  doctor_name: string | null;
  location: string | null;
}

const Alerts = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [missedDoses, setMissedDoses] = useState<AlertDose[]>([]);
  const [upcomingDoses, setUpcomingDoses] = useState<AlertDose[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
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

      // Fetch upcoming appointments (next 7 days)
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const { data: appointments } = await supabase
        .from("appointments")
        .select("id, title, appointment_date, appointment_time, appointment_type, doctor_name, location")
        .eq("user_id", session.user.id)
        .eq("status", "scheduled")
        .gte("appointment_date", new Date().toISOString().split('T')[0])
        .lte("appointment_date", sevenDaysFromNow.toISOString().split('T')[0])
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true })
        .limit(5);

      setUpcomingAppointments(appointments || []);

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Alerts</h1>
          <p className="text-sm text-muted-foreground">Stay on track with your medications</p>
        </div>
        <div className="flex items-center gap-2">
          {preferences?.enabled && preferences?.browser_enabled ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-success/10 text-success rounded-full text-xs">
              <Bell className="w-3 h-3" />
              <span>Active</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-muted text-muted-foreground rounded-full text-xs">
              <BellOff className="w-3 h-3" />
              <span>Off</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/notification-settings")}
            className="h-8 w-8"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Urgent Alerts */}
        {missedDoses.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Urgent</h2>
            <div className="space-y-2">
              {missedDoses.map((dose, idx) => (
                <Card 
                  key={`${dose.schedule.id}-${idx}`} 
                  className="border-l-2 border-l-destructive hover:bg-accent/5 transition-colors cursor-pointer"
                  onClick={() => navigate(`/medications/${dose.medication.id}`)}
                >
                  <CardContent className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm mb-0.5">
                          {dose.medication.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(dose.scheduledTime, { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTakeNow(dose);
                      }}
                      size="sm"
                      className="shrink-0"
                    >
                      Take Now
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Today's Medication Reminders */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Upcoming Medications</h2>
          {upcomingDoses.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-success" />
                <p className="text-sm text-muted-foreground">All caught up!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {upcomingDoses.slice(0, 5).map((dose, idx) => (
                <Card key={`${dose.schedule.id}-${idx}`}>
                  <CardContent className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Bell className="w-4 h-4 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm mb-0.5">{dose.medication.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {format(dose.scheduledTime, "h:mm a")}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => navigate("/dashboard")}
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                    >
                      View
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Upcoming Appointments */}
        {upcomingAppointments.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Upcoming Appointments</h2>
            <div className="space-y-2">
              {upcomingAppointments.map((appointment) => {
                const appointmentDate = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
                const dateLabel = isToday(appointmentDate) 
                  ? "Today" 
                  : isTomorrow(appointmentDate) 
                  ? "Tomorrow" 
                  : format(appointmentDate, "MMM d");
                
                return (
                  <Card 
                    key={appointment.id}
                    className="hover:bg-accent/5 transition-colors cursor-pointer"
                    onClick={() => navigate(`/appointments/${appointment.id}`)}
                  >
                    <CardContent className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <CalendarCheck className="w-4 h-4 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm mb-0.5">{appointment.title}</h3>
                          <p className="text-xs text-muted-foreground">
                            {dateLabel} at {format(appointmentDate, "h:mm a")}
                            {appointment.doctor_name && ` • ${appointment.doctor_name}`}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* Recent Updates */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Recent</h2>
          <Card className="hover:bg-accent/5 transition-colors cursor-pointer" onClick={() => navigate("/medications")}>
            <CardContent className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="bg-success/10 rounded-full p-1.5 shrink-0">
                  <CheckCircle className="w-3.5 h-3.5 text-success" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm mb-0.5">Medication Refill Ready</h3>
                  <p className="text-xs text-muted-foreground">Your prescription is ready for pickup</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
};

export default Alerts;
