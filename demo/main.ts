import { lib, signal } from 'xzo'

import './components'

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