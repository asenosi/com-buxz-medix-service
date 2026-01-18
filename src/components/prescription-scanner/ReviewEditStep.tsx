import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, RefreshCw, Pill, Clock, Building2, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { ExtractedPrescription } from "@/types/prescription";

interface ReviewEditStepProps {
  imagePreviews: string[];
  prescriptions: ExtractedPrescription[];
  selectedIndex: number;
  onSelectPrescription: (index: number) => void;
  onUpdatePrescription: (index: number, data: ExtractedPrescription) => void;
  onProceed: () => void;
  onRescan: () => void;
}

const formOptions = [
  { value: "pill", label: "Tablet" },
  { value: "capsule", label: "Capsule" },
  { value: "solution", label: "Liquid/Solution" },
  { value: "drops", label: "Drops" },
  { value: "inhaler", label: "Inhaler" },
  { value: "spray", label: "Spray" },
  { value: "cream", label: "Cream/Ointment" },
  { value: "powder", label: "Powder" },
  { value: "other", label: "Other" },
];

const routeOptions = [
  { value: "by_mouth", label: "Oral (By Mouth)" },
  { value: "topical", label: "Topical (On Skin)" },
  { value: "inhaled", label: "Inhaled" },
  { value: "nose_eyes_ear", label: "Nose/Eyes/Ear" },
  { value: "rectum_vagina", label: "Rectal/Vaginal" },
  { value: "injection", label: "Injection" },
];

const strengthUnits = ["mg", "mcg", "g", "mL", "IU", "%"];

