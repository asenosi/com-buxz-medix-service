import { useState, useRef } from "react";
import { useSwipeable } from "react-swipeable";
import { CheckCircle2, XCircle, AlarmClock } from "lucide-react";
import { DoseCard } from "./DoseCard";
import { cn } from "@/lib/utils";

interface Medication {
  id: string;
  name: string;
  dosage: string;
  form: string | null;
  pills_remaining: number | null;
  image_url: string | null;
  images?: string[];
  grace_period_minutes?: number | null;
  reminder_window_minutes?: number | null;
  missed_dose_cutoff_minutes?: number | null;
}

interface Schedule {
  id: string;
  medication_id: string;
  time_of_day: string;
  with_food: boolean;
  special_instructions: string | null;
}

interface TodayDose {
  medication: Medication;
  schedule: Schedule;
  nextDoseTime: Date;
  status: "upcoming" | "due" | "overdue";
  isTaken?: boolean;
  isSkipped?: boolean;
  isSnoozed?: boolean;
  snoozeUntil?: Date;
}

interface SwipeableDoseCardProps {
  dose: TodayDose;
  isPastDate?: boolean;
  onMarkTaken: (dose: TodayDose) => void;
  onMarkSkipped: (dose: TodayDose) => void;
  onMarkSnoozed: (dose: TodayDose, minutes: number) => void;
  onEdit: (medicationId: string) => void;
  onOpenDetails: (medicationId: string) => void;
}

export const SwipeableDoseCard = ({ 
  dose, 
  isPastDate, 
  onMarkTaken, 
  onMarkSkipped, 
  onMarkSnoozed,
  onEdit,
  onOpenDetails 
}: SwipeableDoseCardProps) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const isCompleted = dose.isTaken || dose.isSkipped || dose.isSnoozed;
  const SWIPE_THRESHOLD = 100;

  const handlers = useSwipeable({
    onSwiping: (eventData) => {
      if (isCompleted || isPastDate) return;
      setSwiping(true);
      setSwipeOffset(eventData.deltaX);
    },
    onSwipedRight: (eventData) => {
      if (isCompleted || isPastDate) return;
      setSwiping(false);
      if (Math.abs(eventData.deltaX) > SWIPE_THRESHOLD) {
        // Haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }
        onMarkTaken(dose);
        setSwipeOffset(0);
      } else {
        setSwipeOffset(0);
      }
    },
    onSwipedLeft: (eventData) => {
      if (isCompleted || isPastDate) return;
      setSwiping(false);
      if (Math.abs(eventData.deltaX) > SWIPE_THRESHOLD) {
        // Haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate([30, 20, 30]);
        }
        onMarkSnoozed(dose, 15);
        setSwipeOffset(0);
      } else {
        setSwipeOffset(0);
      }
    },
    trackMouse: false,
    trackTouch: true,
    delta: 10,
  });

  const swipeProgress = Math.min(Math.abs(swipeOffset) / SWIPE_THRESHOLD, 1);
  const isSwipeRight = swipeOffset > 0;

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Background Actions */}
      {!isCompleted && !isPastDate && (
        <>
          <div 
            className={cn(
              "absolute left-0 top-0 bottom-0 w-20 flex items-center justify-center transition-opacity duration-200",
              isSwipeRight ? "bg-success" : "bg-transparent"
            )}
            style={{ 
              opacity: isSwipeRight ? swipeProgress : 0,
            }}
          >
            <CheckCircle2 className="w-8 h-8 text-white" />
          </div>
          <div 
            className={cn(
              "absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center transition-opacity duration-200",
              !isSwipeRight ? "bg-warning" : "bg-transparent"
            )}
            style={{ 
              opacity: !isSwipeRight ? swipeProgress : 0,
            }}
          >
            <AlarmClock className="w-8 h-8 text-white" />
          </div>
        </>
      )}

      {/* Card */}
      <div
        {...handlers}
        ref={cardRef}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: swiping ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        <DoseCard
          dose={dose}
          isPastDate={isPastDate}
          onMarkTaken={onMarkTaken}
          onMarkSkipped={onMarkSkipped}
          onMarkSnoozed={onMarkSnoozed}
          onEdit={onEdit}
          onOpenDetails={onOpenDetails}
        />
      </div>
    </div>
  );
};