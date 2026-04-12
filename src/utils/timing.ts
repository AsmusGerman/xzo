export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout> | undefined
  return function (this: unknown, ...args: Parameters<T>) {
    clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), ms)
  } as T
}

export function throttle<T extends (...args: unknown[]) => unknown>(fn: T, ms: number): T {
  let last = 0
  return function (this: unknown, ...args: Parameters<T>) {
    const now = Date.now()
    if (now - last >= ms) {
      last = now
      return fn.apply(this, args)
    }
  } as T
}
