import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";

interface Step5FrequencyProps {
  frequencyType: string;
  setFrequencyType: (value: string) => void;
  times: string[];
  setTimes: (value: string[]) => void;
  selectedDays: number[];
  setSelectedDays: (value: number[]) => void;
}

const frequencyOptions = [
  { value: "everyday", label: "Everyday" },
  { value: "every_other_day", label: "Every other day" },
  { value: "specific_days", label: "Specific days of the week" },
  { value: "every_x_days", label: "Every X days" },
  { value: "as_needed", label: "Only as needed" },
];

const daysOfWeek = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

export const Step5Frequency = ({
  frequencyType,
  setFrequencyType,
  times,
  setTimes,
  selectedDays,
  setSelectedDays,
}: Step5FrequencyProps) => {
  const [timesPerDay, setTimesPerDay] = useState(times.length || 1);

  const updateTimesPerDay = (count: number) => {
    setTimesPerDay(count);
    const newTimes = Array(count).fill("").map((_, i) => times[i] || "08:00");
    setTimes(newTimes);
  };

  const updateTime = (index: number, value: string) => {
    const newTimes = [...times];
    newTimes[index] = value;
    setTimes(newTimes);
  };

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  return (
    <Card>
      <CardContent className="pt-4 space-y-4">
        <div className="text-center mb-3">
          <h2 className="text-xl font-bold mb-1">How often do you take it?</h2>
          <p className="text-sm text-muted-foreground">Set your schedule</p>
        </div>
        
        <div className="grid grid-cols-1 gap-2">
          {frequencyOptions.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={frequencyType === option.value ? "default" : "outline"}
              onClick={() => setFrequencyType(option.value)}
              className="h-10 text-sm"
            >
              {option.label}
            </Button>
          ))}
        </div>

        {frequencyType === "everyday" && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">How many times a day?</Label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((count) => (
                  <Button
                    key={count}
                    type="button"
                    variant={timesPerDay === count ? "default" : "outline"}
                    onClick={() => updateTimesPerDay(count)}
                    className="h-10"
                  >
                    {count}x
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">What time(s)?</Label>
              {Array.from({ length: timesPerDay }).map((_, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-sm font-medium w-16">Dose {index + 1}:</span>
                  <Input
                    type="time"
                    value={times[index] || "08:00"}
                    onChange={(e) => updateTime(index, e.target.value)}
                    className="h-9"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {frequencyType === "specific_days" && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Select days</Label>
              <div className="grid grid-cols-7 gap-1.5">
                {daysOfWeek.map((day) => (
                  <Button
                    key={day.value}
                    type="button"
                    variant={selectedDays.includes(day.value) ? "default" : "outline"}
                    onClick={() => toggleDay(day.value)}
                    className="h-10 text-xs"
                  >
                    {day.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">What time?</Label>
              <Input
                type="time"
                value={times[0] || "08:00"}
                onChange={(e) => setTimes([e.target.value])}
                className="h-9"
              />
            </div>
          </div>
        )}

        {frequencyType === "every_other_day" && (
          <div className="space-y-2">
            <Label className="text-sm font-semibold">What time?</Label>
            <Input
              type="time"
              value={times[0] || "08:00"}
              onChange={(e) => setTimes([e.target.value])}
              className="h-9"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
