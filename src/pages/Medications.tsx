import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { Session } from "@supabase/supabase-js";
import { Step1Name } from "@/components/medication-wizard/Step1Name";
import { Step2Form } from "@/components/medication-wizard/Step2Form";
import { Step3Route } from "@/components/medication-wizard/Step3Route";
import { Step4Reason } from "@/components/medication-wizard/Step4Reason";
import { Step5Frequency } from "@/components/medication-wizard/Step5Frequency";
import { Step6Options } from "@/components/medication-wizard/Step6Options";
import { Step7Review } from "@/components/medication-wizard/Step7Review";

const Medications = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 7;
  
  // Step 1
  const [name, setName] = useState("");
  
  // Step 2
  const [form, setForm] = useState("");
  
  // Step 3
  const [route, setRoute] = useState("");
  
  // Step 4
  const [reason, setReason] = useState("");
  const [dosage, setDosage] = useState("");
  
  // Step 5
  const [frequencyType, setFrequencyType] = useState("");
  const [times, setTimes] = useState<string[]>(["08:00"]);
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  
  // Step 6
  const [startDate, setStartDate] = useState("");
  const [treatmentDays, setTreatmentDays] = useState("");
  const [totalPills, setTotalPills] = useState("");
  const [refillThreshold, setRefillThreshold] = useState("");
  const [withFood, setWithFood] = useState("");
  const [instructions, setInstructions] = useState("");
  const [medicationColor, setMedicationColor] = useState("blue");
  const [medicationIcon, setMedicationIcon] = useState("pill");

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

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return name.trim() !== "";
      case 2:
        return form !== "";
      case 3:
        return route !== "";
      case 4:
        return reason.trim() !== "" && dosage.trim() !== "";
      case 5:
        return frequencyType !== "" && times.length > 0;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (canProceed() && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else if (!canProceed()) {
      toast.error("Please complete all required fields");
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session) {
      toast.error("Please sign in first");
      return;
    }

    if (!canProceed()) {
      toast.error("Please complete all required fields");
      return;
    }

    setLoading(true);

    try {
      // Calculate end date if treatment duration is provided
      let endDate = null;
      if (startDate && treatmentDays) {
        const start = new Date(startDate);
        start.setDate(start.getDate() + parseInt(treatmentDays));
        endDate = start.toISOString().split('T')[0];
      }

      // Create medication
      const { data: medData, error: medError } = await supabase
        .from("medications")
        .insert([
          {
            user_id: session.user.id,
            name,
            dosage,
            form: form || null,
            route_of_administration: route || null,
            reason_for_taking: reason || null,
            instructions: instructions || null,
            total_pills: totalPills ? parseInt(totalPills) : null,
            pills_remaining: totalPills ? parseInt(totalPills) : null,
            refill_reminder_threshold: refillThreshold ? parseInt(refillThreshold) : null,
            with_food_timing: withFood || null,
            start_date: startDate || null,
            end_date: endDate,
            treatment_duration_days: treatmentDays ? parseInt(treatmentDays) : null,
            medication_color: medicationColor,
            medication_icon: medicationIcon,
            active: true,
          },
        ])
        .select()
        .single();

      if (medError) throw medError;

      // Create schedules based on frequency type
      let scheduleInserts = [];
      
      if (frequencyType === "everyday") {
        scheduleInserts = times.map(time => ({
          medication_id: medData.id,
          time_of_day: time,
          with_food: withFood === "while" || withFood === "before" || withFood === "after",
          special_instructions: instructions || null,
          days_of_week: [0, 1, 2, 3, 4, 5, 6],
          active: true,
        }));
      } else if (frequencyType === "specific_days") {
        scheduleInserts = [{
          medication_id: medData.id,
          time_of_day: times[0],
          with_food: withFood === "while" || withFood === "before" || withFood === "after",
          special_instructions: instructions || null,
          days_of_week: selectedDays,
          active: true,
        }];
      } else if (frequencyType === "every_other_day") {
        scheduleInserts = [{
          medication_id: medData.id,
          time_of_day: times[0],
          with_food: withFood === "while" || withFood === "before" || withFood === "after",
          special_instructions: "Every other day",
          days_of_week: [0, 2, 4, 6],
          active: true,
        }];
      } else if (frequencyType === "as_needed") {
        scheduleInserts = [{
          medication_id: medData.id,
          time_of_day: "08:00",
          with_food: false,
          special_instructions: "As needed",
          days_of_week: null,
          active: true,
        }];
      }

      if (scheduleInserts.length > 0) {
        const { error: schedError } = await supabase
          .from("medication_schedules")
          .insert(scheduleInserts);

        if (schedError) throw schedError;
      }

      toast.success("Medication added successfully!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to add medication");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1Name name={name} setName={setName} />;
      case 2:
        return <Step2Form form={form} setForm={setForm} />;
      case 3:
        return <Step3Route route={route} setRoute={setRoute} />;
      case 4:
        return <Step4Reason reason={reason} setReason={setReason} dosage={dosage} setDosage={setDosage} />;
      case 5:
        return (
          <Step5Frequency
            frequencyType={frequencyType}
            setFrequencyType={setFrequencyType}
            times={times}
            setTimes={setTimes}
            selectedDays={selectedDays}
            setSelectedDays={setSelectedDays}
          />
        );
      case 6:
        return (
          <Step6Options
            startDate={startDate}
            setStartDate={setStartDate}
            treatmentDays={treatmentDays}
            setTreatmentDays={setTreatmentDays}
            totalPills={totalPills}
            setTotalPills={setTotalPills}
            refillThreshold={refillThreshold}
            setRefillThreshold={setRefillThreshold}
            withFood={withFood}
            setWithFood={setWithFood}
            instructions={instructions}
            setInstructions={setInstructions}
            medicationColor={medicationColor}
            setMedicationColor={setMedicationColor}
            medicationIcon={medicationIcon}
            setMedicationIcon={setMedicationIcon}
          />
        );
      case 7:
        return (
          <Step7Review
            data={{
              name,
              form,
              route,
              reason,
              dosage,
              frequencyType,
              times,
              selectedDays,
              medicationIcon,
              medicationColor,
            }}
          />
        );
      default:
        return null;
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
            Step {currentStep} of {totalSteps}
          </p>
          <div className="mt-4 w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {renderStep()}

          <div className="flex gap-4">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={prevStep}
                className="flex-1 text-xl h-16"
              >
                <ChevronLeft className="w-6 h-6 mr-2" />
                Previous
              </Button>
            )}
            
            {currentStep < totalSteps ? (
              <Button
                type="button"
                size="lg"
                onClick={nextStep}
                className="flex-1 text-xl h-16"
                disabled={!canProceed()}
              >
                Next
                <ChevronRight className="w-6 h-6 ml-2" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="lg"
                className="flex-1 text-xl h-16"
                disabled={loading || !canProceed()}
              >
                {loading ? "Saving..." : "Save Medication"}
              </Button>
            )}
          </div>
        </form>
      </main>
    </div>
  );
};

export default Medications;
