import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Session } from "@supabase/supabase-js";

interface Schedule {
  time_of_day: string;
  with_food: boolean;
  special_instructions: string;
}

const Medications = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [form, setForm] = useState("");
  const [instructions, setInstructions] = useState("");
  const [totalPills, setTotalPills] = useState("");
  const [schedules, setSchedules] = useState<Schedule[]>([
    { time_of_day: "08:00", with_food: false, special_instructions: "" }
  ]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      
      if (!currentSession) {
        navigate("/auth");
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (!session) {
          navigate("/auth");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const addSchedule = () => {
    setSchedules([...schedules, { time_of_day: "08:00", with_food: false, special_instructions: "" }]);
  };

  const removeSchedule = (index: number) => {
    if (schedules.length > 1) {
      setSchedules(schedules.filter((_, i) => i !== index));
    }
  };

  const updateSchedule = (index: number, field: keyof Schedule, value: any) => {
    const newSchedules = [...schedules];
    newSchedules[index] = { ...newSchedules[index], [field]: value };
    setSchedules(newSchedules);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session) {
      toast.error("Please sign in first");
      return;
    }

    setLoading(true);

    try {
      const { data: medData, error: medError } = await supabase
        .from("medications")
        .insert([
          {
            user_id: session.user.id,
            name,
            dosage,
            form: form || null,
            instructions: instructions || null,
            total_pills: totalPills ? parseInt(totalPills) : null,
            pills_remaining: totalPills ? parseInt(totalPills) : null,
            active: true,
          },
        ])
        .select()
        .single();

      if (medError) throw medError;

      const scheduleInserts = schedules.map(schedule => ({
        medication_id: medData.id,
        time_of_day: schedule.time_of_day,
        with_food: schedule.with_food,
        special_instructions: schedule.special_instructions || null,
        active: true,
      }));

      const { error: schedError } = await supabase
        .from("medication_schedules")
        .insert(scheduleInserts);

      if (schedError) throw schedError;

      toast.success("Medication added successfully!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to add medication");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Button onClick={() => navigate("/dashboard")} variant="ghost" size="lg" className="mb-4">
            <ArrowLeft className="w-6 h-6 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">Add New Medication</h1>
          <p className="text-lg text-muted-foreground mt-2">
            Enter your medication details and schedule
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Medication Information</CardTitle>
              <CardDescription className="text-lg">
                Basic details about your medication
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="name" className="text-lg font-semibold">
                  Medication Name *
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Aspirin"
                  required
                  className="text-lg h-14"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="dosage" className="text-lg font-semibold">
                  Dosage *
                </Label>
                <Input
                  id="dosage"
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  placeholder="e.g., 100mg"
                  required
                  className="text-lg h-14"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="form" className="text-lg font-semibold">
                  Form
                </Label>
                <Select value={form} onValueChange={setForm}>
                  <SelectTrigger className="text-lg h-14">
                    <SelectValue placeholder="Select form" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pill" className="text-lg">Pill/Tablet</SelectItem>
                    <SelectItem value="capsule" className="text-lg">Capsule</SelectItem>
                    <SelectItem value="liquid" className="text-lg">Liquid</SelectItem>
                    <SelectItem value="injection" className="text-lg">Injection</SelectItem>
                    <SelectItem value="cream" className="text-lg">Cream/Ointment</SelectItem>
                    <SelectItem value="inhaler" className="text-lg">Inhaler</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label htmlFor="instructions" className="text-lg font-semibold">
                  General Instructions
                </Label>
                <Input
                  id="instructions"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g., Take with water"
                  className="text-lg h-14"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="totalPills" className="text-lg font-semibold">
                  Total Pills/Doses
                </Label>
                <Input
                  id="totalPills"
                  type="number"
                  value={totalPills}
                  onChange={(e) => setTotalPills(e.target.value)}
                  placeholder="e.g., 30"
                  min="1"
                  className="text-lg h-14"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-2xl">Schedule</CardTitle>
                  <CardDescription className="text-lg mt-2">
                    When should you take this medication?
                  </CardDescription>
                </div>
                <Button type="button" onClick={addSchedule} size="lg">
                  <Plus className="w-5 h-5 mr-2" />
                  Add Time
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {schedules.map((schedule, index) => (
                <Card key={index} className="bg-muted/50">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xl font-semibold">Dose #{index + 1}</h4>
                      {schedules.length > 1 && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeSchedule(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-3">
                      <Label className="text-lg font-semibold">Time</Label>
                      <Input
                        type="time"
                        value={schedule.time_of_day}
                        onChange={(e) => updateSchedule(index, "time_of_day", e.target.value)}
                        required
                        className="text-lg h-14"
                      />
                    </div>

                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id={`with-food-${index}`}
                        checked={schedule.with_food}
                        onCheckedChange={(checked) =>
                          updateSchedule(index, "with_food", checked)
                        }
                        className="w-6 h-6"
                      />
                      <Label htmlFor={`with-food-${index}`} className="text-lg cursor-pointer">
                        Take with food
                      </Label>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-lg font-semibold">Special Instructions</Label>
                      <Input
                        value={schedule.special_instructions}
                        onChange={(e) =>
                          updateSchedule(index, "special_instructions", e.target.value)
                        }
                        placeholder="e.g., Before exercise"
                        className="text-lg h-14"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button
              type="submit"
              size="lg"
              className="flex-1 text-xl h-16"
              disabled={loading}
            >
              {loading ? "Adding..." : "Add Medication"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => navigate("/dashboard")}
              className="text-xl h-16"
            >
              Cancel
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default Medications;
