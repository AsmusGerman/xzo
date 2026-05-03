import { describe, test, expect } from 'bun:test'
import { scopeHash, injectStyles, applyScope } from '../../../src/core/styles'

// ---------------------------------------------------------------------------
// scopeHash
// ---------------------------------------------------------------------------

describe('scopeHash', () => {
  test('returns a non-empty string', () => {
    expect(scopeHash('my-component').length).toBeGreaterThan(0)
  })

  test('is deterministic — same input always produces same output', () => {
    expect(scopeHash('app')).toBe(scopeHash('app'))
    expect(scopeHash('product-item')).toBe(scopeHash('product-item'))
  })

  test('produces different hashes for different names', () => {
    expect(scopeHash('app')).not.toBe(scopeHash('cart'))
    expect(scopeHash('foo')).not.toBe(scopeHash('bar'))
  })

  test('output is a valid base-36 string of at most 6 characters', () => {
    const hash = scopeHash('my-widget')
    expect(hash).toMatch(/^[0-9a-z]{1,6}$/)
  })

  test('handles empty string without throwing', () => {
    expect(() => scopeHash('')).not.toThrow()
  })

  test('handles unicode characters', () => {
    expect(() => scopeHash('über-component')).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// applyScope
// ---------------------------------------------------------------------------

describe('applyScope', () => {
  test('adds a data-xz-<hash> attribute to the element', () => {
    const el = document.createElement('div')
    applyScope(el, 'my-widget')
    const hash = scopeHash('my-widget')
    expect(el.hasAttribute(`data-xz-${hash}`)).toBe(true)
  })

  test('attribute value is empty string', () => {
    const el = document.createElement('div')
    applyScope(el, 'my-widget')
    const hash = scopeHash('my-widget')
    expect(el.getAttribute(`data-xz-${hash}`)).toBe('')
  })

  test('two components get distinct scope attributes', () => {
    const elA = document.createElement('div')
    const elB = document.createElement('div')
    applyScope(elA, 'comp-alpha')
    applyScope(elB, 'comp-beta')
    const hashA = scopeHash('comp-alpha')
    const hashB = scopeHash('comp-beta')
    expect(elA.hasAttribute(`data-xz-${hashA}`)).toBe(true)
    expect(elB.hasAttribute(`data-xz-${hashB}`)).toBe(true)
    expect(hashA).not.toBe(hashB)
  })
})

// ---------------------------------------------------------------------------
// injectStyles
// ---------------------------------------------------------------------------

describe('injectStyles', () => {
  test('injects a CSSStyleSheet into document.adoptedStyleSheets', () => {
    const before = document.adoptedStyleSheets.length
    injectStyles('xzo-styles-test-1', '.foo { color: red; }')
    expect(document.adoptedStyleSheets.length).toBeGreaterThan(before)
  })

  test('is idempotent — calling twice with the same name does not add a second sheet', () => {
    injectStyles('xzo-styles-test-2', '.bar { color: blue; }')
    const after = document.adoptedStyleSheets.length
    injectStyles('xzo-styles-test-2', '.bar { color: blue; }')
    expect(document.adoptedStyleSheets.length).toBe(after)
  })

  test('does nothing when css string is empty', () => {
    const before = document.adoptedStyleSheets.length
    injectStyles('xzo-styles-test-empty', '')
    expect(document.adoptedStyleSheets.length).toBe(before)
  })
})
