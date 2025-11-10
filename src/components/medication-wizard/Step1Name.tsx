import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { MedicationImageSearch } from "./MedicationImageSearch";

interface Step1NameProps {
  name: string;
  setName: (value: string) => void;
  onImageSelect?: (imageUrl: string) => void;
}

export const Step1Name = ({ name, setName, onImageSelect }: Step1NameProps) => {
  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="text-center mb-3">
          <h2 className="text-xl font-bold mb-1">What medication would you like to add?</h2>
          <p className="text-sm text-muted-foreground">Enter the medication name</p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-semibold">
            Medication Name *
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Aspirin, Metformin, Lisinopril"
            required
            className="h-10"
          />
        </div>

        {name.trim().length >= 3 && onImageSelect && (
          <MedicationImageSearch 
            medicationName={name}
            onImageSelect={onImageSelect}
          />
        )}
      </CardContent>
    </Card>
  );
};
