import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { PrescriptionUpload } from "@/components/PrescriptionUpload";

const Medications = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const focus = searchParams.get("focus");
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
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [showPrescriptionUpload, setShowPrescriptionUpload] = useState(true);

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

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  // Jump to a focused step when requested
  useEffect(() => {
    if (!focus) return;
    const mapping: Record<string, number> = {
      name: 1,
      form: 2,
      route: 3,
      reason: 4,
      dosage: 4,
      frequency: 5,
      schedule: 5,
      options: 6,
      review: 7,
    };
    if (mapping[focus]) setCurrentStep(mapping[focus]);
  }, [focus]);

  // Prepopulate when editing a medication
  useEffect(() => {
    const load = async () => {
      if (!editId) return;
      try {
        const { data: med } = await supabase
          .from("medications")
          .select("*")
          .eq("id", editId)
          .single();
        if (med) {
          setName(med.name ?? "");
          setForm(med.form ?? "");
          setRoute(med.route_of_administration ?? "");
          setReason(med.reason_for_taking ?? "");
          setDosage(med.dosage ?? "");
          setInstructions(med.instructions ?? "");
          setTotalPills(med.total_pills?.toString?.() ?? "");
          setRefillThreshold(med.refill_reminder_threshold?.toString?.() ?? "");
          setWithFood(med.with_food_timing ?? "");
          setStartDate(med.start_date ?? "");
          setTreatmentDays(med.treatment_duration_days?.toString?.() ?? "");
          setMedicationColor(med.medication_color ?? medicationColor);
          setMedicationIcon(med.medication_icon ?? medicationIcon);
          if (med.image_url) setImagePreviews([med.image_url]);
        }

        const { data: scheds } = await supabase
          .from("medication_schedules")
          .select("time_of_day, days_of_week, with_food, special_instructions")
          .eq("medication_id", editId)
          .eq("active", true);
        if (scheds && scheds.length) {
          type SchedRow = { time_of_day: string; days_of_week: number[] | null; with_food: boolean | null };
          const timesUnique = Array.from(new Set((scheds as SchedRow[]).map((s) => s.time_of_day))).sort();
          setTimes(timesUnique.length ? timesUnique : ["08:00"]);
          const allDays = Array.from(new Set((scheds as SchedRow[]).flatMap((s) => (Array.isArray(s.days_of_week) ? s.days_of_week : []))));
          if (allDays.length) {
            setFrequencyType("specific_days");
            setSelectedDays(allDays);
          } else {
            setFrequencyType("everyday");
            setSelectedDays([0,1,2,3,4,5,6]);
          }
          if ((scheds as SchedRow[]).some((s) => Boolean(s.with_food))) setWithFood("while");
        }
      } catch (e) {
        console.error(e);
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

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

      // Create or update medication
      let medId = editId as string | null;
      let uploadedImageUrls: string[] = [];
      if (editId) {
        // If images are selected in edit mode, upload first so we can persist first URL in the update
        if (imageFiles.length > 0 && session?.user?.id) {
          const uploaded: string[] = [];
          for (const file of imageFiles.slice(0, 5)) {
            const path = `${session.user.id}/${editId}/${Date.now()}-${file.name}`;
            const { error: uploadErr } = await supabase.storage
              .from("medication-images")
              .upload(path, file, { upsert: true, cacheControl: "3600" });
            if (uploadErr) throw uploadErr;
            const { data: pub } = supabase.storage
              .from("medication-images")
              .getPublicUrl(path);
            uploaded.push(pub.publicUrl);
          }
          uploadedImageUrls = uploaded;
        }

        const { error: updErr } = await supabase
          .from("medications")
          .update({
            name,
            dosage,
            form: form || null,
            route_of_administration: route || null,
            reason_for_taking: reason || null,
            instructions: instructions || null,
            total_pills: totalPills ? parseInt(totalPills) : null,
            refill_reminder_threshold: refillThreshold ? parseInt(refillThreshold) : null,
            with_food_timing: withFood || null,
            start_date: startDate || null,
            end_date: endDate,
            treatment_duration_days: treatmentDays ? parseInt(treatmentDays) : null,
            medication_color: medicationColor,
            medication_icon: medicationIcon,
            ...(uploadedImageUrls.length > 0 ? { 
              image_url: uploadedImageUrls[0],
              image_urls: uploadedImageUrls 
            } : {}),
          })
          .eq("id", editId);
        if (updErr) throw updErr;
      } else {
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
        medId = medData.id;

        // If images are selected in create mode, upload and patch the record with the first URL
        if (imageFiles.length > 0 && session?.user?.id && medId) {
          const uploaded: string[] = [];
          for (const file of imageFiles.slice(0, 5)) {
            const path = `${session.user.id}/${medId}/${Date.now()}-${file.name}`;
            const { error: uploadErr } = await supabase.storage
              .from("medication-images")
              .upload(path, file, { upsert: true, cacheControl: "3600" });
            if (uploadErr) throw uploadErr;
            const { data: pub } = supabase.storage
              .from("medication-images")
              .getPublicUrl(path);
            uploaded.push(pub.publicUrl);
          }
          uploadedImageUrls = uploaded;
          if (uploadedImageUrls.length > 0) {
            const { error: patchErr } = await supabase
              .from("medications")
              .update({ 
                image_url: uploadedImageUrls[0],
                image_urls: uploadedImageUrls
              })
              .eq("id", medId);
            if (patchErr) throw patchErr;
          }
        }
      }

      // Create schedules based on frequency type
      let scheduleInserts = [];
      
      if (frequencyType === "everyday") {
        scheduleInserts = times.map(time => ({
          medication_id: medId,
          time_of_day: time,
          with_food: withFood === "while" || withFood === "before" || withFood === "after",
          special_instructions: instructions || null,
          days_of_week: [0, 1, 2, 3, 4, 5, 6],
          active: true,
        }));
      } else if (frequencyType === "specific_days") {
        scheduleInserts = [{
          medication_id: medId,
          time_of_day: times[0],
          with_food: withFood === "while" || withFood === "before" || withFood === "after",
          special_instructions: instructions || null,
          days_of_week: selectedDays,
          active: true,
        }];
      } else if (frequencyType === "every_other_day") {
        scheduleInserts = [{
          medication_id: medId,
          time_of_day: times[0],
          with_food: withFood === "while" || withFood === "before" || withFood === "after",
          special_instructions: "Every other day",
          days_of_week: [0, 2, 4, 6],
          active: true,
        }];
      } else if (frequencyType === "as_needed") {
        scheduleInserts = [{
          medication_id: medId,
          time_of_day: "08:00",
          with_food: false,
          special_instructions: "As needed",
          days_of_week: null,
          active: true,
        }];
      }

      if (scheduleInserts.length > 0) {
        if (editId) {
          const { error: delErr } = await supabase
            .from("medication_schedules")
            .delete()
            .eq("medication_id", editId);
          if (delErr) throw delErr;
        }
        const { error: schedError } = await supabase
          .from("medication_schedules")
          .insert(scheduleInserts);
        if (schedError) throw schedError;
      }

      toast.success(editId ? "Medication updated!" : "Medication added successfully!");
      navigate("/dashboard");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to add medication";
      toast.error(message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrescriptionExtracted = (medications: Array<{
    name: string;
    dosage: string;
    form?: string;
    frequency_type?: string;
    route_of_administration?: string;
    reason_for_taking?: string;
    instructions?: string;
  }>) => {
    if (medications.length === 0) return;
    
    // Use the first medication found
    const med = medications[0];
    setName(med.name || "");
    setDosage(med.dosage || "");
    if (med.form) setForm(med.form);
    if (med.route_of_administration) setRoute(med.route_of_administration);
    if (med.reason_for_taking) setReason(med.reason_for_taking);
    if (med.instructions) setInstructions(med.instructions);
    if (med.frequency_type) setFrequencyType(med.frequency_type);
    
    setShowPrescriptionUpload(false);
    
    if (medications.length > 1) {
      toast.info(`Found ${medications.length} medications. Showing first one. You can add others separately.`);
    }
    
    // Move to step 1 to review the extracted name
    setCurrentStep(1);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            {showPrescriptionUpload && !editId && (
              <PrescriptionUpload onMedicationsExtracted={handlePrescriptionExtracted} />
            )}
            <Step1Name 
              name={name} 
              setName={setName}
              onImageSelect={(dataUrl) => {
                // Convert data URL to File
                fetch(dataUrl)
                  .then(res => res.blob())
                  .then(blob => {
                    const file = new File([blob], `${name}-image.jpg`, { type: 'image/jpeg' });
                    setImageFiles(prev => [...prev, file]);
                    setImagePreviews(prev => [...prev, dataUrl]);
                    toast.success("Image added successfully");
                  })
                  .catch(err => {
                    console.error("Error adding image:", err);
                  });
              }}
            />
          </div>
        );
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
            imagePreviews={imagePreviews}
            medicationName={name}
            onAddImages={(files) => {
              const arr = Array.from(files);
              const remaining = Math.max(0, 5 - imagePreviews.length);
              const toAdd = arr.slice(0, remaining);
              if (toAdd.length === 0) return;
              setImageFiles(prev => [...prev, ...toAdd]);
              toAdd.forEach(file => {
                const reader = new FileReader();
                reader.onload = () => setImagePreviews(prev => [...prev, reader.result as string]);
                reader.readAsDataURL(file);
              });
            }}
            onRemoveImage={(index) => {
              setImagePreviews(prev => prev.filter((_, i) => i !== index));
              setImageFiles(prev => prev.filter((_, i) => i !== index));
            }}
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
              imagePreviews,
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button onClick={() => navigate("/dashboard")} variant="ghost" size="sm" className="mb-3">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold">{editId ? "Edit Medication" : "Add New Medication"}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Step {currentStep} of {totalSteps}
          </p>
          <div className="mt-3 w-full bg-muted rounded-full h-1.5">
            <div 
              className="bg-primary h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {renderStep()}

          <div className="flex gap-3">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                className="flex-1 h-10"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
            )}
            
            {currentStep < totalSteps ? (
              <Button
                type="button"
                onClick={nextStep}
                disabled={!canProceed()}
                className="flex-1 h-10"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={loading || !canProceed()}
                className="flex-1 h-10"
              >
                {loading ? (editId ? "Updating..." : "Saving...") : (editId ? "Update Medication" : "Save Medication")}
              </Button>
            )}
          </div>
        </form>
      </main>
    </div>
  );
};

export default Medications;
