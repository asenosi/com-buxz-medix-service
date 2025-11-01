import { useState } from "react";
import { format, startOfWeek, addDays, isSameDay, isToday } from "date-fns";

interface WeekCalendarProps {
  onDateSelect: (date: Date) => void;
  selectedDate?: Date;
}

export const WeekCalendar = ({ onDateSelect, selectedDate }: WeekCalendarProps) => {
  const [currentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  return (
    <div className="w-full mb-6">
      <div className="grid grid-cols-7 gap-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
          <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}
        
        {weekDays.map((day) => {
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
          const isCurrentDay = isToday(day);
          
          return (
            <button
              key={day.toISOString()}
              onClick={() => onDateSelect(day)}
              className={`
                aspect-square flex items-center justify-center rounded-lg text-sm font-medium
                transition-colors relative
                ${isCurrentDay ? 'ring-2 ring-primary ring-offset-2' : ''}
                ${isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}
                ${!isSelected && !isCurrentDay ? 'text-foreground' : ''}
              `}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
};
