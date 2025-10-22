import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, LogOut, Pill, Clock, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Session } from "@supabase/supabase-js";

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
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [todayDoses, setTodayDoses] = useState<TodayDose[]>([]);

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

        const doses: TodayDose[] = [];
        const now = new Date();

        medsData.forEach(med => {
          const medSchedules = schedulesData?.filter(s => s.medication_id === med.id) || [];
          
          medSchedules.forEach(schedule => {
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

            doses.push({
              medication: med,
              schedule,
              nextDoseTime: doseTime,
              status,
            });
          });
        });

        doses.sort((a, b) => a.nextDoseTime.getTime() - b.nextDoseTime.getTime());
        setTodayDoses(doses);
      }
    } catch (error: any) {
      toast.error("Failed to load medications");
      console.error(error);
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

      toast.success(`Marked ${dose.medication.name} as taken!`);
      fetchMedications();
    } catch (error: any) {
      toast.error("Failed to log dose");
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
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Today's Schedule</h2>
              <div className="grid gap-4">
                {todayDoses.map((dose, idx) => (
                  <Card
                    key={`${dose.schedule.id}-${idx}`}
                    className={`border-l-4 ${
                      dose.status === "overdue"
                        ? "border-l-destructive"
                        : dose.status === "due"
                        ? "border-l-accent"
                        : "border-l-primary"
                    }`}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-2xl">{dose.medication.name}</CardTitle>
                          <CardDescription className="text-lg mt-2">
                            {dose.medication.dosage}
                            {dose.medication.form && ` • ${dose.medication.form}`}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-6 h-6 text-muted-foreground" />
                          <span className="text-2xl font-semibold">
                            {dose.nextDoseTime.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-4 mb-4 text-lg">
                        {dose.schedule.with_food && (
                          <span className="text-muted-foreground">Take with food</span>
                        )}
                        {dose.schedule.special_instructions && (
                          <span className="text-muted-foreground">
                            {dose.schedule.special_instructions}
                          </span>
                        )}
                        {dose.medication.pills_remaining !== null && (
                          <span className="text-muted-foreground">
                            {dose.medication.pills_remaining} pills remaining
                          </span>
                        )}
                      </div>
                      <div className="flex gap-3">
                        <Button
                          onClick={() => markAsTaken(dose)}
                          size="lg"
                          className="flex-1 text-xl"
                          variant="default"
                        >
                          <CheckCircle2 className="w-6 h-6 mr-2" />
                          I Took This
                        </Button>
                        <Button size="lg" variant="outline" className="text-xl">
                          <XCircle className="w-6 h-6 mr-2" />
                          Skip
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
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
