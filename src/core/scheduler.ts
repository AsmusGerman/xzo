/**
 * The Owner represets a component instance in the scheduler.
 * It manages the Lifecycle of the component, for onMount and onUnmount callback,
 * cleanup functions and provide a way to store references and the scope for the component and its children.
  */
export type Owner = {
  /** The name of the component instance */
  name: string
  /** The parent owner in the component hierarchy */
  parent: Owner | null
  /** The host element for the component */
  host: Element | null
  /** The exposed state and API of the component, available to its subtree */
  scope: Record<string, unknown>
  mountCallbacks: Array<() => void>
  unmountCallbacks: Array<() => void>
  cleanups: Set<() => void>
  refs: Map<string, unknown>
  mounted: boolean
}

let currentOwner: Owner | null = null

export function createOwner(name: string, parent: Owner | null, host: Element | null): Owner {
  return {
    name,
    parent,
    host,
    scope: {},
    mountCallbacks: [],
    unmountCallbacks: [],
    cleanups: new Set(),
    refs: new Map(),
    mounted: false,
  }
}

export function getOwner(): Owner | null {
  return currentOwner
}

export function runWithOwner<T>(owner: Owner | null, fn: () => T): T {
  const previous = currentOwner
  currentOwner = owner

  try {
    return fn()
  } finally {
    currentOwner = previous
  }
}

export function setOwnerScope(owner: Owner, scope: Record<string, unknown>): void {
  owner.scope = scope
}

export function addMountCallback(owner: Owner, callback: () => void): void {
  owner.mountCallbacks.push(callback)
}

export function addUnmountCallback(owner: Owner, callback: () => void): void {
  owner.unmountCallbacks.push(callback)
}

export function addCleanup(owner: Owner, cleanup: () => void): void {
  owner.cleanups.add(cleanup)
}

export function mountOwner(owner: Owner): void {
  owner.mounted = true
  for (const callback of owner.mountCallbacks) {
    runWithOwner(owner, callback)
  }
}

export function disposeOwner(owner: Owner): void {
  for (const callback of owner.unmountCallbacks) {
    runWithOwner(owner, callback)
  }

  for (const cleanup of owner.cleanups) {
    cleanup()
  }

  owner.cleanups.clear()
  owner.mountCallbacks.length = 0
  owner.unmountCallbacks.length = 0
  owner.refs.clear()
  owner.scope = {}
  owner.mounted = false
}