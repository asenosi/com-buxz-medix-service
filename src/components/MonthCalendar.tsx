import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MonthCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  highlightDates?: Date[];
}

export const MonthCalendar = ({ selectedDate, onDateSelect, highlightDates = [] }: MonthCalendarProps) => {
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
          
          return (
            <button
              key={day}
              onClick={() => onDateSelect(date)}
              className={`
                aspect-square flex items-center justify-center rounded-lg text-sm font-medium
                transition-colors relative
                ${isToday(date) ? 'ring-2 ring-primary ring-offset-2' : ''}
                ${isSelected(date) ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}
                ${!isSelected(date) && !isToday(date) ? 'text-foreground' : ''}
              `}
            >
              {day}
              {isHighlighted(date) && !isSelected(date) && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
