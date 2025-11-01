import { useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format, startOfWeek, addDays, isSameDay, isToday } from "date-fns";

interface WeekCalendarProps {
  onDateSelect: (date: Date) => void;
  selectedDate?: Date;
}

export const WeekCalendar = ({ onDateSelect, selectedDate }: WeekCalendarProps) => {
  const [currentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  return (
    <div className="grid grid-cols-7 gap-2 mb-6">
      {weekDays.map((day) => {
        const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
        const isCurrentDay = isToday(day);
        
        return (
          <Card
            key={day.toISOString()}
            className={cn(
              "p-3 cursor-pointer transition-all hover:scale-105 hover:shadow-lg text-center",
              isSelected && "bg-primary text-primary-foreground border-primary shadow-md",
              isCurrentDay && !isSelected && "border-primary/50 bg-primary/5",
              !isSelected && "hover:border-primary/30"
            )}
            onClick={() => onDateSelect(day)}
          >
            <div className="text-xs font-medium mb-1">
              {format(day, "EEE")}
            </div>
            <div className={cn(
              "text-2xl font-bold",
              isSelected && "text-primary-foreground"
            )}>
              {format(day, "d")}
            </div>
          </Card>
        );
      })}
    </div>
  );
};
