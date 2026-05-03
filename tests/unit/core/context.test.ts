import { describe, test, expect } from 'bun:test'
import { signal, computed } from '@preact/signals-core'
import { createContext } from '../../../src/core/context'
import {
  createOwner,
  mountOwner,
  disposeOwner,
  runWithOwner,
  addCleanup,
} from '../../../src/core/scheduler'

// ---------------------------------------------------------------------------
// Helper: build a mounted context for a given host element
// ---------------------------------------------------------------------------
function makeCtx(name = 'test-ctx-el') {
  const host = document.createElement(name)
  const owner = createOwner(name, null, host)
  const ctx = runWithOwner(owner, () => createContext(owner, host))
  return { host, owner, ctx }
}

// ---------------------------------------------------------------------------
// ctx.element / ctx.host / ctx.name / ctx.tagName
// ---------------------------------------------------------------------------

describe('context identity', () => {
  test('ctx.element and ctx.host both point to the host element', () => {
    const { host, ctx } = makeCtx()
    expect(ctx.element).toBe(host)
    expect(ctx.host).toBe(host)
  })

  test('ctx.name equals the owner name', () => {
    const { ctx } = makeCtx('my-widget')
    expect(ctx.name).toBe('my-widget')
  })

  test('ctx.tagName equals the owner name', () => {
    const { ctx } = makeCtx('my-widget')
    expect(ctx.tagName).toBe('my-widget')
  })
})

// ---------------------------------------------------------------------------
// ctx.prop
// ---------------------------------------------------------------------------

describe('ctx.prop', () => {
  test('returns a signal for an unknown property (defaults to null)', () => {
    const { ctx } = makeCtx()
    const sig = ctx.prop('title')
    expect(sig).toBeDefined()
    // No attribute set — initial value is null (getAttribute returns null)
    expect(sig.value).toBeNull()
  })

  test('reads from an existing attribute via kebab-case', () => {
    const host = document.createElement('test-ctx-attr')
    host.setAttribute('item-count', '5')
    const owner = createOwner('test-ctx-attr', null, host)
    const ctx = runWithOwner(owner, () => createContext(owner, host))
    const sig = ctx.prop<string>('itemCount')
    expect(sig.value).toBe('5')
  })

  test('returns a readonly computed (writing throws)', () => {
    const { ctx } = makeCtx()
    const sig = ctx.prop('label')
    // The returned signal is a computed — it should not have a .set method
    // and assigning to .value should throw
    expect(() => {
      // @ts-expect-error intentionally writing to a readonly signal
      sig.value = 'new'
    }).toThrow()
  })

  test('proxy shorthand: unknown property access returns the same signal as ctx.prop()', () => {
    const { ctx } = makeCtx()
    const viaMethod = ctx.prop('size')
    const viaProxy = (ctx as unknown as Record<string, unknown>)['size']
    expect(viaProxy).toBe(viaMethod)
  })
})

// ---------------------------------------------------------------------------
// ctx.emit
// ---------------------------------------------------------------------------

describe('ctx.emit', () => {
  test('dispatches a bubbling CustomEvent with the given name', () => {
    const { host, ctx } = makeCtx()
    let received: Event | undefined
    const parent = document.createElement('div')
    parent.appendChild(host)
    parent.addEventListener('ping', (e) => { received = e })

    ctx.emit('ping')
    expect(received).toBeDefined()
    expect(received!.type).toBe('ping')
  })

  test('includes the detail payload', () => {
    const { host, ctx } = makeCtx()
    let detail: unknown
    host.addEventListener('my-event', (e) => { detail = (e as CustomEvent).detail })

    ctx.emit('my-event', { id: 7 })
    expect(detail).toEqual({ id: 7 })
  })
})

// ---------------------------------------------------------------------------
// ctx.listen
// ---------------------------------------------------------------------------

