import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Scan, Camera } from "lucide-react";
import { PrescriptionScanWizard } from "@/components/prescription-scanner";

interface ExtractedMedication {
  name: string;
  dosage: string;
  form?: string;
  frequency_type?: string;
  route_of_administration?: string;
  reason_for_taking?: string;
  instructions?: string;
}

interface PrescriptionUploadProps {
  onMedicationsExtracted: (medications: ExtractedMedication[]) => void;
}

export const PrescriptionUpload = ({ onMedicationsExtracted }: PrescriptionUploadProps) => {
  const [wizardOpen, setWizardOpen] = useState(false);

  const handleComplete = () => {
    // The wizard saves directly to DB, so we just notify parent
    onMedicationsExtracted([]);
  };

  return (
    <>
      <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Scan className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-medium mb-1">Scan Prescription Label</p>
              <p className="text-sm text-muted-foreground">
                Take a photo of your prescription to auto-fill medication details
              </p>
            </div>
            
            <Button
              variant="default"
              onClick={() => setWizardOpen(true)}
              className="gap-2"
            >
              <Camera className="h-4 w-4" />
              Scan Prescription
            </Button>
            
            <p className="text-xs text-muted-foreground text-center">
              AI-powered extraction with review and editing
            </p>
          </div>
        </CardContent>
      </Card>

      <PrescriptionScanWizard 
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onComplete={handleComplete}
      />
    </>
  );
};
