/**
 * Custom hook for haptic feedback using the Web Vibration API
 */
export const useHaptic = () => {
  const vibrate = (pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  return {
    // Light tap (button press)
    light: () => vibrate(10),
    
    // Medium tap (action confirmation)
    medium: () => vibrate(30),
    
    // Heavy tap (important action)
    heavy: () => vibrate(50),
    
    // Success pattern
    success: () => vibrate([30, 20, 30]),
    
    // Warning pattern
    warning: () => vibrate([50, 30, 50]),
    
    // Error pattern
    error: () => vibrate([100, 50, 100, 50, 100]),
    
    // Custom pattern
    custom: (pattern: number | number[]) => vibrate(pattern),
  };
};