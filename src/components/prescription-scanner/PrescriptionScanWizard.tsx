import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ImageCaptureStep } from "./ImageCaptureStep";
import { ReviewEditStep } from "./ReviewEditStep";
import { ValidationSaveStep } from "./ValidationSaveStep";
import { ExtractedPrescription } from "@/types/prescription";

interface PrescriptionScanWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export type WizardStep = "capture" | "review" | "validate";

export const PrescriptionScanWizard = ({
  open,
  onOpenChange,
  onComplete,
}: PrescriptionScanWizardProps) => {
  const [step, setStep] = useState<WizardStep>("capture");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedPrescription[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleImageProcessed = (
    preview: string,
    prescriptions: ExtractedPrescription[],
    file: File
  ) => {
    setImagePreview(preview);
    setImageFile(file);
    setExtractedData(prescriptions);
    setSelectedIndex(0);
    setStep("review");
  };

  const handleDataUpdate = (index: number, data: ExtractedPrescription) => {
    setExtractedData((prev) => {
      const updated = [...prev];
      updated[index] = data;
      return updated;
    });
  };

  const handleProceedToValidation = () => {
    setStep("validate");
  };

  const handleRescan = () => {
    setStep("capture");
    setImagePreview(null);
    setImageFile(null);
    setExtractedData([]);
  };

  const handleClose = () => {
    setStep("capture");
    setImagePreview(null);
    setImageFile(null);
    setExtractedData([]);
    onOpenChange(false);
  };

  const handleSaveComplete = () => {
    handleClose();
    onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
        {step === "capture" && (
          <ImageCaptureStep onImageProcessed={handleImageProcessed} />
        )}
        {step === "review" && imagePreview && extractedData.length > 0 && (
          <ReviewEditStep
            imagePreview={imagePreview}
            prescriptions={extractedData}
            selectedIndex={selectedIndex}
            onSelectPrescription={setSelectedIndex}
            onUpdatePrescription={handleDataUpdate}
            onProceed={handleProceedToValidation}
            onRescan={handleRescan}
          />
        )}
        {step === "validate" && (
          <ValidationSaveStep
            prescriptions={extractedData}
            imageFile={imageFile}
            onSave={handleSaveComplete}
            onBack={() => setStep("review")}
            onRescan={handleRescan}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
