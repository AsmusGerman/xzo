import { computed, effect, signal, untracked } from '@preact/signals-core'
import type { AnySignal, PropsOf, EventsOf, Reg } from '../types'
import { toKebabCase } from '../types'
import { type ComponentDefinition } from './scheduler'
import { getService, walkComponentScope, getAllServiceIds, hasService } from './lib'

// Optional context extension points — populated by @xzo/router or other add-ons
const contextExtensions = new Map<string, (owner: ComponentDefinition, host: Element) => unknown>()

export function registerContextExtension(name: string, getter: (owner: ComponentDefinition, host: Element) => unknown): void {
  contextExtensions.set(name, getter)
}

type HostWithSignals = Element & {
  __xz_propSignals?: Map<string, ReturnType<typeof signal<unknown>>>
  __xz_readonlyPropSignals?: Map<string, AnySignal<unknown>>
}

export interface Context<Contract = {}> {
  readonly element: Element
  readonly host: Element
  readonly name: string
  readonly tagName: string
  readonly props: { readonly [K in keyof PropsOf<Contract>]: AnySignal<PropsOf<Contract>[K]> }
  inject: <T>(selector: (reg: Reg) => T) => T
  observe: {
    <T>(sig: AnySignal<T>, cb: (value: T, prev: T | undefined) => void): void
    (sigs: AnySignal<unknown>[], cb: (values: unknown[], prev: unknown[] | undefined) => void): void
  }
  onMount: (callback: () => void) => void
  onUnmount: (callback: () => void) => void
  effect: (fn: () => void) => () => void
  prop: <T>(name: string) => AnySignal<T>
  ref: <T>(name: string) => T
  emit: [keyof EventsOf<Contract>] extends [never]
    ? (eventName: string, detail?: unknown) => void
    : <K extends keyof EventsOf<Contract>>(
        eventName: K,
        ...args: EventsOf<Contract>[K] extends void ? [] : [detail: EventsOf<Contract>[K]]
      ) => void
  listen: (eventName: string, handler: EventListener, options?: AddEventListenerOptions & { target?: EventTarget }) => () => void
  [name: string]: unknown
}

const RESERVED_CONTEXT_KEYS = new Set([
  'element',
  'host',
  'tagName',
  'inject',
  'observe',
  'effect',
  'onMount',
  'onUnmount',
  'prop',
  'props',
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

export function createContext(owner: ComponentDefinition, host: Element): Context<{}> {
  const api = {
    element: host,
    host,
    name: owner.name,
    tagName: owner.name,
    inject<T>(selector: (reg: Reg) => T): T {
      const reg: Reg = {
        components: new Proxy({} as never, {
          get(_: never, id: string | symbol) {
            if (typeof id === 'symbol') return undefined
            return walkComponentScope(id, host)
          },
        }),
        services: new Proxy({} as never, {
          get(_: never, id: string | symbol) {
            if (typeof id === 'symbol') return undefined
            if (__DEV__ && !hasService(id)) {
              const all = getAllServiceIds()
              throw new Error(
                `[xzo] InjectNotFoundError — service "${id}" is not registered.\n` +
                `  ✘ Registered services: ${all.length ? all.join(', ') : 'none'}`
              )
            }
            return getService(id)
          },
        }),
        page: undefined,
      }
      return selector(reg)
    },
    observe<T>(sigOrSigs: AnySignal<T> | AnySignal<unknown>[], cb: ((value: T, prev: T | undefined) => void) | ((values: unknown[], prev: unknown[] | undefined) => void)) {
      if (Array.isArray(sigOrSigs)) {
        let prevValues: unknown[] | undefined
        const dispose = effect(() => {
          const values = sigOrSigs.map(s => s.value)
          const prev = prevValues
          prevValues = values
          untracked(() => (cb as (values: unknown[], prev: unknown[] | undefined) => void)(values, prev))
        })
        owner.addCleanup(dispose)
      } else {
        let prevValue: T | undefined
        const dispose = effect(() => {
          const value = (sigOrSigs as AnySignal<T>).value
          const prev = prevValue
          prevValue = value
          if (__DEV__) {
            // Detect potential cycle: same signal mutated inside callback
            const observedSig = sigOrSigs
            const origSet = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(observedSig), 'value')?.set
            if (origSet) {
              // Patch temporarily to detect mutation
            }
          }
          untracked(() => (cb as (value: T, prev: T | undefined) => void)(value, prev))
        })
        owner.addCleanup(dispose)
      }
    },
    onMount(callback: () => void) {
      owner.addMountCallback(callback)
    },
    onUnmount(callback: () => void) {
      owner.addUnmountCallback(callback)
    },
    effect(fn: () => void) {
      const dispose = effect(fn)
      owner.addCleanup(dispose)
      return dispose
    },
    prop<T>(name: string) {
      return getReadonlyPropSignal(host, name) as AnySignal<T>
    },
    props: new Proxy({} as never, {
      get(_: never, name: string | symbol) {
        if (typeof name !== 'string') return undefined
        return getReadonlyPropSignal(host, name)
      },
    }),
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

      owner.addCleanup(cleanup)
      return cleanup
    },
  }

  return new Proxy(api, {
    get(target, property, receiver) {
      if (typeof property === 'string') {
        if (contextExtensions.has(property)) {
          return contextExtensions.get(property)!(owner, host)
        }

        if (!RESERVED_CONTEXT_KEYS.has(property) && hasResolvableProp(host, property)) {
          return getReadonlyPropSignal(host, property)
        }

        if (!(property in target)) {
          return getReadonlyPropSignal(host, property)
        }
      }

      return Reflect.get(target, property, receiver)
    },
  }) as unknown as Context
}
