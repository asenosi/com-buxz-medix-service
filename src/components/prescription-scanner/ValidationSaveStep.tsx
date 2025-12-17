import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  RefreshCw, 
  CheckCircle2, 
  Loader2, 
  Pill, 
  Clock, 
  AlertTriangle,
  Building2
} from "lucide-react";
import { ExtractedPrescription } from "@/types/prescription";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ValidationSaveStepProps {
  prescriptions: ExtractedPrescription[];
  onSave: () => void;
  onBack: () => void;
  onRescan: () => void;
}

const parseFrequencyType = (frequency?: string, timing?: string): string => {
  const freqLower = (frequency || "").toLowerCase();
  const timingLower = (timing || "").toLowerCase();
  
  if (freqLower.includes("once") || freqLower.includes("one time")) return "once_daily";
  if (freqLower.includes("twice") || freqLower.includes("two times")) return "twice_daily";
  if (freqLower.includes("three") || freqLower.includes("3 times") || timingLower.includes("8 hour")) return "three_times_daily";
  if (freqLower.includes("four") || freqLower.includes("4 times") || timingLower.includes("6 hour")) return "four_times_daily";
  if (freqLower.includes("necessary") || freqLower.includes("needed") || freqLower.includes("prn")) return "as_needed";
  
  return "everyday";
};

const generateScheduleTimes = (frequencyType: string): string[] => {
  switch (frequencyType) {
    case "once_daily":
      return ["09:00"];
    case "twice_daily":
      return ["09:00", "21:00"];
    case "three_times_daily":
      return ["08:00", "14:00", "20:00"];
    case "four_times_daily":
      return ["08:00", "12:00", "16:00", "20:00"];
    default:
      return ["09:00"];
  }
};

