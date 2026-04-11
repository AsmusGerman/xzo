import { batch, computed, signal, untracked } from '@preact/signals-core'
import { lib } from './core/lib'

export type { Context } from './core/context'
export type {
  AnySignal,
  AsyncSource,
  ComponentFactory,
  ComponentRegistry,
  ComponentResult,
  EachOptions,
  EachSource,
  Reg,
  ServiceRegistry,
  Unwrap,
} from './types'
export type { Lib } from './core/lib'
export { addCleanup, getOwner } from './core/scheduler'
export { lib, signal, computed, batch }
export const untrack = untracked

export function css(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings.reduce((output, chunk, index) => {
    const value = index < values.length ? String(values[index] ?? '') : ''
    return output + chunk + value
  }, '')
}