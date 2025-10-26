import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Pill, Syringe, Droplet, Wind, Bandage, Clipboard } from "lucide-react";

interface Step6OptionsProps {
  startDate: string;
  setStartDate: (value: string) => void;
  treatmentDays: string;
  setTreatmentDays: (value: string) => void;
  totalPills: string;
  setTotalPills: (value: string) => void;
  refillThreshold: string;
  setRefillThreshold: (value: string) => void;
  withFood: string;
  setWithFood: (value: string) => void;
  instructions: string;
  setInstructions: (value: string) => void;
  medicationColor: string;
  setMedicationColor: (value: string) => void;
  medicationIcon: string;
  setMedicationIcon: (value: string) => void;
  imagePreviews: string[];
  onAddImages: (files: FileList | File[]) => void;
  onRemoveImage: (index: number) => void;
}

const iconOptions = [
  { value: "pill", icon: Pill, label: "Pill" },
  { value: "injection", icon: Syringe, label: "Injection" },
  { value: "drop", icon: Droplet, label: "Drop" },
  { value: "inhaler", icon: Wind, label: "Inhaler" },
  { value: "bandage", icon: Bandage, label: "Bandage" },
  { value: "clipboard", icon: Clipboard, label: "Other" },
];

const colorOptions = [
  { value: "blue", color: "bg-primary" },
  { value: "green", color: "bg-success" },
  { value: "orange", color: "bg-warning" },
  { value: "red", color: "bg-destructive" },
  { value: "purple", color: "bg-purple-500" },
  { value: "pink", color: "bg-pink-500" },
];

export const Step6Options = ({
  startDate,
  setStartDate,
  treatmentDays,
  setTreatmentDays,
  totalPills,
  setTotalPills,
  refillThreshold,
  setRefillThreshold,
  withFood,
  setWithFood,
  instructions,
  setInstructions,
  medicationColor,
  setMedicationColor,
  medicationIcon,
  setMedicationIcon,
  imagePreviews,
  onAddImages,
  onRemoveImage,
}: Step6OptionsProps) => {
  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">Almost done!</h2>
          <p className="text-muted-foreground">Additional options (all optional)</p>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Treatment Duration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="treatmentDays">Treatment Duration (days)</Label>
              <Input
                id="treatmentDays"
                type="number"
                value={treatmentDays}
                onChange={(e) => setTreatmentDays(e.target.value)}
                placeholder="e.g., 30"
                className="h-12"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Medication Images</h3>
          <p className="text-sm text-muted-foreground">Select up to 5 images. Existing images remain; new ones will be added.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <div className="space-y-2">
              <Label htmlFor="images">Upload Images</Label>
              <Input
                id="images"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => e.target.files && onAddImages(e.target.files)}
                className="h-12"
              />
              <p className="text-xs text-muted-foreground">PNG or JPG up to ~5MB each</p>
            </div>
            <div>
              {imagePreviews.length === 0 ? (
                <div className="w-24 h-24 rounded-lg border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                  No images selected
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {imagePreviews.map((src, idx) => (
                    <div key={idx} className="relative">
                      <img src={src} alt={`Selected ${idx+1}`} className="w-20 h-20 rounded-lg object-cover border" />
                      <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() => onRemoveImage(idx)}
                        aria-label={`Remove image ${idx+1}`}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Refill Reminders</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="totalPills">Total Pills/Doses</Label>
              <Input
                id="totalPills"
                type="number"
                value={totalPills}
                onChange={(e) => setTotalPills(e.target.value)}
                placeholder="e.g., 30"
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="refillThreshold">Remind me when left</Label>
              <Input
                id="refillThreshold"
                type="number"
                value={refillThreshold}
                onChange={(e) => setRefillThreshold(e.target.value)}
                placeholder="e.g., 7"
                className="h-12"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Instructions</h3>
          <div className="space-y-3">
            <Label htmlFor="withFood">Take with food?</Label>
            <Select value={withFood} onValueChange={setWithFood}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="before">Before eating</SelectItem>
                <SelectItem value="while">While eating</SelectItem>
                <SelectItem value="after">After eating</SelectItem>
                <SelectItem value="doesnt_matter">Doesn't matter</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructions">Any other instructions?</Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g., Take with water, Avoid alcohol"
              className="min-h-[80px]"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Customize Icon</h3>
          
          <div className="space-y-2">
            <Label>Select Icon</Label>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {iconOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <Button
                    key={option.value}
                    type="button"
                    variant={medicationIcon === option.value ? "default" : "outline"}
                    onClick={() => setMedicationIcon(option.value)}
                    className="h-20 flex flex-col gap-1"
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs">{option.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Select Color</Label>
            <div className="grid grid-cols-6 gap-2">
              {colorOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMedicationColor(option.value)}
                  className={`h-12 rounded-md ${option.color} ${
                    medicationColor === option.value ? "ring-4 ring-ring" : ""
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
