import { describe, test, expect, beforeEach } from 'bun:test'
import {
  createOwner,
  disposeOwner,
  mountOwner,
  runWithOwner,
  getOwner,
  addCleanup,
  addMountCallback,
  addUnmountCallback,
  setOwnerProviders,
  type Owner,
} from '../../../src/core/scheduler'

// ---------------------------------------------------------------------------
// createOwner
// ---------------------------------------------------------------------------

describe('createOwner', () => {
  test('initialises all fields correctly', () => {
    const owner = createOwner('my-component', null, null)
    expect(owner.name).toBe('my-component')
    expect(owner.parent).toBeNull()
    expect(owner.host).toBeNull()
    expect(owner.mounted).toBe(false)
    expect(owner.mountCallbacks).toEqual([])
    expect(owner.unmountCallbacks).toEqual([])
    expect(owner.cleanups.size).toBe(0)
    expect(owner.refs.size).toBe(0)
    expect(owner.providers).toEqual({})
  })

  test('stores parent reference', () => {
    const parent = createOwner('parent', null, null)
    const child = createOwner('child', parent, null)
    expect(child.parent).toBe(parent)
  })

  test('stores host element reference', () => {
    const el = document.createElement('div')
    const owner = createOwner('host-test', null, el)
    expect(owner.host).toBe(el)
  })
})

// ---------------------------------------------------------------------------
// runWithOwner / getOwner
// ---------------------------------------------------------------------------

describe('runWithOwner', () => {
  test('sets getOwner() inside the callback', () => {
    const owner = createOwner('test', null, null)
    let captured: Owner | null = null
    runWithOwner(owner, () => {
      captured = getOwner()
    })
    expect(captured).toBe(owner)
  })

  test('restores the previous owner after the callback', () => {
    const outer = createOwner('outer', null, null)
    const inner = createOwner('inner', null, null)
    runWithOwner(outer, () => {
      runWithOwner(inner, () => {})
      expect(getOwner()).toBe(outer)
    })
  })

  test('restores null when there was no previous owner', () => {
    const owner = createOwner('test', null, null)
    runWithOwner(owner, () => {})
    expect(getOwner()).toBeNull()
  })

  test('returns the callback return value', () => {
    const owner = createOwner('test', null, null)
    const result = runWithOwner(owner, () => 42)
    expect(result).toBe(42)
  })

  test('restores owner even when the callback throws', () => {
    const owner = createOwner('test', null, null)
    try {
      runWithOwner(owner, () => { throw new Error('boom') })
    } catch {
      // expected
    }
    expect(getOwner()).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// mountOwner
// ---------------------------------------------------------------------------

describe('mountOwner', () => {
  test('sets mounted to true', () => {
    const owner = createOwner('test', null, null)
    expect(owner.mounted).toBe(false)
    mountOwner(owner)
    expect(owner.mounted).toBe(true)
  })

  test('fires all mount callbacks in order', () => {
    const owner = createOwner('test', null, null)
    const calls: string[] = []
    addMountCallback(owner, () => calls.push('a'))
    addMountCallback(owner, () => calls.push('b'))
    mountOwner(owner)
    expect(calls).toEqual(['a', 'b'])
  })

  test('runs mount callbacks with the owner as current owner', () => {
    const owner = createOwner('test', null, null)
    let captured: Owner | null = null
    addMountCallback(owner, () => { captured = getOwner() })
    mountOwner(owner)
    expect(captured).toBe(owner)
  })
})

// ---------------------------------------------------------------------------
// disposeOwner
// ---------------------------------------------------------------------------

describe('disposeOwner', () => {
  test('fires all unmount callbacks in order', () => {
    const owner = createOwner('test', null, null)
    const calls: string[] = []
    addUnmountCallback(owner, () => calls.push('a'))
    addUnmountCallback(owner, () => calls.push('b'))
    disposeOwner(owner)
    expect(calls).toEqual(['a', 'b'])
  })

  test('runs all cleanup functions', () => {
    const owner = createOwner('test', null, null)
    let count = 0
    addCleanup(owner, () => { count++ })
    addCleanup(owner, () => { count++ })
    disposeOwner(owner)
    expect(count).toBe(2)
  })

  test('deduplicates identical cleanup functions (Set semantics)', () => {
    const owner = createOwner('test', null, null)
    let count = 0
    const fn = () => { count++ }
    addCleanup(owner, fn)
    addCleanup(owner, fn) // same reference — only one entry in Set
    disposeOwner(owner)
    expect(count).toBe(1)
  })

  test('clears mounted flag', () => {
    const owner = createOwner('test', null, null)
    mountOwner(owner)
    expect(owner.mounted).toBe(true)
    disposeOwner(owner)
    expect(owner.mounted).toBe(false)
  })

  test('empties mountCallbacks and unmountCallbacks arrays', () => {
    const owner = createOwner('test', null, null)
    addMountCallback(owner, () => {})
    addUnmountCallback(owner, () => {})
    disposeOwner(owner)
    expect(owner.mountCallbacks).toHaveLength(0)
    expect(owner.unmountCallbacks).toHaveLength(0)
  })

  test('empties cleanups Set', () => {
    const owner = createOwner('test', null, null)
    addCleanup(owner, () => {})
    disposeOwner(owner)
    expect(owner.cleanups.size).toBe(0)
  })

  test('resets providers to empty object', () => {
    const owner = createOwner('test', null, null)
    setOwnerProviders(owner, { foo: 'bar' })
    disposeOwner(owner)
    expect(owner.providers).toEqual({})
  })

  test('clears refs map', () => {
    const owner = createOwner('test', null, null)
    owner.refs.set('el', document.createElement('span'))
    disposeOwner(owner)
    expect(owner.refs.size).toBe(0)
  })

  test('runs unmount callbacks with the owner as current owner', () => {
    const owner = createOwner('test', null, null)
    let captured: Owner | null = null
    addUnmountCallback(owner, () => { captured = getOwner() })
    disposeOwner(owner)
    expect(captured).toBe(owner)
  })
})

// ---------------------------------------------------------------------------
// setOwnerProviders
// ---------------------------------------------------------------------------

describe('setOwnerProviders', () => {
  test('replaces the providers object', () => {
    const owner = createOwner('test', null, null)
    const providers = { count: 1, label: 'hello' }
    setOwnerProviders(owner, providers)
    expect(owner.providers).toBe(providers)
  })
})
