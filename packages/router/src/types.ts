/** Maps a path string's dynamic segments to a typed params object.
 * @example '/products/:id' → `{ id: string }` */
type ExtractParamNames<Path extends string> =
  Path extends `${string}:${infer Param}/${infer Rest}`
  ? Param | ExtractParamNames<`/${Rest}`>
  : Path extends `${string}:${infer Param}`
  ? Param
  : never

/** Maps a path string's dynamic segments to a typed params object.
 * @example '/products/:id' → `{ id: string }` */
export type PathParams<Path extends string> = [ExtractParamNames<Path>] extends [never]
  ? Record<string, never>
  : { [K in ExtractParamNames<Path>]: string }

/** Augment this interface to get typed `navigate()` calls.
 * @example
 * declare module '@xzo/router' {
 *   interface RouteRegistry {
 *     'product-detail': { id: string }
 *   }
 * }
 */
export interface RouteRegistry { }

export type GuardPhase = 'enter' | 'leave'

export type GuardResult = boolean | { redirect: string }
export type GuardFn = () => GuardResult | Promise<GuardResult>

export type RouterSource = {
  outlet(props?: Record<string, unknown>): Node
  pending(props?: { children?: unknown }): Node
  error(props?: { children?: unknown }): Node
}

export type NavigateFn = {
  <Id extends keyof RouteRegistry>(
    id: Id,
    ...args: [RouteRegistry[Id]] extends [Record<string, never>]
      ? [params?: Record<string, never>, opts?: { replace?: boolean }]
      : [params: RouteRegistry[Id], opts?: { replace?: boolean }]
  ): Promise<void>
  (id: string, params?: Record<string, string>, opts?: { replace?: boolean }): Promise<void>
}

export type MatchResult = { route: RouteEntry; params: Record<string, string> } | null

/** @internal
 * Represents a registered route in the router's internal trie structure.
 */
export type RouteEntry = {
  id: string
  path: string
  tagName: string
}

/** @internal
 * Represents a node in the router's internal trie structure.
 */
export type TrieNode = {
  // static children (e.g. 'about', 'products')
  children: Map<string, TrieNode>
  // dynamic child (e.g. ':id')
  paramChild?: { name: string; node: TrieNode } | null
  // if this node is the end of a registered route, this contains the route's metadata
  route?: RouteEntry | null
  // if this node is the wildcard '*' route, this contains the route's metadata
  wildCardRoute?: RouteEntry | null
}

