import { Card, CardContent } from "@/components/ui/card";
import { Pill, Syringe, Droplet, Wind, Bandage, Clipboard } from "lucide-react";
import type React from "react";

interface Step7ReviewProps {
  data: {
    name: string;
    form: string;
    route: string;
    reason: string;
    dosage: string;
    frequencyType: string;
    times: string[];
    selectedDays: number[];
    medicationIcon: string;
    medicationColor: string;
    imagePreviews?: string[];
  };
}

const iconMap: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  pill: Pill,
  injection: Syringe,
  drop: Droplet,
  inhaler: Wind,
  bandage: Bandage,
  clipboard: Clipboard,
};

const daysMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const Step7Review = ({ data }: Step7ReviewProps) => {
  const Icon = iconMap[data.medicationIcon] || Pill;

  return (
    <Card>
      <CardContent className="pt-4 space-y-4">
        <div className="text-center mb-3">
          <h2 className="text-xl font-bold mb-1">Review Your Medication</h2>
          <p className="text-sm text-muted-foreground">Make sure everything looks good</p>
        </div>

        <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
          {data.imagePreviews && data.imagePreviews.length > 0 ? (
            <img src={data.imagePreviews[0]} alt={data.name} className="w-16 h-16 rounded-lg object-cover border" />
          ) : (
            <div className={`w-16 h-16 rounded-full flex items-center justify-center bg-${data.medicationColor}-500`}>
              <Icon className="w-8 h-8 text-white" />
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-xl font-bold">{data.name}</h3>
            <p className="text-muted-foreground">{data.dosage}</p>
          </div>
        </div>

        {data.imagePreviews && data.imagePreviews.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {data.imagePreviews.slice(1).map((src, idx) => (
              <img key={idx} src={src} alt={`${data.name} ${idx+2}`} className="w-16 h-16 rounded-lg object-cover border" />
            ))}
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Form</p>
              <p className="font-semibold capitalize">{data.form}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Route</p>
              <p className="font-semibold">{data.route.replace(/_/g, ' ')}</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Taking it for</p>
            <p className="font-semibold">{data.reason}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Schedule</p>
            {data.frequencyType === "everyday" && (
              <div>
                <p className="font-semibold">Everyday</p>
                <p className="text-sm">{data.times.join(", ")}</p>
              </div>
            )}
            {data.frequencyType === "specific_days" && (
              <div>
                <p className="font-semibold">
                  {data.selectedDays.map(d => daysMap[d]).join(", ")}
                </p>
                <p className="text-sm">{data.times[0]}</p>
              </div>
            )}
            {data.frequencyType === "every_other_day" && (
              <p className="font-semibold">Every other day at {data.times[0]}</p>
            )}
            {data.frequencyType === "as_needed" && (
              <p className="font-semibold">As needed</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
