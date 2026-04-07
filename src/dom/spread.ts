import { effect } from '@preact/signals-core'
import { isSignal, toPropertyName } from '../types'
import { getOwner } from '../core/scheduler'

type ClassListState = Record<string, boolean>
type SpreadProps = Record<string | symbol, unknown>

function normalizeEventName(name: string): string {
  return name.slice(2).toLowerCase()
}

function unwrap<T>(value: T): T {
  if (isSignal(value)) {
    return value.value as T
  }

  return value
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function setAttribute(node: Element, name: string, value: unknown): void {
  const next = unwrap(value)

  if (next === null || next === undefined || next === false) {
    node.removeAttribute(name)
    return
  }

  node.setAttribute(name, String(next))
}

export function setAttributeNS(node: Element, namespace: string, name: string, value: unknown): void {
  const next = unwrap(value)

  if (next === null || next === undefined || next === false) {
    node.removeAttributeNS(namespace, name)
    return
  }

  node.setAttributeNS(namespace, name, String(next))
}

export function setBoolAttribute(node: Element, name: string, value: unknown): void {
  if (unwrap(value)) {
    node.setAttribute(name, '')
    return
  }

  node.removeAttribute(name)
}

export function setProperty<T extends Element>(node: T, name: string, value: unknown): void {
  ;(node as unknown as Record<string, unknown>)[name] = unwrap(value)
}

export function setStyleProperty(node: Element, name: string, value: unknown): void {
  const next = unwrap(value)

  if (!(node instanceof HTMLElement || node instanceof SVGElement)) {
    return
  }

  if (next === null || next === undefined || next === false || next === '') {
    node.style.removeProperty(name)
    return
  }

  node.style.setProperty(name, String(next))
}

export function className(node: Element, value: unknown): void {
  const next = unwrap(value)
  if (next === null || next === undefined || next === false) {
    node.removeAttribute('class')
    return
  }

  node.className = String(next)
}

export function classList(node: Element, value: unknown, previous: ClassListState = {}): ClassListState {
  const next = isPlainObject(value) ? value : {}
  const state: ClassListState = {}

  for (const key of Object.keys(previous)) {
    if (!(key in next)) {
      node.classList.remove(key)
    }
  }

  for (const key of Object.keys(next)) {
    const enabled = Boolean(unwrap(next[key]))
    node.classList.toggle(key, enabled)
    state[key] = enabled
  }

  return state
}

export function style(node: Element, value: unknown, previous: Record<string, string> = {}): Record<string, string> {
  if (!(node instanceof HTMLElement || node instanceof SVGElement)) {
    return previous
  }

  const next = unwrap(value)

  if (typeof next === 'string') {
    node.setAttribute('style', next)
    return {}
  }

  const record = isPlainObject(next) ? next : {}
  const state: Record<string, string> = {}

  for (const key of Object.keys(previous)) {
    if (!(key in record)) {
      node.style.removeProperty(key)
    }
  }

  for (const [key, raw] of Object.entries(record)) {
    const resolved = raw === null || raw === undefined ? '' : String(unwrap(raw))
    if (resolved) {
      node.style.setProperty(key, resolved)
      state[key] = resolved
    } else {
      node.style.removeProperty(key)
    }
  }

  return state
}

export function use<T>(action: ((element: Element, value?: T) => unknown) | undefined, element: Element, value?: T): void {
  action?.(element, value)
}

function assignEvent(node: Element, name: string, handler: unknown): void {
  ;(node as unknown as Record<string, unknown>)[`$$${normalizeEventName(name)}`] = handler ?? undefined
}

function applySpreadValue(node: Element, key: string, value: unknown, isSVG: boolean): void {
  if (key === 'children' || key === 'innerHTML' || key === 'textContent' || key === 'innerText') {
    return
  }

  if (key === 'ref') {
    use(value as (element: Element) => unknown, node)
    return
  }

  if (key === 'x-ref') {
    if (typeof value === 'string' && value) {
      getOwner()?.refs.set(value, node)
    }
    return
  }

  if (key === 'style') {
    style(node, value)
    return
  }

  if (key === 'class' || key === 'className') {
    className(node, value)
    return
  }

  if (key === 'classList') {
    classList(node, value)
    return
  }

  if (key.startsWith('style:')) {
    setStyleProperty(node, key.slice(6), value)
    return
  }

  if (key.startsWith('class:')) {
    node.classList.toggle(key.slice(6), Boolean(unwrap(value)))
    return
  }

  if (key.startsWith('on')) {
    assignEvent(node, key, value)
    return
  }

  if (!isSVG) {
    const propertyName = toPropertyName(key)
    if (propertyName in node || node.localName.includes('-')) {
      setProperty(node, propertyName, value)
      return
    }
  }

  setAttribute(node, key, value)
}

export function spread(node: Element, props: SpreadProps, isSVG = false, hasChildren = false): void {
  let previous: Record<string, unknown> = {}

  effect(() => {
    const next: Record<string, unknown> = {}

    for (const key of Reflect.ownKeys(props)) {
      if (typeof key !== 'string') {
        continue
      }

      if (hasChildren && key === 'children') {
        continue
      }

      next[key] = props[key]
    }

    for (const key of Object.keys(previous)) {
      if (!(key in next)) {
        applySpreadValue(node, key, undefined, isSVG)
      }
    }

    for (const [key, value] of Object.entries(next)) {
      applySpreadValue(node, key, value, isSVG)
    }

    previous = next
  })
}

export function mergeProps<T extends object[]>(...sources: T): T[number] {
  return new Proxy({} as T[number], {
    get(_, property) {
      for (let index = sources.length - 1; index >= 0; index -= 1) {
        const source = sources[index] as Record<PropertyKey, unknown>
        if (property in source) {
          return source[property]
        }
      }
      return undefined
    },
    has(_, property) {
      return sources.some((source) => property in source)
    },
    ownKeys() {
      const keys = new Set<string | symbol>()
      for (const source of sources) {
        for (const key of Reflect.ownKeys(source)) {
          if (typeof key === 'string' || typeof key === 'symbol') {
            keys.add(key)
          }
        }
      }
      return [...keys]
    },
    getOwnPropertyDescriptor() {
      return {
        enumerable: true,
        configurable: true,
      }
    },
  })
}