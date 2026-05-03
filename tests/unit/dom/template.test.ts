import { describe, test, expect } from 'bun:test'
import { template, getNextElement, getNextMarker } from '../../../src/dom/template'

// ---------------------------------------------------------------------------
// template()
// ---------------------------------------------------------------------------

describe('template()', () => {
  test('returns a factory function', () => {
    const factory = template('<div>hello</div>')
    expect(typeof factory).toBe('function')
  })

  test('factory returns a Node', () => {
    const factory = template('<div>world</div>')
    const node = factory()
    expect(node).toBeInstanceOf(Node)
  })

  test('clones the template on each call (different instances)', () => {
    const factory = template('<p>clone me</p>')
    const a = factory()
    const b = factory()
    expect(a).not.toBe(b)
  })

  test('single-element template returns the element directly (not a fragment)', () => {
    const factory = template('<span>single</span>')
    const node = factory()
    expect(node.nodeName.toLowerCase()).toBe('span')
  })

  test('multi-element template returns a DocumentFragment', () => {
    const factory = template('<b>a</b><i>b</i>')
    const node = factory()
    expect(node.nodeType).toBe(Node.DOCUMENT_FRAGMENT_NODE)
  })

  test('preserves inner text content', () => {
    const factory = template('<div>hello</div>')
    const el = factory() as HTMLElement
    expect(el.textContent).toBe('hello')
  })

  test('uses a cache — same html string reuses the template element', () => {
    const html = '<section class="cached">content</section>'
    const a = template(html)
    const b = template(html)
    // Both factories should produce nodes with the same structure
    const na = a() as HTMLElement
    const nb = b() as HTMLElement
    expect(na.tagName).toBe(nb.tagName)
    expect(na.textContent).toBe(nb.textContent)
  })

  test('SVG wrapper is unwrapped for single SVG child', () => {
    const factory = template('<circle r="5" />', false, true)
    const node = factory()
    expect(node.nodeName.toLowerCase()).toBe('circle')
  })
})

// ---------------------------------------------------------------------------
// getNextElement()
// ---------------------------------------------------------------------------

describe('getNextElement()', () => {
  test('returns the result of the factory when provided', () => {
    const el = document.createElement('span')
    const result = getNextElement(() => el)
    expect(result).toBe(el)
  })

  test('returns a comment placeholder when no factory is provided', () => {
    const result = getNextElement()
    expect(result.nodeType).toBe(Node.COMMENT_NODE)
  })
})

// ---------------------------------------------------------------------------
// getNextMarker()
// ---------------------------------------------------------------------------

describe('getNextMarker()', () => {
  test('returns [node, node.nextSibling] tuple', () => {
    const parent = document.createElement('div')
    const a = document.createElement('span')
    const b = document.createElement('em')
    parent.append(a, b)

    const [marker, sibling] = getNextMarker(a)
    expect(marker).toBe(a)
    expect(sibling).toBe(b)
  })

  test('returns null sibling when node is the last child', () => {
    const parent = document.createElement('div')
    const a = document.createElement('span')
    parent.appendChild(a)

    const [, sibling] = getNextMarker(a)
    expect(sibling).toBeNull()
  })
})
