import { describe, test, expect } from 'bun:test'
import { signal } from '@preact/signals-core'
import {
  setAttribute,
  setAttributeNS,
  setBoolAttribute,
  setProperty,
  setStyleProperty,
  className,
  classList,
  style,
  mergeProps,
} from '../../../src/dom/spread'

// ---------------------------------------------------------------------------
// setAttribute
// ---------------------------------------------------------------------------

describe('setAttribute()', () => {
  test('sets the attribute to the string value', () => {
    const el = document.createElement('div')
    setAttribute(el, 'data-id', '42')
    expect(el.getAttribute('data-id')).toBe('42')
  })

  test('removes the attribute when value is null', () => {
    const el = document.createElement('div')
    el.setAttribute('data-id', 'old')
    setAttribute(el, 'data-id', null)
    expect(el.hasAttribute('data-id')).toBe(false)
  })

  test('removes the attribute when value is undefined', () => {
    const el = document.createElement('div')
    el.setAttribute('title', 'old')
    setAttribute(el, 'title', undefined)
    expect(el.hasAttribute('title')).toBe(false)
  })

  test('removes the attribute when value is false', () => {
    const el = document.createElement('div')
    el.setAttribute('disabled', '')
    setAttribute(el, 'disabled', false)
    expect(el.hasAttribute('disabled')).toBe(false)
  })

  test('unwraps a signal before setting', () => {
    const el = document.createElement('div')
    setAttribute(el, 'lang', signal('en'))
    expect(el.getAttribute('lang')).toBe('en')
  })
})

// ---------------------------------------------------------------------------
// setAttributeNS
// ---------------------------------------------------------------------------

describe('setAttributeNS()', () => {
  test('sets a namespaced attribute', () => {
    const ns = 'http://www.w3.org/1999/xlink'
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'use')
    setAttributeNS(el, ns, 'xlink:href', '#icon')
    expect(el.getAttributeNS(ns, 'href')).toBe('#icon')
  })

  test('removes a namespaced attribute when value is null', () => {
    const ns = 'http://www.w3.org/1999/xlink'
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'use')
    el.setAttributeNS(ns, 'xlink:href', '#icon')
    setAttributeNS(el, ns, 'xlink:href', null)
    expect(el.getAttributeNS(ns, 'href')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// setBoolAttribute
// ---------------------------------------------------------------------------

describe('setBoolAttribute()', () => {
  test('sets an empty attribute when value is truthy', () => {
    const el = document.createElement('input')
    setBoolAttribute(el, 'disabled', true)
    expect(el.hasAttribute('disabled')).toBe(true)
    expect(el.getAttribute('disabled')).toBe('')
  })

  test('removes the attribute when value is falsy', () => {
    const el = document.createElement('input')
    el.setAttribute('disabled', '')
    setBoolAttribute(el, 'disabled', false)
    expect(el.hasAttribute('disabled')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// setProperty
// ---------------------------------------------------------------------------

describe('setProperty()', () => {
  test('assigns a property directly on the element', () => {
    const el = document.createElement('input')
    setProperty(el, 'value', 'hello')
    expect((el as HTMLInputElement).value).toBe('hello')
  })

  test('unwraps a signal before assigning', () => {
    const el = document.createElement('input')
    setProperty(el, 'value', signal('from-signal'))
    expect((el as HTMLInputElement).value).toBe('from-signal')
  })
})

// ---------------------------------------------------------------------------
// setStyleProperty
// ---------------------------------------------------------------------------

describe('setStyleProperty()', () => {
  test('sets a CSS custom property on an HTMLElement', () => {
    const el = document.createElement('div')
    setStyleProperty(el, '--color', 'red')
    expect(el.style.getPropertyValue('--color')).toBe('red')
  })

  test('removes the property when value is null', () => {
    const el = document.createElement('div')
    el.style.setProperty('color', 'blue')
    setStyleProperty(el, 'color', null)
    expect(el.style.getPropertyValue('color')).toBe('')
  })
})

// ---------------------------------------------------------------------------
// className
// ---------------------------------------------------------------------------

describe('className()', () => {
  test('sets the className string', () => {
    const el = document.createElement('div')
    className(el, 'foo bar')
    expect(el.className).toBe('foo bar')
  })

  test('removes the class attribute when value is null', () => {
    const el = document.createElement('div')
    el.className = 'old'
    className(el, null)
    expect(el.hasAttribute('class')).toBe(false)
  })

  test('removes the class attribute when value is false', () => {
    const el = document.createElement('div')
    el.className = 'old'
    className(el, false)
    expect(el.hasAttribute('class')).toBe(false)
  })

  test('unwraps a signal value', () => {
    const el = document.createElement('div')
    className(el, signal('reactive'))
    expect(el.className).toBe('reactive')
  })
})

// ---------------------------------------------------------------------------
// classList
// ---------------------------------------------------------------------------

describe('classList()', () => {
  test('adds classes for truthy map entries', () => {
    const el = document.createElement('div')
    classList(el, { active: true, disabled: false })
    expect(el.classList.contains('active')).toBe(true)
    expect(el.classList.contains('disabled')).toBe(false)
  })

  test('removes a previously-added class when its value becomes false', () => {
    const el = document.createElement('div')
    const prev = classList(el, { active: true })
    classList(el, { active: false }, prev)
    expect(el.classList.contains('active')).toBe(false)
  })

  test('removes a class that is absent from the next map', () => {
    const el = document.createElement('div')
    const prev = classList(el, { 'was-here': true })
    classList(el, {}, prev)
    expect(el.classList.contains('was-here')).toBe(false)
  })

  test('returns the current state object', () => {
    const el = document.createElement('div')
    const state = classList(el, { a: true, b: false })
    expect(state).toEqual({ a: true, b: false })
  })
})

// ---------------------------------------------------------------------------
// style()
// ---------------------------------------------------------------------------

describe('style()', () => {
  test('sets individual style properties from an object', () => {
    const el = document.createElement('div')
    style(el, { color: 'red', fontSize: '16px' })
    expect(el.style.getPropertyValue('color')).toBe('red')
    expect(el.style.getPropertyValue('font-size') || el.style.fontSize).toBeTruthy()
  })

  test('sets the style attribute when value is a string', () => {
    const el = document.createElement('div')
    style(el, 'color: green;')
    expect(el.getAttribute('style')).toContain('green')
  })

  test('removes properties absent from the next object', () => {
    const el = document.createElement('div')
    const prev = style(el, { color: 'blue' })
    style(el, {}, prev)
    expect(el.style.getPropertyValue('color')).toBe('')
  })
})

// ---------------------------------------------------------------------------
// mergeProps()
// ---------------------------------------------------------------------------

describe('mergeProps()', () => {
  test('merges multiple objects — later sources override earlier ones', () => {
    const merged = mergeProps({ a: 1, b: 2 }, { b: 99, c: 3 })
    expect(merged.b).toBe(99)
    expect(merged.c).toBe(3)
    expect(merged.a).toBe(1)
  })

  test('merged proxy reflects all keys via ownKeys', () => {
    const merged = mergeProps({ x: 1 }, { y: 2 })
    const keys = Reflect.ownKeys(merged) as string[]
    expect(keys).toContain('x')
    expect(keys).toContain('y')
  })

  test('"in" operator finds keys across all sources', () => {
    const merged = mergeProps({ a: 1 }, { b: 2 })
    expect('a' in merged).toBe(true)
    expect('b' in merged).toBe(true)
    expect('c' in merged).toBe(false)
  })

  test('handles a single source', () => {
    const merged = mergeProps({ z: 42 })
    expect(merged.z).toBe(42)
  })
})
