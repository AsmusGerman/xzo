import { lib, signal } from 'xzo'
import type { AnySignal } from 'xzo'
import '@xzo/router'

import './services/cart'
import './components/App'
import './components/ProductList'
import './components/ProductItem'
import './components/CartSummary'
import './pages/PageHome'
import './pages/PageCheckoutConfirm'

type LogEntry = { id: number; text: string }

// Augment the xzo registries with the service and component types used in this demo
declare module 'xzo' {
  interface ServiceRegistry {
    logger: { entries: AnySignal<LogEntry[]>; log: (message: string) => void }
  }
}

declare module '@xzo/router' {
  interface RouteRegistry {
    'page-home': Record<string, never>
    'page-checkout-confirm': Record<string, never>
  }
}

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