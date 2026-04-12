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
const services = new Map<string, Record<string, unknown> | ServiceFactory>()
let observer: MutationObserver | null = null

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
  // if(node.nodeName === "CHECKOUT-BUTTON") debugger
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
  console.log(name)
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

export const lib = {
  define,
  root,
  service,
  init,
  each,
  async: createAsyncSource,
  xif
}