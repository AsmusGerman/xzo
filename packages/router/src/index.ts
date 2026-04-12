import './context'
import { path, query } from './state'
import type { PathParams, NavigateFn, GuardFn, GuardPhase, RouteRegistry } from './types'
export { Router } from './router'
export { page } from './page'
export type {
  RouterSource,
  RouteRegistry,
  PathParams,
  GuardFn,
  GuardResult,
  GuardPhase,
  NavigateFn,
} from './types'

// module augmentation to add router() and page() to xzo.lib,
// and navigate, path, query, params, guard(), redirect() to xzo.ctx
declare module 'xzo' {
  interface Lib {
    router(): import('./types').RouterSource
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
    guard(phase: GuardPhase, fn: GuardFn): void
    redirect<Id extends keyof RouteRegistry>(id: Id): { redirect: Id }
  }
}

export { path, query }
