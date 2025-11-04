import { useState } from "react";
import { format, startOfWeek, addDays, isSameDay, isToday } from "date-fns";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface DayData {
  date: Date;
  hasTaken: boolean;
  hasSkipped: boolean;
  hasSnoozed: boolean;
  totalDoses: number;
  takenDoses: number;
}

interface WeekCalendarProps {
  onDateSelect: (date: Date) => void;
  selectedDate?: Date;
  adherenceData?: DayData[];
}

export const WeekCalendar = ({ onDateSelect, selectedDate, adherenceData = [] }: WeekCalendarProps) => {
  const [currentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  
  const getDayData = (date: Date): DayData | undefined => {
    return adherenceData.find(d => {
      const dDate = new Date(d.date);
      dDate.setHours(0, 0, 0, 0);
      const checkDate = new Date(date);
      checkDate.setHours(0, 0, 0, 0);
      return dDate.getTime() === checkDate.getTime();
    });
  };

  const getAdherenceColor = (dayData: DayData | undefined, isPast: boolean) => {
    if (!dayData || !isPast) return null;
    
    const { takenDoses, totalDoses, hasSkipped } = dayData;
    
    if (takenDoses === totalDoses && totalDoses > 0) {
      return 'bg-success/20 border-2 border-success/50';
    } else if (takenDoses > 0) {
      return 'bg-warning/20 border-2 border-warning/50';
    } else if (hasSkipped) {
      return 'bg-warning/20 border-2 border-warning/50';
    } else if (totalDoses > 0) {
      return 'bg-destructive/20 border-2 border-destructive/50';
    }
    return null;
  };

  const isPartOfStreak = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dayData = getDayData(date);
    if (!dayData || dayData.totalDoses === 0) return false;
    
    if (dayData.takenDoses !== dayData.totalDoses) return false;
    
    if (date > today) return false;
    
    let consecutiveDays = 0;
    for (let i = 0; i <= 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      checkDate.setHours(0, 0, 0, 0);
      
      const checkData = getDayData(checkDate);
      if (checkData && checkData.totalDoses > 0 && checkData.takenDoses === checkData.totalDoses) {
        consecutiveDays++;
        const dateCheck = new Date(date);
        dateCheck.setHours(0, 0, 0, 0);
        if (checkDate.getTime() === dateCheck.getTime()) {
          return true;
        }
      } else if (i > 0) {
        break;
      }
    }
    
    return false;
  };

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
          const isPastDay = day < new Date(new Date().setHours(0, 0, 0, 0));
          const dayData = getDayData(day);
          const adherenceColor = getAdherenceColor(dayData, isPastDay || isCurrentDay);
          const showStreak = isPartOfStreak(day);
          
          return (
            <button
              key={day.toISOString()}
              onClick={() => onDateSelect(day)}
              className={cn(
                "aspect-square flex flex-col items-center justify-center rounded-lg text-sm font-medium",
                "transition-all relative group",
                isPastDay && !adherenceColor && 'text-muted-foreground opacity-50',
                isCurrentDay && 'ring-2 ring-primary ring-offset-2',
                isSelected && 'bg-primary text-primary-foreground',
                !isSelected && !adherenceColor && 'hover:bg-muted',
                !isSelected && !isCurrentDay && !isPastDay && !adherenceColor && 'text-foreground',
                adherenceColor && !isSelected
              )}
            >
              <span className={cn(
                showStreak && !isSelected && "text-success font-bold"
              )}>
                {format(day, "d")}
              </span>
              
              {showStreak && !isSelected && (
                <Flame className="w-3 h-3 text-orange-500 absolute top-0.5 right-0.5" />
              )}
              
              {dayData && (isPastDay || isCurrentDay) && !isSelected && dayData.totalDoses > 0 && (
                <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {dayData.takenDoses === dayData.totalDoses ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-success" />
                  ) : dayData.takenDoses > 0 ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-success" />
                      <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                    </>
                  ) : dayData.hasSkipped ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
