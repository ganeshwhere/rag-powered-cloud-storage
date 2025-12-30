'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { cn } from '@/shared/utils/cn';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscan?: number;
  onScroll?: (scrollTop: number) => void;
}

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className,
  overscan = 5,
  onScroll
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const totalHeight = items.length * itemHeight;

  const visibleRange = useMemo(() => {
    const visibleStart = Math.floor(scrollTop / itemHeight);
    const visibleEnd = Math.min(
      visibleStart + Math.ceil(containerHeight / itemHeight),
      items.length - 1
    );

    const start = Math.max(0, visibleStart - overscan);
    const end = Math.min(items.length - 1, visibleEnd + overscan);

    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const visibleItems = useMemo(() => {
    const result = [];
    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      result.push({
        index: i,
        item: items[i],
        offsetY: i * itemHeight
      });
    }
    return result;
  }, [items, visibleRange, itemHeight]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);
  };

  return (
    <div
      ref={scrollElementRef}
      className={cn('overflow-auto', className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ index, item, offsetY }) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              top: offsetY,
              left: 0,
              right: 0,
              height: itemHeight
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}

// Hook for dynamic item heights (more complex but handles variable heights)
export function useVirtualList<T>({
  items,
  estimateItemHeight,
  containerHeight,
  overscan = 5
}: {
  items: T[];
  estimateItemHeight: (index: number) => number;
  containerHeight: number;
  overscan?: number;
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const [measuredHeights, setMeasuredHeights] = useState<Map<number, number>>(new Map());
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const itemOffsets = useMemo(() => {
    const offsets = [0];
    for (let i = 0; i < items.length; i++) {
      const height = measuredHeights.get(i) ?? estimateItemHeight(i);
      offsets[i + 1] = offsets[i] + height;
    }
    return offsets;
  }, [items.length, measuredHeights, estimateItemHeight]);

  const totalHeight = itemOffsets[items.length] || 0;

  const visibleRange = useMemo(() => {
    const findIndex = (offset: number) => {
      let low = 0;
      let high = itemOffsets.length - 1;
      
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (itemOffsets[mid] <= offset) {
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }
      
      return Math.max(0, high);
    };

    const start = Math.max(0, findIndex(scrollTop) - overscan);
    const end = Math.min(
      items.length - 1,
      findIndex(scrollTop + containerHeight) + overscan
    );

    return { start, end };
  }, [scrollTop, containerHeight, itemOffsets, items.length, overscan]);

  const visibleItems = useMemo(() => {
    const result = [];
    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      result.push({
        index: i,
        item: items[i],
        offsetY: itemOffsets[i]
      });
    }
    return result;
  }, [items, visibleRange, itemOffsets]);

  const measureItem = (index: number, height: number) => {
    setMeasuredHeights(prev => {
      if (prev.get(index) !== height) {
        const newMap = new Map(prev);
        newMap.set(index, height);
        return newMap;
      }
      return prev;
    });
  };

  return {
    scrollElementRef,
    visibleItems,
    totalHeight,
    measureItem,
    setScrollTop
  };
}