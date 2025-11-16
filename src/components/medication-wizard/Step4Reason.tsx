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
      <CardContent className="pt-4 space-y-4">
        <div className="text-center mb-3">
          <h2 className="text-xl font-bold mb-1">What are you taking it for?</h2>
          <p className="text-sm text-muted-foreground">Help us understand your treatment</p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="reason" className="text-sm font-semibold">
            Reason for Taking *
          </Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => {
              const val = e.target.value;
              if (val.length <= 300) {
                setReason(val);
              }
            }}
            placeholder="e.g., High blood pressure, Diabetes, Pain relief"
            required
            maxLength={300}
            className="min-h-[80px] text-sm"
          />
          <p className="text-xs text-muted-foreground">{reason.length}/300 characters</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dosage" className="text-sm font-semibold">
            Dosage/Strength *
          </Label>
          <Input
            id="dosage"
            value={dosage}
            onChange={(e) => {
              const val = e.target.value;
              if (val.length <= 50) {
                setDosage(val);
              }
            }}
            placeholder="e.g., 100mg, 2 puffs, 1 drop"
            required
            maxLength={50}
            className="h-10"
          />
          <p className="text-xs text-muted-foreground">{dosage.length}/50 characters</p>
        </div>
      </CardContent>
    </Card>
  );
};
