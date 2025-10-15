import { useCallback, useRef, useEffect, useMemo, useState } from 'react';

/**
 * Performance optimization utilities for React components
 */

// Simple debounce implementation (no external dependency)
function debounce<T extends (...args: any[]) => void>(func: T, delay: number): T {
  let timeoutId: NodeJS.Timeout;

  return ((...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  }) as T;
}

// Debounced callback hook for performance
export function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): T {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedCallback = useMemo(
    () => debounce((...args: Parameters<T>) => callbackRef.current(...args), delay),
    [delay]
  );

  useEffect(() => {
    return () => {
      // Simple cleanup - no cancel method needed
    };
  }, [debouncedCallback]);

  return useCallback(debouncedCallback, deps) as T;
}

// Memoized calculation hook
export function useMemoizedCalculation<T>(calculation: () => T, deps: React.DependencyList): T {
  return useMemo(calculation, deps);
}

// Intersection Observer hook for lazy loading
export function useIntersectionObserver(
  callback: (entries: IntersectionObserverEntry[]) => void,
  options: IntersectionObserverInit = {}
) {
  const targetRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(callback, {
      threshold: 0.1,
      rootMargin: '100px',
      ...options,
    });

    observer.observe(target);

    return () => {
      observer.unobserve(target);
      observer.disconnect();
    };
  }, [callback, options]);

  return targetRef;
}

// Virtual scrolling hook for large lists
export function useVirtualScrolling<T>(items: T[], itemHeight: number, containerHeight: number) {
  const [startIndex, setStartIndex] = useState(0);
  const [endIndex, setEndIndex] = useState(0);

  const visibleItems = useMemo(() => {
    const itemsPerPage = Math.ceil(containerHeight / itemHeight);
    const buffer = Math.floor(itemsPerPage / 2);

    const start = Math.max(0, startIndex - buffer);
    const end = Math.min(items.length, endIndex + buffer);

    return items.slice(start, end).map((item, index) => ({
      item,
      index: start + index,
      top: (start + index) * itemHeight,
    }));
  }, [items, startIndex, endIndex, itemHeight]);

  const onScroll = useCallback(
    (scrollTop: number) => {
      const newStartIndex = Math.floor(scrollTop / itemHeight);
      const itemsPerPage = Math.ceil(containerHeight / itemHeight);
      const newEndIndex = newStartIndex + itemsPerPage;

      setStartIndex(newStartIndex);
      setEndIndex(newEndIndex);
    },
    [itemHeight, containerHeight]
  );

  const totalHeight = items.length * itemHeight;

  return {
    visibleItems,
    totalHeight,
    onScroll,
  };
}

// Performance monitoring hook
export function usePerformanceMonitor(componentName: string, enabled = false) {
  const renderCountRef = useRef(0);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (enabled) {
      renderCountRef.current += 1;
      const renderTime = Date.now() - startTimeRef.current;

      if (renderTime > 16) {
        // More than one frame (16ms)
        console.warn(
          `🐌 Slow render in ${componentName}: ${renderTime}ms (render #${renderCountRef.current})`
        );
      }

      startTimeRef.current = Date.now();
    }
  });

  return {
    renderCount: renderCountRef.current,
  };
}

// Memoized data fetching hook
export function useMemoizedFetch<T>(
  fetchFn: () => Promise<T>,
  deps: React.DependencyList,
  initialData?: T
) {
  const [data, setData] = useState<T | undefined>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const memoizedFetch = useCallback(fetchFn, deps);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const result = await memoizedFetch();

        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Fetch failed'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [memoizedFetch]);

  return { data, loading, error };
}

// Batch state updates for better performance
export function useBatchedUpdates() {
  const batchRef = useRef<{ [key: string]: any }>({});
  const timeoutRef = useRef<NodeJS.Timeout>();

  const setBatch = useCallback((key: string, value: any, callback?: () => void) => {
    batchRef.current[key] = value;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callback?.();
      batchRef.current = {};
    }, 0);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return setBatch;
}

// Image lazy loading hook
export function useLazyImage(src: string, placeholder?: string) {
  const [imageSrc, setImageSrc] = useState(placeholder || '');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);

  const imgRef = useIntersectionObserver(
    (entries) => {
      const [entry] = entries;
      if (entry.isIntersecting && !isLoaded && !isError) {
        const img = new Image();
        img.onload = () => {
          setImageSrc(src);
          setIsLoaded(true);
        };
        img.onerror = () => {
          setIsError(true);
        };
        img.src = src;
      }
    },
    { threshold: 0.1 }
  );

  return { imageSrc, isLoaded, isError, imgRef };
}

// Performance utilities
export const performanceUtils = {
  // Measure component render time
  measureRender: (componentName: string, fn: () => void) => {
    const start = performance.now();
    fn();
    const end = performance.now();
    console.log(`🕐 ${componentName} render time: ${(end - start).toFixed(2)}ms`);
  },

  // Debounce function calls
  debounce: <T extends (...args: any[]) => void>(fn: T, delay: number): T => {
    return debounce(fn, delay) as T;
  },

  // Throttle function calls
  throttle: <T extends (...args: any[]) => void>(fn: T, delay: number): T => {
    let lastCall = 0;
    return ((...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        return fn(...args);
      }
    }) as T;
  },

  // Memory usage monitoring
  getMemoryUsage: (): string => {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      return `Used: ${(memory.usedJSHeapSize / 1048576).toFixed(2)}MB / Total: ${(memory.totalJSHeapSize / 1048576).toFixed(2)}MB`;
    }
    return 'Memory monitoring not available';
  },

  // Bundle size analysis helpers
  analyzeBundle: () => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.log('📦 Bundle Analysis:', {
        userAgent: navigator.userAgent,
        location: window.location.href,
      });
    }
  },
};
