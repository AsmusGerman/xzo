import { describe, test, expect, afterEach } from 'bun:test'
import { signal } from '@preact/signals-core'
import { each } from '../../../src/core/source-each'
import { createOwner, disposeOwner, runWithOwner } from '../../../src/core/scheduler'

type Item = { id: number; name: string }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeOwner(name = 'test-each') {
  return createOwner(name, null, null)
}

/** Render a source.each branch and return its container. */
function renderEach(
  owner: ReturnType<typeof makeOwner>,
  source: ReturnType<typeof each<Item>>,
  renderFn: (item: Item, index: number) => Node = (item) => document.createTextNode(item.name),
): HTMLDivElement {
  const container = document.createElement('div')
  const fragment = source.each({ children: renderFn }) as DocumentFragment
  container.appendChild(fragment)
  return container
}

/** Render a source.empty branch into a container. */
function renderEmpty(
  owner: ReturnType<typeof makeOwner>,
  source: ReturnType<typeof each<Item>>,
): HTMLDivElement {
  const container = document.createElement('div')
  const fragment = source.empty({ children: document.createTextNode('(empty)') }) as DocumentFragment
  container.appendChild(fragment)
  return container
}

// ---------------------------------------------------------------------------
// Basic rendering
// ---------------------------------------------------------------------------

describe('source-each: rendering', () => {
  test('renders initial items', () => {
    const owner = makeOwner()
    const items = signal<Item[]>([
      { id: 1, name: 'Apple' },
      { id: 2, name: 'Bread' },
    ])
    const source = runWithOwner(owner, () => each(items, (i) => i.id))
    const container = renderEach(owner, source)
    expect(container.textContent).toContain('Apple')
    expect(container.textContent).toContain('Bread')
    disposeOwner(owner)
  })

  test('renders nothing when list is empty', () => {
    const owner = makeOwner()
    const items = signal<Item[]>([])
    const source = runWithOwner(owner, () => each(items, (i) => i.id))
    const container = renderEach(owner, source)
    // Only comments remain
    const textNodes = Array.from(container.childNodes).filter(n => n.nodeType === Node.TEXT_NODE)
    expect(textNodes).toHaveLength(0)
    disposeOwner(owner)
  })

  test('passes item and index to children', () => {
    const owner = makeOwner()
    const items = signal<Item[]>([{ id: 10, name: 'X' }])
    const indices: number[] = []
    const source = runWithOwner(owner, () => each(items, (i) => i.id))
    renderEach(owner, source, (item, index) => {
      indices.push(index)
      return document.createTextNode(item.name)
    })
    expect(indices).toEqual([0])
    disposeOwner(owner)
  })

  test('accepts a plain selector function (no args)', () => {
    const owner = makeOwner()
    const items = signal<Item[]>([{ id: 1, name: 'One' }])
    const source = runWithOwner(owner, () => each(() => items.value, (i) => i.id))
    const container = renderEach(owner, source)
    expect(container.textContent).toContain('One')
    disposeOwner(owner)
  })
})

// ---------------------------------------------------------------------------
// Reactive updates
// ---------------------------------------------------------------------------

describe('source-each: reactive updates', () => {
  test('updates the DOM when the signal changes', () => {
    const owner = makeOwner()
    const items = signal<Item[]>([{ id: 1, name: 'Apple' }])
    const source = runWithOwner(owner, () => each(items, (i) => i.id))
    const container = renderEach(owner, source)

    items.value = [{ id: 1, name: 'Apple' }, { id: 2, name: 'Banana' }]
    expect(container.textContent).toContain('Apple')
    expect(container.textContent).toContain('Banana')
    disposeOwner(owner)
  })

  test('removes items from the DOM when signal shrinks', () => {
    const owner = makeOwner()
    const items = signal<Item[]>([{ id: 1, name: 'A' }, { id: 2, name: 'B' }])
    const source = runWithOwner(owner, () => each(items, (i) => i.id))
    const container = renderEach(owner, source)

    items.value = [{ id: 1, name: 'A' }]
    expect(container.textContent).toContain('A')
    expect(container.textContent).not.toContain('B')
    disposeOwner(owner)
  })

  test('clears DOM when signal becomes empty', () => {
    const owner = makeOwner()
    const items = signal<Item[]>([{ id: 1, name: 'Z' }])
    const source = runWithOwner(owner, () => each(items, (i) => i.id))
    const container = renderEach(owner, source)

    items.value = []
    const textNodes = Array.from(container.childNodes).filter(n => n.nodeType === Node.TEXT_NODE)
    expect(textNodes).toHaveLength(0)
    disposeOwner(owner)
  })

  test('effects are stopped when owner is disposed', () => {
    const owner = makeOwner()
    const items = signal<Item[]>([{ id: 1, name: 'Before' }])
    const source = runWithOwner(owner, () => each(items, (i) => i.id))
    const container = renderEach(owner, source)
    disposeOwner(owner)

    items.value = [{ id: 2, name: 'After' }]
    // DOM should not have changed after dispose
    expect(container.textContent).toContain('Before')
    expect(container.textContent).not.toContain('After')
  })
})

// ---------------------------------------------------------------------------
// .empty slot
// ---------------------------------------------------------------------------

