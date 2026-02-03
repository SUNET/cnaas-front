import { useRef, useEffect } from "react";

/**
 * Hook for providing updated value inside closures.
 */
export function useFreshRef(value) {
  const ref = useRef(value);

  // Always keep ref.current in sync with the latest value
  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref;
}
