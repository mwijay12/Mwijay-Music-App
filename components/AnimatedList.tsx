import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnimatedListProps<T> {
  items: T[];
  getKey: (item: T) => string | number;
  renderItem: (item: T, index: number, isSelected: boolean) => React.ReactNode;
  onItemSelect?: (item: T, index: number) => void;
  showGradients?: boolean;
  enableArrowNavigation?: boolean;
  displayScrollbar?: boolean;
  className?: string;
  itemClassName?: string;
}

const AnimatedList = <T,>({
  items,
  getKey,
  renderItem,
  onItemSelect,
  showGradients = true,
  enableArrowNavigation = true,
  displayScrollbar = false,
  className = '',
  itemClassName = '',
}: AnimatedListProps<T>) => {
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const listRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, items.length);
  }, [items]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enableArrowNavigation || items.length === 0) return;

    let newIndex = selectedIndex;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      newIndex = (selectedIndex + 1) % items.length;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      newIndex = (selectedIndex - 1 + items.length) % items.length;
    } else if (e.key === 'Enter' && selectedIndex !== -1) {
      e.preventDefault();
      onItemSelect?.(items[selectedIndex], selectedIndex);
      return;
    }
    
    if (newIndex !== selectedIndex) {
      setSelectedIndex(newIndex);
      itemRefs.current[newIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [enableArrowNavigation, items, selectedIndex, onItemSelect]);

  useEffect(() => {
    // A better implementation would use focus management to avoid global listeners.
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <div 
        className={`relative h-full overflow-y-auto ${!displayScrollbar ? 'scroll-container' : ''} ${className}`}
    >
      {showGradients && (
        <>
            <div className="sticky top-0 h-10 w-full bg-gradient-to-b from-[var(--bg-color)] to-transparent z-10 pointer-events-none" />
            <div className="sticky bottom-0 h-10 w-full bg-gradient-to-t from-[var(--bg-color)] to-transparent z-10 pointer-events-none" />
        </>
      )}
      <ul ref={listRef} className="relative z-0 p-2 space-y-1">
        <AnimatePresence>
          {items.map((item, index) => (
            <motion.li
              key={getKey(item)}
              ref={el => (itemRefs.current[index] = el)}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0, transition: { delay: index * 0.03, duration: 0.3 } }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={() => onItemSelect?.(item, index)}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
                e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
              }}
              className={`animated-list-item-wrapper rounded-lg cursor-pointer ${itemClassName} ${selectedIndex === index ? 'selected' : ''}`}
            >
              {renderItem(item, index, selectedIndex === index)}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
};

export default AnimatedList;
