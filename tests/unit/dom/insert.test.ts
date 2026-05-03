import { describe, test, expect } from 'bun:test'
import { signal } from '@preact/signals-core'
import { insert } from '../../../src/dom/insert'
import { createOwner, runWithOwner, disposeOwner } from '../../../src/core/scheduler'

// ---------------------------------------------------------------------------
// Static insertion
// ---------------------------------------------------------------------------

describe('insert() — static values', () => {
  test('inserts a string as a text node', () => {
    const parent = document.createElement('div')
    insert(parent, 'hello')
    expect(parent.textContent).toBe('hello')
  })

  test('inserts a number as a text node', () => {
    const parent = document.createElement('div')
    insert(parent, 42)
    expect(parent.textContent).toBe('42')
  })

  test('inserts a DOM Node directly', () => {
    const parent = document.createElement('div')
    const span = document.createElement('span')
    span.textContent = 'world'
    insert(parent, span)
    expect(parent.querySelector('span')?.textContent).toBe('world')
  })

  test('inserts nothing for null', () => {
    const parent = document.createElement('div')
    insert(parent, null)
    expect(parent.childNodes.length).toBe(0)
  })

  test('inserts nothing for undefined', () => {
    const parent = document.createElement('div')
    insert(parent, undefined)
    expect(parent.childNodes.length).toBe(0)
  })

  test('inserts nothing for false', () => {
    const parent = document.createElement('div')
    insert(parent, false)
    expect(parent.childNodes.length).toBe(0)
  })

  test('respects the marker position', () => {
    const parent = document.createElement('div')
    const marker = document.createElement('span')
    marker.textContent = 'END'
    parent.appendChild(marker)
    insert(parent, 'START', marker)
    expect(parent.firstChild?.textContent).toBe('START')
    expect(parent.lastChild?.textContent).toBe('END')
  })
})

// ---------------------------------------------------------------------------
// Signal-driven reactive insertion
// ---------------------------------------------------------------------------

describe('insert() — signal', () => {
  test('inserts the initial signal value', () => {
    const owner = createOwner('insert-test', null, null)
    const parent = document.createElement('div')
    const s = signal('alpha')
    runWithOwner(owner, () => insert(parent, s))
    expect(parent.textContent).toBe('alpha')
    disposeOwner(owner)
  })

  test('updates the DOM when the signal changes', () => {
    const owner = createOwner('insert-test', null, null)
    const parent = document.createElement('div')
    const s = signal('before')
    runWithOwner(owner, () => insert(parent, s))
    s.value = 'after'
    expect(parent.textContent).toBe('after')
    disposeOwner(owner)
  })

  test('removes the node when signal becomes null', () => {
    const owner = createOwner('insert-test', null, null)
    const parent = document.createElement('div')
    const s = signal<string | null>('visible')
    runWithOwner(owner, () => insert(parent, s))
    s.value = null
    expect(parent.childNodes.length).toBe(0)
    disposeOwner(owner)
  })

  test('stops reacting after owner is disposed', () => {
    const owner = createOwner('insert-test', null, null)
    const parent = document.createElement('div')
    const s = signal('initial')
    runWithOwner(owner, () => insert(parent, s))
    disposeOwner(owner)
    s.value = 'should-not-appear'
    expect(parent.textContent).toBe('initial')
  })
})

// ---------------------------------------------------------------------------
// Function-driven reactive insertion
// ---------------------------------------------------------------------------

describe('insert() — function', () => {
  test('inserts the return value of the function', () => {
    const owner = createOwner('insert-fn-test', null, null)
    const parent = document.createElement('div')
    runWithOwner(owner, () => insert(parent, () => 'from-fn'))
    expect(parent.textContent).toBe('from-fn')
    disposeOwner(owner)
  })

  test('updates the DOM when a signal the function reads changes', () => {
    const owner = createOwner('insert-fn-test', null, null)
    const parent = document.createElement('div')
    const s = signal('A')
    runWithOwner(owner, () => insert(parent, () => s.value + '!'))
    expect(parent.textContent).toBe('A!')
    s.value = 'B'
    expect(parent.textContent).toBe('B!')
    disposeOwner(owner)
  })
})
