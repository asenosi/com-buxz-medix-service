import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  days_of_week?: number[];
}

interface IntervalSchedule {
  enabled: boolean;
  doses_per_day: number;
  interval_hours: number;
  start_time: string;
  with_food: boolean;
  special_instructions: string;
  days_of_week: number[];
}

const Medications = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editMedicationId = searchParams.get("edit");
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [form, setForm] = useState("");
  const [instructions, setInstructions] = useState("");
  const [totalPills, setTotalPills] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([
    { time_of_day: "08:00", with_food: false, special_instructions: "", days_of_week: [0,1,2,3,4,5,6] }
  ]);
  const [useInterval, setUseInterval] = useState(false);
  const [intervalSchedule, setIntervalSchedule] = useState<IntervalSchedule>({
    enabled: false,
    doses_per_day: 2,
    interval_hours: 12,
    start_time: "08:00",
    with_food: false,
    special_instructions: "",
    days_of_week: [0,1,2,3,4,5,6]
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      
      if (!currentSession) {
        navigate("/auth");
      } else if (editMedicationId) {
        loadMedicationData(editMedicationId);
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
  }, [navigate, editMedicationId]);

  const loadMedicationData = async (medicationId: string) => {
    setLoadingData(true);
    try {
      const { data: medData, error: medError } = await supabase
        .from("medications")
        .select("*")
        .eq("id", medicationId)
        .single();

      if (medError) throw medError;

      setName(medData.name);
      setDosage(medData.dosage);
      setForm(medData.form || "");
      setInstructions(medData.instructions || "");
      setTotalPills(medData.total_pills?.toString() || "");
      setImageUrl(medData.image_url || null);

      const { data: schedData, error: schedError } = await supabase
        .from("medication_schedules")
        .select("*")
        .eq("medication_id", medicationId)
        .eq("active", true);

      if (schedError) throw schedError;

      if (schedData && schedData.length > 0) {
        setSchedules(schedData.map(s => ({
          time_of_day: s.time_of_day,
          with_food: s.with_food,
          special_instructions: s.special_instructions || "",
          days_of_week: s.days_of_week || [0,1,2,3,4,5,6]
        })));
      }
    } catch (error: any) {
      toast.error("Failed to load medication data");
      console.error(error);
    } finally {
      setLoadingData(false);
    }
  };

  const addSchedule = () => {
    setSchedules([...schedules, { time_of_day: "08:00", with_food: false, special_instructions: "", days_of_week: [0,1,2,3,4,5,6] }]);
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

  const generateIntervalSchedules = (): Schedule[] => {
    const generated: Schedule[] = [];
    const [startHours, startMinutes] = intervalSchedule.start_time.split(":").map(Number);
    
    for (let i = 0; i < intervalSchedule.doses_per_day; i++) {
      const totalMinutes = startHours * 60 + startMinutes + (i * intervalSchedule.interval_hours * 60);
      const hours = Math.floor(totalMinutes / 60) % 24;
      const minutes = totalMinutes % 60;
      const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      
      generated.push({
        time_of_day: timeString,
        with_food: intervalSchedule.with_food,
        special_instructions: intervalSchedule.special_instructions,
        days_of_week: intervalSchedule.days_of_week
      });
    }
    
    return generated;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session) {
      toast.error("Please sign in first");
      return;
    }

    setLoading(true);

    try {
      let uploadedImageUrl = imageUrl;

      // Upload image if there's a new file
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${session.user.id}/${Math.random()}.${fileExt}`;
        
        const { error: uploadError, data } = await supabase.storage
          .from('medication-images')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;
        
        uploadedImageUrl = supabase.storage
          .from('medication-images')
          .getPublicUrl(fileName).data.publicUrl;
      }

      if (editMedicationId) {
        // Update existing medication
        const { error: medError } = await supabase
          .from("medications")
          .update({
            name,
            dosage,
            form: form || null,
            instructions: instructions || null,
            total_pills: totalPills ? parseInt(totalPills) : null,
            image_url: uploadedImageUrl,
          })
          .eq("id", editMedicationId);

        if (medError) throw medError;

        // Delete old schedules
        const { error: deleteError } = await supabase
          .from("medication_schedules")
          .delete()
          .eq("medication_id", editMedicationId);

        if (deleteError) throw deleteError;

        // Insert new schedules
        const schedulesToInsert = useInterval ? generateIntervalSchedules() : schedules;
        const scheduleInserts = schedulesToInsert.map(schedule => ({
          medication_id: editMedicationId,
          time_of_day: schedule.time_of_day,
          with_food: schedule.with_food,
          special_instructions: schedule.special_instructions || null,
          days_of_week: schedule.days_of_week || null,
          active: true,
        }));

        const { error: schedError } = await supabase
          .from("medication_schedules")
          .insert(scheduleInserts);

        if (schedError) throw schedError;

        toast.success("Medication updated successfully!");
      } else {
        // Create new medication
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
              image_url: uploadedImageUrl,
            },
          ])
          .select()
          .single();

        if (medError) throw medError;

        const schedulesToInsert = useInterval ? generateIntervalSchedules() : schedules;
        const scheduleInserts = schedulesToInsert.map(schedule => ({
          medication_id: medData.id,
          time_of_day: schedule.time_of_day,
          with_food: schedule.with_food,
          special_instructions: schedule.special_instructions || null,
          days_of_week: schedule.days_of_week || null,
          active: true,
        }));

        const { error: schedError } = await supabase
          .from("medication_schedules")
          .insert(scheduleInserts);

        if (schedError) throw schedError;

        toast.success("Medication added successfully!");
      }
      
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || `Failed to ${editMedicationId ? 'update' : 'add'} medication`);
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
          <h1 className="text-3xl font-bold">{editMedicationId ? "Edit Medication" : "Add New Medication"}</h1>
          <p className="text-lg text-muted-foreground mt-2">
            {editMedicationId ? "Update your medication details and schedule" : "Enter your medication details and schedule"}
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loadingData ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-xl text-muted-foreground">Loading medication data...</p>
            </div>
          </div>
        ) : (
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
                    <SelectItem value="eye_drops" className="text-lg">Eye Drops</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label htmlFor="dosage" className="text-lg font-semibold">
                  {form === "cream" || form === "inhaler" || form === "eye_drops" 
                    ? "Application/Usage *" 
                    : "Dosage *"}
                </Label>
                <Input
                  id="dosage"
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  placeholder={
                    form === "cream" ? "e.g., Apply thin layer" :
                    form === "inhaler" ? "e.g., 2 puffs" :
                    form === "eye_drops" ? "e.g., 1 drop per eye" :
                    "e.g., 100mg"
                  }
                  required
                  className="text-lg h-14"
                />
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

              <div className="space-y-3">
                <Label htmlFor="image" className="text-lg font-semibold">
                  Medication Image
                </Label>
                {imageUrl && !imageFile && (
                  <div className="mb-3">
                    <img 
                      src={imageUrl} 
                      alt="Current medication" 
                      className="w-32 h-32 object-cover rounded-lg border-2 border-border"
                    />
                  </div>
                )}
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="text-lg h-14"
                />
                <p className="text-sm text-muted-foreground">
                  Upload a picture of your medication for easy identification
                </p>
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
                {!useInterval && (
                  <Button type="button" onClick={addSchedule} size="lg">
                    <Plus className="w-5 h-5 mr-2" />
                    Add Time
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-4 mb-6">
                <Button
                  type="button"
                  variant={!useInterval ? "default" : "outline"}
                  onClick={() => setUseInterval(false)}
                  size="lg"
                  className="flex-1"
                >
                  Manual Times
                </Button>
                <Button
                  type="button"
                  variant={useInterval ? "default" : "outline"}
                  onClick={() => setUseInterval(true)}
                  size="lg"
                  className="flex-1"
                >
                  Interval-Based
                </Button>
              </div>

              {useInterval ? (
                <Card className="bg-muted/50">
                  <CardContent className="pt-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <Label className="text-lg font-semibold">Doses Per Day</Label>
                        <Input
                          type="number"
                          min="1"
                          max="24"
                          value={intervalSchedule.doses_per_day}
                          onChange={(e) => setIntervalSchedule({
                            ...intervalSchedule,
                            doses_per_day: parseInt(e.target.value) || 1
                          })}
                          className="text-lg h-14"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-lg font-semibold">Every (hours)</Label>
                        <Input
                          type="number"
                          min="1"
                          max="24"
                          value={intervalSchedule.interval_hours}
                          onChange={(e) => setIntervalSchedule({
                            ...intervalSchedule,
                            interval_hours: parseInt(e.target.value) || 1
                          })}
                          className="text-lg h-14"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-lg font-semibold">Start Time</Label>
                      <Input
                        type="time"
                        value={intervalSchedule.start_time}
                        onChange={(e) => setIntervalSchedule({
                          ...intervalSchedule,
                          start_time: e.target.value
                        })}
                        className="text-lg h-14"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-lg font-semibold">Repeat On</Label>
                      <div className="flex flex-wrap gap-2">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, dayIdx) => (
                          <Button
                            key={dayIdx}
                            type="button"
                            variant={intervalSchedule.days_of_week.includes(dayIdx) ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              const newDays = intervalSchedule.days_of_week.includes(dayIdx)
                                ? intervalSchedule.days_of_week.filter(d => d !== dayIdx)
                                : [...intervalSchedule.days_of_week, dayIdx].sort();
                              setIntervalSchedule({ ...intervalSchedule, days_of_week: newDays });
                            }}
                            className="text-base"
                          >
                            {day}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="interval-with-food"
                        checked={intervalSchedule.with_food}
                        onCheckedChange={(checked) =>
                          setIntervalSchedule({ ...intervalSchedule, with_food: !!checked })
                        }
                        className="w-6 h-6"
                      />
                      <Label htmlFor="interval-with-food" className="text-lg cursor-pointer">
                        Take with food
                      </Label>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-lg font-semibold">Special Instructions</Label>
                      <Input
                        value={intervalSchedule.special_instructions}
                        onChange={(e) =>
                          setIntervalSchedule({ ...intervalSchedule, special_instructions: e.target.value })
                        }
                        placeholder="e.g., Apply 4 times, 6 hourly"
                        className="text-lg h-14"
                      />
                    </div>

                    <div className="bg-primary/10 p-4 rounded-lg">
                      <p className="text-sm font-semibold mb-2">Generated Times:</p>
                      <p className="text-base text-muted-foreground">
                        {generateIntervalSchedules().map(s => s.time_of_day).join(", ")}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                schedules.map((schedule, index) => (
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

                    <div className="space-y-3">
                      <Label className="text-lg font-semibold">Repeat On</Label>
                      <div className="flex flex-wrap gap-2">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, dayIdx) => (
                          <Button
                            key={dayIdx}
                            type="button"
                            variant={schedule.days_of_week?.includes(dayIdx) ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              const currentDays = schedule.days_of_week || [];
                              const newDays = currentDays.includes(dayIdx)
                                ? currentDays.filter(d => d !== dayIdx)
                                : [...currentDays, dayIdx].sort();
                              updateSchedule(index, "days_of_week", newDays);
                            }}
                            className="text-base"
                          >
                            {day}
                          </Button>
                        ))}
                      </div>
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
              ))
              )}
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button
              type="submit"
              size="lg"
              className="flex-1 text-xl h-16"
              disabled={loading}
            >
              {loading ? (editMedicationId ? "Updating..." : "Adding...") : (editMedicationId ? "Update Medication" : "Add Medication")}
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
        )}
      </main>
    </div>
  );
};

export default Medications;
