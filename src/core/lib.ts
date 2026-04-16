import type { ComponentFactory, ComponentResult } from '../types'
import { each, createAsyncSource, xif } from './directives'
import { createContext, ensurePropSignal } from './context'
import {
  createOwner,
  disposeOwner,
  getOwner,
  mountOwner,
  runWithOwner,
  setOwnerProviders,
  type Owner,
} from './scheduler'
import { applyScope, injectStyles } from './styles'

type MountedInstance = {
  owner: Owner
}

type ServiceFactory = () => Record<string, unknown>

const RESERVED_KEYS = new Set(['template', 'styles', 'scope'])
const definitions = new Map<string, ComponentFactory>()
const rootDefinitions = new Set<string>()
const mountedRoots = new Map<string, Element>()
const mounted = new WeakMap<Element, MountedInstance>()
// componentTable caches injection results (per-requesting-element), GC-safe
const componentTable = new WeakMap<Element, Map<string, unknown>>()
const services = new Map<string, Record<string, unknown> | ServiceFactory>()
let observer: MutationObserver | null = null

/**
 * Builds the providers object for a component from its result, separating out reserved keys.
 * The "scope" property is merged into the top-level providers for convenience, but it's not
 * required to be used — it's just an optional namespacing mechanism.
 * 
 * @example
 * 
 * lib.define('app', (ctx) => {
    const cart = signal([])
    const total = computed(() => cart.value.length)
    return { template, cart, total }  // cart and total are directly injectable
  })
 * 
 * TODO: consider changing the name from providers to scope,
 * since the "providers" terminology is a bit overloaded and can be confused with context providers in other frameworks.
 * The idea of "providing" values to descendants is still there, but it might be clearer to just call it scope.
 */
function buildProviders(result: ComponentResult): Record<string, unknown> {
  const providers: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(result)) {
    if (!RESERVED_KEYS.has(key)) {
      providers[key] = value
    }
  }

  if (result.scope) {
    Object.assign(providers, result.scope)
  }

  return providers
}

/**
 * Similar to buildProviders,
 * but only includes non-reserved keys that are functions (e.g. signals, computed)
 * since services are meant to be injected and used directly, not as a context object.
 * 
 * @example
 * lib.service('logger', () => {
    const entries = signal<string[]>([])

    function log(message: string) {
      entries.value = [...entries.value, message]
    }

    return { entries, log }
  })

 * After buildServiceProviders runs, what gets stored and later returned by ctx.inject(reg => reg.services.logger) is:
 * { entries: Signal<string[]>, log: (message: string) => void }
 */
function buildServiceProviders(result: Record<string, unknown>): Record<string, unknown> {
  const providers: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(result)) {
    if (!RESERVED_KEYS.has(key)) {
      providers[key] = value
    }
  }

  if (result.scope && typeof result.scope === 'object') {
    Object.assign(providers, result.scope as Record<string, unknown>)
  }

  return providers
}

function findParentOwner(element: Element): Owner | null {
  const explicitOwner = (element as Element & { _$owner?: Owner })._$owner
  if (explicitOwner) {
    return explicitOwner
  }

  let cursor = element.parentElement
  while (cursor) {
    const instance = mounted.get(cursor)
    if (instance) {
      return instance.owner
    }
    cursor = cursor.parentElement
  }

  return getOwner()
}

function normalizeTemplate(template: Node): Node {
  return template instanceof Node ? template : document.createTextNode(String(template))
}

function mountElement(element: Element): void {
  if (mounted.has(element)) {
    return
  }

  const name = element.localName
  const definition = definitions.get(name)
  if (!definition) {
    return
  }

  if (rootDefinitions.has(name)) {
    const existing = mountedRoots.get(name)
    if (existing && existing !== element) {
      console.error(`[xzo] root singleton violation: <${name}> already mounted; removing duplicate instance.`)
      element.remove()
      return
    }
  }

  for (const property of Object.keys(element as unknown as Record<string, unknown>)) {
    if (property !== '_$owner') {
      ensurePropSignal(element, property)
    }
  }

  const owner = createOwner(name, findParentOwner(element), element)
  mounted.set(element, { owner })
  if (rootDefinitions.has(name)) {
    mountedRoots.set(name, element)
  }

  const result = runWithOwner(owner, () => definition(createContext(owner, element)))
  setOwnerProviders(owner, buildProviders(result))

  if (result.styles) {
    injectStyles(name, result.styles)
    applyScope(element, name)
  }

  element.replaceChildren(normalizeTemplate(result.template))
  mountOwner(owner)
  scanSubtree(element)
}

