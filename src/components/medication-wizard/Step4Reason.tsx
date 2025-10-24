import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface Step4ReasonProps {
  reason: string;
  setReason: (value: string) => void;
  dosage: string;
  setDosage: (value: string) => void;
}

export const Step4Reason = ({ reason, setReason, dosage, setDosage }: Step4ReasonProps) => {
  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">What are you taking it for?</h2>
          <p className="text-muted-foreground">Help us understand your treatment</p>
        </div>
        
        <div className="space-y-3">
          <Label htmlFor="reason" className="text-lg font-semibold">
            Reason for Taking *
          </Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., High blood pressure, Diabetes, Pain relief"
            required
            className="text-lg min-h-[100px]"
          />
        </div>

        <div className="space-y-3">
          <Label htmlFor="dosage" className="text-lg font-semibold">
            Dosage/Strength *
          </Label>
          <Input
            id="dosage"
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
            placeholder="e.g., 100mg, 2 puffs, 1 drop"
            required
            className="text-lg h-14"
          />
        </div>
      </CardContent>
    </Card>
  );
};
