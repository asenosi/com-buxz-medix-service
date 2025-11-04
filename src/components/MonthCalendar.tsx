import { ChevronLeft, ChevronRight, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DayData {
  date: Date;
  hasTaken: boolean;
  hasSkipped: boolean;
  hasSnoozed: boolean;
  totalDoses: number;
  takenDoses: number;
}

interface MonthCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  highlightDates?: Date[];
  adherenceData?: DayData[];
}

export const MonthCalendar = ({ selectedDate, onDateSelect, highlightDates = [], adherenceData = [] }: MonthCalendarProps) => {
  const currentMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  
  const previousMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    onDateSelect(newDate);
  };

  const nextMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    onDateSelect(newDate);
  };

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const emptyDays = Array(firstDayOfMonth).fill(null);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isHighlighted = (date: Date) => {
    return highlightDates.some(d => {
      const hDate = new Date(d);
      hDate.setHours(0, 0, 0, 0);
      return hDate.getTime() === date.getTime();
    });
  };

  const isSelected = (date: Date) => {
    const sel = new Date(selectedDate);
    sel.setHours(0, 0, 0, 0);
    return sel.getTime() === date.getTime();
  };

  const isToday = (date: Date) => {
    return today.getTime() === date.getTime();
  };

  const getDayData = (date: Date): DayData | undefined => {
    return adherenceData.find(d => {
      const dDate = new Date(d.date);
      dDate.setHours(0, 0, 0, 0);
      return dDate.getTime() === date.getTime();
    });
  };

  const getAdherenceColor = (dayData: DayData | undefined, isPast: boolean) => {
    if (!dayData || !isPast) return null;
    
    const { takenDoses, totalDoses, hasSkipped } = dayData;
    
    if (takenDoses === totalDoses && totalDoses > 0) {
      return 'bg-success/20 border border-success/40';
    } else if (takenDoses > 0) {
      return 'bg-warning/20 border border-warning/40';
    } else if (hasSkipped) {
      return 'bg-warning/20 border border-warning/40';
    } else if (totalDoses > 0) {
      return 'bg-destructive/20 border border-destructive/40';
    }
    return null;
  };

  // Calculate if a day is part of current streak
  const isPartOfStreak = (date: Date): boolean => {
    const dayData = getDayData(date);
    if (!dayData || dayData.totalDoses === 0) return false;
    
    // Check if all doses were taken
    if (dayData.takenDoses !== dayData.totalDoses) return false;
    
    // Check if this is today or in the past
    if (date > today) return false;
    
    // Check if there's a consecutive pattern
    let consecutiveDays = 0;
    for (let i = 0; i <= 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      checkDate.setHours(0, 0, 0, 0);
      
      const checkData = getDayData(checkDate);
      if (checkData && checkData.totalDoses > 0 && checkData.takenDoses === checkData.totalDoses) {
        consecutiveDays++;
        if (checkDate.getTime() === date.getTime()) {
          return true;
        }
      } else if (i > 0) {
        break;
      }
    }
    
    return false;
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <Button onClick={previousMonth} variant="ghost" size="icon">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h3 className="text-lg font-semibold">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        <Button onClick={nextMonth} variant="ghost" size="icon">
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
          <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}
        
        {emptyDays.map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
          const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
          date.setHours(0, 0, 0, 0);
          const isPast = date < today;
          const dayData = getDayData(date);
          const adherenceColor = getAdherenceColor(dayData, isPast || isToday(date));
          const showStreak = isPartOfStreak(date);
          
          return (
            <button
              key={day}
              onClick={() => onDateSelect(date)}
              className={cn(
                "aspect-square flex flex-col items-center justify-center rounded-lg text-sm font-medium",
                "transition-all relative group",
                isPast && !adherenceColor && 'text-muted-foreground opacity-50',
                isToday(date) && 'ring-2 ring-primary ring-offset-2',
                isSelected(date) && 'bg-primary text-primary-foreground',
                !isSelected(date) && !adherenceColor && 'hover:bg-muted',
                !isSelected(date) && !isToday(date) && !isPast && !adherenceColor && 'text-foreground',
                adherenceColor && !isSelected(date)
              )}
            >
              <span className={cn(
                showStreak && !isSelected(date) && "text-success font-bold"
              )}>
                {day}
              </span>
              
              {showStreak && !isSelected(date) && (
                <Flame className="w-3 h-3 text-orange-500 absolute top-0.5 right-0.5" />
              )}
              
              {dayData && isPast && !isSelected(date) && dayData.totalDoses > 0 && (
                <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {dayData.takenDoses === dayData.totalDoses ? (
                    <span className="w-1 h-1 rounded-full bg-success" />
                  ) : dayData.takenDoses > 0 ? (
                    <>
                      <span className="w-1 h-1 rounded-full bg-success" />
                      <span className="w-1 h-1 rounded-full bg-warning" />
                    </>
                  ) : dayData.hasSkipped ? (
                    <span className="w-1 h-1 rounded-full bg-warning" />
                  ) : (
                    <span className="w-1 h-1 rounded-full bg-destructive" />
                  )}
                </div>
              )}
              
              {isHighlighted(date) && !isSelected(date) && !dayData && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