describe('source-each: .empty slot', () => {
  test('renders empty slot when list is empty', () => {
    const owner = makeOwner()
    const items = signal<Item[]>([])
    const source = runWithOwner(owner, () => each(items, (i) => i.id))
    const container = renderEmpty(owner, source)
    expect(container.textContent).toContain('(empty)')
    disposeOwner(owner)
  })

  test('hides empty slot when list has items', () => {
    const owner = makeOwner()
    const items = signal<Item[]>([{ id: 1, name: 'A' }])
    const source = runWithOwner(owner, () => each(items, (i) => i.id))
    const container = renderEmpty(owner, source)
    const textNodes = Array.from(container.childNodes).filter(n => n.nodeType === Node.TEXT_NODE)
    expect(textNodes).toHaveLength(0)
    disposeOwner(owner)
  })

  test('empty slot toggles reactively', () => {
    const owner = makeOwner()
    const items = signal<Item[]>([{ id: 1, name: 'X' }])
    const source = runWithOwner(owner, () => each(items, (i) => i.id))
    const container = renderEmpty(owner, source)

    expect(container.textContent).not.toContain('(empty)')
    items.value = []
    expect(container.textContent).toContain('(empty)')
    items.value = [{ id: 1, name: 'X' }]
    expect(container.textContent).not.toContain('(empty)')
    disposeOwner(owner)
  })
})

// ---------------------------------------------------------------------------
// .first / .last slots
// ---------------------------------------------------------------------------

describe('source-each: .first and .last slots', () => {
  test('.first renders the first item', () => {
    const owner = makeOwner()
    const items = signal<Item[]>([
      { id: 1, name: 'Alpha' },
      { id: 2, name: 'Beta' },
    ])
    const source = runWithOwner(owner, () => each(items, (i) => i.id))
    const container = document.createElement('div')
    container.appendChild(
      source.first({ children: (item) => document.createTextNode(item.name) }) as DocumentFragment,
    )
    expect(container.textContent).toBe('Alpha')
    disposeOwner(owner)
  })

  test('.last renders the last item', () => {
    const owner = makeOwner()
    const items = signal<Item[]>([
      { id: 1, name: 'Alpha' },
      { id: 2, name: 'Beta' },
    ])
    const source = runWithOwner(owner, () => each(items, (i) => i.id))
    const container = document.createElement('div')
    container.appendChild(
      source.last({ children: (item) => document.createTextNode(item.name) }) as DocumentFragment,
    )
    expect(container.textContent).toBe('Beta')
    disposeOwner(owner)
  })
})

// ---------------------------------------------------------------------------
// Mutation helpers: .add / .remove / .update / .set
// ---------------------------------------------------------------------------

describe('source-each: mutation helpers', () => {
  test('.add appends a new item', () => {
    const owner = makeOwner()
    const items = signal<Item[]>([{ id: 1, name: 'A' }])
    const source = runWithOwner(owner, () => each(items, (i) => i.id))
    source.add({ id: 2, name: 'B' })
    expect(items.value).toHaveLength(2)
    expect(items.value[1].name).toBe('B')
    disposeOwner(owner)
  })

  test('.remove deletes an item by key', () => {
    const owner = makeOwner()
    const items = signal<Item[]>([{ id: 1, name: 'A' }, { id: 2, name: 'B' }])
    const source = runWithOwner(owner, () => each(items, (i) => i.id))
    source.remove(1)
    expect(items.value).toHaveLength(1)
    expect(items.value[0].name).toBe('B')
    disposeOwner(owner)
  })

  test('.update patches an existing item by key', () => {
    const owner = makeOwner()
    const items = signal<Item[]>([{ id: 1, name: 'Old' }])
    const source = runWithOwner(owner, () => each(items, (i) => i.id))
    source.update(1, { name: 'New' })
    expect(items.value[0].name).toBe('New')
    disposeOwner(owner)
  })

  test('.set replaces the entire list', () => {
    const owner = makeOwner()
    const items = signal<Item[]>([{ id: 1, name: 'A' }])
    const source = runWithOwner(owner, () => each(items, (i) => i.id))
    source.set([{ id: 10, name: 'X' }, { id: 11, name: 'Y' }])
    expect(items.value).toHaveLength(2)
    expect(items.value[0].id).toBe(10)
    disposeOwner(owner)
  })

  test('mutation helpers are no-ops when selector is a computed (readonly)', () => {
    const owner = makeOwner()
    const inner = signal<Item[]>([{ id: 1, name: 'A' }])
    // Wrapping in a function creates a computed, which is not writable
    const source = runWithOwner(owner, () => each(() => inner.value, (i) => i.id))
    source.add({ id: 2, name: 'B' }) // should silently do nothing
    expect(inner.value).toHaveLength(1)
    disposeOwner(owner)
  })
})

// ---------------------------------------------------------------------------
// Error: must be called during component setup
// ---------------------------------------------------------------------------

describe('source-each: ownership requirement', () => {
  test('throws when called outside a component setup (no owner)', () => {
    const items = signal<Item[]>([])
    expect(() => each(items, (i) => i.id)).toThrow(
      '[xzo] lib.each() must be called during component setup.',
    )
  })
})
