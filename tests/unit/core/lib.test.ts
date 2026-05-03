import { describe, test, expect, beforeAll, afterEach } from 'bun:test'
import { lib, signal } from '../../../src/index'
import { define, service, getService, hasService, walkComponentProviders, init } from '../../../src/core/lib'
import { createOwner, runWithOwner, mountOwner } from '../../../src/core/scheduler'

// lib.init() is idempotent — calling it multiple times is safe.
// We call it once so the MutationObserver is running for tests that rely on
// auto-mounting, and use lib.init(container) to synchronously scan isolated
// subtrees without touching document.body.
beforeAll(() => {
  lib.init()
})

// Utility: create a detached container, add a custom element, trigger a
// synchronous scan via lib.init(container), and return both for inspection.
function mountInContainer(name: string): { container: HTMLElement; el: HTMLElement } {
  const container = document.createElement('div')
  const el = document.createElement(name)
  container.appendChild(el)
  // Calling init with a specific root always runs scanSubtree synchronously,
  // even if the global observer already exists.
  lib.init(container)
  return { container, el }
}

// ---------------------------------------------------------------------------
// define
// ---------------------------------------------------------------------------

describe('define', () => {
  test('runs the factory when a matching element is scanned', () => {
    let ran = false
    define('xzo-test-define-1', () => {
      ran = true
      return { template: document.createTextNode('') }
    })
    mountInContainer('xzo-test-define-1')
    expect(ran).toBe(true)
  })

  test('replaces element children with the template result', () => {
    define('xzo-test-define-2', () => {
      const span = document.createElement('span')
      span.textContent = 'hello'
      return { template: span }
    })
    const { el } = mountInContainer('xzo-test-define-2')
    expect(el.querySelector('span')?.textContent).toBe('hello')
  })

  test('does not mount the same element twice', () => {
    let mountCount = 0
    define('xzo-test-define-3', () => {
      mountCount++
      return { template: document.createTextNode('') }
    })
    const container = document.createElement('div')
    const el = document.createElement('xzo-test-define-3')
    container.appendChild(el)
    lib.init(container) // first scan
    lib.init(container) // second scan — should be a no-op for already-mounted elements
    expect(mountCount).toBe(1)
  })

  test('passes a Context object to the factory', () => {
    let capturedCtx: unknown
    define('xzo-test-define-4', (ctx) => {
      capturedCtx = ctx
      return { template: document.createTextNode('') }
    })
    mountInContainer('xzo-test-define-4')
    expect(capturedCtx).toBeDefined()
    expect(typeof (capturedCtx as { emit: unknown }).emit).toBe('function')
  })
})

// ---------------------------------------------------------------------------
// root (singleton enforcement)
// ---------------------------------------------------------------------------

describe('root', () => {
  test('mounts successfully the first time', () => {
    let mounted = false
    lib.root('xzo-test-root-1', () => {
      mounted = true
      return { template: document.createTextNode('') }
    })
    mountInContainer('xzo-test-root-1')
    expect(mounted).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// service / getService / hasService
// ---------------------------------------------------------------------------

describe('service / getService / hasService', () => {
  test('hasService returns false for an unregistered service', () => {
    expect(hasService('xzo-no-such-service')).toBe(false)
  })

  test('hasService returns true after registration', () => {
    service('xzo-test-svc-1', () => ({ value: 42 }))
    expect(hasService('xzo-test-svc-1')).toBe(true)
  })

  test('getService lazily initialises the factory and returns its providers', () => {
    let initialised = false
    service('xzo-test-svc-2', () => {
      initialised = true
      return { count: signal(0) }
    })
    // Not yet initialised (no lib.init call for this specific container)
    const result = getService('xzo-test-svc-2')
    // getService calls the factory on first access
    expect(result).toBeDefined()
    expect(typeof (result as { count: unknown }).count).toBe('object')
  })

  test('getService returns empty object for unknown service', () => {
    expect(getService('xzo-totally-unknown')).toEqual({})
  })
})

// ---------------------------------------------------------------------------
// walkComponentProviders
// ---------------------------------------------------------------------------

describe('walkComponentProviders', () => {
  test('returns providers of a named ancestor component', () => {
    const parentEl = document.createElement('xzo-test-parent-1')
    const childEl = document.createElement('xzo-test-child-1')
    parentEl.appendChild(childEl)

    // Manually set up an owner with providers on the parent element
    const owner = createOwner('xzo-test-parent-1', null, parentEl)
    owner.providers = { value: 99 }
    mountOwner(owner)

    // Simulate what lib does: store the mounted instance on the element
    // by mounting it through define
    define('xzo-test-parent-1', () => ({ template: document.createTextNode(''), value: 99 }))
    const container = document.createElement('div')
    container.appendChild(parentEl)
    lib.init(container)

    const providers = walkComponentProviders('xzo-test-parent-1', childEl)
    expect(providers).toBeDefined()
    expect((providers as { value: number }).value).toBe(99)
  })

  test('returns undefined when no ancestor matches', () => {
    const el = document.createElement('span')
    const result = walkComponentProviders('xzo-non-existent-ancestor', el)
    expect(result).toBeUndefined()
  })
})
