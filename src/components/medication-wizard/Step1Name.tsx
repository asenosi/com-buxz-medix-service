import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

interface Step1NameProps {
  name: string;
  setName: (value: string) => void;
  onImageSelect?: (imageUrl: string) => void;
}

export const Step1Name = ({ name, setName }: Step1NameProps) => {
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
            onChange={(e) => {
              const val = e.target.value;
              if (val.length <= 100) {
                setName(val);
              }
            }}
            placeholder="e.g., Aspirin, Metformin, Lisinopril"
            required
            maxLength={100}
            className="h-10"
          />
          <p className="text-xs text-muted-foreground">{name.length}/100 characters</p>
        </div>
      </CardContent>
    </Card>
  );
};
