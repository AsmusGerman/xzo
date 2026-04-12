import { effect } from '@preact/signals-core'
import { isSignal } from '../types'
import { getOwner, runWithOwner, type Owner } from '../core/scheduler'

function normalizeValue(value: unknown): unknown {
  if (isSignal(value)) {
    return value.value
  }

  return value
}

function createUnwrappedScope(owner: Owner | null): Record<string, unknown> {
  if (!owner) {
    return {}
  }

  return new Proxy({}, {
    get(_, property) {
      if (typeof property !== 'string') {
        return undefined
      }

      if (property in owner.scope) {
        return normalizeValue(owner.scope[property])
      }

      if (owner.host) {
        return normalizeValue((owner.host as unknown as Record<string, unknown>)[property])
      }

      return undefined
    },
  }) as Record<string, unknown>
}

function invokeChildFn(fn: (...args: unknown[]) => unknown, owner: Owner | null): unknown {
  if (fn.length > 0) {
    return fn(createUnwrappedScope(owner))
  }

  return fn()
}

function createNode(value: unknown): Node | null {
  if (value === null || value === undefined || value === false) {
    return null
  }

  if (value instanceof Node) {
    return value
  }

  return document.createTextNode(String(value))
}

function reconcile(parent: Node, value: unknown, current: Node | null, marker: Node | null): Node | null {
  const next = createNode(normalizeValue(value))

  if (!next) {
    if (current?.parentNode === parent) {
      parent.removeChild(current)
    }
    return null
  }

  if (current === next) {
    return current
  }

  if (current?.parentNode === parent) {
    parent.replaceChild(next, current)
    return next
  }

  if (marker) {
    parent.insertBefore(next, marker)
  } else {
    parent.appendChild(next)
  }

  return next
}

export function insert(parent: Node, value: unknown, marker: Node | null = null): void {
  const owner = getOwner()

  if (isSignal(value)) {
    let current: Node | null = null
    effect(() => {
      current = runWithOwner(owner, () => reconcile(parent, value.value, current, marker))
    })
    return
  }

  if (typeof value === 'function') {
    let current: Node | null = null
    const callback = value as (...args: unknown[]) => unknown
    effect(() => {
      current = runWithOwner(owner, () => reconcile(parent, invokeChildFn(callback, owner), current, marker))
    })
    return
  }

  reconcile(parent, value, null, marker)
}