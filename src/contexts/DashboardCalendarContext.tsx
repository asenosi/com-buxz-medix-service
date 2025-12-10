import { createContext, useContext, useState, ReactNode } from "react";

interface DashboardCalendarContextType {
  calendarLabel: string;
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
  setCalendarInfo: (label: string, onPrev: () => void, onNext: () => void) => void;
  clearCalendarInfo: () => void;
}

const DashboardCalendarContext = createContext<DashboardCalendarContextType | undefined>(undefined);

export function DashboardCalendarProvider({ children }: { children: ReactNode }) {
  const [calendarLabel, setCalendarLabel] = useState("");
  const [onPrev, setOnPrev] = useState<(() => void) | null>(null);
  const [onNext, setOnNext] = useState<(() => void) | null>(null);

  const setCalendarInfo = (label: string, prevFn: () => void, nextFn: () => void) => {
    setCalendarLabel(label);
    setOnPrev(() => prevFn);
    setOnNext(() => nextFn);
  };

  const clearCalendarInfo = () => {
    setCalendarLabel("");
    setOnPrev(null);
    setOnNext(null);
  };

  return (
    <DashboardCalendarContext.Provider value={{ calendarLabel, onPrev, onNext, setCalendarInfo, clearCalendarInfo }}>
      {children}
    </DashboardCalendarContext.Provider>
  );
}

export function useDashboardCalendar() {
  const context = useContext(DashboardCalendarContext);
  if (!context) {
    throw new Error("useDashboardCalendar must be used within DashboardCalendarProvider");
  }
  return context;
}
