import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, X, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ExtractedMedication {
  name: string;
  dosage: string;
  form?: string;
  route?: string;
  reason?: string;
  instructions?: string;
  frequency_type?: string;
  times?: string[];
  selectedDays?: number[];
}

interface BulkPrescriptionUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export const BulkPrescriptionUpload = ({ open, onOpenChange, onComplete }: BulkPrescriptionUploadProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [extractedMeds, setExtractedMeds] = useState<ExtractedMedication[]>([]);
  const [savingMeds, setSavingMeds] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setIsProcessing(true);
    setPreview(URL.createObjectURL(file));

    try {
      const base64 = await fileToBase64(file);
      
      const { data, error } = await supabase.functions.invoke("extract-prescription", {
        body: { image: base64 },
      });

      if (error) throw error;

      if (data?.medications && data.medications.length > 0) {
        setExtractedMeds(data.medications);
        toast.success(`Found ${data.medications.length} medication${data.medications.length > 1 ? 's' : ''} in prescription`);
      } else {
        toast.error("No medications found in the image. Please try a clearer image.");
      }
    } catch (error: unknown) {
      console.error("Error processing prescription:", error);
      toast.error(error instanceof Error ? error.message : "Failed to process prescription");
    } finally {
      setIsProcessing(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSaveAll = async () => {
    if (extractedMeds.length === 0) return;

    setSavingMeds(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        toast.error("You must be logged in to save medications");
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (const med of extractedMeds) {
        try {
          // Insert medication
          const { data: medication, error: medError } = await supabase
            .from("medications")
            .insert({
              user_id: session.user.id,
              name: med.name,
              dosage: med.dosage || "As prescribed",
              form: med.form || "pill",
              route_of_administration: med.route || "by_mouth",
              reason_for_taking: med.reason,
              instructions: med.instructions,
              frequency_type: med.frequency_type || "everyday",
              active: true,
            })
            .select()
            .single();

          if (medError) throw medError;

          // Insert schedule(s)
          const times = med.times && med.times.length > 0 ? med.times : ["09:00"];
          for (const time of times) {
            const scheduleData: {
              medication_id: string;
              time_of_day: string;
              frequency_type: string;
              active: boolean;
              days_of_week?: number[];
            } = {
              medication_id: medication.id,
              time_of_day: time,
              frequency_type: med.frequency_type || "everyday",
              active: true,
            };

            if (med.selectedDays && med.selectedDays.length > 0) {
              scheduleData.days_of_week = med.selectedDays;
            }

            const { error: schedError } = await supabase
              .from("medication_schedules")
              .insert(scheduleData);

            if (schedError) throw schedError;
          }

          successCount++;
        } catch (error) {
          console.error(`Failed to save ${med.name}:`, error);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully added ${successCount} medication${successCount > 1 ? 's' : ''}`);
        onComplete();
        onOpenChange(false);
        resetState();
      }

      if (failCount > 0) {
        toast.error(`Failed to add ${failCount} medication${failCount > 1 ? 's' : ''}`);
      }
    } catch (error: unknown) {
      console.error("Error saving medications:", error);
      toast.error("Failed to save medications");
    } finally {
      setSavingMeds(false);
    }
  };

  const resetState = () => {
    setPreview(null);
    setExtractedMeds([]);
    setIsProcessing(false);
    setSavingMeds(false);
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Prescription</DialogTitle>
          <DialogDescription>
            Upload a photo of your prescription to automatically extract medication details
          </DialogDescription>
        </DialogHeader>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select Prescription Image</CardTitle>
            <CardDescription className="text-sm">
              Take a clear photo of your prescription or upload an existing image
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center justify-center gap-4">
              <Button
                variant="outline"
                className="w-full h-24"
                disabled={isProcessing}
                onClick={() => document.getElementById("prescription-upload")?.click()}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-5 w-5" />
                    Choose Image
                  </>
                )}
              </Button>
              <input
                id="prescription-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
                disabled={isProcessing}
              />
            </div>

            {preview && (
              <div className="relative">
                <img
                  src={preview}
                  alt="Prescription preview"
                  className="w-full h-auto rounded-lg border"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={resetState}
                  disabled={isProcessing || savingMeds}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {extractedMeds.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Extracted Medications ({extractedMeds.length})</h3>
                  <Button
                    onClick={handleSaveAll}
                    disabled={savingMeds}
                    size="sm"
                  >
                    {savingMeds ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Save All
                      </>
                    )}
                  </Button>
                </div>
                <div className="space-y-2">
                  {extractedMeds.map((med, idx) => (
                    <Card key={idx}>
                      <CardContent className="pt-4">
                        <div className="space-y-1">
                          <p className="font-semibold">{med.name}</p>
                          <p className="text-sm text-muted-foreground">{med.dosage}</p>
                          {med.reason && (
                            <p className="text-xs text-muted-foreground">For: {med.reason}</p>
                          )}
                          {med.instructions && (
                            <p className="text-xs text-muted-foreground">{med.instructions}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Supports JPG, PNG images up to 10MB. The AI will extract medication names, dosages, and instructions automatically.
            </p>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};
