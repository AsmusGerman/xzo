import { batch, computed, signal, untracked } from '@preact/signals-core'
import { lib } from './core/lib'

export type { Context } from './core/context'
export { registerContextExtension } from './core/context'
export type {
  AnySignal,
  ActivePageScope,
  AsyncSource,
  ComponentFactory,
  ComponentProp,
  ComponentEvent,
  PropsOf,
  EventsOf,
  ComponentRegistry,
  ComponentResult,
  EachOptions,
  EachSource,
  Reg,
  ServiceRegistry,
  Unwrap,
} from './types'
export type { Lib } from './core/lib'
export { ComponentDefinition, getOwner } from './core/scheduler'
/** @deprecated Use ComponentDefinition */
export type { Owner } from './core/scheduler'

export function addCleanup(owner: import('./core/scheduler').ComponentDefinition, cleanup: () => void): void {
  owner.addCleanup(cleanup)
}
// Named function exports (tree-shakeable)
export { define, root, service, init } from './core/lib'
export { define as component } from './core/lib'
export { lib, signal, computed, batch }
export const untrack = untracked

export function css(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings.reduce((output, chunk, index) => {
    const value = index < values.length ? String(values[index] ?? '') : ''
    return output + chunk + value
  }, '')
}