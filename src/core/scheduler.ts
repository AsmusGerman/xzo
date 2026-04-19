/**
 * Owner represents a component instance in the scheduler.
 * It manages the lifecycle of the component — mount/unmount callbacks,
 * cleanup functions, element references, and the scope exposed to its subtree.
 */
export class Owner {
  /** The exposed state and API of the component, available to its subtree */
  scope: Record<string, unknown> = {}
  mountCallbacks: Array<() => void> = []
  unmountCallbacks: Array<() => void> = []
  cleanupCallbacks: Array<() => void> = []
  refs: Map<string, unknown> = new Map()
  mounted = false

  constructor(
    public readonly name: string,
    public readonly parent: Owner | null,
    public readonly host: Element | null,
  ) {}

  setScope(scope: Record<string, unknown>): void {
    this.scope = scope
  }

  addMountCallback(callback: () => void): void {
    this.mountCallbacks.push(callback)
  }

  addUnmountCallback(callback: () => void): void {
    this.unmountCallbacks.push(callback)
  }

  addCleanup(cleanup: () => void): void {
    this.cleanupCallbacks.push(cleanup)
  }

  mount(): void {
    this.mounted = true
    for (const callback of this.mountCallbacks) {
      runWithOwner(this, callback)
    }
  }

  dispose(): void {
    for (const callback of this.unmountCallbacks) {
      runWithOwner(this, callback)
    }
    for (const cleanup of this.cleanupCallbacks) {
      cleanup()
    }
    this.cleanupCallbacks.length = 0
    this.mountCallbacks.length = 0
    this.unmountCallbacks.length = 0
    this.refs.clear()
    this.scope = {}
    this.mounted = false
  }
}

let currentOwner: Owner | null = null

/**
 * Returns the current owner — the component instance that is currently
 * being initialized. Only reliable during synchronous component setup.
 */
export function createOwner(name: string, parent: Owner | null, host: Element | null): Owner {
  return new Owner(name, parent, host)
}

export function getOwner(): Owner | null {
  return currentOwner
}

/**
 * Runs fn with the given owner set as the current owner, then restores
 * the previous owner. The finally block guarantees restoration even if fn throws.
 */
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
  owner.setScope(scope)
}

export function addMountCallback(owner: Owner, callback: () => void): void {
  owner.addMountCallback(callback)
}

export function addUnmountCallback(owner: Owner, callback: () => void): void {
  owner.addUnmountCallback(callback)
}

export function addCleanup(owner: Owner, cleanup: () => void): void {
  owner.addCleanup(cleanup)
}

export function mountOwner(owner: Owner): void {
  owner.mount()
}

export function disposeOwner(owner: Owner): void {
  owner.dispose()
}
