export type Owner = {
  name: string
  parent: Owner | null
  host: Element | null
  providers: Record<string, unknown>
  mountCallbacks: Array<() => void>
  unmountCallbacks: Array<() => void>
  cleanups: Set<() => void>
  refs: Map<string, unknown>
  mounted: boolean
}

let currentOwner: Owner | null = null

/**
 * Creates an object to represent the parent element
 * @param name 
 * Name of the component being created
 * @param parent 
 * Parent component definition
 * @param host 
 * @returns 
 */
export function createOwner(name: string, parent: Owner | null, host: Element | null): Owner {
  console.log(name, parent)
  return {
    name,
    // This object is recursive all the way to the top node ('app').
    parent,
    host,
    providers: {},
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

export function setOwnerProviders(owner: Owner, providers: Record<string, unknown>): void {
  owner.providers = providers
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
  owner.providers = {}
  owner.mounted = false
}