import { useState, useEffect } from "react";

/**
 * A hook that debounces a value by a specified delay.
 * This is useful for search inputs where you want to wait for the user to stop typing
 * before triggering a search.
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
