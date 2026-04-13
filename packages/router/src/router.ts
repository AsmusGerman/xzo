import { effect, signal } from '@preact/signals-core'
import type { ComponentFactory } from 'xzo'
import { addCleanup, getOwner, lib as xzoLib, registerContextExtension } from 'xzo'

// ---------------------------------------------------------------------------
// Type utilities — extract param keys from a path string
// e.g. '/products/:id' → 'id'
// ---------------------------------------------------------------------------
type ExtractParamNames<Path extends string> =
  Path extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractParamNames<`/${Rest}`>
    : Path extends `${string}:${infer Param}`
    ? Param
    : never

export type PathParams<Path extends string> = [ExtractParamNames<Path>] extends [never]
  ? Record<string, never>
  : { [K in ExtractParamNames<Path>]: string }

// ---------------------------------------------------------------------------
// Registry interfaces — augmented by lib.page()
// ---------------------------------------------------------------------------
export interface RouteRegistry {}

// ---------------------------------------------------------------------------
// Guard types — Section 2.11
// ---------------------------------------------------------------------------
export type GuardResult = boolean | { redirect: string }
export type GuardFn = () => GuardResult | Promise<GuardResult>

// ---------------------------------------------------------------------------
// RouterSource — returned by lib.router(), follows EachSource/AsyncSource pattern
// ---------------------------------------------------------------------------
export type RouterSource = {
  outlet(props?: Record<string, unknown>): Node
  pending(props?: { children?: unknown }): Node
  error(props?: { children?: unknown }): Node
}

// ---------------------------------------------------------------------------
// Internal route table
// ---------------------------------------------------------------------------
type RouteEntry = {
  id: string
  path: string
  /** Normalised path segments, e.g. ['products', ':id'] */
  segments: string[]
  /** Custom element tag name for mounting */
  tagName: string
}

const routeTable = new Map<string, RouteEntry>()

function compileSegments(path: string): string[] {
  return path.replace(/^\//, '').split('/').filter(Boolean)
}

// ---------------------------------------------------------------------------
// Per-element params map — set before element is inserted into DOM
// ---------------------------------------------------------------------------
const pageParamsMap = new WeakMap<Element, Record<string, string>>()

// ---------------------------------------------------------------------------
// Guard registries
// ---------------------------------------------------------------------------
const routeEnterGuards = new Map<string, GuardFn[]>()
const routeLeaveGuards = new Map<string, GuardFn[]>()
let activeRouteId: string | null = null
const enterGuardInitedForOwner = new WeakSet<object>()
const leaveGuardInitedForOwner = new WeakSet<object>()

// ---------------------------------------------------------------------------
// Current router state
// ---------------------------------------------------------------------------
export const path = signal(location.pathname)
export const query = signal(new URLSearchParams(location.search))

// ---------------------------------------------------------------------------
// Route matching
// ---------------------------------------------------------------------------
type MatchResult = { route: RouteEntry; params: Record<string, string> } | null

function matchRoute(pathname: string): MatchResult {
  const segments = pathname.replace(/^\//, '').split('/').filter(Boolean)
  let wildcardRoute: RouteEntry | null = null
  let best: MatchResult = null
  let bestScore = -1

  for (const route of routeTable.values()) {
    if (route.segments.length === 1 && route.segments[0] === '*') {
      wildcardRoute = route
      continue
    }

    if (route.segments.length !== segments.length) continue

    let match = true
    let score = 0
    const params: Record<string, string> = {}

    for (let i = 0; i < route.segments.length; i++) {
      const seg = route.segments[i]!
      if (seg.startsWith(':')) {
        params[seg.slice(1)] = segments[i]!
      } else if (seg === segments[i]) {
        score++
      } else {
        match = false
        break
      }
    }

    if (match && score > bestScore) {
      best = { route, params }
      bestScore = score
    }
  }

  return best ?? (wildcardRoute ? { route: wildcardRoute, params: {} } : null)
}

function navigateByUrl(url: string, replace = false): void {
  if (replace) {
    history.replaceState(null, '', url)
  } else {
    history.pushState(null, '', url)
  }
  path.value = location.pathname
  query.value = new URLSearchParams(location.search)
}

// ---------------------------------------------------------------------------
// Guard runner
// ---------------------------------------------------------------------------
async function runGuards(guards: GuardFn[] | undefined): Promise<{ cancel: boolean; redirect?: string }> {
  if (!guards || guards.length === 0) return { cancel: false }
  for (const fn of guards) {
    const result = await fn()
    if (result === false) return { cancel: true }
    if (typeof result === 'object' && 'redirect' in result) {
      return { cancel: true, redirect: result.redirect }
    }
  }
  return { cancel: false }
}
// ---------------------------------------------------------------------------
type NavigateFn = {
  <Id extends keyof RouteRegistry>(
    id: Id,
    ...args: [RouteRegistry[Id]] extends [Record<string, never>]
      ? [params?: Record<string, never>, opts?: { replace?: boolean }]
      : [params: RouteRegistry[Id], opts?: { replace?: boolean }]
  ): Promise<void>
  (id: string, params?: Record<string, string>, opts?: { replace?: boolean }): Promise<void>
}

async function navigate(
  id: string,
  params?: Record<string, string>,
  opts?: { replace?: boolean },
): Promise<void> {
  const route = routeTable.get(id)
  if (!route) {
    if (__DEV__) {
      throw new Error(
        `[xzo/router] navigate() — unknown route id "${id}". Registered: ${Array.from(routeTable.keys()).join(', ')}`,
      )
    }
    return
  }

  let url = route.path
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url = url.replace(`:${key}`, encodeURIComponent(value))
    }
  }

  // -- leave guards for current page --
  if (activeRouteId) {
    const leaveResult = await runGuards(routeLeaveGuards.get(activeRouteId))
    if (leaveResult.cancel) {
      if (leaveResult.redirect) return navigate(leaveResult.redirect)
      return
    }
  }
  // -- enter guards for target page --
  const enterResult = await runGuards(routeEnterGuards.get(id))
  if (enterResult.cancel) {
    if (enterResult.redirect) return navigate(enterResult.redirect)
    return
  }

  navigateByUrl(url, opts?.replace)
}

