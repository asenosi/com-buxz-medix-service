import { useState, useRef, useEffect, TouchEvent } from "react";
import { format, startOfWeek, addDays, isSameDay, addMonths, subMonths, startOfMonth, isSameMonth, differenceInDays } from "date-fns";
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  onMonthYearChange?: (label: string, onPrev: () => void, onNext: () => void) => void;
}

export function DashboardWeekStrip({
  selectedDate,
  onDateSelect,
  adherenceData = [],
  onMonthYearChange,
}: DashboardWeekStripProps) {
  const [expanded, setExpanded] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);
  
  const today = new Date();

  // Notify parent of month/year changes for header display
  useEffect(() => {
    if (onMonthYearChange) {
      const label = format(selectedDate, "MMMM yyyy");
      onMonthYearChange(label, handlePrev, handleNext);
    }
  }, [selectedDate, expanded, onMonthYearChange]);

  const getDayData = (date: Date): DayData | undefined => {
    const dateStr = format(date, "yyyy-MM-dd");
    return adherenceData.find(d => d.date === dateStr);
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


  // Swipe gesture handlers
  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchEndX.current = null;
    touchEndY.current = null;
  };

  const handleTouchMove = (e: TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    
    const diffX = touchStartX.current - (touchEndX.current ?? touchStartX.current);
    const diffY = touchStartY.current - (touchEndY.current ?? touchStartY.current);
    const minSwipeDistance = 50;
    
    // Determine if horizontal or vertical swipe based on which axis has larger movement
    const isHorizontalSwipe = Math.abs(diffX) > Math.abs(diffY);
    
    if (isHorizontalSwipe && Math.abs(diffX) > minSwipeDistance) {
      // Horizontal swipe - navigate weeks/months
      if (diffX > 0) {
        setSwipeDirection("left");
        handleNext();
      } else {
        setSwipeDirection("right");
        handlePrev();
      }
      setTimeout(() => setSwipeDirection(null), 300);
    } else if (!isHorizontalSwipe && Math.abs(diffY) > minSwipeDistance) {
      // Vertical swipe - expand/collapse
      if (diffY > 0) {
        // Swipe up - collapse
        setExpanded(false);
      } else {
        // Swipe down - expand
        setExpanded(true);
      }
    }
    
    touchStartX.current = null;
    touchEndX.current = null;
    touchStartY.current = null;
    touchEndY.current = null;
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
    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/50 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 pb-3 pt-2">
      {/* Day Labels */}
      <div className="grid grid-cols-9 gap-1 mb-1">
        <div /> {/* Spacer for left arrow */}
        {dayLabels.map((label) => (
          <div key={label} className="text-center text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </div>
        ))}
        <div /> {/* Spacer for right arrow */}
      </div>

      {/* Week Strip with side navigation */}
      {!expanded && (
        <div 
          className={cn(
            "grid grid-cols-9 gap-1 items-center transition-transform duration-200",
            swipeDirection === "left" && "animate-fade-in",
            swipeDirection === "right" && "animate-fade-in"
          )}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 justify-self-center"
            onClick={handlePrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {weekDays.map((day) => {
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, today);
            const indicator = getDoseIndicator(day);

            return (
              <button
                key={day.toISOString()}
                onClick={() => onDateSelect(day)}
                className={cn(
                  "flex flex-col items-center py-1 rounded-lg transition-all",
                  "hover:bg-muted/50 active:scale-95"
                )}
              >
                <span
                  className={cn(
                    "flex items-center justify-center w-9 h-9 text-sm font-semibold rounded-full transition-colors",
                    isToday && !isSelected && "ring-2 ring-primary ring-offset-1 ring-offset-background",
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
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 justify-self-center"
            onClick={handleNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Expanded Full Month Grid with side navigation */}
      {expanded && (
        <div 
          className={cn(
            "grid grid-cols-9 gap-1 items-start transition-transform duration-200",
            swipeDirection === "left" && "animate-fade-in",
            swipeDirection === "right" && "animate-fade-in"
          )}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 justify-self-center mt-8"
            onClick={handlePrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="col-span-7 grid grid-cols-7 gap-1">
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
                    "flex flex-col items-center py-1 rounded-lg transition-all",
                    "hover:bg-muted/50 active:scale-95",
                    !isCurrentMonth && "opacity-40"
                  )}
                >
                  <span
                    className={cn(
                      "flex items-center justify-center w-9 h-9 text-sm font-semibold rounded-full transition-colors",
                      isToday && !isSelected && "ring-2 ring-primary ring-offset-1 ring-offset-background",
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
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 justify-self-center mt-8"
            onClick={handleNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Expand/Collapse Toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex justify-center pt-1"
      >
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
    </div>
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