export const ReviewEditStep = ({
  imagePreviews,
  prescriptions,
  selectedIndex,
  onSelectPrescription,
  onUpdatePrescription,
  onProceed,
  onRescan,
}: ReviewEditStepProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const current = prescriptions[selectedIndex];

  const updateField = <K extends keyof ExtractedPrescription>(
    field: K,
    value: ExtractedPrescription[K]
  ) => {
    onUpdatePrescription(selectedIndex, { ...current, [field]: value });
  };

  const updateMedication = (field: string, value: string | number) => {
    onUpdatePrescription(selectedIndex, {
      ...current,
      medication: { ...current.medication, [field]: value },
    });
  };

  const updateDosage = (field: string, value: string) => {
    onUpdatePrescription(selectedIndex, {
      ...current,
      dosage: { ...current.dosage, [field]: value },
    });
  };

  const updateMetadata = (field: string, value: string) => {
    onUpdatePrescription(selectedIndex, {
      ...current,
      metadata: { ...current.metadata, [field]: value },
    });
  };

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

  return (
    <div className="flex flex-col h-[85vh]">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-lg font-semibold">Review Extracted Data</h2>
          <p className="text-sm text-muted-foreground">
            Verify and edit the extracted information
          </p>
        </div>
        <Badge variant="outline" className={getConfidenceColor(current.confidence)}>
          {current.confidence.charAt(0).toUpperCase() + current.confidence.slice(1)} Confidence
        </Badge>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Left: Image Preview */}
        <div className="w-full md:w-2/5 p-4 border-b md:border-b-0 md:border-r bg-muted/30 shrink-0">
          <div className="sticky top-0 space-y-3">
            <div className="relative">
              <img
                src={imagePreviews[currentImageIndex]}
                alt={`Prescription ${currentImageIndex + 1}`}
                className="w-full h-auto max-h-[30vh] md:max-h-[55vh] object-contain rounded-lg border shadow-sm"
              />
              {imagePreviews.length > 1 && (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? imagePreviews.length - 1 : prev - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setCurrentImageIndex((prev) => (prev === imagePreviews.length - 1 ? 0 : prev + 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm rounded-full px-2 py-1 text-xs">
                    {currentImageIndex + 1} / {imagePreviews.length}
                  </div>
                </>
              )}
            </div>
            {imagePreviews.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {imagePreviews.map((preview, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`shrink-0 w-12 h-12 rounded-md overflow-hidden border-2 transition-colors ${
                      idx === currentImageIndex ? "border-primary" : "border-transparent"
                    }`}
                  >
                    <img src={preview} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            {prescriptions.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {prescriptions.map((_, idx) => (
                  <Button
                    key={idx}
                    variant={idx === selectedIndex ? "default" : "outline"}
                    size="sm"
                    onClick={() => onSelectPrescription(idx)}
                  >
                    Med {idx + 1}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Editable Form */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {/* Medication Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Pill className="h-4 w-4 text-primary" />
                  Medication Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label>Medication Name</Label>
                    <Input
                      value={current.medication.name || ""}
                      onChange={(e) => updateMedication("name", e.target.value)}
                      placeholder="e.g., IBUGESIC PLUS"
                      maxLength={50}
                    />
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label>Strength</Label>
                      <Input
                        value={current.medication.strength || ""}
                        onChange={(e) => updateMedication("strength", e.target.value)}
                        placeholder="e.g., 400"
                      />
                    </div>
                    <div className="w-24">
                      <Label>Unit</Label>
                      <Select
                        value={current.medication.strengthUnit || "mg"}
                        onValueChange={(v) => updateMedication("strengthUnit", v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {strengthUnits.map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Form</Label>
                    <Select
                      value={current.medication.form || "pill"}
                      onValueChange={(v) => updateMedication("form", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {formOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      value={current.medication.quantity || ""}
                      onChange={(e) => updateMedication("quantity", parseInt(e.target.value) || 0)}
                      placeholder="e.g., 30"
                    />
                  </div>

                  <div>
                    <Label>Schedule</Label>
                    <Input
                      value={current.medication.schedule || ""}
                      onChange={(e) => updateMedication("schedule", e.target.value)}
                      placeholder="e.g., S2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dosage Instructions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Dosage Instructions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Quantity per Dose</Label>
                    <Input
                      value={current.dosage.quantityPerDose || ""}
                      onChange={(e) => updateDosage("quantityPerDose", e.target.value)}
                      placeholder="e.g., ONE CAPSULE"
                    />
                  </div>

                  <div>
                    <Label>Route</Label>
                    <Select
                      value={current.dosage.route || "by_mouth"}
                      onValueChange={(v) => updateDosage("route", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {routeOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Frequency</Label>
                    <Input
                      value={current.dosage.frequency || ""}
                      onChange={(e) => updateDosage("frequency", e.target.value)}
                      placeholder="e.g., THREE TIMES A DAY"
                    />
                  </div>

                  <div>
                    <Label>Interval</Label>
                    <Input
                      value={current.dosage.timing || ""}
                      onChange={(e) => updateDosage("timing", e.target.value)}
                      placeholder="e.g., 8 HOURLY"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Label>Conditions/Notes</Label>
                    <Textarea
                      value={current.dosage.condition || ""}
                      onChange={(e) => updateDosage("condition", e.target.value)}
                      placeholder="e.g., IF NECESSARY, WITH FOOD"
                      rows={2}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Metadata */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Prescription Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Pharmacy</Label>
                    <Input
                      value={current.metadata.pharmacyName || ""}
                      onChange={(e) => updateMetadata("pharmacyName", e.target.value)}
                      placeholder="e.g., Dis-Chem"
                    />
                  </div>

                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={current.metadata.pharmacyPhone || ""}
                      onChange={(e) => updateMetadata("pharmacyPhone", e.target.value)}
                      placeholder="e.g., (011) 697 0800"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Label>Address</Label>
                    <Input
                      value={current.metadata.pharmacyAddress || ""}
                      onChange={(e) => updateMetadata("pharmacyAddress", e.target.value)}
                      placeholder="e.g., CNR LEVER & NEW RD, MIDRAND"
                    />
                  </div>

                  <div>
                    <Label>Prescription Date</Label>
                    <Input
                      type="date"
                      value={current.metadata.prescriptionDate || ""}
                      onChange={(e) => updateMetadata("prescriptionDate", e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>Prescription Number</Label>
                    <Input
                      value={current.metadata.prescriptionNumber || ""}
                      onChange={(e) => updateMetadata("prescriptionNumber", e.target.value)}
                      placeholder="e.g., 0385284/03"
                    />
                  </div>

                  <div>
                    <Label>Patient Name</Label>
                    <Input
                      value={current.metadata.patientName || ""}
                      onChange={(e) => updateMetadata("patientName", e.target.value)}
                      placeholder="Patient name"
                    />
                  </div>

                  <div>
                    <Label>Doctor/Prescriber</Label>
                    <Input
                      value={current.metadata.doctorName || ""}
                      onChange={(e) => updateMetadata("doctorName", e.target.value)}
                      placeholder="Doctor name"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {current.confidence === "low" && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">
                  Low confidence extraction. Please verify all fields carefully or try rescanning with a clearer image.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Footer */}
      <Separator />
      <div className="p-4 flex gap-3 justify-between shrink-0">
        <Button variant="outline" onClick={onRescan}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Rescan
        </Button>
        <Button onClick={onProceed}>
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