export const ValidationSaveStep = ({
  prescriptions,
  onSave,
  onBack,
  onRescan,
}: ValidationSaveStepProps) => {
  const [isSaving, setIsSaving] = useState(false);

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case "high":
        return "bg-green-500/10 text-green-600 border-green-500/30";
      case "medium":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/30";
      case "low":
        return "bg-red-500/10 text-red-600 border-red-500/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const hasLowConfidence = prescriptions.some((p) => p.confidence === "low");

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        toast.error("You must be logged in to save medications");
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (const prescription of prescriptions) {
        try {
          const { medication, dosage, metadata } = prescription;
          
          // Build dosage string
          const dosageStr = [
            medication.strength,
            medication.strengthUnit,
          ].filter(Boolean).join("") || "As prescribed";

          // Determine frequency type
          const frequencyType = parseFrequencyType(dosage.frequency, dosage.timing);
          
          // Build instructions
          const instructions = [
            dosage.quantityPerDose,
            dosage.frequency,
            dosage.timing,
            dosage.condition,
          ].filter(Boolean).join(" • ");

          // Insert medication
          const { data: med, error: medError } = await supabase
            .from("medications")
            .insert({
              user_id: session.user.id,
              name: medication.name,
              dosage: dosageStr,
              form: medication.form || "pill",
              route_of_administration: dosage.route || "by_mouth",
              instructions: instructions || undefined,
              frequency_type: frequencyType,
              total_pills: medication.quantity || undefined,
              pills_remaining: medication.quantity || undefined,
              prescribing_doctor: metadata.doctorName || undefined,
              prescription_number: metadata.prescriptionNumber || undefined,
              active: true,
            })
            .select()
            .single();

          if (medError) throw medError;

          // Insert schedules
          const times = generateScheduleTimes(frequencyType);
          for (const time of times) {
            const { error: schedError } = await supabase
              .from("medication_schedules")
              .insert({
                medication_id: med.id,
                time_of_day: time,
                frequency_type: frequencyType,
                active: true,
              });

            if (schedError) throw schedError;
          }

          // Create pharmacy if provided
          if (metadata.pharmacyName) {
            await supabase.from("pharmacies").insert({
              user_id: session.user.id,
              name: metadata.pharmacyName,
              phone_number: metadata.pharmacyPhone || undefined,
              address: metadata.pharmacyAddress || undefined,
            });
          }

          successCount++;
        } catch (error) {
          console.error("Failed to save prescription:", error);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully added ${successCount} medication${successCount > 1 ? "s" : ""}`);
        onSave();
      }

      if (failCount > 0) {
        toast.error(`Failed to add ${failCount} medication${failCount > 1 ? "s" : ""}`);
      }
    } catch (error) {
      console.error("Error saving medications:", error);
      toast.error("Failed to save medications");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-[85vh] max-h-[85vh]">
      {/* Header */}
      <div className="p-4 border-b shrink-0">
        <h2 className="text-lg font-semibold">Validate & Save</h2>
        <p className="text-sm text-muted-foreground">
          Review the final summary before adding to your medication list
        </p>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-4">
          {hasLowConfidence && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-700">Potential Misinterpretations</p>
                <p className="text-yellow-600">
                  Some medications have low confidence extraction. Please verify the details are correct.
                </p>
              </div>
            </div>
          )}

          {prescriptions.map((prescription, idx) => {
            const { medication, dosage, metadata } = prescription;
            const frequencyType = parseFrequencyType(dosage.frequency, dosage.timing);
            const times = generateScheduleTimes(frequencyType);

            return (
              <Card key={idx} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2 min-w-0">
                      <Pill className="h-4 w-4 text-primary shrink-0" />
                      <span className="truncate">{medication.name || "Unknown Medication"}</span>
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={`shrink-0 ${getConfidenceColor(prescription.confidence)}`}
                    >
                      {prescription.confidence}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Medication Details */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Dosage</p>
                      <p className="font-medium">
                        {medication.strength}{medication.strengthUnit || "MG"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Form</p>
                      <p className="font-medium capitalize">{medication.form || "Pill"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Quantity</p>
                      <p className="font-medium">{medication.quantity || "-"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Schedule</p>
                      <p className="font-medium">{medication.schedule || "-"}</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Dosage Instructions */}
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="text-sm min-w-0">
                      <p className="font-medium break-words">
                        {dosage.quantityPerDose || "Take as directed"} • {dosage.frequency || "As prescribed"}
                      </p>
                      {dosage.timing && (
                        <p className="text-muted-foreground break-words">{dosage.timing}</p>
                      )}
                      {dosage.condition && (
                        <p className="text-muted-foreground break-words">{dosage.condition}</p>
                      )}
                      <p className="text-xs text-primary mt-1">
                        Schedule: {times.join(", ")} ({frequencyType.replace(/_/g, " ")})
                      </p>
                    </div>
                  </div>

                  {/* Metadata */}
                  {(metadata.pharmacyName || metadata.doctorName) && (
                    <>
                      <Separator />
                      <div className="flex items-start gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="text-sm space-y-1 min-w-0">
                          {metadata.pharmacyName && (
                            <p className="font-medium break-words">{metadata.pharmacyName}</p>
                          )}
                          {metadata.pharmacyPhone && (
                            <p className="text-muted-foreground">{metadata.pharmacyPhone}</p>
                          )}
                          {metadata.doctorName && (
                            <p className="text-muted-foreground break-words">
                              Prescribed by: {metadata.doctorName}
                            </p>
                          )}
                          {metadata.prescriptionDate && (
                            <p className="text-xs text-muted-foreground">
                              Date: {metadata.prescriptionDate}
                            </p>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-4 shrink-0 bg-background">
        <div className="flex flex-col sm:flex-row gap-2 sm:justify-between">
          <div className="flex gap-2">
            <Button variant="outline" onClick={onBack} className="flex-1 sm:flex-none">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button variant="ghost" onClick={onRescan} className="flex-1 sm:flex-none">
              <RefreshCw className="mr-2 h-4 w-4" />
              Rescan
            </Button>
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Add Medications
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
