import { useState, useRef, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
}

export const PullToRefresh = ({ onRefresh, children }: PullToRefreshProps) => {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const PULL_THRESHOLD = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (refreshing || !containerRef.current || containerRef.current.scrollTop > 0) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - touchStartY.current;

    if (distance > 0) {
      setPulling(true);
      setPullDistance(Math.min(distance, PULL_THRESHOLD * 1.5));
      
      // Prevent default scrolling when pulling
      if (distance > 10) {
        e.preventDefault();
      }
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= PULL_THRESHOLD && !refreshing) {
      setRefreshing(true);
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(30);
      }
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setRefreshing(false);
      }
    }
    setPulling(false);
    setPullDistance(0);
  };

  const pullProgress = Math.min(pullDistance / PULL_THRESHOLD, 1);
  const showRefreshIndicator = pulling || refreshing;

  return (
    <div 
      ref={containerRef}
      className="relative overflow-auto h-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull Indicator */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-200 z-50",
          showRefreshIndicator ? "opacity-100" : "opacity-0"
        )}
        style={{
          height: refreshing ? '60px' : `${pullDistance}px`,
          transform: refreshing ? 'translateY(0)' : 'translateY(-20px)',
        }}
      >
        <div className="bg-primary/10 backdrop-blur-sm rounded-full p-2">
          <Loader2 
            className={cn(
              "w-6 h-6 text-primary transition-transform",
              refreshing ? "animate-spin" : ""
            )}
            style={{
              transform: `rotate(${pullProgress * 360}deg)`,
            }}
          />
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          transform: refreshing ? 'translateY(60px)' : `translateY(${pullDistance * 0.5}px)`,
          transition: refreshing || !pulling ? 'transform 0.3s ease-out' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
};