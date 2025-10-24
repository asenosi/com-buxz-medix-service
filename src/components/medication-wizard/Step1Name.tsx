import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

interface Step1NameProps {
  name: string;
  setName: (value: string) => void;
}

export const Step1Name = ({ name, setName }: Step1NameProps) => {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">What medication would you like to add?</h2>
          <p className="text-muted-foreground">Enter the medication name</p>
        </div>
        
        <div className="space-y-3">
          <Label htmlFor="name" className="text-lg font-semibold">
            Medication Name *
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Aspirin, Metformin, Lisinopril"
            required
            className="text-lg h-14"
          />
        </div>
      </CardContent>
    </Card>
  );
};
