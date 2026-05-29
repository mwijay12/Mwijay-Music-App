import { useEffect } from 'react'

// Debounce scroll events
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): T {
  let timer: number
  return ((...args) => {
    clearTimeout(timer)
    timer = window.setTimeout(() => fn(...args), delay)
  }) as T
}

// Throttle for smooth events
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): T {
  let lastCall = 0
  return ((...args) => {
    const now = Date.now()
    if (now - lastCall >= limit) {
      lastCall = now
      return fn(...args)
    }
  }) as T
}

// Use Intersection Observer for lazy loading
export function useLazyLoad(
  ref: React.RefObject<HTMLElement | null>,
  callback: () => void
) {
  useEffect(() => {
    if (!ref.current) return
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          callback()
          observer.disconnect()
        }
      },
      { rootMargin: '100px' }
    )
    
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [ref, callback])
}
