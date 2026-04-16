/**
 * ComponentDefinition represents a component instance in the scheduler.
 * It manages the lifecycle of the component — mount/unmount callbacks,
 * cleanup functions, element references, and the scope exposed to its subtree.
 */
export class ComponentDefinition {
  /** The exposed state and API of the component, available to its subtree */
  scope: Record<string, unknown> = {}
  mountCallbacks: Array<() => void> = []
  unmountCallbacks: Array<() => void> = []
  cleanupCallbacks: Array<() => void> = []
  refs: Map<string, unknown> = new Map()
  mounted = false
  #disposed = false

  readonly #parent: WeakRef<ComponentDefinition> | null
  readonly #host: WeakRef<Element> | null

  constructor(
    public readonly name: string,
    parent: ComponentDefinition | null,
    host: Element | null,
  ) {
    this.#parent = parent ? new WeakRef(parent) : null
    this.#host = host ? new WeakRef(host) : null

    if (host) {
      const self = new WeakRef(this)
      ownerRegistry.register(host, () => self.deref()?.dispose())
    }
  }

  get parent(): ComponentDefinition | null {
    return this.#parent?.deref() ?? null
  }

  get host(): Element | null {
    return this.#host?.deref() ?? null
  }

  /** Alias for scope — used by source-each.ts and inject walk */
  get providers(): Record<string, unknown> {
    return this.scope
  }

  get isDisposed(): boolean {
    return this.#disposed
  }

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
    if (this.mounted) return
    this.mounted = true
    for (const callback of this.mountCallbacks) {
      runWithOwner(this, callback)
    }
  }

  dispose(): void {
    if (this.#disposed) return
    this.#disposed = true

    for (const cb of this.unmountCallbacks) cb()
    for (const cb of this.cleanupCallbacks) cb()

    this.cleanupCallbacks.length = 0
    this.mountCallbacks.length = 0
    this.unmountCallbacks.length = 0

    this.refs.clear()
    this.scope = {}
    this.mounted = false
  }
}

/**
 * Safety net — if dispose() is never called (e.g. innerHTML = '' removes the
 * host without going through the framework), GC of the host element will
 * eventually trigger cleanup via this registry.
 */
const ownerRegistry = new FinalizationRegistry<() => void>((cleanup) => cleanup())

let currentOwner: ComponentDefinition | null = null

/**
 * Returns the current owner — the component instance that is currently
 * being initialized. Only reliable during synchronous component setup.
 */
export function getOwner(): ComponentDefinition | null {
  return currentOwner
}

/**
 * Runs fn with the given owner set as the current owner, then restores
 * the previous owner. The finally block guarantees restoration even if fn throws.
 */
export function runWithOwner<T>(owner: ComponentDefinition | null, fn: () => T): T {
  const previous = currentOwner
  currentOwner = owner
  try {
    return fn()
  } finally {
    currentOwner = previous
  }
}

/** @deprecated Use ComponentDefinition */
export type Owner = ComponentDefinition
