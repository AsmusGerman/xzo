import { describe, it, expect, beforeEach } from 'bun:test'
import { ComponentDefinition, getOwner, runWithOwner } from './scheduler'

/**
 * Minimal DOM element stub — satisfies the Element-shaped API used by
 * ComponentDefinition without requiring a browser or jsdom.
 */
function makeElement(): Element {
  return {} as Element
}

// ---------------------------------------------------------------------------
// Lifecycle guards
// ---------------------------------------------------------------------------

describe('mount() guard', () => {
  it('runs mountCallbacks exactly once when called twice', () => {
    const owner = new ComponentDefinition('test', null, null)
    let count = 0
    owner.addMountCallback(() => { count++ })

    owner.mount()
    owner.mount()

    expect(count).toBe(1)
  })

  it('sets mounted = true after first mount', () => {
    const owner = new ComponentDefinition('test', null, null)
    owner.mount()
    expect(owner.mounted).toBe(true)
  })
})

describe('dispose() guard', () => {
  it('runs unmount and cleanup callbacks exactly once when called twice', () => {
    const owner = new ComponentDefinition('test', null, null)
    let unmount = 0
    let cleanup = 0
    owner.addUnmountCallback(() => { unmount++ })
    owner.addCleanup(() => { cleanup++ })

    owner.dispose()
    owner.dispose()

    expect(unmount).toBe(1)
    expect(cleanup).toBe(1)
  })

  it('does not throw on second dispose()', () => {
    const owner = new ComponentDefinition('test', null, null)
    owner.dispose()
    expect(() => owner.dispose()).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// isDisposed flag
// ---------------------------------------------------------------------------

describe('isDisposed', () => {
  it('is false before dispose()', () => {
    const owner = new ComponentDefinition('test', null, null)
    expect(owner.isDisposed).toBe(false)
  })

  it('is true after dispose()', () => {
    const owner = new ComponentDefinition('test', null, null)
    owner.dispose()
    expect(owner.isDisposed).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Callbacks cleared after dispose
// ---------------------------------------------------------------------------

describe('dispose() clears callback arrays', () => {
  it('clears mountCallbacks', () => {
    const owner = new ComponentDefinition('test', null, null)
    owner.addMountCallback(() => {})
    owner.dispose()
    expect(owner.mountCallbacks.length).toBe(0)
  })

  it('clears unmountCallbacks', () => {
    const owner = new ComponentDefinition('test', null, null)
    owner.addUnmountCallback(() => {})
    owner.dispose()
    expect(owner.unmountCallbacks.length).toBe(0)
  })

  it('clears cleanupCallbacks', () => {
    const owner = new ComponentDefinition('test', null, null)
    owner.addCleanup(() => {})
    owner.dispose()
    expect(owner.cleanupCallbacks.length).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Scope and refs cleared after dispose
// ---------------------------------------------------------------------------

describe('dispose() clears scope and refs', () => {
  it('clears scope to empty object', () => {
    const owner = new ComponentDefinition('test', null, null)
    owner.setScope({ counter: 42, name: 'xzo' })
    owner.dispose()
    expect(Object.keys(owner.scope).length).toBe(0)
  })

  it('clears refs map', () => {
    const owner = new ComponentDefinition('test', null, null)
    owner.refs.set('btn', makeElement())
    owner.dispose()
    expect(owner.refs.size).toBe(0)
  })

  it('resets mounted flag to false', () => {
    const owner = new ComponentDefinition('test', null, null)
    owner.mount()
    owner.dispose()
    expect(owner.mounted).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// currentOwner is NOT the disposing owner inside unmount callbacks
// ---------------------------------------------------------------------------

describe('unmount callbacks — no runWithOwner', () => {
  it('getOwner() returns null (or outer owner) inside an unmount callback', () => {
    const owner = new ComponentDefinition('test', null, null)
    let capturedOwner: ComponentDefinition | null | undefined = undefined

    owner.addUnmountCallback(() => {
      capturedOwner = getOwner()
    })

    owner.dispose()

    // Should NOT be the disposing owner — it must be null (no outer context here)
    expect(capturedOwner).toBeNull()
    expect(capturedOwner).not.toBe(owner)
  })

  it('getOwner() returns the surrounding owner, not the disposing one, when disposed inside runWithOwner', () => {
    const outer = new ComponentDefinition('outer', null, null)
    const inner = new ComponentDefinition('inner', outer, null)
    let capturedOwner: ComponentDefinition | null | undefined = undefined

    inner.addUnmountCallback(() => {
      capturedOwner = getOwner()
    })

    // Dispose inner while outer is current — unmount callback should NOT see inner
    runWithOwner(outer, () => inner.dispose())

    expect(capturedOwner).toBe(outer)
    expect(capturedOwner).not.toBe(inner)
  })
})

// ---------------------------------------------------------------------------
// providers alias
// ---------------------------------------------------------------------------

describe('providers getter', () => {
  it('returns the same reference as scope', () => {
    const owner = new ComponentDefinition('test', null, null)
    expect(owner.providers).toBe(owner.scope)
  })

  it('reflects scope changes', () => {
    const owner = new ComponentDefinition('test', null, null)
    const newScope = { x: 1 }
    owner.setScope(newScope)
    expect(owner.providers).toBe(newScope)
  })
})

// ---------------------------------------------------------------------------
// parent and host WeakRef accessors
// ---------------------------------------------------------------------------

describe('parent WeakRef accessor', () => {
  it('returns the parent owner while it is alive', () => {
    const parent = new ComponentDefinition('parent', null, null)
    const child = new ComponentDefinition('child', parent, null)
    expect(child.parent).toBe(parent)
  })

  it('returns null when constructed with null parent', () => {
    const owner = new ComponentDefinition('root', null, null)
    expect(owner.parent).toBeNull()
  })
})

describe('host WeakRef accessor', () => {
  it('returns the host element while it is alive', () => {
    const el = makeElement()
    const owner = new ComponentDefinition('test', null, el)
    expect(owner.host).toBe(el)
  })

  it('returns null when constructed with null host', () => {
    const owner = new ComponentDefinition('test', null, null)
    expect(owner.host).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// No effect leak — cleanup removes signal subscriber
// ---------------------------------------------------------------------------

describe('no effect leak after dispose', () => {
  it('cleanup registered via addCleanup is invoked on dispose', () => {
    const owner = new ComponentDefinition('test', null, null)
    let disposed = false
    owner.addCleanup(() => { disposed = true })

    owner.dispose()

    expect(disposed).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// GC-dependent tests — require deterministic GC
// These are documented here; run with `bun test --expose-gc` to exercise the
// FinalizationRegistry path. Synchronous GC is not guaranteed so these tests
// only assert the WeakRef deref behaviour while references are in scope.
// ---------------------------------------------------------------------------

describe('WeakRef GC semantics (structural, not GC-dependent)', () => {
  it('parent() returns null immediately when WeakRef is constructed with null', () => {
    const owner = new ComponentDefinition('test', null, null)
    expect(owner.parent).toBeNull()
  })

  it('host() returns null immediately when WeakRef is constructed with null', () => {
    const owner = new ComponentDefinition('test', null, null)
    expect(owner.host).toBeNull()
  })
})
