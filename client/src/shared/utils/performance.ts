import { useCallback, useRef, useMemo } from 'react';

// Debounce hook for performance optimization
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [callback, delay]
  );
}

// Throttle hook for performance optimization
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastCallRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      
      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now;
        callback(...args);
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(() => {
          lastCallRef.current = Date.now();
          callback(...args);
        }, delay - (now - lastCallRef.current));
      }
    }) as T,
    [callback, delay]
  );
}

// Memoization utility for expensive computations
export function useMemoizedValue<T>(
  factory: () => T,
  deps: React.DependencyList
): T {
  return useMemo(factory, deps);
}

// Intersection Observer hook for lazy loading
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
) {
  const elementRef = useRef<HTMLElement>(null);
  const observerRef = useRef<IntersectionObserver | undefined>(undefined);
  const callbackRef = useRef<(entry: IntersectionObserverEntry) => void | undefined>(undefined);

  const observe = useCallback((callback: (entry: IntersectionObserverEntry) => void) => {
    callbackRef.current = callback;
    
    if (elementRef.current && !observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            callbackRef.current?.(entry);
          });
        },
        options
      );
      
      observerRef.current.observe(elementRef.current);
    }
  }, [options]);

  const unobserve = useCallback(() => {
    if (observerRef.current && elementRef.current) {
      observerRef.current.unobserve(elementRef.current);
      observerRef.current.disconnect();
      observerRef.current = undefined;
    }
  }, []);

  return { elementRef, observe, unobserve };
}

// Performance measurement utilities
export class PerformanceMonitor {
  private static measurements = new Map<string, number>();

  static startMeasurement(name: string): void {
    this.measurements.set(name, performance.now());
  }

  static endMeasurement(name: string): number {
    const startTime = this.measurements.get(name);
    if (startTime === undefined) {
      console.warn(`No measurement started for "${name}"`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.measurements.delete(name);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`Performance: ${name} took ${duration.toFixed(2)}ms`);
    }
    
    return duration;
  }

  static measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.startMeasurement(name);
    return fn().finally(() => {
      this.endMeasurement(name);
    });
  }

  static measureSync<T>(name: string, fn: () => T): T {
    this.startMeasurement(name);
    try {
      return fn();
    } finally {
      this.endMeasurement(name);
    }
  }
}

// Image lazy loading utility
export function createLazyImage(src: string, placeholder?: string): {
  currentSrc: string;
  load: () => void;
  isLoaded: boolean;
} {
  let isLoaded = false;
  let currentSrc = placeholder || '';

  const load = () => {
    if (isLoaded) return;
    
    const img = new Image();
    img.onload = () => {
      currentSrc = src;
      isLoaded = true;
    };
    img.src = src;
  };

  return { currentSrc, load, isLoaded };
}

// Bundle size optimization - dynamic imports
export const lazyImport = <T extends Record<string, any>>(
  importFn: () => Promise<T>
) => {
  return importFn;
};

// Memory usage monitoring (development only)
export function logMemoryUsage(label: string): void {
  if (process.env.NODE_ENV === 'development' && 'memory' in performance) {
    const memory = (performance as any).memory;
    console.log(`Memory Usage (${label}):`, {
      used: `${Math.round(memory.usedJSHeapSize / 1024 / 1024)} MB`,
      total: `${Math.round(memory.totalJSHeapSize / 1024 / 1024)} MB`,
      limit: `${Math.round(memory.jsHeapSizeLimit / 1024 / 1024)} MB`
    });
  }
}

// Efficient array operations
export const arrayUtils = {
  // Efficient array chunking
  chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  },

  // Efficient array deduplication
  unique<T>(array: T[], keyFn?: (item: T) => any): T[] {
    if (!keyFn) {
      return [...new Set(array)];
    }
    
    const seen = new Set();
    return array.filter(item => {
      const key = keyFn(item);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  },

  // Efficient array search
  binarySearch<T>(array: T[], target: T, compareFn?: (a: T, b: T) => number): number {
    let left = 0;
    let right = array.length - 1;
    
    const compare = compareFn || ((a, b) => a < b ? -1 : a > b ? 1 : 0);
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const comparison = compare(array[mid], target);
      
      if (comparison === 0) {
        return mid;
      } else if (comparison < 0) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    
    return -1;
  }
};