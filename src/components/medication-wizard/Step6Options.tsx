import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

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
  imagePreviews: string[];
  onAddImages: (files: FileList | File[]) => void;
  onRemoveImage: (index: number) => void;
  medicationName: string;
  isEditMode?: boolean;
}

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
  imagePreviews,
  onAddImages,
  onRemoveImage,
  medicationName,
  isEditMode = false,
}: Step6OptionsProps) => {
  return (
    <Card>
      <CardContent className="pt-4 space-y-4">
        <div className="text-center mb-3">
          <h2 className="text-xl font-bold mb-1">Almost done!</h2>
          <p className="text-sm text-muted-foreground">Additional options (all optional)</p>
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-semibold">Treatment Duration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="startDate" className="text-sm">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                max={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="treatmentDays" className="text-sm">Treatment Duration (days)</Label>
              <Input
                id="treatmentDays"
                type="number"
                value={treatmentDays}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || (Number(val) >= 1 && Number(val) <= 3650)) {
                    setTreatmentDays(val);
                  }
                }}
                placeholder="e.g., 30"
                min="1"
                max="3650"
                className="h-9"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-semibold">Medication Images</h3>
          <p className="text-xs text-muted-foreground">Select up to 5 images. Existing images remain; new ones will be added.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
            <div className="space-y-1.5">
              <Label htmlFor="images" className="text-sm">Upload from Device</Label>
              <Input
                id="images"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => e.target.files && onAddImages(e.target.files)}
                className="h-9"
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

        {isEditMode && (
          <div className="space-y-3">
            <h3 className="text-base font-semibold">Refill Reminders</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="totalPills" className="text-sm">Total Pills/Doses</Label>
                <Input
                  id="totalPills"
                  type="number"
                  value={totalPills}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || (Number(val) >= 1 && Number(val) <= 10000)) {
                      setTotalPills(val);
                    }
                  }}
                  placeholder="e.g., 30"
                  min="1"
                  max="10000"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="refillThreshold" className="text-sm">Refill Reminder (pills left)</Label>
                <Input
                  id="refillThreshold"
                  type="number"
                  value={refillThreshold}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || (Number(val) >= 1 && Number(val) <= 10000)) {
                      setRefillThreshold(val);
                    }
                  }}
                  placeholder="e.g., 5"
                  min="1"
                  max="10000"
                  className="h-9"
                />
                <p className="text-xs text-muted-foreground">
                  Get notified when this many pills remain
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h3 className="text-base font-semibold">Instructions</h3>
          <div className="space-y-2">
            <Label htmlFor="withFood" className="text-sm">Take with food?</Label>
            <Select value={withFood} onValueChange={setWithFood}>
              <SelectTrigger className="h-9">
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

          <div className="space-y-1.5">
            <Label htmlFor="instructions" className="text-sm">Any other instructions?</Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => {
                const val = e.target.value;
                if (val.length <= 500) {
                  setInstructions(val);
                }
              }}
              placeholder="e.g., Take with water, Avoid alcohol"
              maxLength={500}
              className="min-h-[60px] text-sm"
            />
            <p className="text-xs text-muted-foreground">{instructions.length}/500 characters</p>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-semibold">Customize Color</h3>
          
          <div className="space-y-2">
            <Label className="text-sm">Select Color</Label>
            <div className="grid grid-cols-6 gap-2">
              {colorOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMedicationColor(option.value)}
                  className={`h-10 rounded-md ${option.color} ${
                    medicationColor === option.value ? "ring-2 ring-ring" : ""
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
