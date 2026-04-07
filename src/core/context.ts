import { computed, effect, signal } from '@preact/signals-core'
import type { AnySignal } from '../types'
import { toKebabCase } from '../types'
import {
  addCleanup,
  addMountCallback,
  addUnmountCallback,
  type Owner,
} from './scheduler'
import { getService } from './lib'

type HostWithSignals = Element & {
  __xz_propSignals?: Map<string, ReturnType<typeof signal<unknown>>>
  __xz_readonlyPropSignals?: Map<string, AnySignal<unknown>>
}

export interface Context {
  readonly element: Element
  readonly host: Element
  readonly name: string
  readonly tagName: string
  inject: (name?: string) => Record<string, unknown>
  effect: (callback: Parameters<typeof effect>[0]) => () => void
  onMount: (callback: () => void) => void
  onUnmount: (callback: () => void) => void
  prop: <T>(name: string) => AnySignal<T>
  ref: <T>(name: string) => T
  emit: (eventName: string, detail?: unknown) => void
  listen: (eventName: string, handler: EventListener, options?: AddEventListenerOptions & { target?: EventTarget }) => () => void
  [name: string]: unknown
}

const RESERVED_CONTEXT_KEYS = new Set([
  'element',
  'host',
  'tagName',
  'inject',
  'effect',
  'onMount',
  'onUnmount',
  'prop',
  'ref',
  'emit',
  'listen',
])

function getHostSignals(host: HostWithSignals): Map<string, ReturnType<typeof signal<unknown>>> {
  if (!host.__xz_propSignals) {
    host.__xz_propSignals = new Map()
  }

  return host.__xz_propSignals
}

function getReadonlyHostSignals(host: HostWithSignals): Map<string, AnySignal<unknown>> {
  if (!host.__xz_readonlyPropSignals) {
    host.__xz_readonlyPropSignals = new Map()
  }

  return host.__xz_readonlyPropSignals
}

function defineHostProperty(host: HostWithSignals, name: string, initialValue: unknown): ReturnType<typeof signal<unknown>> {
  const signals = getHostSignals(host)
  const propSignal = signal(initialValue)
  signals.set(name, propSignal)

  Object.defineProperty(host, name, {
    configurable: true,
    enumerable: true,
    get() {
      return propSignal.value
    },
    set(value: unknown) {
      propSignal.value = value
    },
  })

  return propSignal
}

export function ensurePropSignal(host: Element, name: string): ReturnType<typeof signal<unknown>> {
  const element = host as HostWithSignals
  const signals = getHostSignals(element)
  const existing = signals.get(name)

  if (existing) {
    return existing
  }

  let initialValue: unknown
  if (Object.prototype.hasOwnProperty.call(element, name)) {
    initialValue = (element as unknown as Record<string, unknown>)[name]
    delete (element as unknown as Record<string, unknown>)[name]
  } else {
    initialValue = element.getAttribute(toKebabCase(name))
  }

  return defineHostProperty(element, name, initialValue)
}

function getReadonlyPropSignal(host: Element, name: string): AnySignal<unknown> {
  const element = host as HostWithSignals
  const readonlySignals = getReadonlyHostSignals(element)
  const existing = readonlySignals.get(name)
  if (existing) {
    return existing
  }

  const writable = ensurePropSignal(host, name)
  const readonly = computed(() => writable.value)
  readonlySignals.set(name, readonly)
  return readonly
}

function hasResolvableProp(host: Element, name: string): boolean {
  const element = host as HostWithSignals

  if (getHostSignals(element).has(name)) {
    return true
  }

  if (Object.prototype.hasOwnProperty.call(element, name)) {
    return true
  }

  return element.hasAttribute(toKebabCase(name))
}

function findProvider(owner: Owner | null, name?: string): Record<string, unknown> {
  let cursor = owner ?? null

  while (cursor) {
    if (name) {
      if (cursor.name === name) {
        return cursor.providers
      }
    } else if (Object.keys(cursor.providers).length > 0) {
      return cursor.providers
    }

    cursor = cursor.parent
  }

  return getService(name)
}

export function createContext(owner: Owner, host: Element): Context {
  const api: Context = {
    element: host,
    host,
    name: owner.name,
    tagName: owner.name,
    inject(name?: string) {
      return findProvider(owner, name)
    },
    effect(callback: Parameters<typeof effect>[0]) {
      const dispose = effect(callback)
      addCleanup(owner, dispose)
      return dispose
    },
    onMount(callback: () => void) {
      addMountCallback(owner, callback)
    },
    onUnmount(callback: () => void) {
      addUnmountCallback(owner, callback)
    },
    prop<T>(name: string) {
      return getReadonlyPropSignal(host, name) as AnySignal<T>
    },
    ref<T>(name: string) {
      if (!owner.mounted) {
        throw new Error(`[xzo] ref("${name}") is only available after mount.`)
      }

      if (!owner.refs.has(name)) {
        throw new Error(`[xzo] ref("${name}") was not found on component <${owner.name}>.`)
      }

      return owner.refs.get(name) as never
    },
    emit(eventName: string, detail?: unknown) {
      host.dispatchEvent(new CustomEvent(eventName, {
        detail,
        bubbles: true,
        composed: true,
      }))
    },
    listen(eventName: string, handler: EventListener, options?: AddEventListenerOptions & { target?: EventTarget }) {
      const target = options?.target ?? host
      target.addEventListener(eventName, handler, options)

      const cleanup = () => {
        target.removeEventListener(eventName, handler, options)
      }

      addCleanup(owner, cleanup)
      return cleanup
    },
  }

  return new Proxy(api, {
    get(target, property, receiver) {
      if (typeof property === 'string') {
        if (!RESERVED_CONTEXT_KEYS.has(property) && hasResolvableProp(host, property)) {
          return getReadonlyPropSignal(host, property)
        }

        if (!(property in target)) {
          return getReadonlyPropSignal(host, property)
        }
      }

      return Reflect.get(target, property, receiver)
    },
  })
}