describe('ctx.listen', () => {
  test('receives events dispatched on the host element', () => {
    const { host, ctx } = makeCtx()
    let count = 0
    ctx.listen('click', () => { count++ })
    host.dispatchEvent(new Event('click'))
    expect(count).toBe(1)
  })

  test('returned cleanup function removes the listener', () => {
    const { host, ctx } = makeCtx()
    let count = 0
    const unlisten = ctx.listen('click', () => { count++ })
    unlisten()
    host.dispatchEvent(new Event('click'))
    expect(count).toBe(0)
  })

  test('listener is removed automatically when owner is disposed', () => {
    const { host, owner, ctx } = makeCtx()
    let count = 0
    ctx.listen('click', () => { count++ })
    disposeOwner(owner)
    host.dispatchEvent(new Event('click'))
    expect(count).toBe(0)
  })

  test('supports a custom event target via options.target', () => {
    const { ctx } = makeCtx()
    const target = document.createElement('button')
    let count = 0
    ctx.listen('click', () => { count++ }, { target })
    target.dispatchEvent(new Event('click'))
    expect(count).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// ctx.effect
// ---------------------------------------------------------------------------

describe('ctx.effect', () => {
  test('runs immediately', () => {
    const { ctx } = makeCtx()
    let ran = false
    ctx.effect(() => { ran = true })
    expect(ran).toBe(true)
  })

  test('re-runs when a subscribed signal changes', () => {
    const { ctx } = makeCtx()
    const count = signal(0)
    let runs = 0
    ctx.effect(() => { runs++; void count.value })
    expect(runs).toBe(1)
    count.value++
    expect(runs).toBe(2)
  })

  test('effect is disposed when owner is disposed', () => {
    const { owner, ctx } = makeCtx()
    const count = signal(0)
    let runs = 0
    ctx.effect(() => { runs++; void count.value })
    expect(runs).toBe(1)
    disposeOwner(owner)
    count.value++
    expect(runs).toBe(1) // no more re-runs after dispose
  })

  test('returned disposal function stops the effect manually', () => {
    const { ctx } = makeCtx()
    const count = signal(0)
    let runs = 0
    const dispose = ctx.effect(() => { runs++; void count.value })
    dispose()
    count.value++
    expect(runs).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// ctx.onMount / ctx.onUnmount
// ---------------------------------------------------------------------------

describe('ctx.onMount / ctx.onUnmount', () => {
  test('onMount callback fires when mountOwner is called', () => {
    const { owner, ctx } = makeCtx()
    let mounted = false
    ctx.onMount(() => { mounted = true })
    expect(mounted).toBe(false)
    mountOwner(owner)
    expect(mounted).toBe(true)
  })

  test('onUnmount callback fires when disposeOwner is called', () => {
    const { owner, ctx } = makeCtx()
    let unmounted = false
    ctx.onUnmount(() => { unmounted = true })
    disposeOwner(owner)
    expect(unmounted).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// ctx.observe
// ---------------------------------------------------------------------------

describe('ctx.observe', () => {
  test('fires immediately with the current value', () => {
    const { ctx } = makeCtx()
    const s = signal('hello')
    let current: string | undefined
    ctx.observe(s, (val) => { current = val })
    expect(current).toBe('hello')
  })

  test('fires with old and new values on change', () => {
    const { ctx } = makeCtx()
    const s = signal(1)
    const history: Array<[number, number | undefined]> = []
    ctx.observe(s, (val, prev) => { history.push([val, prev]) })
    s.value = 2
    s.value = 3
    expect(history).toEqual([[1, undefined], [2, 1], [3, 2]])
  })

  test('supports observing multiple signals', () => {
    const { ctx } = makeCtx()
    const a = signal('x')
    const b = signal('y')
    let captured: unknown[][]  = []
    ctx.observe([a, b], (vals) => { captured.push([...vals as unknown[]]) })
    a.value = 'X'
    expect(captured.length).toBe(2) // initial + one update
    expect(captured[1]).toEqual(['X', 'y'])
  })

  test('stops observing when owner is disposed', () => {
    const { owner, ctx } = makeCtx()
    const s = signal(0)
    let count = 0
    ctx.observe(s, () => { count++ })
    disposeOwner(owner)
    s.value++
    expect(count).toBe(1) // only the initial fire
  })
})
