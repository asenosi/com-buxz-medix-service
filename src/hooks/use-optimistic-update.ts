import { useState, useCallback } from "react";

/**
 * Hook for optimistic UI updates
 * Shows immediate feedback while waiting for server confirmation
 */
export function useOptimisticUpdate<T>(initialData: T) {
  const [data, setData] = useState<T>(initialData);
  const [isOptimistic, setIsOptimistic] = useState(false);

  const updateOptimistically = useCallback(
    async (
      optimisticValue: T,
      serverUpdate: () => Promise<T>
    ) => {
      // Immediately show optimistic update
      setData(optimisticValue);
      setIsOptimistic(true);

      try {
        // Wait for server confirmation
        const result = await serverUpdate();
        setData(result);
        setIsOptimistic(false);
        return result;
      } catch (error) {
        // Revert on error
        setData(initialData);
        setIsOptimistic(false);
        throw error;
      }
    },
    [initialData]
  );

  return {
    data,
    isOptimistic,
    updateOptimistically,
    setData,
  };
}