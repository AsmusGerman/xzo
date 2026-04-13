import { computed, effect, signal, untracked } from '@preact/signals-core'
import type { AnySignal, PropsOf, EventsOf, Reg } from '../types'
import { toKebabCase } from '../types'
import {
  addCleanup,
  addMountCallback,
  addUnmountCallback,
  type Owner,
} from './scheduler'
import { getService, walkComponentProviders, getAllServiceIds, hasService } from './lib'

// Optional context extension points — populated by @xzo/router or other add-ons
const contextExtensions = new Map<string, (owner: Owner, host: Element) => unknown>()

export function registerContextExtension(name: string, getter: (owner: Owner, host: Element) => unknown): void {
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
  effect: (callback: Parameters<typeof effect>[0]) => () => void
  observe: {
    <T>(sig: AnySignal<T>, cb: (value: T, prev: T | undefined) => void): void
    (sigs: AnySignal<unknown>[], cb: (values: unknown[], prev: unknown[] | undefined) => void): void
  }
  onMount: (callback: () => void) => void
  onUnmount: (callback: () => void) => void
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
  'effect',
  'observe',
  'onMount',
  'onUnmount',
  'prop',
  'props',
  'ref',
  'emit',
  'listen',
])

/**
 * Returns the writable signal map for the given host element, creating it on first access.
 * Signals are stored directly on the element so that external code (e.g. a parent component
 * setting a property) can trigger reactivity by writing to the same signal instance that the
 * component's setup function reads from.
 * 
 * @example
 * ctx.prop('value')
  → getReadonlyPropSignal(host, 'value')
      → getReadonlyHostSignals(host)   // get/create the readonly map
      → checks map for 'value' — miss on first access
      → ensurePropSignal(host, 'value')
          → getHostSignals(host)        // get/create the writable map
          → checks map for 'value' — miss, so calls defineHostProperty
          → defineHostProperty(host, 'value', initialValue)
              → getHostSignals(host)    // stores the new writable signal
      → computed(() => writable.value) // wrap it as readonly
      → stores in readonlySignals map
  → returns the computed signal
 */
function getHostSignals(host: HostWithSignals): Map<string, ReturnType<typeof signal<unknown>>> {
  if (!host.__xz_propSignals) {
    host.__xz_propSignals = new Map()
  }

  return host.__xz_propSignals
}

/**
 * Returns the readonly computed-signal map for the given host element, creating it on first access.
 * Components receive computed wrappers (not the raw writable signals) so they can observe prop
 * changes without being able to mutate them directly — keeping write authority with whoever owns
 * the property (parent element or the DOM attribute system).
 */
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

export function createContext(owner: Owner, host: Element): Context<{}> {
  const api = {
    // todo: remove element from the public API since it's the same as host and can cause confusion — components should just use host
    element: host,
    host,
    // todo: name is redundant since it's the same as tagName
    name: owner.name,
    tagName: owner.name,
    inject<T>(selector: (reg: Reg) => T): T {
      const reg: Reg = {
        components: new Proxy({} as never, {
          get(_: never, id: string | symbol) {
            if (typeof id === 'symbol') return undefined
            return walkComponentProviders(id, host)
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
    /**
     * Run an effect tied to the component's lifecycle. The effect will be disposed automatically on unmount.
     * @param callback The effect callback, which may read signals and will re-run whenever those signals change.
     * @returns A function to manually dispose the effect.
     */
    effect(callback: Parameters<typeof effect>[0]) {
      // effect implementation is handled by preact/signals-core
      // we just need to ensure cleanup is registered with the component's lifecycle
      const dispose = effect(callback)
      // Register cleanup to run on unmount
      addCleanup(owner, dispose)
      return dispose
    },
    /**
     * Observe one or more signals with a callback that receives the current and previous values.
     * Useful for responding to signal changes without causing additional re-renders.
     * @param observed The signal or array of signals to observe.
     * @param callback The callback to invoke when the signal(s) change.
     */
    observe<T>(observed: AnySignal<T> | AnySignal<unknown>[], callback: ((value: T, prev: T | undefined) => void) | ((values: unknown[], prev: unknown[] | undefined) => void)) {
      // can separate single vs multiple signals for better typings and to avoid unnecessary array allocations for single signal case
      if (Array.isArray(observed)) {
        let prevValues: unknown[] | undefined
        const dispose = effect(() => {
          const values = observed.map(s => s.value)
          const prev = prevValues
          prevValues = values
          untracked(() => (callback as (values: unknown[], prev: unknown[] | undefined) => void)(values, prev))
        })
        addCleanup(owner, dispose)
      } else {
        let prevValue: T | undefined
        const dispose = effect(() => {
          const value = (observed as AnySignal<T>).value
          const prev = prevValue
          prevValue = value
          if (__DEV__) {
            // Detect potential cycle: same signal mutated inside callback
            const observedSig = observed
            const origSet = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(observedSig), 'value')?.set
            if (origSet) {
              // Patch temporarily to detect mutation
            }
          }
          untracked(() => (callback as (value: T, prev: T | undefined) => void)(value, prev))
        })
        addCleanup(owner, dispose)
      }
    },
    onMount(callback: () => void) {
      addMountCallback(owner, callback)
    },
    onUnmount(callback: () => void) {
      addUnmountCallback(owner, callback)
    },
    /**
     * Access a reactive property signal for the given name.
     * This will create a new signal if it doesn't already exist,
     * and initialize it with the current attribute value or property value of the host element.
      * @param name The name of the property to access as a signal.
      * @returns A signal representing the property's value.
      * 
      * TODO: consider supporting nested paths like "user.name"
      * maybe using a registered schema to define the shape of props and avoid runtime parsing of paths?
      * also why not having props, to access any property
      */
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
    /**
     * emit a custom event from the component's host element,
     * which can be listened to by ancestor components using ctx.listen.
     * @param eventName The name of the event to emit.
     * @param detail Optional data to include with the event.
     * 
     * TODO: consider supporting non-bubbling events and/or custom event targets,
     * for more flexible communication patterns
     * also consider typing the detail param with generics
     */
    emit(eventName: string, detail?: unknown) {
      host.dispatchEvent(new CustomEvent(eventName, {
        detail,
        bubbles: true,
        composed: true,
      }))
    },
    /**
     * listen for a custom event on the component's host element or an optional target, with automatic cleanup on unmount.
     * @param eventName The name of the event to listen for.
     * @param handler The event handler function to invoke when the event is triggered.
     * @param options Optional event listener options, including a custom target.
     * @returns A cleanup function to remove the event listener.
     */
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
      // todo: the props should be accessible by prop or props,
      // but not directly from the context to avoid confusion with providers and services
      // — consider adding a separate ctx.props object for this
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