// ---------------------------------------------------------------------------
// Helpers shared between outlets
// ---------------------------------------------------------------------------
function clearRange(start: Comment, end: Comment): void {
  let cursor = start.nextSibling
  while (cursor && cursor !== end) {
    const next = cursor.nextSibling
    cursor.parentNode?.removeChild(cursor)
    cursor = next
  }
}

// ---------------------------------------------------------------------------
// routerFactory — each call returns an independent RouterSource
// ---------------------------------------------------------------------------
function routerFactory(): RouterSource {
  const owner = getOwner()
  const start = document.createComment('[xzo/router outlet]')
  const end = document.createComment('[/xzo/router outlet]')
  let currentElement: Element | null = null
  let currentRouteId: string | null = null

  const dispose = effect(() => {
    const currentPath = path.value

    // Anchors not yet in DOM (outlet() hasn't been called yet) — bail but
    // keep `path.value` tracked so the effect re-runs after navigation.
    if (!end.parentNode) return

    const match = matchRoute(currentPath)

    if (!match) {
      if (currentElement) {
        currentElement.remove()
        currentElement = null
        currentRouteId = null
        activeRouteId = null
      }
      clearRange(start, end)
      return
    }

    if (match.route.id === currentRouteId) return

    if (currentElement) {
      currentElement.remove()
      currentElement = null
    }

    currentRouteId = match.route.id
    activeRouteId = match.route.id
    const el = document.createElement(match.route.tagName)
    pageParamsMap.set(el, match.params)
    end.parentNode.insertBefore(el, end)
    currentElement = el
  })

  if (owner) {
    addCleanup(owner, dispose)
  }

  function outlet(_props?: Record<string, unknown>): Node {
    const frag = document.createDocumentFragment()
    frag.appendChild(start)
    // Always perform initial render here — the effect bailed when there was no parentNode
    const match = matchRoute(path.value)
    if (match) {
      currentRouteId = match.route.id
      const el = document.createElement(match.route.tagName)
      pageParamsMap.set(el, match.params)
      frag.appendChild(el)
      currentElement = el
    }
    frag.appendChild(end)
    return frag
  }

  function pending(_props?: { children?: unknown }): Node {
    return document.createComment('[xzo/router pending]')
  }

  function error(_props?: { children?: unknown }): Node {
    return document.createComment('[xzo/router error]')
  }

  return { outlet, pending, error }
}

