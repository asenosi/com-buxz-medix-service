import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pill, Syringe, Droplet, Eye, Wind, Package } from "lucide-react";

interface Step2FormProps {
  form: string;
  setForm: (value: string) => void;
}

const formOptions = [
  { value: "pill", label: "Pill", icon: Pill },
  { value: "injection", label: "Injection", icon: Syringe },
  { value: "solution", label: "Solution (Liquid)", icon: Droplet },
  { value: "drops", label: "Drops", icon: Eye },
  { value: "inhaler", label: "Inhaler", icon: Wind },
  { value: "powder", label: "Powder", icon: Package },
  { value: "spray", label: "Spray", icon: Wind },
  { value: "cream", label: "Cream", icon: Package },
  { value: "strip", label: "Strip", icon: Package },
  { value: "stick", label: "Stick", icon: Package },
  { value: "insert", label: "Insert", icon: Package },
  { value: "other", label: "Other", icon: Package },
];

export const Step2Form = ({ form, setForm }: Step2FormProps) => {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">What form is the medication?</h2>
          <p className="text-muted-foreground">Select the medication type</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {formOptions.map((option) => {
            const Icon = option.icon;
            return (
              <Button
                key={option.value}
                type="button"
                variant={form === option.value ? "default" : "outline"}
                onClick={() => setForm(option.value)}
                className="h-24 flex flex-col gap-2"
              >
                <Icon className="w-6 h-6" />
                <span>{option.label}</span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
