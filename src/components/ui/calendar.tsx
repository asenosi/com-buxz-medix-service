import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-6 pointer-events-auto", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-between items-center pt-1 mb-2 w-full px-1",
        caption_label: "text-xl font-bold text-foreground",
        nav: "flex items-center gap-1",
        nav_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-10 w-10 bg-background hover:bg-muted rounded-full p-0 shadow-sm border border-border/50 transition-all",
        ),
        nav_button_previous: "",
        nav_button_next: "",
        table: "w-full border-collapse space-y-1 mt-4",
        head_row: "flex justify-between mb-2",
        head_cell: "text-muted-foreground w-12 font-medium text-xs uppercase",
        row: "flex justify-between w-full mt-1.5",
        cell: "h-12 w-12 text-center text-sm p-0 relative flex items-center justify-center",
        day: cn(
          "h-12 w-12 p-0 font-normal rounded-full transition-all hover:bg-muted",
          "aria-selected:opacity-100 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground shadow-sm",
        day_today: "bg-primary text-primary-foreground font-semibold shadow-md hover:bg-primary hover:text-primary-foreground",
        day_outside:
          "day-outside text-muted-foreground/40 opacity-40 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground/30 opacity-30",
        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-5 w-5" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-5 w-5" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
