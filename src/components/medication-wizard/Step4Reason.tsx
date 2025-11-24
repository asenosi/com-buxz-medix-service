import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface Step4ReasonProps {
  reason: string;
  setReason: (value: string) => void;
  dosage: string;
  setDosage: (value: string) => void;
  form: string;
}

const getDosagePlaceholder = (form: string) => {
  const placeholders: Record<string, string> = {
    pill: "e.g., 100mg, 500mg, 10mg",
    injection: "e.g., 0.5ml, 10mg/ml",
    solution: "e.g., 5ml, 10ml",
    drops: "e.g., 1 drop, 2 drops per eye",
    inhaler: "e.g., 2 puffs, 100mcg per puff",
    powder: "e.g., 1 sachet, 5g",
    spray: "e.g., 2 sprays per nostril, 50mcg",
    cream: "e.g., Apply thin layer, 1% cream",
    strip: "e.g., 1 strip, 25mg",
    stick: "e.g., 1 stick, 15g",
    insert: "e.g., 1 insert, 100mg",
    other: "e.g., As prescribed"
  };
  return placeholders[form] || "e.g., 100mg, 2 puffs, 1 drop";
};

export const Step4Reason = ({ reason, setReason, dosage, setDosage, form }: Step4ReasonProps) => {
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
            placeholder={getDosagePlaceholder(form)}
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
