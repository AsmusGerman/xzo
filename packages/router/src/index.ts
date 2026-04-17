import './context'
import type { path, query } from './state';
import type { PathParams, NavigateFn, GuardFn, RouteRegistry } from './types';
export { Router, } from "./router";

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
    guard(phase: 'enter' | 'leave', fn: GuardFn): void
    redirect<Id extends keyof RouteRegistry>(id: Id): { redirect: Id }
  }
}