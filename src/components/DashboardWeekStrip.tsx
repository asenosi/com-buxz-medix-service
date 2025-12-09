import { useState } from "react";
import { format, startOfWeek, addDays, isSameDay, addMonths, subMonths, startOfMonth, endOfMonth, isSameMonth, differenceInDays } from "date-fns";
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Pill } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

interface DayData {
  date: string;
  total: number;
  taken: number;
  skipped: number;
  snoozed: number;
}

interface DashboardWeekStripProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  adherenceData?: DayData[];
}

export function DashboardWeekStrip({
  selectedDate,
  onDateSelect,
  adherenceData = [],
}: DashboardWeekStripProps) {
  const [expanded, setExpanded] = useState(false);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  
  const today = new Date();

  const getDayData = (date: Date): DayData | undefined => {
    const dateStr = format(date, "yyyy-MM-dd");
    return adherenceData.find(d => d.date === dateStr);
  };

  const hasDosesOnDate = (date: Date): boolean => {
    const dayData = getDayData(date);
    return dayData ? dayData.total > 0 : false;
  };

  const getDoseIndicator = (date: Date): { color: string; count: number } | null => {
    const dayData = getDayData(date);
    if (!dayData || dayData.total === 0) return null;

    const completionRate = dayData.taken / dayData.total;
    
    if (completionRate === 1) {
      return { color: "bg-success", count: dayData.total };
    } else if (completionRate > 0) {
      return { color: "bg-warning", count: dayData.total };
    } else if (isSameDay(date, today) || date > today) {
      return { color: "bg-primary", count: dayData.total };
    } else {
      return { color: "bg-destructive", count: dayData.total };
    }
  };

  const handlePrev = () => {
    if (expanded) {
      onDateSelect(subMonths(selectedDate, 1));
    } else {
      onDateSelect(addDays(selectedDate, -7));
    }
  };

  const handleNext = () => {
    if (expanded) {
      onDateSelect(addMonths(selectedDate, 1));
    } else {
      onDateSelect(addDays(selectedDate, 7));
    }
  };

  const handleMonthSelect = (date: Date | undefined) => {
    if (date) {
      onDateSelect(date);
      setMonthPickerOpen(false);
    }
  };

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getMonthDays = () => {
    const monthStart = startOfMonth(selectedDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    
    const days: Date[] = [];
    let currentDay = calendarStart;
    
    for (let i = 0; i < 42; i++) {
      days.push(currentDay);
      currentDay = addDays(currentDay, 1);
    }
    
    return days;
  };

  const dayLabels = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  return (
    <Card className="shadow-sm border-border/50 mb-4">
      <CardContent className="p-3 sm:p-4">
        {/* Month Header with Navigation */}
        <div className="flex items-center justify-between mb-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handlePrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Popover open={monthPickerOpen} onOpenChange={setMonthPickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="gap-1.5 text-base font-semibold">
                {format(selectedDate, "MMMM yyyy")}
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleMonthSelect}
                className="rounded-md border-0 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Day Labels */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayLabels.map((label) => (
            <div key={label} className="text-center text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              {label}
            </div>
          ))}
        </div>

        {/* Week Strip */}
        {!expanded && (
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day) => {
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, today);
              const indicator = getDoseIndicator(day);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => onDateSelect(day)}
                  className={cn(
                    "flex flex-col items-center py-1.5 rounded-lg transition-all",
                    "hover:bg-muted/50 active:scale-95"
                  )}
                >
                  <span
                    className={cn(
                      "flex items-center justify-center w-10 h-10 text-sm font-semibold rounded-full transition-colors",
                      isToday && !isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                      isSelected && "bg-primary text-primary-foreground",
                      !isToday && !isSelected && "text-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  <div className="h-1.5 mt-0.5">
                    {indicator && (
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        isSelected ? "bg-primary-foreground" : indicator.color
                      )} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Expanded Full Month Grid */}
        {expanded && (
          <div className="grid grid-cols-7 gap-1">
            {getMonthDays().map((day, index) => {
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, today);
              const indicator = getDoseIndicator(day);
              const isCurrentMonth = isSameMonth(day, selectedDate);

              return (
                <button
                  key={index}
                  onClick={() => onDateSelect(day)}
                  className={cn(
                    "flex flex-col items-center py-1.5 rounded-lg transition-all",
                    "hover:bg-muted/50 active:scale-95",
                    !isCurrentMonth && "opacity-40"
                  )}
                >
                  <span
                    className={cn(
                      "flex items-center justify-center w-10 h-10 text-sm font-semibold rounded-full transition-colors",
                      isToday && !isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                      isSelected && "bg-primary text-primary-foreground",
                      !isToday && !isSelected && "text-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  <div className="h-1.5 mt-0.5">
                    {indicator && (
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        isSelected ? "bg-primary-foreground" : indicator.color
                      )} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Expand/Collapse Toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex justify-center pt-2 mt-1"
        >
          {expanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </button>
      </CardContent>
    </Card>
  );
}

interface DashboardRelativeDateLabelProps {
  date: Date;
}

export function DashboardRelativeDateLabel({ date }: DashboardRelativeDateLabelProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  const daysDiff = differenceInDays(targetDate, today);

  let label: string;
  
  if (daysDiff === 0) {
    label = "Today";
  } else if (daysDiff === 1) {
    label = "Tomorrow";
  } else if (daysDiff === -1) {
    label = "Yesterday";
  } else if (daysDiff > 1) {
    label = `In ${daysDiff} days`;
  } else {
    label = `${Math.abs(daysDiff)} days ago`;
  }

  return (
    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
      {label}
    </span>
  );
}
