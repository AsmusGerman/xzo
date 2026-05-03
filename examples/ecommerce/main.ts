import { lib, signal } from 'xzo'

import './components/App'
import './components/ProductList'
import './components/ProductItem'
import './components/CartSummary'

declare module 'xzo' {
  interface ComponentRegistry {
    app: {
      cart: import('@preact/signals-core').Signal<import('./components/types').Product[]>
      total: import('@preact/signals-core').ReadonlySignal<number>
      totalPrice: import('@preact/signals-core').ReadonlySignal<string>
      checkoutMessage: import('@preact/signals-core').Signal<string>
    }
  }

  interface ServiceRegistry {
    logger: {
      entries: import('@preact/signals-core').ReadonlySignal<{ id: number; text: string }[]>
      log: (message: string) => void
    }
  }
}

type LogEntry = { id: number; text: string }

// Register a global logger service to demonstrate lib.service()
lib.service('logger', () => {
  let nextId = 0
  const entries = signal<LogEntry[]>([])

  function log(message: string) {
    const stamp = new Date().toLocaleTimeString()
    nextId += 1
    entries.value = [...entries.value, { id: nextId, text: `[${stamp}] ${message}` }]
    console.log(`[logger] ${message}`)
  }

  return { entries, log }
})

lib.init()