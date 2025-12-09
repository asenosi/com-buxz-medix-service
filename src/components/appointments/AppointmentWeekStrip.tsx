import { useState } from "react";
import { format, startOfWeek, addDays, isSameDay, addMonths, subMonths, startOfMonth, endOfMonth, isSameMonth, differenceInDays } from "date-fns";
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { Database } from "@/integrations/supabase/types";

type Appointment = Database["public"]["Tables"]["appointments"]["Row"];

interface AppointmentWeekStripProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  appointments: Appointment[];
}

export function AppointmentWeekStrip({
  selectedDate,
  onDateSelect,
  appointments,
}: AppointmentWeekStripProps) {
  const [expanded, setExpanded] = useState(false);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  
  const today = new Date();

  const hasAppointmentOnDate = (date: Date) => {
    return appointments.some((apt) =>
      isSameDay(new Date(apt.appointment_date), date)
    );
  };

  const handlePrev = () => {
    if (expanded) {
      onDateSelect(subMonths(selectedDate, 1));
    } else {
      // Move back one week
      onDateSelect(addDays(selectedDate, -7));
    }
  };

  const handleNext = () => {
    if (expanded) {
      onDateSelect(addMonths(selectedDate, 1));
    } else {
      // Move forward one week
      onDateSelect(addDays(selectedDate, 7));
    }
  };

  const handleMonthSelect = (date: Date | undefined) => {
    if (date) {
      onDateSelect(date);
      setMonthPickerOpen(false);
    }
  };

  // Get week days for collapsed view
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Get all days for the month grid in expanded view
  const getMonthDays = () => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    
    const days: Date[] = [];
    let currentDay = calendarStart;
    
    // Generate 6 weeks (42 days) to ensure we cover all possible month layouts
    for (let i = 0; i < 42; i++) {
      days.push(currentDay);
      currentDay = addDays(currentDay, 1);
    }
    
    return days;
  };

  const dayLabels = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

  return (
    <Card className="shadow-sm border-border/50">
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
                modifiers={{
                  hasAppointment: appointments.map((apt) => new Date(apt.appointment_date)),
                }}
                modifiersClassNames={{
                  hasAppointment: "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-primary after:rounded-full",
                }}
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

        {/* Week Strip - only show when collapsed */}
        {!expanded && (
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day) => {
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, today);
              const hasAppointment = hasAppointmentOnDate(day);

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
                      isToday && !isSelected && "bg-muted text-foreground",
                      isSelected && "bg-primary text-primary-foreground",
                      !isToday && !isSelected && "text-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {/* Appointment indicator dot */}
                  <div className="h-1.5 mt-0.5">
                    {hasAppointment && (
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        isSelected ? "bg-primary-foreground" : "bg-primary"
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
              const hasAppointment = hasAppointmentOnDate(day);
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
                      isToday && !isSelected && "bg-muted text-foreground",
                      isSelected && "bg-primary text-primary-foreground",
                      !isToday && !isSelected && "text-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {/* Appointment indicator dot */}
                  <div className="h-1.5 mt-0.5">
                    {hasAppointment && (
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        isSelected ? "bg-primary-foreground" : "bg-primary"
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

interface RelativeDateLabelProps {
  date: Date;
}

export function RelativeDateLabel({ date }: RelativeDateLabelProps) {
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