function disposeElement(element: Element): void {
  const instance = mounted.get(element)
  if (!instance) {
    return
  }

  disposeOwner(instance.owner)
  mounted.delete(element)

  const name = element.localName
  if (rootDefinitions.has(name) && mountedRoots.get(name) === element) {
    mountedRoots.delete(name)
  }
}

function visitElements(node: Node, visitor: (element: Element) => void): void {
  if (!(node instanceof Element)) {
    return
  }
  visitor(node)

  for (const child of Array.from(node.children)) {
    visitElements(child, visitor)
  }
}

function scanSubtree(root: ParentNode): void {
  const children = root instanceof Element ? [root, ...Array.from(root.children)] : Array.from(root.children)
  for (const node of children) {
    visitElements(node, mountElement)
  }
}

function disposeSubtree(node: Node): void {
  visitElements(node, disposeElement)
}

export function define(name: string, factory: ComponentFactory): void {
  definitions.set(name, factory)
}

export function root(name: string, factory: ComponentFactory): void {
  rootDefinitions.add(name)
  define(name, factory)
}

export function service(name: string, factory: ServiceFactory): void {
  services.set(name, factory)
}

function initServices(): void {
  for (const [name, entry] of services) {
    if (typeof entry === 'function') {
      services.set(name, buildServiceProviders(entry()))
    }
  }
}

export function getService(name?: string): Record<string, unknown> {
  if (!name) {
    return {}
  }

  const existing = services.get(name)
  if (!existing) {
    return {}
  }

  if (typeof existing === 'function') {
    const value = existing()
    services.set(name, value)
    return value
  }

  return existing
}

/**
 * Walks up the DOM tree from the given host element to find the nearest ancestor component that provides the requested id,
 * returning its providers object.
 * Results are cached per host element to optimize repeated lookups,
 * which is common when multiple properties or effects are injected from the same ancestor.
 * If no matching provider is found, returns undefined (or throws in dev mode with a helpful message).
 */
export function walkComponentProviders(id: string, host: Element): unknown {
  // Check per-element cache first
  const cache = componentTable.get(host)
  if (cache && cache.has(id)) {
    return cache.get(id)
  }

  let path: string[] | undefined
  if (__DEV__) {
    path = []
  }

  let cursor: Element | null = host.parentElement
  while (cursor) {
    const instance = mounted.get(cursor)
    if (instance) {
      if (path) {
        path.push(instance.owner.name)
      }
      // Match by component NAME — reg.components.app returns the providers of
      // the ancestor component registered as "app", not a provider key named "app"
      if (instance.owner.name === id) {
        const value = instance.owner.providers
        // Cache result
        const c = componentTable.get(host) ?? new Map<string, unknown>()
        c.set(id, value)
        componentTable.set(host, c)
        return value
      }
    }
    cursor = cursor.parentElement
  }

  if (__DEV__) {
    const pathStr = path && path.length ? path.join(' → ') : 'none'
    throw new Error(
      `[xzo] InjectNotFoundError — "${id}" not found in ancestor scopes\n` +
      `  ✘ Searched: ${pathStr}\n` +
      `  ✦ Hint: did you mean ctx.inject(reg => reg.services.${id})?`
    )
  }

  return undefined
}

export function getAllServiceIds(): string[] {
  return Array.from(services.keys())
}

export function hasService(name: string): boolean {
  return services.has(name)
}

export function init(rootNode: Document | Element = document): void {
  initServices()
  scanSubtree(rootNode)

  if (observer) {
    return
  }

  observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of Array.from(mutation.removedNodes)) {
        disposeSubtree(node)
      }

      for (const node of Array.from(mutation.addedNodes)) {
        if (node instanceof Element) {
          visitElements(node, mountElement)
        }
      }
    }
  })

  const target = rootNode instanceof Document ? rootNode.documentElement : rootNode
  observer.observe(target, { childList: true, subtree: true })
}

export interface Lib {
  define(name: string, factory: ComponentFactory): void
  root(name: string, factory: ComponentFactory): void
  service(name: string, factory: () => Record<string, unknown>): void
  init(rootNode?: Document | Element): void
  each: typeof each
  async: typeof createAsyncSource
}

export const lib = {
  define,
  root,
  service,
  init,
  each,
  async: createAsyncSource,
  xif
} as unknown as Lib