// ---------------------------------------------------------------------------
// Context extensions — registered once at import time
// ---------------------------------------------------------------------------
registerContextExtension('navigate', () => navigate as NavigateFn)
registerContextExtension('path', () => path)
registerContextExtension('query', () => query)
registerContextExtension('params', (_owner, host) => pageParamsMap.get(host as Element) ?? {})
registerContextExtension('guard', (owner) => {
  return (phaseOrFn: GuardFn | 'enter' | 'leave', fn?: GuardFn): void => {
    const phase: 'enter' | 'leave' = typeof phaseOrFn === 'string' ? phaseOrFn : 'enter'
    const guardFn = typeof phaseOrFn === 'function' ? phaseOrFn : fn!
    if (phase === 'enter') {
      if (!enterGuardInitedForOwner.has(owner)) {
        routeEnterGuards.set(owner.name, [])
        enterGuardInitedForOwner.add(owner)
      }
      routeEnterGuards.get(owner.name)!.push(guardFn)
    } else {
      if (!leaveGuardInitedForOwner.has(owner)) {
        routeLeaveGuards.set(owner.name, [])
        leaveGuardInitedForOwner.add(owner)
      }
      routeLeaveGuards.get(owner.name)!.push(guardFn)
      addCleanup(owner, () => {
        const g = routeLeaveGuards.get(owner.name)
        if (g) { const i = g.indexOf(guardFn); if (i >= 0) g.splice(i, 1) }
      })
    }
  }
})
registerContextExtension('redirect', () => {
  return (id: string): { redirect: string } => ({ redirect: id })
})

// ---------------------------------------------------------------------------
// lib.page() — registers a page component and its route
// ---------------------------------------------------------------------------
export function page<
  Id extends string,
  Path extends string,
>(
  id: Id,
  options: { path: Path; lazy?: boolean },
  factory: (
    ctx: import('xzo').Context & { params: PathParams<Path> },
  ) => import('xzo').ComponentResult,
): void {
  const tagName = id
  const segments = compileSegments(options.path)

  routeTable.set(id, {
    id,
    path: options.path,
    segments,
    tagName,
  })

  ;(xzoLib as unknown as { define: (name: string, factory: ComponentFactory) => void }).define(
    tagName,
    factory as ComponentFactory,
  )
}

// ---------------------------------------------------------------------------
// Extend the xzo lib object at import time
// ---------------------------------------------------------------------------
Object.assign(xzoLib, { router: routerFactory, page })

// ---------------------------------------------------------------------------
// Module augmentation
// ---------------------------------------------------------------------------
declare module 'xzo' {
  interface Lib {
    router(): RouterSource
    page<Id extends string, Path extends string>(
      id: Id,
      options: { path: Path; lazy?: boolean },
      factory: (
        ctx: import('xzo').Context & { params: PathParams<Path> },
      ) => import('xzo').ComponentResult,
    ): void
  }
  interface Context {
    navigate: NavigateFn
    path: typeof path
    query: typeof query
    params: Record<string, string>
    guard(fn: GuardFn): void
    guard(phase: 'enter' | 'leave', fn: GuardFn): void
    redirect<Id extends keyof RouteRegistry>(id: Id): { redirect: Id }
  }
}

// ---------------------------------------------------------------------------
// Link interception
// ---------------------------------------------------------------------------
function interceptLinks(event: MouseEvent): void {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
    return
  }

  const anchor = (event.composedPath() as Element[]).find(
    (el): el is HTMLAnchorElement => el instanceof HTMLAnchorElement,
  )
  if (!anchor) return
  if (anchor.target === '_blank') return
  if (anchor.hasAttribute('download')) return
  if (anchor.getAttribute('rel') === 'external') return

  const href = anchor.getAttribute('href')
  if (!href || href.startsWith('http') || href.startsWith('//') || href.startsWith('mailto:')) {
    return
  }

  event.preventDefault()
  navigateByUrl(href)
}

// ---------------------------------------------------------------------------
// popstate — back/forward
// ---------------------------------------------------------------------------
window.addEventListener('popstate', () => {
  path.value = location.pathname
  query.value = new URLSearchParams(location.search)
})

document.addEventListener('click', interceptLinks)
